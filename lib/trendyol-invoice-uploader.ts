import fs from "fs";
import path from "path";
import { Page, Browser } from "puppeteer";

export interface TrendyolUploadOptions {
  page: Page;
  browser?: Browser;
  pdfOutputDir?: string;
  pdfFiles?: string[];
  username?: string;
  password?: string;
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

/**
 * Türkçe karakterleri normalize edip karşılaştırma için sadeleştirir
 */
function normalizeName(name: string): string {
  return cleanCustomerName(name)
    .toLocaleLowerCase("tr-TR")
    .replace(/[\s\-_.,]+/g, " ")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

/**
 * İndirilen PDF dosyaları arasından müşteri adına en uygun olanı bulur
 */
function findMatchingPdf(customerName: string, pdfDir: string): string | null {
  if (!fs.existsSync(pdfDir)) return null;

  const files = fs.readdirSync(pdfDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  const normalizedTarget = normalizeName(customerName);

  // 1. Birebir veya tam içeren eşleşme
  for (const file of files) {
    const baseName = path.basename(file, path.extname(file));
    const normalizedFile = normalizeName(baseName);

    if (
      normalizedFile === normalizedTarget ||
      normalizedFile.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedFile)
    ) {
      return path.join(pdfDir, file);
    }
  }

  // 2. İsim ve soyismin kelimelerinin büyük çoğunluğunun eşleşmesi
  const targetWords = normalizedTarget.split(" ").filter((w) => w.length > 1);
  for (const file of files) {
    const baseName = path.basename(file, path.extname(file));
    const normalizedFile = normalizeName(baseName);

    const matches = targetWords.filter((w) => normalizedFile.includes(w));
    if (matches.length >= 2 || (targetWords.length === 1 && matches.length === 1)) {
      return path.join(pdfDir, file);
    }
  }

  return null;
}

/**
 * Trendyol Partner sayfasına giriş yapıp "Faturası Olmayan" siparişlere faturaları yükler
 */
export async function uploadInvoicesToTrendyol(options: TrendyolUploadOptions) {
  const { page } = options;
  const username = options.username || process.env.TRENDYOL_USERNAME || "";
  const password = options.password || process.env.TRENDYOL_PASSWORD || "";
  const pdfDir = options.pdfOutputDir || path.join(process.cwd(), "downloads", "faturalar");

  console.log("\n========================================================");
  console.log("🟠 TRENDYOL PARTNER FATURA YÜKLEME OTOMASYONU BAŞLADI");
  console.log("========================================================");

  const targetUrl = "https://partner.trendyol.com/orders/shipment-packages/delivered?invoiceStatuses=NotInvoiced,Rejected,Received&page=0";

  // 1. Doğrudan Faturası Olmayanlar Sipariş Sayfasına Git
  console.log("🌐 Doğrudan 'Faturası Olmayan' Teslim Edilen Siparişler sayfasına gidiliyor...");
  await page.goto(targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 35000,
  }).catch((e) => console.warn("⚠️ Sayfa yükleme uyarısı:", e.message));

  // Sayfanın veya login ekranının oturmasını bekle
  await page.waitForSelector("tbody tr, input[name='email'], .login-form-wrapper, button[data-testid='DELIVERED_TAB_TRIGGER']", { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  const currentUrl = page.url();
  console.log(`📌 Mevcut URL: ${currentUrl}`);

  // Eğer oturum kapalıysa ve login sayfasına yönlendiyse giriş yap
  if (currentUrl.includes("/auth/login") || currentUrl.includes("/auth/")) {
    console.log("🔑 Oturum kapalı, Trendyol giriş bilgileri dolduruluyor...");

    // E-posta sekmesinin seçili olduğunu doğrula
    await page.evaluate(() => {
      const emailTab = document.querySelector('bl-tab[name="EMAIL"]') as HTMLElement | null;
      if (emailTab) emailTab.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // E-posta yaz
    await page.waitForSelector('input[name="email"], input[placeholder*="E-Posta"]', { timeout: 15000 });
    await page.evaluate(() => {
      const el = document.querySelector('input[name="email"], input[placeholder*="E-Posta"]') as HTMLInputElement | null;
      if (el) el.value = "";
    });
    await page.type('input[name="email"], input[placeholder*="E-Posta"]', username, { delay: 30 });

    // Şifre yaz
    await page.waitForSelector('.password input, input[placeholder*="Şifre"], input[type="password"]', { timeout: 15000 });
    await page.evaluate(() => {
      const el = document.querySelector('.password input, input[placeholder*="Şifre"], input[type="password"]') as HTMLInputElement | null;
      if (el) el.value = "";
    });
    await page.type('.password input, input[placeholder*="Şifre"], input[type="password"]', password, { delay: 30 });

    await new Promise((r) => setTimeout(r, 500));

    // Giriş Yap butonuna tıkla
    console.log("🚀 'Giriş Yap' butonuna basılıyor...");
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]') as HTMLElement | null;
      if (submitBtn) submitBtn.click();
    });

    // Mobil Onay Bildirimini bekle
    console.log("⏳ Mobil Onay Bildirimi kontrol ediliyor...");
    await new Promise((r) => setTimeout(r, 3000));

    const isWaitingForMobileOtp = await page.evaluate(() => {
      const bodyText = document.body?.innerText || "";
      return (
        bodyText.includes("Mobil Onay Bildirimi Gönderildi") ||
        bodyText.includes("Akıllı bildirim cihazı") ||
        document.querySelector(".mobile-push-notification-modal, .otp-modal") !== null
      );
    });

    if (isWaitingForMobileOtp) {
      console.log("📲 Mobil onay bildirimi gönderildi!");
      console.log("📱 LÜTFEN TELEFONUNUZDAN TRENDYOL BİLDİRİMİNİ ONAYLAYINIZ...");

      // Ekranda bilgilendirme kutusu göster
      await page.evaluate(() => {
        const helper = document.createElement("div");
        helper.id = "trendyol-helper-box";
        helper.style.position = "fixed";
        helper.style.top = "15px";
        helper.style.left = "50%";
        helper.style.transform = "translateX(-50%)";
        helper.style.zIndex = "9999999";
        helper.style.backgroundColor = "#F97316";
        helper.style.color = "#FFFFFF";
        helper.style.padding = "14px 24px";
        helper.style.borderRadius = "14px";
        helper.style.boxShadow = "0 8px 30px rgba(0,0,0,0.3)";
        helper.style.fontWeight = "bold";
        helper.style.fontSize = "15px";
        helper.style.display = "flex";
        helper.style.alignItems = "center";
        helper.style.gap = "12px";
        helper.innerHTML = `
          <div style="font-size: 26px;">📱</div>
          <div>
            <div>Trendyol Mobil Onayı Bekleniyor!</div>
            <div style="font-size: 12px; font-weight: normal; opacity: 0.95;">
              Lütfen telefonunuzdaki bildirimden "Onayla" seçeneğine basınız.
            </div>
          </div>
        `;
        document.body.appendChild(helper);
      }).catch(() => {});

      // Mobil onayın tamamlanmasını bekle (Maksimum 180 saniye)
      const waitStart = Date.now();
      while (Date.now() - waitStart < 180000) {
        await new Promise((r) => setTimeout(r, 1500));
        const url = page.url();

        // Eğer login sayfasından ayrıldıysa onay tamamlanmıştır
        if (url.includes("/dashboard") || (!url.includes("/auth/login") && !url.includes("/auth/"))) {
          console.log("✅ Mobil onay tamamlandı (URL değişti)!");
          break;
        }

        let hasModal = false;
        try {
          hasModal = await page.evaluate(() => {
            if (!document.body) return false;
            const bodyText = document.body.innerText || "";
            return (
              bodyText.includes("Mobil Onay Bildirimi Gönderildi") ||
              bodyText.includes("Akıllı bildirim cihazı") ||
              document.querySelector(".mobile-push-notification-modal, .otp-modal") !== null
            );
          });
        } catch {
          hasModal = true;
        }

        if (!hasModal) {
          console.log("✅ Mobil onay tamamlandı (Modal kapandı)!");
          break;
        }
      }

      await page.evaluate(() => {
        const box = document.getElementById("trendyol-helper-box");
        if (box) box.remove();
      }).catch(() => {});
    }

    // Giriş tamamlandıktan sonra doğrudan hedef sayfaya yönel
    console.log("📦 Giriş yapıldı, doğrudan Faturası Olmayanlar sayfasına gidiliyor...");
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 35000,
    }).catch((e) => console.warn("⚠️ Sayfa yükleme uyarısı:", e.message));
    await new Promise((r) => setTimeout(r, 3000));
  } else {
    console.log("✅ Zaten Trendyol oturumu açık, doğrudan siparişler yüklendi.");
  }

