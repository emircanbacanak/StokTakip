import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { cleanProductName } from "./utils";
import { uploadInvoicesToTrendyol, getTrendyolAcceptedClaims } from "./trendyol-invoice-uploader";

export interface GibBrowserOptions {
  username?: string;
  password?: string;
  orders?: any[];
  skipCreation?: boolean;
  skipTrendyolUpload?: boolean;
  trendyolUsername?: string;
  trendyolPassword?: string;
  onProgress?: (index: number, total: number, orderNumber: string) => void;
}

interface TableRowMetadata {
  index: number;
  invoiceNo: string;
  vknTckn: string;
  customerName: string;
  date: string;
  totalAmount: string;
  isApproved: boolean;
  isCancelled: boolean;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&uuml;/gi, "ü")
    .replace(/&ouml;/gi, "ö")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&sect;/gi, "ş")
    .replace(/&icirc;/gi, "î")
    .replace(/&Uuml;/gi, "Ü")
    .replace(/&Ouml;/gi, "Ö")
    .replace(/&Ccedil;/gi, "Ç")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function cleanCustomerName(name: string): string {
  return name
    .replace(/trendyol\s*plus['’]?l[ıi]/gi, "")
    .replace(/plus['’]?l[ıi]/gi, "")
    .replace(/kurumsal/gi, "")
    .replace(/[★☆⭐\u2022\u25cf]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(name: string): string {
  return cleanCustomerName(decodeHtmlEntities(name || ""))
    .toLocaleLowerCase("tr-TR")
    .replace(/[\s\-_.,;:]+/g, " ")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function sanitizeFilename(name: string): string {
  const decoded = decodeHtmlEntities(name);
  return decoded
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCustomerNameFromHtml(html: string, fallbackName?: string): string {
  // 1. Look for "SAYIN" cell in customerPartyTable
  const sayinMatch = html.match(/SAYIN[\s\S]*?<\/tr>\s*<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (sayinMatch && sayinMatch[1]) {
    const rawName = decodeHtmlEntities(
      sayinMatch[1]
        .replace(/&nbsp;/g, " ")
        .replace(/<[^>]+>/g, "")
        .trim()
    );
    if (rawName && rawName.length > 1) {
      return rawName;
    }
  }

  // 2. Look inside customerPartyTable
  const customerMatch = html.match(/id=["']customerPartyTable["'][\s\S]*?<tr>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (customerMatch && customerMatch[1]) {
    const rawName = decodeHtmlEntities(
      customerMatch[1]
        .replace(/&nbsp;/g, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/^SAYIN\s*/i, "")
        .trim()
    );
    if (rawName && rawName.length > 1) {
      return rawName;
    }
  }

  return decodeHtmlEntities(fallbackName || "Fatura");
}

function getOrderCustomerFullName(order: any): string {
  const invoiceAddress = order.invoice_address || order.shipment_address || {};
  const raw = (
    `${order.customer_first_name || ""} ${order.customer_last_name || ""}`.trim() ||
    `${invoiceAddress.firstName || ""} ${invoiceAddress.lastName || ""}`.trim() ||
    order.buyer?.name ||
    ""
  ).trim();
  return raw;
}

function isCustomerNameMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;

  const words1 = n1.split(" ").filter((w) => w.length > 1);
  const words2 = n2.split(" ").filter((w) => w.length > 1);

  if (words1.length > 0 && words2.length > 0) {
    const matchCount = words1.filter((w) => words2.includes(w)).length;
    if (matchCount >= Math.min(words1.length, words2.length)) return true;
  }

  return false;
}

function htmlMatchesOrder(html: string, order: any): boolean {
  const normHtml = normalizeName(html);

  // 1. Doğrudan Sipariş Numarası Kontrolü (Eğer notlara yazılmışsa)
  const orderNum = (order.order_number || "").toString().trim();
  if (orderNum && orderNum.length > 4 && html.includes(orderNum)) {
    return true;
  }

  // 2. Müşteri Adı Kontrolü
  const custName = getOrderCustomerFullName(order);
  const normCust = normalizeName(custName);
  const isCustMatch = normCust && (normHtml.includes(normCust) || isCustomerNameMatch(html, custName));

  if (!isCustMatch) {
    return false;
  }

  // Müşteri adı eşleşti! Şimdi ürün ve fiyat kontrolü:
  const items = order.items || [];
  let productMatched = false;
  let priceMatched = false;

  // A) Ürün adı kontrolü
  for (const item of items) {
    const rawProdName = item.product_name || item.name || "";
    const cleanName = cleanProductName(rawProdName);
    const normProd = normalizeName(cleanName);

    const keywords = normProd.split(" ").filter((w) => w.length > 2);
    if (keywords.length > 0) {
      const matchingKeywords = keywords.filter((kw) => normHtml.includes(kw));
      if (matchingKeywords.length >= Math.ceil(keywords.length * 0.5) || normHtml.includes(normProd)) {
        productMatched = true;
        break;
      }
    }
  }

  // B) Fiyat ve Tutar Kontrolü
  const pricesToCheck: number[] = [];
  if (order.gross_amount) pricesToCheck.push(Number(order.gross_amount));
  if (order.total_price) pricesToCheck.push(Number(order.total_price));
  for (const item of items) {
    if (item.price) pricesToCheck.push(Number(item.price));
    if (item.quantity && item.price) pricesToCheck.push(Number(item.quantity) * Number(item.price));
  }

  for (const p of pricesToCheck) {
    if (p > 0) {
      const pStrTr = p.toFixed(2).replace(".", ",");
      const pStrEn = p.toFixed(2);
      const pWithoutVatTr = (p / 1.2).toFixed(2).replace(".", ",");
      const pWithoutVatEn = (p / 1.2).toFixed(2);

      if (
        html.includes(pStrTr) ||
        html.includes(pStrEn) ||
        html.includes(pWithoutVatTr) ||
        html.includes(pWithoutVatEn)
      ) {
        priceMatched = true;
        break;
      }
    }
  }

  // Ürün VEYA Fiyat uyuşuyorsa bu kesinlikle aynı siparişin faturasıdır
  if (productMatched || priceMatched) {
    return true;
  }

  // Eğer sipariş verisinde items ve fiyat tanımlanmamışsa sadece müşteri adına güven
  if (items.length === 0 && pricesToCheck.length === 0) {
    return true;
  }

  return false;
}

async function showHelperOverlay(
  page: Page,
  options: {
    icon: string;
    title: string;
    subtitle: string;
    borderColor?: string;
  }
) {
  try {
    await page.evaluate(
      ({ icon, title, subtitle, borderColor }) => {
        let helper = document.getElementById("stocktakip-helper-box");
        if (!helper) {
          helper = document.createElement("div");
          helper.id = "stocktakip-helper-box";
          helper.style.position = "fixed";
          helper.style.top = "15px";
          helper.style.left = "50%";
          helper.style.transform = "translateX(-50%)";
          helper.style.zIndex = "999999";
          helper.style.backgroundColor = "#1E293B";
          helper.style.color = "#FFFFFF";
          helper.style.padding = "14px 22px";
          helper.style.borderRadius = "14px";
          helper.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.5)";
          helper.style.border = "2px solid #3B82F6";
          helper.style.display = "flex";
          helper.style.alignItems = "center";
          helper.style.gap = "14px";
          helper.style.fontFamily = "sans-serif";
          document.body.appendChild(helper);
        }

        helper.style.borderColor = borderColor || "#3B82F6";
        helper.innerHTML = `
          <div style="font-size: 24px;">${icon}</div>
          <div>
            <div style="font-weight: bold; font-size: 14px; color: #38BDF8;">
              ${title}
            </div>
            <div style="font-size: 12px; color: #E2E8F0; margin-top: 2px;">
              ${subtitle}
            </div>
          </div>
        `;
      },
      {
        icon: options.icon,
        title: options.title,
        subtitle: options.subtitle,
        borderColor: options.borderColor || "#3B82F6",
      }
    );
  } catch {}
}

async function expandAndClickTreeMenu(page: Page, targetMenuKeyword: string) {
  await page.evaluate((keyword) => {
    const w = window as any;

    // Ağaçtaki tüm kapalı dalları aç
    const allLis = Array.from(document.querySelectorAll(".mainTreeMenu li, .cstree li"));
    allLis.forEach((li) => {
      li.classList.remove("cstree-closed");
      li.classList.add("cstree-open");
    });

    const uls = Array.from(document.querySelectorAll(".mainTreeMenu ul, .cstree ul"));
    uls.forEach((u) => {
      (u as HTMLElement).style.display = "block";
      (u as HTMLElement).style.visibility = "visible";
    });

    // Belge İşlemleri tetikle
    const allA = Array.from(document.querySelectorAll("a"));
    const belgeA = allA.find((a) => (a.textContent || "").includes("Belge İşlemleri"));
    if (belgeA) {
      belgeA.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }

    // Hedef menüye tıkla
    const targetA = allA.find((a) => (a.textContent || "").includes(keyword));
    if (targetA) {
      targetA.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      targetA.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
      targetA.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      if (w.$) w.$(targetA).trigger("click");
    }
  }, targetMenuKeyword);
}

async function openDuzenlenenBelgeler(page: Page) {
  console.log("📂 Sol menüden 'Belge İşlemleri' -> 'Düzenlenen Belgeler' açılıyor...");
  await expandAndClickTreeMenu(page, "Düzenlenen Belgeler");

  // "Sorgula" butonunun ekranda görünmesini bekle
  await page.waitForFunction(
    () => {
      const btns = Array.from(document.querySelectorAll('input[rel="sorgula"], input[value="Sorgula"]'));
      return btns.some((b) => (b as HTMLElement).offsetWidth > 0);
    },
    { timeout: 25000 }
  );

  await new Promise((r) => setTimeout(r, 600));
}

async function queryDuzenlenenBelgeler(page: Page) {
  console.log("🔍 'Sorgula' butonuna basılıyor...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('input[rel="sorgula"], input[value="Sorgula"]')) as HTMLInputElement[];
    const visibleBtn = btns.find((b) => b.offsetWidth > 0) || btns[btns.length - 1];
    if (visibleBtn) visibleBtn.click();
  });

  // Tablonun ve belgelerin yüklenmesini bekle
  await new Promise((r) => setTimeout(r, 2500));
}

async function readDuzenlenenBelgelerRows(page: Page): Promise<TableRowMetadata[]> {
  return await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table tbody tr[rel], tr[rowid], .csc-grid tr[rel]")).filter((r) => {
      return (r as HTMLElement).offsetWidth > 0 && r.querySelector("td.csc-table-select, input[type='checkbox']");
    });

    return rows.map((row, index) => {
      const tds = Array.from(row.querySelectorAll("td"));
      const invoiceNo = (tds[1]?.textContent || "").trim();
      const vknTckn = (tds[2]?.textContent || "").trim();
      const customerName = (tds[3]?.textContent || "").trim();
      const date = (tds[4]?.textContent || "").trim();
      const totalAmount = (tds[5]?.textContent || "").trim();

      // Onay durumu (7. Kolon - tds[6] veya rel="onayli")
      // GİB onaylı faturada: <a rel="onayli" ...><i class="fa fa-check"></i></a>
      const onayCell = tds[6] || row.querySelector('td[rel="onayli"]');
      const onayHtml = (onayCell?.innerHTML || "").toLowerCase();
      
      const isApproved = Boolean(
        onayCell?.querySelector("a[rel='onayli'] i.fa-check, i.fa-check, .fa-check, [rel='onayli'] .fa-check") ||
        (onayHtml.includes("fa-check") && !onayHtml.includes("fa-times") && !onayHtml.includes("fa-close"))
      );

      // İptal / Silinme durumu (8. Kolon - tds[7] ve satır geneli)
      const iptalCell = tds[7];
      const iptalText = ((iptalCell?.textContent || "") + " " + (row.textContent || "")).toLowerCase();
      const isCancelled =
        iptalText.includes("iptal") ||
        iptalText.includes("silin") ||
        iptalText.includes("itiraz") ||
        iptalText.includes("kabul edildi") ||
        iptalText.includes("reddedildi");

      return {
        index,
        invoiceNo,
        vknTckn,
        customerName,
        date,
        totalAmount,
        isApproved,
        isCancelled,
      };
    });
  });
}

/**
 * GİB Tablosundaki TÜM sayfaları dolaşarak bütün faturaları okur.
 */
async function readAllDuzenlenenBelgelerRows(page: Page): Promise<TableRowMetadata[]> {
  const allRows: TableRowMetadata[] = [];
  let pageNum = 1;
  const maxPages = 20;

  // Önce ilk sayfaya git
  await page.evaluate(() => {
    const firstBtn = document.querySelector('.csc-table-seek-first:not(.csc-table-paging-btn-disabled)') as HTMLElement | null;
    if (firstBtn && firstBtn.offsetWidth > 0) firstBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  while (pageNum <= maxPages) {
    const currentRows = await readDuzenlenenBelgelerRows(page);
    for (const r of currentRows) {
      if (r.invoiceNo && !allRows.some((existing) => existing.invoiceNo === r.invoiceNo)) {
        allRows.push(r);
      }
    }

    // Sonraki sayfa var mı kontrol et
    const hasNext = await page.evaluate(() => {
      const nextBtn = document.querySelector('.csc-table-seek-next:not(.csc-table-paging-btn-disabled)') as HTMLElement | null;
      if (nextBtn && nextBtn.offsetWidth > 0 && !nextBtn.classList.contains('csc-table-paging-btn-disabled')) {
        nextBtn.click();
        return true;
      }
      return false;
    });

    if (!hasNext) {
      break;
    }

    pageNum++;
    console.log(`📄 GİB Tablosu Sonraki Sayfaya Geçildi (Sayfa ${pageNum})...`);
    await new Promise((r) => setTimeout(r, 1500));
  }

  // İşlem bitince tekrar ilk sayfaya dön
  await page.evaluate(() => {
    const firstBtn = document.querySelector('.csc-table-seek-first:not(.csc-table-paging-btn-disabled)') as HTMLElement | null;
    if (firstBtn && firstBtn.offsetWidth > 0) firstBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  return allRows;
}

/**
 * GİB Tablosunda belirtilen faturayı sayfalar arasında arayıp sadece o faturayı seçer.
 */
async function findAndSelectInvoiceRow(page: Page, invoiceNo: string): Promise<boolean> {
  // Önce ilk sayfaya git
  await page.evaluate(() => {
    const firstBtn = document.querySelector('.csc-table-seek-first:not(.csc-table-paging-btn-disabled)') as HTMLElement | null;
    if (firstBtn && firstBtn.offsetWidth > 0) firstBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  let pageNum = 1;
  const maxPages = 20;

  while (pageNum <= maxPages) {
    const found = await page.evaluate((targetInvoice) => {
      const w = window as any;
      const rows = Array.from(document.querySelectorAll("table tbody tr[rel], tr[rowid], .csc-grid tr[rel]")).filter((r) => {
        return (r as HTMLElement).offsetWidth > 0 && r.querySelector("td.csc-table-select, input[type='checkbox']");
      });

      // Önce tüm checkboxları temizle
      rows.forEach((r) => {
        const c = r.querySelector('td.csc-table-select input[type="checkbox"], input[type="checkbox"]') as HTMLInputElement | null;
        if (c && c.checked) {
          c.click();
          c.checked = false;
          c.dispatchEvent(new Event("change", { bubbles: true }));
          if (w.$) w.$(c).trigger("change");
        }
      });

      const targetRow = rows.find((r) => {
        const invCell = r.querySelector("td:nth-child(2)")?.textContent?.trim() || "";
        return invCell === targetInvoice || r.textContent?.includes(targetInvoice);
      });

      if (targetRow) {
        const cb = targetRow.querySelector('td.csc-table-select input[type="checkbox"], input[type="checkbox"]') as HTMLInputElement | null;
        if (cb) {
          cb.click();
          cb.checked = true;
          cb.dispatchEvent(new Event("change", { bubbles: true }));
          if (w.$) w.$(cb).trigger("change");
          return true;
        }
      }
      return false;
    }, invoiceNo);

    if (found) {
      await new Promise((r) => setTimeout(r, 600));
      return true;
    }

    // Sonraki sayfaya geç
    const hasNext = await page.evaluate(() => {
      const nextBtn = document.querySelector('.csc-table-seek-next:not(.csc-table-paging-btn-disabled)') as HTMLElement | null;
      if (nextBtn && nextBtn.offsetWidth > 0 && !nextBtn.classList.contains('csc-table-paging-btn-disabled')) {
        nextBtn.click();
        return true;
      }
      return false;
    });

    if (!hasNext) break;
    pageNum++;
    await new Promise((r) => setTimeout(r, 1200));
  }

  return false;
}

async function downloadSingleInvoiceZip(
  page: Page,
  invoiceNo: string,
  downloadDir: string
): Promise<{ downloadedZipName: string | null; invoiceHtmlContent: string | null }> {
  // 1. Faturayı tablodaki sayfalar arasında bul ve seç
  const isSelected = await findAndSelectInvoiceRow(page, invoiceNo);
  if (!isSelected) {
    console.warn(`⚠️ Fatura tablodan seçilemedi (İndirme atlanıyor): ${invoiceNo}`);
  }

  await new Promise((r) => setTimeout(r, 600));

  // 2. Mevcut zip dosyalarını ve zamanlarını kaydet
  const filesBefore = new Map<string, number>();
  if (fs.existsSync(downloadDir)) {
    fs.readdirSync(downloadDir)
      .filter((f) => f.endsWith(".zip"))
      .forEach((f) => {
        try {
          filesBefore.set(f, fs.statSync(path.join(downloadDir, f)).mtimeMs);
        } catch {}
      });
  }

  // 3. "İndir" butonuna tıkla
  await page.evaluate(() => {
    const indirBtns = Array.from(document.querySelectorAll('input[value="İndir"], input[rel="indir"], button[rel="indir"]')) as HTMLElement[];
    const visibleIndir = indirBtns.find((b) => b.offsetWidth > 0) || indirBtns[indirBtns.length - 1];
    if (visibleIndir) visibleIndir.click();
  });

  // 4. İndirmeyi bekle
  let downloadedZipName: string | null = null;
  const downloadStart = Date.now();

  while (Date.now() - downloadStart < 25000) {
    await new Promise((r) => setTimeout(r, 800));
    const currentFiles = fs.readdirSync(downloadDir);

    const hasCrDownload = currentFiles.some((f) => f.endsWith(".crdownload") || f.endsWith(".tmp"));
    if (hasCrDownload) continue;

    const newZip = currentFiles.find((f) => {
      if (!f.endsWith(".zip")) return false;
      if (!filesBefore.has(f)) return true;
      try {
        const mtime = fs.statSync(path.join(downloadDir, f)).mtimeMs;
        const prevMtime = filesBefore.get(f) || 0;
        return mtime > prevMtime || mtime >= downloadStart - 1000;
      } catch {
        return false;
      }
    });

    if (newZip) {
      downloadedZipName = newZip;
      break;
    }
  }

  // 5. Satırın işaretini kaldır
  await page.evaluate((targetInvoiceNo) => {
    const w = window as any;
    const rows = Array.from(document.querySelectorAll("table tbody tr[rel], tr[rowid], .csc-grid tr[rel]")).filter((r) => {
      return (r as HTMLElement).offsetWidth > 0 && r.querySelector("td.csc-table-select, input[type='checkbox']");
    });
    const targetRow = rows.find((r) => {
      const invCell = r.querySelector("td:nth-child(2)")?.textContent?.trim() || "";
      return invCell === targetInvoiceNo || r.textContent?.includes(targetInvoiceNo);
    });
    if (targetRow) {
      const cb = targetRow.querySelector('td.csc-table-select input[type="checkbox"], input[type="checkbox"]') as HTMLInputElement | null;
      if (cb && cb.checked) {
        cb.click();
        cb.checked = false;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
        if (w.$) w.$(cb).trigger("change");
      }
    }
  }, invoiceNo);

  // 6. Zip dosyasından HTML içeriğini oku
  let invoiceHtmlContent: string | null = null;
  if (downloadedZipName) {
    const zipFilePath = path.join(downloadDir, downloadedZipName);
    try {
      const zip = new AdmZip(zipFilePath);
      const zipEntries = zip.getEntries();
      for (const entry of zipEntries) {
        if (entry.entryName.endsWith(".html") || entry.entryName.endsWith(".htm")) {
          invoiceHtmlContent = entry.getData().toString("utf8");
          break;
        }
      }
    } catch (e) {
      console.error(`❌ Zip okuma hatası (${downloadedZipName}):`, e);
    }
  }

  return { downloadedZipName, invoiceHtmlContent };
}

async function renderHtmlToPdf(
  browser: Browser,
  htmlContent: string,
  targetPdfPath: string
): Promise<string> {
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(htmlContent, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 600));

  await pdfPage.pdf({
    path: targetPdfPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "5mm",
      right: "5mm",
      bottom: "5mm",
      left: "5mm",
    },
  });

  await pdfPage.close();
  return targetPdfPath;
}

export async function runGibBrowserAutomation(options: GibBrowserOptions) {
  const username = (options.username || process.env.GIB_USERNAME || "").trim();
  const password = (options.password || process.env.GIB_PASSWORD || "").trim();
  const orders = options.orders || [];
  const skipCreation = options.skipCreation ?? false;

  // İndirme ve PDF kayıt klasörlerini ayarla
  const downloadDir = path.join(process.cwd(), "downloads", "gib_zips");
  const pdfOutputDir = path.join(process.cwd(), "downloads", "faturalar");

  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
  if (!fs.existsSync(pdfOutputDir)) fs.mkdirSync(pdfOutputDir, { recursive: true });

  console.log("🚀 GİB Canlı Tarayıcı Otomasyonu başlatılıyor...");
  console.log(`📁 PDF Çıktı Klasörü: ${pdfOutputDir}`);
  console.log(`📋 İşlenecek Sipariş Sayısı: ${orders.length}`);

  const profileDir = path.join(process.cwd(), ".gib_profile");
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const browser: Browser = await puppeteer.launch({
    headless: false, // Ekranda görünür Chrome penceresi
    defaultViewport: null,
    channel: "chrome",
    userDataDir: profileDir,
    args: [
      "--start-maximized",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
    ],
  });

  const pages = await browser.pages();
  const page: Page = pages.length > 0 ? pages[0] : await browser.newPage();

  // Otomatik diyalog/alert pencerelerini onayla
  page.on("dialog", async (dialog) => {
    console.log("💬 GİB Alert:", dialog.message());
    await dialog.accept().catch(() => {});
  });

  // Tarayıcı indirme dizinini ayarla (CDP)
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
  });

  try {
    // 1. GİB e-Arşiv Giriş Ekranına git
    console.log("🌐 GİB e-Arşiv Giriş sayfasına gidiliyor...");
    await page.goto("https://earsivportal.efatura.gov.tr/intragiris.html", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // 2. Kullanıcı adı ve şifreyi yaz
    await page.waitForSelector("#userid", { timeout: 15000 });
    await page.type("#userid", username, { delay: 30 });
    await page.type("#password", password, { delay: 30 });

    // 3. Giriş yap
    console.log("🔑 Giriş yapılıyor...");
    await page.evaluate(() => {
      // @ts-ignore
      if (typeof assosLogin === "function") {
        // @ts-ignore
        assosLogin();
      }
    });

    // 4. Portalın açılmasını bekle (index.jsp)
    console.log("⏳ Ana panelin açılması bekleniyor...");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));

    // Modül Seçiniz -> "e-Arşiv Portal" (MAINTREEMENU) seç
    console.log("📌 Modül Seçiniz -> e-Arşiv Portal seçiliyor...");
    await page.waitForSelector("#gen__1006, select.select-project", { timeout: 20000 });
    await page.evaluate(() => {
      const select = document.querySelector("#gen__1006, select.select-project") as HTMLSelectElement | null;
      if (select) {
        select.value = "MAINTREEMENU";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        // @ts-ignore
        if (typeof window["$"] !== "undefined") window["$"](select).trigger("change");
      }
    });
    await new Promise((r) => setTimeout(r, 2500));

    const downloadedPdfFiles: string[] = [];
    const errors: string[] = [];

    // =========================================================================
    // AŞAMA 1: DÜZENLENEN BELGELERİ SORGULA VE MEVCUT FATURALARI TESPİT ET
    // (Aynı müşteriye bu sipariş için zaten kesilmiş fatura varsa tekrar kesme!)
    // =========================================================================
    await showHelperOverlay(page, {
      icon: "🔍",
      title: "Düzenlenen Belgeler Kontrol Ediliyor...",
      subtitle: "Daha önce bu siparişler için kesilmiş fatura olup olmadığı sorgulanıyor.",
      borderColor: "#3B82F6",
    });

    await openDuzenlenenBelgeler(page);
    await queryDuzenlenenBelgeler(page);

    const initialRows = await readAllDuzenlenenBelgelerRows(page);
    const activeRows = initialRows.filter((r) => !r.isCancelled && r.invoiceNo);

    console.log(`📋 GİB Sisteminde (Tüm Sayfalar) ${activeRows.length} adet aktif fatura bulundu.`);

    // Her sipariş için daha önceden fatura kesilmiş mi kontrol et
    const orderStatuses: {
      order: any;
      alreadyExists: boolean;
      existingInvoiceNo?: string;
      isApproved?: boolean;
      matchedCustomerName?: string;
      pdfPath?: string;
      downloaded?: boolean;
    }[] = [];

    for (let i = 0; i < orders.length; i++) {
      const ord = orders[i];
      const ordCustName = getOrderCustomerFullName(ord);
      const ordNumber = (ord.order_number || "").toString().trim();
      const ordTckn = (ord.tax_number || ord.invoice_address?.taxNumber || "").replace(/\D/g, "");

      console.log(`\n🔎 Sipariş #${ordNumber} (${ordCustName}) için mevcut fatura aranıyor...`);

      // İsim veya TCKN eşleşen aday satırları doğrudan tablodan bul (Zip indirmeden)
      const matchedCand = activeRows.find((r) => {
        if (ordTckn && ordTckn.length === 11 && ordTckn !== "11111111111" && r.vknTckn === ordTckn) {
          return true;
        }
        return isCustomerNameMatch(r.customerName, ordCustName);
      });

      if (matchedCand) {
        console.log(`   ✅ Sipariş #${ordNumber} için MEVCUT FATURA BULUNDU: ${matchedCand.invoiceNo} (${matchedCand.customerName})`);
        console.log(`   ℹ️ Fatura Durumu: ${matchedCand.isApproved ? "Onaylı (İmzalı)" : "Taslak (İmza Bekliyor)"}`);

        orderStatuses.push({
          order: ord,
          alreadyExists: true,
          existingInvoiceNo: matchedCand.invoiceNo,
          isApproved: matchedCand.isApproved,
          matchedCustomerName: matchedCand.customerName,
        });
      } else {
        console.log(`   🆕 Sipariş #${ordNumber} için sistemde önceden kesilmiş fatura yok. Yeni fatura kesilecek.`);
        orderStatuses.push({
          order: ord,
          alreadyExists: false,
        });
      }
    }

    // =========================================================================
    // AŞAMA 2: SADECE YENİ FATURA GEREKEN SİPARİŞLERİ OLUŞTUR
    // =========================================================================
    const ordersToCreate = orderStatuses.filter((s) => !s.alreadyExists).map((s) => s.order);

    if (!skipCreation && ordersToCreate.length > 0) {
      console.log(`\n======================================================`);
      console.log(`✍️ ${ordersToCreate.length} ADET YENİ FATURA KESİLECEK`);
      console.log(`======================================================`);

      for (let i = 0; i < ordersToCreate.length; i++) {
        const order = ordersToCreate[i];
        const orderNumber = order.order_number || order.notes?.match(/#([0-9]+)/)?.[1] || order.id?.substring(0, 8);
        const rawFullName = getOrderCustomerFullName(order) || "Trendyol Müşterisi";

        console.log(`\n📄 [${i + 1}/${ordersToCreate.length}] Fatura Kesiliyor: #${orderNumber} (${rawFullName})`);

        if (options.onProgress) {
          options.onProgress(i + 1, ordersToCreate.length, orderNumber);
        }

        await showHelperOverlay(page, {
          icon: "✍️",
          title: `[${i + 1}/${ordersToCreate.length}] Fatura Kesiliyor: #${orderNumber}`,
          subtitle: `Müşteri: ${rawFullName} - Fatura formu dolduruluyor.`,
          borderColor: "#F59E0B",
        });

        try {
          // Sol menüden 'Belge İşlemleri' -> 'e-Arşiv Fatura (İnteraktif) Oluştur' aç
          await expandAndClickTreeMenu(page, "Fatura (İnteraktif) Oluştur");
          await page.waitForSelector('td[rel="vknTckn"] input, input[rel="vknTckn"], #gen__1033', { timeout: 15000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 1500));

          // Form alanlarını hazırla
          const invoiceAddress = order.invoice_address || order.shipment_address || {};
          const nameWords = rawFullName.split(/\s+/).filter(Boolean);
          let firstName = "";
          let lastName = "";

          if (nameWords.length > 1) {
            lastName = nameWords[nameWords.length - 1];
            firstName = nameWords.slice(0, -1).join(" ");
          } else {
            firstName = nameWords[0] || "Trendyol";
            lastName = "Müşterisi";
          }

          const rawTckn = (order.tax_number || invoiceAddress.taxNumber || "").replace(/\D/g, "");
          const isCorporate = rawTckn.length === 10;
          const finalTckn = rawTckn.length === 11 || rawTckn.length === 10 ? rawTckn : "11111111111";

          const addressParts = [
            invoiceAddress.address1,
            invoiceAddress.address2,
            invoiceAddress.neighborhood,
            invoiceAddress.district,
            invoiceAddress.city,
          ].filter(Boolean);
          const address = addressParts.join(" ") || "Teslimat Adresi";

          const unvan = isCorporate ? (order.buyer?.name || rawFullName).trim() : "";
          const vergiDairesi = isCorporate ? invoiceAddress.taxOffice || "Vergi Dairesi" : "";

          await page.evaluate(
            async ({ finalTckn, isCorporate, unvan, firstName, lastName, vergiDairesi, address, orderNumber }) => {
              function setField(selector: string, val: string) {
                const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
                if (el && val) {
                  el.focus();
                  el.value = val;
                  el.dispatchEvent(new Event("input", { bubbles: true }));
                  el.dispatchEvent(new Event("change", { bubbles: true }));
                  el.dispatchEvent(new Event("blur", { bubbles: true }));
                  // @ts-ignore
                  if (typeof window["$"] !== "undefined") {
                    // @ts-ignore
                    window["$"](el).val(val).trigger("input").trigger("change").trigger("blur");
                  }
                }
              }

              // 1. VKN / TCKN yaz
              setField('td[rel="vknTckn"] input', finalTckn);

              await new Promise((r) => setTimeout(r, 1200));

              // 2. Alıcı Bilgileri
              if (isCorporate) {
                if (unvan) setField('td[rel="aliciUnvan"] input', unvan);
                if (vergiDairesi) setField('td[rel="vergiDairesi"] input', vergiDairesi);
              } else {
                if (firstName) setField('td[rel="aliciAdi"] input', firstName);
                if (lastName) setField('td[rel="aliciSoyadi"] input', lastName);
              }

              // 3. Ülke -> Türkiye seç
              const ulkeSelect = document.querySelector('td[rel="ulke"] select') as HTMLSelectElement | null;
              if (ulkeSelect) {
                ulkeSelect.value = "Türkiye";
                ulkeSelect.dispatchEvent(new Event("change", { bubbles: true }));
                // @ts-ignore
                if (typeof window["$"] !== "undefined") {
                  // @ts-ignore
                  window["$"](ulkeSelect).val("Türkiye").trigger("change");
                }
              }

              // 4. Adres alanını doldur
              if (address) {
                setField('td[rel="bulvarcaddesokak"] textarea', address);
              }

              // 5. Not alanına Trendyol Sipariş No yaz
              setField('div[rel="not"] textarea', `Trendyol Sipariş No: ${orderNumber}`);
            },
            { finalTckn, isCorporate, unvan, firstName, lastName, vergiDairesi, address, orderNumber }
          );

          await new Promise((r) => setTimeout(r, 600));

          // Ürünleri (Mal/Hizmet) Tablosuna Ekle
          const items = order.items || [];
          for (let j = 0; j < items.length; j++) {
            const item = items[j];
            const cleanedName = cleanProductName(item.product_name || "Ürün");
            const quantity = Number(item.quantity) || 1;
            const priceWithVat = Number(item.price) || 0;
            const numPriceWithoutVat = Number((priceWithVat / 1.2).toFixed(2));

            // "Satır Ekle" butonuna tıkla
            await page.evaluate(() => {
              const btn = document.querySelector('input[rel="satirEkle"], input[value="Satır Ekle"]') as HTMLInputElement | null;
              if (btn) btn.click();
            });

            await new Promise((r) => setTimeout(r, 700));

            // Eklenen satırı doldur
            await page.evaluate(
              ({ rowIndex, cleanedName, quantity, numPriceWithoutVat }) => {
                const rows = Array.from(document.querySelectorAll('#gen__1079-b tr[rel], table[rel="malHizmetTable"] tbody tr[rel]'));
                const targetRow = rows[rowIndex] || rows[rows.length - 1];

                if (targetRow) {
                  // 1. Mal / Hizmet adı
                  const nameInput = targetRow.querySelector('input.csc-textbox, td:nth-child(4) input') as HTMLInputElement | null;
                  if (nameInput) {
                    nameInput.value = cleanedName;
                    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
                    nameInput.dispatchEvent(new Event("change", { bubbles: true }));
                    nameInput.dispatchEvent(new Event("blur", { bubbles: true }));
                  }

                  // 2. Miktar
                  const miktarInput = targetRow.querySelector('input.csc-number, td:nth-child(5) input') as HTMLInputElement | null;
                  if (miktarInput) {
                    // @ts-ignore
                    if (typeof window["$"] !== "undefined" && window["$"](miktarInput).data("autoNumeric")) {
                      // @ts-ignore
                      window["$"](miktarInput).autoNumeric("set", quantity);
                    } else {
                      miktarInput.value = String(quantity);
                    }
                    miktarInput.dispatchEvent(new Event("input", { bubbles: true }));
                    miktarInput.dispatchEvent(new Event("change", { bubbles: true }));
                    miktarInput.dispatchEvent(new Event("blur", { bubbles: true }));
                  }

                  // 3. Birim -> Adet (C62)
                  const birimSelect = targetRow.querySelector('select.csc-combobox, td:nth-child(6) select') as HTMLSelectElement | null;
                  if (birimSelect) {
                    birimSelect.value = "C62";
                    birimSelect.dispatchEvent(new Event("change", { bubbles: true }));
                    // @ts-ignore
                    if (typeof window["$"] !== "undefined") window["$"](birimSelect).val("C62").trigger("change");
                  }

                  // 4. Birim Fiyat (KDV Hariç)
                  const fiyatInput = targetRow.querySelector('input.csc-currency, td:nth-child(7) input') as HTMLInputElement | null;
                  if (fiyatInput) {
                    // @ts-ignore
                    if (typeof window["$"] !== "undefined" && window["$"](fiyatInput).data("autoNumeric")) {
                      // @ts-ignore
                      window["$"](fiyatInput).autoNumeric("set", numPriceWithoutVat);
                    } else {
                      fiyatInput.value = numPriceWithoutVat.toFixed(2).replace(".", ",");
                    }
                    fiyatInput.dispatchEvent(new Event("input", { bubbles: true }));
                    fiyatInput.dispatchEvent(new Event("change", { bubbles: true }));
                    fiyatInput.dispatchEvent(new Event("blur", { bubbles: true }));
                    // @ts-ignore
                    if (typeof window["$"] !== "undefined") window["$"](fiyatInput).trigger("change").trigger("blur");
                  }

                  // 5. KDV Oranı -> %20
                  const kdvSelect = targetRow.querySelector('td:nth-child(11) select, td[rel="kdvOrani"] select') as HTMLSelectElement | null;
                  if (kdvSelect) {
                    kdvSelect.value = "20";
                    kdvSelect.dispatchEvent(new Event("change", { bubbles: true }));
                    // @ts-ignore
                    if (typeof window["$"] !== "undefined") window["$"](kdvSelect).val("20").trigger("change");
                  }
                }
              },
              { rowIndex: j, cleanedName, quantity, numPriceWithoutVat }
            );

            await new Promise((r) => setTimeout(r, 500));
          }

          // Faturayı "Oluştur" butonuna basarak kaydet
          await page.evaluate(() => {
            const olusturBtn = document.querySelector('input[rel="olustur"], input[value="Oluştur"]') as HTMLInputElement | null;
            if (olusturBtn) olusturBtn.click();
          });

          await page.waitForSelector('.cs-popup-msg-box input[value="Tamam"], .csc-msgbox input[value="Tamam"], input[value="Tamam"]', { timeout: 10000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 600));

          await page.evaluate(() => {
            const popupBtns = Array.from(
              document.querySelectorAll('.cs-popup-msg-box input[value="Tamam"], .csc-msgbox input[value="Tamam"], input[value="Tamam"]')
            );
            const tamamBtn = popupBtns[popupBtns.length - 1] as HTMLInputElement | null;
            if (tamamBtn) {
              tamamBtn.click();
            } else {
              const closeBtn = document.querySelector(".cs-popup-close-btn") as HTMLElement | null;
              if (closeBtn) closeBtn.click();
            }
          });

          await new Promise((r) => setTimeout(r, 1200));
          console.log(`   ✅ Fatura taslağı başarıyla oluşturuldu: #${orderNumber}`);
        } catch (err) {
          console.error(`❌ Sipariş #${orderNumber} fatura oluşturma hatası:`, err);
          errors.push(`#${orderNumber}: ${err instanceof Error ? err.message : "Fatura oluşturulamadı"}`);
        }
      }
    } else if (ordersToCreate.length === 0) {
      console.log("ℹ️ Tüm siparişlerin faturası zaten mevcut. Yeni fatura kesme adımı atlanıyor.");
    }

    // =========================================================================
    // AŞAMA 3: DÜZENLENEN BELGELERİ AÇ, SORGULA VE GİB İMZA (SMS) YAP
    // =========================================================================
    await openDuzenlenenBelgeler(page);
    await queryDuzenlenenBelgeler(page);

    const currentRows = await readDuzenlenenBelgelerRows(page);
    const activeCurrentRows = currentRows.filter((r) => !r.isCancelled && r.invoiceNo);

    // Bizim işlediğimiz siparişlere ait satırları bul
    const ourTargetRows: { row: TableRowMetadata; order: any }[] = [];

    for (const ord of orders) {
      const ordCustName = getOrderCustomerFullName(ord);
      const ordTckn = (ord.tax_number || ord.invoice_address?.taxNumber || "").replace(/\D/g, "");

      const matchedRow = activeCurrentRows.find((r) => {
        if (ordTckn && ordTckn.length === 11 && ordTckn !== "11111111111" && r.vknTckn === ordTckn) {
          return true;
        }
        return isCustomerNameMatch(r.customerName, ordCustName);
      });

      if (matchedRow) {
        ourTargetRows.push({ row: matchedRow, order: ord });
      }
    }

    console.log(`🎯 Bizim siparişlerimize ait ${ourTargetRows.length} adet fatura satırı eşleşti.`);

    // SADECE ve SADECE Henüz Onaylanmamış (Taslak) ve İptal Edilmemiş olan faturalar için GİB İmza gereklidir!
    const unapprovedTargetRows = ourTargetRows.filter((item) => !item.row.isCancelled && !item.row.isApproved);

    if (unapprovedTargetRows.length > 0) {
      console.log(`\n✍️ ${unapprovedTargetRows.length} adet onay bekleyen fatura seçilip GİB İmza & SMS Onay başlatılıyor...`);

      await showHelperOverlay(page, {
        icon: "✍️",
        title: "GİB İmza & SMS Onay Aşaması",
        subtitle: `${unapprovedTargetRows.length} adet onay bekleyen faturanız seçiliyor. GİB İmza butonuna basılıp SMS onayı başlatılacak...`,
        borderColor: "#3B82F6",
      });

      // 1. Tablodaki TÜM kutucukları temizle
      await page.evaluate(() => {
        const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
        allCheckboxes.forEach((cb) => {
          if (cb.checked) {
            cb.click();
            cb.checked = false;
            cb.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
      });

      await new Promise((r) => setTimeout(r, 600));

      // 2. SADECE onay bekleyen satırları işaretle
      const targetInvoiceNumbers = unapprovedTargetRows.map((u) => u.row.invoiceNo).filter(Boolean);

      await page.evaluate((targetInvoices) => {
        const w = window as any;
        const rows = Array.from(document.querySelectorAll("table tbody tr[rel], tr[rowid], .csc-grid tr[rel]")).filter((r) => {
          return (r as HTMLElement).offsetWidth > 0 && r.querySelector("td.csc-table-select, input[type='checkbox']");
        });

        rows.forEach((r, idx) => {
          const invCell = r.querySelector("td:nth-child(2)")?.textContent?.trim() || "";
          const isTarget = targetInvoices.length === 0 
            ? idx < 10 
            : targetInvoices.includes(invCell) || targetInvoices.some((inv) => r.textContent?.includes(inv));

          if (isTarget) {
            const tds = Array.from(r.querySelectorAll("td"));
            const iptalText = ((tds[7]?.textContent || "") + " " + (r.textContent || "")).toLowerCase();
            const isCancelled = iptalText.includes("iptal") || iptalText.includes("silin");

            if (!isCancelled) {
              const cb = r.querySelector('td.csc-table-select input[type="checkbox"], input[type="checkbox"]') as HTMLInputElement | null;
              if (cb) {
                cb.click();
                cb.checked = true;
                cb.dispatchEvent(new Event("change", { bubbles: true }));
                if (w.$) w.$(cb).trigger("change");
              }
            }
          }
        });
      }, targetInvoiceNumbers);

      await new Promise((r) => setTimeout(r, 800));

      // 3. "GİB İmza" butonuna tıkla
      console.log("✍️ 'GİB İmza' butonuna basılıyor...");
      await page.evaluate(() => {
        const imzaBtns = Array.from(document.querySelectorAll('input[rel="hsmImza"], input[value="GİB İmza"], input[value*="İmza"], button[rel="hsmImza"]')) as HTMLElement[];
        const visibleImza = imzaBtns.find((b) => b.offsetWidth > 0) || imzaBtns[imzaBtns.length - 1];
        if (visibleImza) visibleImza.click();
      });

      // 4. SMS Onay penceresinin açılmasını bekle
      console.log("⏳ SMS Onay açılır penceresi bekleniyor...");
      await page.waitForFunction(
        () => {
          const text = document.body.innerText || "";
          return text.includes("Uyarıyı Okudum") || text.includes("Şifre Gönder") || text.includes("SMS Onay") || text.includes("e-Arşiv Fatura Portalı Bilgilendirme");
        },
        { timeout: 15000 }
      ).catch(() => {});

      await new Promise((r) => setTimeout(r, 1000));

      // 5. "Uyarıyı Okudum :" kutucuğunu işaretle
      console.log("☑️ 'Uyarıyı Okudum :' kutucuğu işaretleniyor...");
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("label, span, div, td, p, b, strong"));
        const uyarElement = elements.find((el) => (el.textContent || "").includes("Uyarıyı Okudum"));
        let checked = false;

        if (uyarElement) {
          const container = uyarElement.closest("div, tr, form, p, table") || uyarElement.parentElement;
          if (container) {
            const cb = container.querySelector("input[type='checkbox']") as HTMLInputElement | null;
            if (cb) {
              cb.click();
              cb.checked = true;
              cb.dispatchEvent(new Event("change", { bubbles: true }));
              checked = true;
            }
          }
        }

        if (!checked) {
          const modalCheckboxes = Array.from(
            document.querySelectorAll(".cs-popup-msg-box input[type='checkbox'], .csc-msgbox input[type='checkbox'], .x-window input[type='checkbox'], div[style*='z-index'] input[type='checkbox']")
          ) as HTMLInputElement[];
          if (modalCheckboxes.length > 0) {
            const lastCb = modalCheckboxes[modalCheckboxes.length - 1];
            lastCb.click();
            lastCb.checked = true;
            lastCb.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      });

      await new Promise((r) => setTimeout(r, 800));

      // 6. "Şifre Gönder" butonuna bas
      console.log("📲 'Şifre Gönder' butonuna basılıyor...");
      await page.evaluate(() => {
        const allBtns = Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit'], a, div, span"));
        const sifreGonderBtn = allBtns.find((el) => {
          const text = (el.textContent || (el as HTMLInputElement).value || "").trim();
          return text.includes("Şifre Gönder");
        });
        if (sifreGonderBtn) {
          (sifreGonderBtn as HTMLElement).click();
        }
      });

      // 7. Kullanıcı için ekrana SMS Onay bilgilendirmesini bas ve bekle
      console.log("⏳ Kullanıcının SMS onay kodunu girmesi bekleniyor...");
      await showHelperOverlay(page, {
        icon: "📲",
        title: "SMS Onay Şifresi Gönderildi!",
        subtitle: `Lütfen telefonunuza gelen SMS onay kodunu GİB penceresindeki kutucuğa girip "Onayla" butonuna basınız.<br/><b>SMS onaylandıktan sonra faturalar indirilip Trendyol'a yüklenecektir.</b>`,
        borderColor: "#10B981",
      });

      // SMS penceresinin tam oturması için bekle
      await new Promise((r) => setTimeout(r, 3000));

      // Kullanıcının SMS kodunu girmesini bekle (Maksimum 180 saniye)
      const startTime = Date.now();
      let isSigned = false;

      while (Date.now() - startTime < 180000) {
        try {
          const checkStatus = await page.evaluate(() => {
            const text = document.body.innerText || "";

            // Ekranda "Tamam" veya başarı mesajı varsa kapat
            const successPopups = Array.from(
              document.querySelectorAll('.cs-popup-msg-box input[value="Tamam"], .csc-msgbox input[value="Tamam"]')
            ) as HTMLInputElement[];
            if (successPopups.length > 0) {
              successPopups[successPopups.length - 1].click();
              return { isClosed: true, success: true };
            }

            // SMS girişi veya şifre penceresi hala açık mı?
            const isStillWaiting =
              text.includes("Doğrulama Kodu") ||
              text.includes("Şifre Gönder") ||
              text.includes("SMS Onay") ||
              text.includes("Telefonunuza Gönderilen") ||
              text.includes("Onay Kodu");

            return { isClosed: !isStillWaiting, success: !isStillWaiting };
          });

          if (checkStatus.isClosed) {
            isSigned = true;
            break;
          }
        } catch {}

        await new Promise((r) => setTimeout(r, 2000));
      }

      if (!isSigned) {
        console.error("❌ SMS onay süresi doldu veya onay tamamlanmadı. İptal ediliyor.");
        await showHelperOverlay(page, {
          icon: "⚠️",
          title: "SMS Onayı Tamamlanamadı!",
          subtitle: "SMS onayı yapılmadığı için faturalar indirilmedi ve Trendyol'a yüklenmedi.",
          borderColor: "#EF4444",
        });
        throw new Error("GİB SMS onayı yapılmadı. İşlem güvenlik nedeniyle durduruldu.");
      }

      console.log("✅ SMS onayı başarıyla tamamlandı!");
      await new Promise((r) => setTimeout(r, 2500));

      // SMS sonrası listeyi tekrar sorgula
      await openDuzenlenenBelgeler(page);
      await queryDuzenlenenBelgeler(page);
    } else {
      console.log("ℹ️ Fatura kesme veya imza adımı gerekmedi.");
    }

    // =========================================================================
    // AŞAMA 4: SADECE HEDEF SİPARİŞLERE AİT ONAYLI / İMZALI FATURALARI İNDİR VE PDF'E DÖNÜŞTÜR
    // (İptal edilen, silinen veya onaylanmamış faturalar KESİNLİKLE indirilmez!)
    // =========================================================================
    console.log(`\n======================================================`);
    console.log(`📥 SADECE ONAYLI VE GEÇERLİ FATURALAR İNDİRİLİYOR`);
    console.log(`======================================================`);

    await showHelperOverlay(page, {
      icon: "📥",
      title: "Onaylı Faturalar İndiriliyor...",
      subtitle: "Sadece onaylanmış/imzalanmış ve geçerli olan faturalar tek tek indirilip PDF formatına dönüştürülüyor.",
      borderColor: "#38BDF8",
    });

    const finalRows = await readAllDuzenlenenBelgelerRows(page);
    // SADECE İptal Edilmemiş olan geçerli faturalar
    const finalActiveRows = finalRows.filter((r) => !r.isCancelled && r.invoiceNo);

    console.log(`📋 Tabloda (Tüm Sayfalar) ${finalActiveRows.length} adet geçerli fatura mevcut.`);

    for (let i = 0; i < orders.length; i++) {
      const ord = orders[i];
      const ordCustName = getOrderCustomerFullName(ord);
      const ordNumber = (ord.order_number || "").toString().trim();
      const ordTckn = (ord.tax_number || ord.invoice_address?.taxNumber || "").replace(/\D/g, "");

      // Bu sipariş için eşleşen satırı bul
      const matchedRow = finalActiveRows.find((r) => {
        if (ordTckn && ordTckn.length === 11 && ordTckn !== "11111111111" && r.vknTckn === ordTckn) {
          return true;
        }
        return isCustomerNameMatch(r.customerName, ordCustName);
      });

      if (!matchedRow) {
        console.warn(`⚠️ Sipariş #${ordNumber} (${ordCustName}) için fatura satırı bulunamadı. İndirme atlanıyor.`);
        continue;
      }

      // PDF klasöründe bu faturanın PDF'i zaten var mı kontrol et (Tekrar indirmemek için)
      const safeName = sanitizeFilename(matchedRow.customerName || ordCustName || "Fatura");
      const possiblePdf1 = path.join(pdfOutputDir, `${safeName}.pdf`);
      const possiblePdf2 = path.join(pdfOutputDir, `${safeName}_${matchedRow.invoiceNo}.pdf`);

      if (fs.existsSync(possiblePdf1)) {
        if (!downloadedPdfFiles.includes(possiblePdf1)) downloadedPdfFiles.push(possiblePdf1);
        console.log(`ℹ️ [${ordCustName}] PDF faturası klasörde zaten mevcut (${path.basename(possiblePdf1)}). Yeniden indirilmiyor.`);
        continue;
      }
      if (fs.existsSync(possiblePdf2)) {
        if (!downloadedPdfFiles.includes(possiblePdf2)) downloadedPdfFiles.push(possiblePdf2);
        console.log(`ℹ️ [${ordCustName}] PDF faturası klasörde zaten mevcut (${path.basename(possiblePdf2)}). Yeniden indirilmiyor.`);
        continue;
      }

      console.log(`\n⬇️ [${i + 1}/${orders.length}] İndiriliyor: ${matchedRow.customerName} (${matchedRow.invoiceNo})`);

      await showHelperOverlay(page, {
        icon: "⬇️",
        title: `[${i + 1}/${orders.length}] İndiriliyor (Onaylı): ${matchedRow.customerName}`,
        subtitle: `Fatura No: ${matchedRow.invoiceNo} - Zip indiriliyor ve PDF yapılıyor.`,
        borderColor: "#F59E0B",
      });

      const { downloadedZipName, invoiceHtmlContent } = await downloadSingleInvoiceZip(page, matchedRow.invoiceNo, downloadDir);

      if (invoiceHtmlContent) {
        const customerNameFromHtml = extractCustomerNameFromHtml(invoiceHtmlContent, matchedRow.customerName);
        const resolvedName = sanitizeFilename(customerNameFromHtml || matchedRow.customerName || ordCustName || "Fatura");

        let targetPdfPath = path.join(pdfOutputDir, `${resolvedName}.pdf`);
        if (fs.existsSync(targetPdfPath)) {
          targetPdfPath = path.join(pdfOutputDir, `${resolvedName}_${matchedRow.invoiceNo}.pdf`);
        }

        await renderHtmlToPdf(browser, invoiceHtmlContent, targetPdfPath);
        if (!downloadedPdfFiles.includes(targetPdfPath)) {
          downloadedPdfFiles.push(targetPdfPath);
        }
        console.log(`✅ Onaylı PDF Başarıyla Kaydedildi: ${targetPdfPath}`);
      } else {
        console.warn(`⚠️ #${matchedRow.invoiceNo} için fatura HTML içeriği alınamadı.`);
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    // =========================================================================
    // AŞAMA 5: BİTİŞ VE BİLGİLENDİRME
    // =========================================================================
    console.log(`\n🎉 BÜTÜN İŞLEMLER TAMAMLANDI! ${downloadedPdfFiles.length} adet PDF faturası hazırlandı.`);

    await showHelperOverlay(page, {
      icon: "🎉",
      title: `İşlem Başarıyla Tamamlandı! (${downloadedPdfFiles.length} Adet PDF)`,
      subtitle: `Kayıt Yeri: <b>${pdfOutputDir}</b><br/>Gereksiz diğer faturalar elendi, sadece ilgili faturalar hazırlandı.`,
      borderColor: "#10B981",
    });

    // =========================================================================
    // AŞAMA 6: TRENDYOL PARTNER FATURA YÜKLEME (AYRI SEKMEDE AÇILIR)
    // GİB oturumu sekmede açık tutulur, Trendyol yeni sekmede çalışır!
    // =========================================================================
    let trendyolResult: { success: boolean; uploadedCount: number } | null = null;
    let returnedCustomers: string[] = [];

    if (!options.skipTrendyolUpload) {
      console.log("\n========================================================");
      console.log("🚀 TRENDYOL İŞLEMLERİ İÇİN YAN SEKME AÇILIYOR...");
      console.log("========================================================");

      const trendyolPage = await browser.newPage();
      await trendyolPage.bringToFront();

      try {
        if (downloadedPdfFiles.length > 0) {
          console.log("🚀 GİB Faturaları Hazır! Trendyol Partner Yüklemesi Başlatılıyor...");
          trendyolResult = await uploadInvoicesToTrendyol({
            page: trendyolPage,
            browser,
            pdfOutputDir,
            pdfFiles: downloadedPdfFiles,
            username: options.trendyolUsername || process.env.TRENDYOL_USERNAME || "",
            password: options.trendyolPassword || process.env.TRENDYOL_PASSWORD || "",
          });
        }

        // =========================================================================
        // AŞAMA 7: TRENDYOL İADELERİ KONTROL ET (TRENDYOL SEKMESİNDE)
        // =========================================================================
        console.log("\n========================================================");
        console.log("🔄 TRENDYOL İADELERİ KONTROL EDİLİYOR...");
        console.log("========================================================");
        returnedCustomers = await getTrendyolAcceptedClaims(trendyolPage);

      } catch (trendyolErr) {
        console.error("❌ Trendyol işlemleri hatası:", trendyolErr);
        errors.push(`Trendyol Hatası: ${trendyolErr instanceof Error ? trendyolErr.message : "Hata"}`);
      } finally {
        // Trendyol işlemleri bitince sekmesini kapat ve GİB sekmesini öne getir
        await trendyolPage.close().catch(() => {});
        await page.bringToFront().catch(() => {});
      }
    }

    // =========================================================================
    // AŞAMA 8: GİB SEKEMESİNE DÖNÜP İADE EDİLENLER İÇİN İPTAL TALEBİ OLUŞTUR
    // (GİB sekmesi zaten açık ve oturumu aktif!)
    // =========================================================================
    let cancelledInvoicesCount = 0;
    if (returnedCustomers && returnedCustomers.length > 0) {
      try {
        await page.bringToFront().catch(() => {});
        cancelledInvoicesCount = await cancelGibInvoicesForReturnedOrders(page, returnedCustomers);
      } catch (claimErr) {
        console.error("⚠️ GİB fatura iptal hatası:", claimErr);
        errors.push(`İade Fatura İptal Hatası: ${claimErr instanceof Error ? claimErr.message : "Hata"}`);
      }
    } else {
      console.log("ℹ️ Trendyol'da kabul edilen iade bulunamadı veya kontrol atlandı.");
    }

    // Final Kapanış Overlay'i
    await showHelperOverlay(page, {
      icon: "🎉",
      title: "Tüm İşlemler Başarıyla Tamamlandı!",
      subtitle: `Yüklenen Fatura: ${trendyolResult?.uploadedCount || downloadedPdfFiles.length}<br/>İptal Edilen İade Faturası: ${cancelledInvoicesCount}`,
      borderColor: "#10B981",
    });

    return {
      success: true,
      successCount: downloadedPdfFiles.length,
      failCount: errors.length,
      errors,
      pdfOutputDir,
      downloadedPdfs: downloadedPdfFiles,
      trendyolUploadedCount: trendyolResult?.uploadedCount || 0,
      cancelledInvoicesCount,
    };
  } catch (error) {
    console.error("❌ Tarayıcı otomasyon hatası:", error);
    throw error;
  }
}

/**
 * GİB Düzenlenen Belgeler tablosunda belirtilen müşterilere ait faturaları bulup TEK TEK İptal Talebi Oluşturur.
 */
export async function cancelGibInvoicesForReturnedOrders(
  page: Page,
  returnedCustomers: string[]
): Promise<number> {
  if (!returnedCustomers || returnedCustomers.length === 0) {
    return 0;
  }

  console.log("\n========================================================");
  console.log("🛑 GİB İADE EDİLEN SİPARİŞLERİN FATURA İPTAL İŞLEMİ BAŞLADI");
  console.log("========================================================");

  // GİB sekmesini öne getir
  await page.bringToFront().catch(() => {});

  await openDuzenlenenBelgeler(page);
  await queryDuzenlenenBelgeler(page);

  const currentRows = await readAllDuzenlenenBelgelerRows(page);
  console.log(`📋 GİB tablosunda (Tüm Sayfalar) ${currentRows.length} adet fatura taranıyor...`);

  // İptal edilmemiş ve iade edilen kişilerle eşleşen faturaları tespit et
  const matchedInvoicesToCancel: { invoiceNo: string; customerName: string }[] = [];

  for (const returnedCust of returnedCustomers) {
    const matched = currentRows.find((r) => {
      if (r.isCancelled) return false;
      return isCustomerNameMatch(r.customerName, returnedCust);
    });

    if (matched && !matchedInvoicesToCancel.some((m) => m.invoiceNo === matched.invoiceNo)) {
      matchedInvoicesToCancel.push({
        invoiceNo: matched.invoiceNo,
        customerName: matched.customerName,
      });
    }
  }

  if (matchedInvoicesToCancel.length === 0) {
    console.log("ℹ️ İade edilen kişilere ait GİB sisteminde aktif/iptal edilecek fatura bulunamadı.");
    return 0;
  }

  console.log(`🎯 İptal edilecek ${matchedInvoicesToCancel.length} adet fatura bulundu:`);
  matchedInvoicesToCancel.forEach((inv, i) => console.log(`   [${i + 1}] ${inv.customerName} (${inv.invoiceNo})`));

  let cancelledCount = 0;

  for (let i = 0; i < matchedInvoicesToCancel.length; i++) {
    const item = matchedInvoicesToCancel[i];
    console.log(`\n🛑 [${i + 1}/${matchedInvoicesToCancel.length}] İptal Talebi Oluşturuluyor: ${item.customerName} (${item.invoiceNo})`);

    await showHelperOverlay(page, {
      icon: "🛑",
      title: `[${i + 1}/${matchedInvoicesToCancel.length}] Fatura İptal Ediliyor: ${item.customerName}`,
      subtitle: `Fatura No: ${item.invoiceNo}<br/>İptal gerekçesi: "İade edilen ürün"`,
      borderColor: "#EF4444",
    });

    // Sayfalar arasında gezip faturayı bul ve tekil olarak işaretle
    const isSelected = await findAndSelectInvoiceRow(page, item.invoiceNo);
    if (!isSelected) {
      console.warn(`⚠️ Fatura tablodan seçilemedi: ${item.invoiceNo}`);
      continue;
    }

    await new Promise((r) => setTimeout(r, 800));

    // 3. "İptal Talebi Oluştur" butonuna tıkla
    console.log("🔘 'İptal Talebi Oluştur' butonuna basılıyor...");
    await page.evaluate(() => {
      const iptalBtns = Array.from(
        document.querySelectorAll('input[rel="iptalTalebiOlustur"], input[value="İptal Talebi Oluştur"], button[rel="iptalTalebiOlustur"]')
      ) as HTMLElement[];
      const visibleBtn = iptalBtns.find((b) => b.offsetWidth > 0) || iptalBtns[iptalBtns.length - 1];
      if (visibleBtn) visibleBtn.click();
    });

    // 4. Modal pencerenin açılmasını bekle
    console.log("⏳ İptal modal penceresi bekleniyor...");
    await page.waitForFunction(() => {
      const modal = document.querySelector('.cs-popup-window, div[rel*="popup"], textarea.csc-textarea');
      return modal !== null && (modal as HTMLElement).offsetWidth > 0;
    }, { timeout: 15000 }).catch(() => {});

    await new Promise((r) => setTimeout(r, 1000));

    // 5. Modal içini doldur: Gerekçe textarea -> "İade edilen ürün", "Uyarıyı Okudum" checkbox -> işaretle
    console.log("✍️ İptal gerekçesi yazılıyor ve uyarı onaylanıyor...");
    await page.evaluate(() => {
      // 1. Textarea
      const textarea = document.querySelector(
        '.cs-popup-window textarea, textarea.csc-textarea, div[rel="aciklama"] textarea, textarea'
      ) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        textarea.value = "İade edilen ürün";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
        textarea.dispatchEvent(new Event("blur", { bubbles: true }));
        // @ts-ignore
        if (typeof window["$"] !== "undefined") {
          // @ts-ignore
          window["$"](textarea).val("İade edilen ürün").trigger("input").trigger("change").trigger("blur");
        }
      }

      // 2. Uyarıyı Okudum Checkbox
      const elements = Array.from(document.querySelectorAll("label, span, div, td, p, b, strong"));
      const uyarElement = elements.find((el) => (el.textContent || "").includes("Uyarıyı Okudum"));
      let checked = false;

      if (uyarElement) {
        const container = uyarElement.closest("div, tr, form, p, table") || uyarElement.parentElement;
        if (container) {
          const cb = container.querySelector("input[type='checkbox']") as HTMLInputElement | null;
          if (cb) {
            cb.click();
            cb.checked = true;
            cb.dispatchEvent(new Event("change", { bubbles: true }));
            checked = true;
          }
        }
      }

      if (!checked) {
        const modalCheckboxes = Array.from(
          document.querySelectorAll('.cs-popup-window input[type="checkbox"], div[rel="onayCheckbox"] input, .csc-checkbox__container input')
        ) as HTMLInputElement[];
        if (modalCheckboxes.length > 0) {
          const lastCb = modalCheckboxes[modalCheckboxes.length - 1];
          lastCb.click();
          lastCb.checked = true;
          lastCb.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });

    await new Promise((r) => setTimeout(r, 1000));

    // 6. "İptal Talebi Oluştur" onay butonuna tıkla
    console.log("🚀 Modal içindeki 'İptal Talebi Oluştur' butonuna basılıyor...");
    await page.evaluate(() => {
      const confirmBtns = Array.from(
        document.querySelectorAll(
          '.cs-popup-window input[rel="iptalOlustur"], .cs-popup-window input[value="İptal Talebi Oluştur"], input[rel="iptalOlustur"]'
        )
      ) as HTMLInputElement[];
      const btn = confirmBtns.find((b) => b.offsetWidth > 0) || confirmBtns[confirmBtns.length - 1];
      if (btn) {
        btn.removeAttribute("disabled");
        btn.disabled = false;
        btn.click();
      }
    });

    // 7. Varsa başarı / Tamam popup'ını onayla ve kapat
    await page.waitForSelector('.cs-popup-msg-box input[value="Tamam"], .csc-msgbox input[value="Tamam"], input[value="Tamam"]', { timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 800));

    await page.evaluate(() => {
      const popupBtns = Array.from(
        document.querySelectorAll('.cs-popup-msg-box input[value="Tamam"], .csc-msgbox input[value="Tamam"], input[value="Tamam"]')
      );
      const tamamBtn = popupBtns[popupBtns.length - 1] as HTMLInputElement | null;
      if (tamamBtn) {
        tamamBtn.click();
      } else {
        const closeBtn = document.querySelector(".cs-popup-close-btn") as HTMLElement | null;
        if (closeBtn) closeBtn.click();
      }
    });

    console.log(`✅ ${item.customerName} (${item.invoiceNo}) için İptal Talebi başarıyla oluşturuldu!`);
    cancelledCount++;
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n🎉 Toplam ${cancelledCount} adet iade faturası için iptal talebi oluşturuldu.`);
  return cancelledCount;
}

