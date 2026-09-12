import puppeteer, { Browser, Page } from "puppeteer";
import { cleanProductName } from "./utils";

export interface GibBrowserOptions {
  username?: string;
  password?: string;
  orders: any[];
  onProgress?: (index: number, total: number, orderNumber: string) => void;
}

export async function runGibBrowserAutomation(options: GibBrowserOptions) {
  const username = (options.username || "12911762").trim();
  const password = (options.password || "973973").trim();
  const orders = options.orders || [];

  console.log("🚀 GİB Canlı Tarayıcı Otomasyonu başlatılıyor...");

  const browser: Browser = await puppeteer.launch({
    headless: false, // Ekranda görünür Chrome penceresi
    defaultViewport: null,
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
    await new Promise((r) => setTimeout(r, 3000));

    // ADIM 1 & 2: "Modül Seçiniz" -> "e-Arşiv Portal" (MAINTREEMENU) seç
    console.log("📌 1. & 2. Adım: Modül Seçiniz -> e-Arşiv Portal seçiliyor...");
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

    let successCount = 0;
    const errors: string[] = [];

    // HER SİPARİŞ İÇİN DÖNGÜ
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`\n========================================`);
      console.log(`📄 [${i + 1}/${orders.length}] Sipariş İşleniyor: #${order.order_number}`);
      console.log(`========================================`);

      if (options.onProgress) {
        options.onProgress(i + 1, orders.length, order.order_number);
      }

      try {
        // ADIM 3 & 4: Belge İşlemleri -> e-Arşiv Fatura (İnteraktif) Oluştur'a tıkla
        console.log("📂 3. & 4. Adım: Belge İşlemleri -> e-Arşiv Fatura Oluştur açılıyor...");
        await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll("a, span, div"));
          const target = links.find((a) => (a.textContent || "").trim() === "e-Arşiv Fatura (İnteraktif) Oluştur");
          if (target) {
            (target as HTMLElement).click();
          }
        });

        await new Promise((r) => setTimeout(r, 3000));

        // Form alanlarının yüklenmesini bekle
        await page.waitForSelector('td[rel="vknTckn"] input, input[rel="vknTckn"], #gen__1033', { timeout: 15000 }).catch(() => {});

        // ADIM 5: Form Verilerini Hazırla
        const invoiceAddress = order.invoice_address || order.shipment_address || {};
        
        // Müşteri tam adı oluştur ve kurala göre ayır (Son kelime Soyadı, öncekiler Adı)
        const rawFullName = (
          `${order.customer_first_name || ""} ${order.customer_last_name || ""}`.trim() ||
          `${invoiceAddress.firstName || ""} ${invoiceAddress.lastName || ""}`.trim() ||
          order.buyer?.name ||
          "Trendyol Müşterisi"
        ).trim();

        const nameWords = rawFullName.split(/\s+/).filter(Boolean);
        let firstName = "";
        let lastName = "";

        if (nameWords.length > 1) {
          lastName = nameWords[nameWords.length - 1]; // Sadece son kelime Soyadı (Örn: Öztop)
          firstName = nameWords.slice(0, -1).join(" "); // Önceki tüm kelimeler Adı (Örn: Ayça Kalkan)
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
        const orderNumber = order.order_number || order.notes?.match(/#([0-9]+)/)?.[1] || order.id?.substring(0, 8);

        // Form alanlarını hassas ve tek tek yazarak doldur (ekranda canlı harf harf yazma)
        console.log(`📝 5. Adım: Form Dolduruluyor:
        - TCKN/VKN: ${finalTckn}
        - Adı: ${firstName}
        - Soyadı: ${lastName}
        - Unvan: ${unvan}
        - Adres: ${address}`);

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

            // GİB VKN MERNIS sorgulamasının bitmesini bekle
            await new Promise((r) => setTimeout(r, 1500));

            // 2. Kurumsal ise Unvan ve Vergi Dairesi, Bireysel ise Adı ve Soyadı
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

        // ADIM 6: Ürünleri (Mal/Hizmet) Tablosuna Ekle
        const items = order.items || [];
        console.log(`📦 6. Adım: ${items.length} adet ürün kalemi ekleniyor...`);

        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          const cleanedName = cleanProductName(item.product_name || "Ürün");
          const quantity = Number(item.quantity) || 1;
          const priceWithVat = Number(item.price) || 0;
          // KDV Hariç tutar (Sayısal)
          const numPriceWithoutVat = Number((priceWithVat / 1.20).toFixed(2));

          // "Satır Ekle" butonuna tıkla
          await page.evaluate(() => {
            const btn = document.querySelector('input[rel="satirEkle"], input[value="Satır Ekle"]') as HTMLInputElement | null;
            if (btn) btn.click();
          });

          await new Promise((r) => setTimeout(r, 800));

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

          await new Promise((r) => setTimeout(r, 600));
        }

        // ADIM 7: Faturayı Otomatik Oluştur (Kullanıcı onayı beklemeden sıradakine geç)
        console.log(`💾 7. Adım: Form dolduruldu. Fatura otomatik oluşturuluyor...`);

        await page.evaluate(({ orderNumber, current, total }) => {
          const oldBox = document.getElementById("stocktakip-helper-box");
          if (oldBox) oldBox.remove();

          const helper = document.createElement("div");
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

          helper.innerHTML = `
            <div style="font-size: 22px;">⚡</div>
            <div>
              <div style="font-weight: bold; font-size: 14px; color: #60A5FA;">
                [${current}/${total}] Sipariş #${orderNumber} Faturası Kaydediliyor...
              </div>
              <div style="font-size: 12px; color: #94A3B8; margin-top: 2px;">
                Otomatik olarak onaylanıp sıradaki faturaya geçiliyor.
              </div>
            </div>
          `;

          document.body.appendChild(helper);
        }, { orderNumber: order.order_number, current: i + 1, total: orders.length });

        await new Promise((r) => setTimeout(r, 800));

        // Faturayı "Oluştur" butonuna basarak kaydet
        console.log("💾 Fatura 'Oluştur' butonuna basılıyor...");
        await page.evaluate(() => {
          const olusturBtn = document.querySelector('input[rel="olustur"], input[value="Oluştur"]') as HTMLInputElement | null;
          if (olusturBtn) olusturBtn.click();
        });

        // "Faturanız başarıyla oluşturulmuştur" popup'ını bekle ve "Tamam" butonuna tıkla
        console.log("⏳ Onay penceresi bekleniyor...");
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
        successCount++;
        console.log(`✅ Sipariş #${order.order_number} faturası başarıyla oluşturuldu!`);
      } catch (err) {
        console.error(`❌ Sipariş #${order.order_number} hatası:`, err);
        errors.push(`#${order.order_number}: ${err instanceof Error ? err.message : "Hata"}`);
      }
    }

    // =========================================================================
    // TÜM FATURALAR OLUŞTURULDUKTAN SONRA: İMZA VE SMS SÜRECİ
    // =========================================================================
    console.log("🎉 Tüm faturalar oluşturuldu! Belge İşlemleri -> Düzenlenen Belgeler ekranına geçiliyor...");

    await page.evaluate(() => {
      const helper = document.getElementById("stocktakip-helper-box");
      if (helper) {
        helper.innerHTML = `
          <div style="font-size: 22px;">📜</div>
          <div>
            <div style="font-weight: bold; font-size: 14px; color: #38BDF8;">
              Tüm Faturalar Tamamlandı! Düzenlenen Belgeler Açılıyor...
            </div>
            <div style="font-size: 12px; color: #94A3B8; margin-top: 2px;">
              Belgeler sorgulanıp GİB İmza ve SMS ekranı otomatik açılacak.
            </div>
          </div>
        `;
      }
    });

    // ADIM 8: "Belge İşlemleri" menüsünü bul ve gerekirse tıkla
    await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll("a, span, div, li, td"));
      const duzenlenenBtn = allElements.find((el) => 
        (el.textContent || "").trim().includes("Düzenlenen Belgeler e-Arşiv Fatura")
      );
      
      // Eğer "Düzenlenen Belgeler" görünür değilse "Belge İşlemleri" akordeonunu aç
      if (!duzenlenenBtn || (duzenlenenBtn as HTMLElement).offsetParent === null) {
        const belgeIslemleri = allElements.find((el) => (el.textContent || "").trim() === "Belge İşlemleri");
        if (belgeIslemleri) {
          (belgeIslemleri as HTMLElement).click();
        }
      }
    });

    await new Promise((r) => setTimeout(r, 1200));

    // ADIM 9: "Düzenlenen Belgeler e-Arşiv Fatura (İnteraktif)" tıkla
    console.log("📂 Düzenlenen Belgeler e-Arşiv Fatura (İnteraktif) menüsüne tıklanıyor...");
    await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll("a, span, div, li, td"));
      const duzenlenenBtn = allElements.find((el) => 
        (el.textContent || "").trim().includes("Düzenlenen Belgeler e-Arşiv Fatura")
      );
      if (duzenlenenBtn) {
        (duzenlenenBtn as HTMLElement).click();
      }
    });

    await new Promise((r) => setTimeout(r, 2500));

    // ADIM 10: Ekrana gelen panelden "Sorgula" butonuna bas
    console.log("🔍 Panelden 'Sorgula' butonuna basılıyor...");
    await page.waitForFunction(() => {
      const all = Array.from(document.querySelectorAll("button, input, a, div, span"));
      return all.some((el) => {
        const text = (el.textContent || (el as HTMLInputElement).value || "").trim();
        return text === "Sorgula" || text.includes("Sorgula");
      });
    }, { timeout: 15000 }).catch(() => {});

    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit'], a, div, span"));
      const sorgulaBtn = all.find((el) => {
        const text = (el.textContent || (el as HTMLInputElement).value || "").trim();
        return text === "Sorgula" || text.includes("Sorgula");
      });
      if (sorgulaBtn) {
        (sorgulaBtn as HTMLElement).click();
      }
    });

    // Tablonun ve belgelerin yüklenmesini bekle
    console.log("⏳ Belgelerin listelenmesi bekleniyor...");
    await new Promise((r) => setTimeout(r, 3000));
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll("table tbody tr, .csc-grid tr[rel], tr[id*='grid']");
      return rows.length > 0;
    }, { timeout: 10000 }).catch(() => {});

    // ADIM 11: Tabloda en baştaki kutucuğu işaretle (Belge Numarası yanındaki Tümünü Seç kutusu)
    console.log("☑️ Tablodaki en baştaki kutucuk (Tümünü Seç) işaretleniyor...");
    await page.evaluate(() => {
      let clicked = false;

      // 1. "Belge Numarası" başlığının bulunduğu hücredeki veya yanındaki checkbox
      const allElements = Array.from(document.querySelectorAll("th, td, div, span"));
      const belgeNoEl = allElements.find((el) => (el.textContent || "").trim().includes("Belge Numarası"));
      
      if (belgeNoEl) {
        const headerCell = belgeNoEl.closest("th, td, div.csc-grid-header, div.x-grid3-hd") || belgeNoEl.parentElement;
        if (headerCell) {
          const cb = headerCell.querySelector("input[type='checkbox']") as HTMLInputElement | null;
          if (cb) {
            cb.click();
            cb.checked = true;
            cb.dispatchEvent(new Event("change", { bubbles: true }));
            clicked = true;
          } else {
            const prev = headerCell.previousElementSibling;
            if (prev) {
              const prevCb = prev.querySelector("input[type='checkbox']") as HTMLInputElement | null;
              if (prevCb) {
                prevCb.click();
                prevCb.checked = true;
                prevCb.dispatchEvent(new Event("change", { bubbles: true }));
                clicked = true;
              }
            }
          }
        }
      }

      // 2. thead içindeki veya tablonun ilk satırındaki checkbox
      if (!clicked) {
        const theadCb = document.querySelector("thead input[type='checkbox'], th input[type='checkbox'], .csc-grid-header input[type='checkbox'], .x-grid3-hd-checker") as HTMLElement | null;
        if (theadCb) {
          theadCb.click();
          clicked = true;
        }
      }

      // 3. Tablodaki ilk checkbox
      if (!clicked) {
        const firstCb = document.querySelector("table input[type='checkbox'], input[type='checkbox']") as HTMLInputElement | null;
        if (firstCb) {
          firstCb.click();
          firstCb.checked = true;
          firstCb.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      // Güvenlik: Tablo satırlarındaki tüm kutucukların seçildiğinden emin ol
      const rowCheckboxes = Array.from(document.querySelectorAll("table tbody input[type='checkbox'], .csc-grid-body input[type='checkbox']")) as HTMLInputElement[];
      rowCheckboxes.forEach((rcb) => {
        if (!rcb.checked) {
          rcb.checked = true;
          rcb.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });

    await new Promise((r) => setTimeout(r, 1500));

    // ADIM 12: "GİB İmza" butonuna tıkla
    console.log("✍️ 'GİB İmza' butonuna basılıyor...");
    await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll("button, input[type='button'], a, div, span"));
      const imzaBtn = allBtns.find((el) => {
        const text = (el.textContent || (el as HTMLInputElement).value || "").trim();
        return text === "GİB İmza" || text.includes("GİB İmza") || text.includes("GİB imza");
      });
      if (imzaBtn) {
        (imzaBtn as HTMLElement).click();
      }
    });

    // ADIM 13: Yeni pop up ekranının açılmasını bekle ("SMS Onay")
    console.log("⏳ 'SMS Onay' açılır penceresi bekleniyor...");
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return text.includes("Uyarıyı Okudum") || text.includes("Şifre Gönder") || text.includes("SMS Onay");
    }, { timeout: 15000 }).catch(() => {});

    await new Promise((r) => setTimeout(r, 1000));

    // "Uyarıyı Okudum :" kutucuğunu işaretle
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

    // ADIM 14: "Şifre Gönder" butonuna tıkla
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

    // ADIM 15: Kullanıcıya SMS şifresinin gönderildiğini belirten bilgilendirme rozeti göster
    await page.evaluate(() => {
      const helper = document.getElementById("stocktakip-helper-box");
      if (helper) {
        helper.innerHTML = `
          <div style="font-size: 26px;">📲</div>
          <div>
            <div style="font-weight: bold; font-size: 15px; color: #10B981;">
              SMS Onay Şifresi Gönderildi!
            </div>
            <div style="font-size: 12px; color: #E2E8F0; margin-top: 3px;">
              Lütfen telefonunuza gelen SMS onay kodunu ekrandaki alana girip imzalama işlemini tamamlayınız.
            </div>
          </div>
        `;
        helper.style.borderColor = "#10B981";
      }
    });

    return {
      success: true,
      successCount,
      failCount: errors.length,
      errors,
    };
  } catch (error) {
    console.error("❌ Tarayıcı otomasyon hatası:", error);
    throw error;
  }
}