  // Varsa ekrandaki anket / duyuru / çerez pencerelerini kapat
  await page.evaluate(() => {
    const closeBtns = Array.from(
      document.querySelectorAll(
        '.modal-close, [aria-label="close"], bl-button[icon="close"], .chakra-modal__close-btn'
      )
    ) as HTMLElement[];
    closeBtns.forEach((b) => b.click());

    // Çerez onayı
    const btns = Array.from(document.querySelectorAll("button"));
    const accept = btns.find(
      (b) => (b.textContent || "").trim() === "Kabul Et" || (b.textContent || "").trim() === "Reddet"
    );
    if (accept) accept.click();
  }).catch(() => {});

  // Tablonun yüklenmesini bekle
  console.log("⏳ 'Faturası Olmayan' sipariş tablosunun yüklenmesi bekleniyor...");
  await page.waitForSelector("tbody tr", { timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  // "Her Sayfada 100 Ürün" Seç
  await page.evaluate(() => {
    const blSelects = Array.from(document.querySelectorAll("bl-select"));
    for (const sel of blSelects) {
      const options = Array.from(sel.querySelectorAll("bl-select-option"));
      const opt100 = options.find((opt) => (opt.textContent || "").includes("100"));
      if (opt100) {
        (opt100 as HTMLElement).click();
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  });
  await new Promise((r) => setTimeout(r, 2000));

  // 4. FATURA YÜKLEME DÖNGÜSÜ
  // Tablo her fatura yüklendiğinde yenileneceğinden daima güncel ilk satırdan devam edeceğiz.
  let uploadedCount = 0;
  const processedCustomers = new Set<string>();
  let hasMoreRows = true;
  const maxIterations = 50;
  let iteration = 0;

  console.log(`📂 PDF faturaları taranıyor: ${pdfDir}`);

  while (hasMoreRows && iteration < maxIterations) {
    iteration++;

    // Tablodaki faturası olmayan ve henüz işlenmemiş sıradaki satırı bul
    const rowInfo = await page.evaluate((alreadyProcessed: string[]) => {
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      const processedSet = new Set(alreadyProcessed);

      for (const row of rows) {
        // Alıcı kolonunu bul
        const customerTd = row.querySelector('td[data-testid="customer"], td:nth-child(3)');
        const customerName = (customerTd?.textContent || "").trim();

        // Fatura İşlemleri butonunu bul
        const rowBtns = Array.from(row.querySelectorAll("button"));
        const invoiceActionsBtn = rowBtns.find((b) => 
          b.getAttribute("data-testid") === "invoice-actions-popover-trigger" ||
          (b.textContent || "").includes("Fatura İşlemleri")
        );

        if (customerName && invoiceActionsBtn && !processedSet.has(customerName)) {
          return {
            customerName,
            hasButton: true,
          };
        }
      }
      return null;
    }, Array.from(processedCustomers));

    if (!rowInfo || !rowInfo.customerName) {
      console.log("🏁 Faturası olmayan başka satır bulunamadı veya tüm faturalar yüklendi.");
      hasMoreRows = false;
      break;
    }

    const currentCustomer = rowInfo.customerName;
    console.log(`\n--------------------------------------------------------`);
    console.log(`👤 [${iteration}] Sıradaki Alıcı: ${currentCustomer}`);

    // PDF dosyasını bul
    const matchingPdfPath = findMatchingPdf(currentCustomer, pdfDir);

    if (!matchingPdfPath) {
      console.warn(`⚠️ Eşleşen PDF bulunamadı: ${currentCustomer} (Klasörde bu isimde PDF yok)`);
      processedCustomers.add(currentCustomer);
      continue;
    }

    console.log(`📄 Eşleşen PDF bulundu: ${path.basename(matchingPdfPath)}`);

    try {
      // 1. "Fatura İşlemleri" butonuna tıkla
      console.log("🔘 'Fatura İşlemleri' menüsü açılıyor...");
      const clickedPopover = await page.evaluate((targetName) => {
        const rows = Array.from(document.querySelectorAll("tbody tr"));
        for (const row of rows) {
          const customerTd = row.querySelector('td[data-testid="customer"], td:nth-child(3)');
          const name = (customerTd?.textContent || "").trim();
          if (name === targetName || name.includes(targetName) || targetName.includes(name)) {
            const rowBtns = Array.from(row.querySelectorAll("button"));
            const btn = rowBtns.find((b) => 
              b.getAttribute("data-testid") === "invoice-actions-popover-trigger" ||
              (b.textContent || "").includes("Fatura İşlemleri")
            );
            if (btn) {
              btn.click();
              return true;
            }
          }
        }
        return false;
      }, currentCustomer);

      if (!clickedPopover) {
        console.warn(`⚠️ '${currentCustomer}' için Fatura İşlemleri butonu tıklanamadı.`);
        processedCustomers.add(currentCustomer);
        continue;
      }

      await new Promise((r) => setTimeout(r, 1000));

      // 2. Açılan popover menüde "Fatura Yükle" butonunu bul
      console.log("📤 'Fatura Yükle' butonuna basılıyor...");
      const hasUploadBtn = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('.chakra-popover__content button, [role="dialog"] button, button'));
        const uploadBtn = buttons.find((b) => (b.textContent || "").trim().includes("Fatura Yükle"));
        if (uploadBtn) {
          (uploadBtn as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (!hasUploadBtn) {
        console.warn("⚠️ 'Fatura Yükle' butonu bulunamadı.");
        processedCustomers.add(currentCustomer);
        continue;
      }

      await new Promise((r) => setTimeout(r, 1500));

      // 3. Dosya yükleme (input[type="file"]) alanını bul ve PDF'i seç
      console.log(`📎 PDF dosyası yükleniyor: ${matchingPdfPath}`);
      await page.waitForSelector('input[type="file"]', { timeout: 10000 });
      const fileInput = await page.$('input[type="file"]');

      if (fileInput) {
        await fileInput.uploadFile(matchingPdfPath);
        await new Promise((r) => setTimeout(r, 1500));

        // 4. Modal içindeki "Faturayı Yükle" onay butonuna tıkla
        console.log("🟠 'Faturayı Yükle' onay butonuna basılıyor...");
        await page.evaluate(() => {
          const directBtn = document.querySelector('button.css-c8frfc') as HTMLElement | null;
          if (directBtn) {
            directBtn.click();
            return;
          }

          const modalBtns = Array.from(
            document.querySelectorAll(
              '[role="dialog"] button, .chakra-modal__content button, .modal button, button'
            )
          ) as HTMLElement[];

          const confirmBtn = modalBtns.find((b) => {
            const txt = (b.textContent || "").trim();
            return (
              txt.includes("Faturayı Yükle") ||
              txt.includes("Fatura Yükle") ||
              txt.includes("Yükle") ||
              b.classList.contains("css-c8frfc")
            );
          });

          if (confirmBtn) {
            confirmBtn.click();
          }
        });

        // Modalın kapanmasını veya yükleme işleminin tamamlanmasını bekle
        await page.waitForFunction(() => {
          const modalBtn = document.querySelector('button.css-c8frfc');
          return modalBtn === null;
        }, { timeout: 15000 }).catch(() => {});

        console.log(`✅ ${currentCustomer} için fatura başarıyla yüklendi!`);
        uploadedCount++;
        processedCustomers.add(currentCustomer);

        // Tablonun güncellenmesini ve yukarı kaymasını bekle
        console.log("⏳ Tablonun güncellenmesi bekleniyor...");
        await new Promise((r) => setTimeout(r, 3500));
      } else {
        console.warn("⚠️ input[type='file'] elemanı bulunamadı.");
        processedCustomers.add(currentCustomer);
      }
    } catch (rowErr) {
      console.error(`❌ '${currentCustomer}' faturası yüklenirken hata oluştu:`, rowErr);
      processedCustomers.add(currentCustomer);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("\n========================================================");
  console.log(`🎉 TRENDYOL FATURA YÜKLEME TAMAMLANDI! Toplam Yüklenen: ${uploadedCount}`);
  console.log("========================================================\n");

  return {
    success: true,
    uploadedCount,
  };
}

/**
 * Trendyol Partner 'Kabul Edilen İadeler' sayfasına giderek iade edilen müşteri isimlerini toplar.
 */
export async function getTrendyolAcceptedClaims(page: Page): Promise<string[]> {
  console.log("\n========================================================");
  console.log("🔍 TRENDYOL KABUL EDİLEN İADELER SAYFASI KONTROL EDİLİYOR...");
  console.log("========================================================");

  const claimsUrl = "https://partner.trendyol.com/orders/claims/accepted";
  console.log(`🌐 İadeler sayfasına gidiliyor: ${claimsUrl}`);

  await page.goto(claimsUrl, {
    waitUntil: "domcontentloaded",
    timeout: 35000,
  }).catch((e) => console.warn("⚠️ İadeler sayfası yükleme uyarısı:", e.message));

  await new Promise((r) => setTimeout(r, 3500));
  await page.waitForSelector("tbody tr, table, [data-testid='claim-row'], bl-select", { timeout: 15000 }).catch(() => {});

  // 1. "Her Sayfada 100 Ürün" Seçeneğini Seç
  console.log("📄 'Her Sayfada 100 Ürün' seçiliyor...");
  try {
    // A) Baklava bl-select elementine fiziksel tıkla
    const blSelectHandle = await page.$("bl-select, .css-1j332a9 bl-select");
    if (blSelectHandle) {
      await blSelectHandle.click();
      await new Promise((r) => setTimeout(r, 600));

      // 100 Ürün seçeneğine tıkla
      const optionHandles = await page.$$("bl-select-option, [role='option']");
      let clicked100 = false;
      for (const opt of optionHandles) {
        const txt = await page.evaluate((el) => el.textContent || "", opt);
        if (txt.includes("100")) {
          await opt.click();
          clicked100 = true;
          break;
        }
      }

      if (!clicked100) {
        // Evaluate içinde doğrudan tetikle
        await page.evaluate(() => {
          const sel = document.querySelector("bl-select") as any;
          if (sel) {
            const opts = Array.from(sel.querySelectorAll("bl-select-option")) as any[];
            const opt100 = opts.find((o) => (o.textContent || "").includes("100") || (o.value || "").includes("100"));
            if (opt100) {
              opt100.click();
              if (typeof sel.selectOption === "function") sel.selectOption(opt100);
              sel.value = opt100.value || "100";
              sel.dispatchEvent(new CustomEvent("bl-change", { bubbles: true, composed: true, detail: sel.value }));
              sel.dispatchEvent(new CustomEvent("bl-select", { bubbles: true, composed: true, detail: sel.value }));
              sel.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
        });
      }
    }

    // B) Standart HTML select fallback
    await page.evaluate(() => {
      const stdSelects = Array.from(document.querySelectorAll("select"));
      for (const sel of stdSelects) {
        const opts = Array.from(sel.options);
        const opt100 = opts.find((o) => o.text.includes("100") || o.value.includes("100"));
        if (opt100) {
          sel.value = opt100.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });

    // Tablonun 100 ürünle yeniden yüklenmesini bekle
    await new Promise((r) => setTimeout(r, 3000));
  } catch (selErr) {
    console.warn("⚠️ 100 Ürün seçimi uyarısı:", selErr);
  }

  // 2. TÜM SAYFALARI DÖNGÜ İLE TARA VE İADE EDEN KİŞİLERİ TOPLA
  const allReturnedCustomers = new Set<string>();
  let currentPage = 1;
  const maxPages = 10;

  while (currentPage <= maxPages) {
    // Mevcut sayfadaki satırları oku
    const pageCustomers = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr, .claim-item, [data-testid='claim-row']"));
      const list: string[] = [];

      for (const row of rows) {
        // Alıcı kolonunu (genellikle 2. kolon) bul
        const tds = Array.from(row.querySelectorAll("td"));
        let name = "";

        // 1. Kolon 2: Alıcı Adı
        if (tds.length >= 2) {
          const rawCol2 = (tds[1].textContent || "").trim();
          const firstLine = rawCol2.split("\n")[0].trim();
          if (firstLine && firstLine.length > 2 && !firstLine.includes("#") && !firstLine.includes("₺")) {
            name = firstLine;
          }
        }

        // 2. data-testid veya özel sınıflar
        if (!name) {
          const customerTd = row.querySelector('td[data-testid="customer"], .customer-info, .customer-name');
          if (customerTd) {
            name = (customerTd.textContent || "").split("\n")[0].trim();
          }
        }

        // 3. Fallback: Satırdaki uygun hücreyi bul
        if (!name) {
          for (const td of tds) {
            const txt = (td.textContent || "").trim();
            if (
              txt.length > 2 &&
              txt.length < 40 &&
              !txt.includes("TL") &&
              !txt.includes("₺") &&
              !txt.includes("/") &&
              !txt.includes(":") &&
              !txt.includes("#") &&
              !txt.includes("Kargo") &&
              !txt.includes("İade") &&
              !txt.includes("Onaylandı") &&
              !txt.includes("Satıcı")
            ) {
              name = txt.split("\n")[0].trim();
              break;
            }
          }
        }

        if (name) {
          // İsimdeki gereksiz ekleri temizle
          const cleaned = name
            .replace(/trendyol\s*plus['’]?l[ıi]/gi, "")
            .replace(/plus['’]?l[ıi]/gi, "")
            .replace(/kurumsal/gi, "")
            .replace(/[★☆⭐\u2022\u25cf]/g, "")
            .replace(/\s+/g, " ")
            .trim();

          if (cleaned.length > 2 && !cleaned.toLowerCase().includes("toplam tutar") && !cleaned.toLowerCase().includes("desi")) {
            list.push(cleaned);
          }
        }
      }

      return list;
    });

    pageCustomers.forEach((c) => allReturnedCustomers.add(c));

    // Sonraki sayfa (Next Page) var mı kontrol et
    const hasNextPage = await page.evaluate(() => {
      // 1. Baklava pagination: bl-pagination içindeki sonraki butonu
      const blPagination = document.querySelector("bl-pagination");
      if (blPagination) {
        const shadowRoot = blPagination.shadowRoot;
        const root = shadowRoot || blPagination;
        const nextBtn = root.querySelector('bl-button[icon="arrow_right"], button[aria-label="next"], button[aria-label="Sonraki sayfa"], button.next') as HTMLElement | null;
        if (nextBtn && !nextBtn.hasAttribute("disabled") && !nextBtn.classList.contains("disabled")) {
          nextBtn.click();
          return true;
        }
      }

      // 2. Standart pagination butonları
      const nextButtons = Array.from(
        document.querySelectorAll('button[aria-label*="Sonraki"], button[aria-label*="next" i], .pagination-next, [data-testid="pagination-next"]')
      ) as HTMLElement[];

      for (const btn of nextButtons) {
        if (!btn.hasAttribute("disabled") && !btn.classList.contains("disabled") && btn.offsetParent !== null) {
          btn.click();
          return true;
        }
      }

      return false;
    });

    if (!hasNextPage) {
      break;
    }

    console.log(`➡️ Sonraki sayfaya (${currentPage + 1}) geçiliyor...`);
    await new Promise((r) => setTimeout(r, 2500));
    currentPage++;
  }

  const result = Array.from(allReturnedCustomers);
  console.log(`📦 Trendyol İadeler Sayfasında ${result.length} adet iade kaydı tespit edildi:`);
  result.forEach((c, idx) => console.log(`   [${idx + 1}] ${c}`));

  return result;
}

