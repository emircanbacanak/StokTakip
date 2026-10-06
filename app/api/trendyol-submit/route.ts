/**
 * POST /api/trendyol-submit
 *
 * Trendyol ürün gönderimi — Next.js API Route olarak çalışır.
 * CORS sorunu yok çünkü server-side istek.
 * Supabase Edge Function deploy gerektirmez.
 *
 * Özellikler:
 *  - Otonom barkod üretimi (TY + timestamp + random)
 *  - Barkod çakışması → otomatik yeni barkod (max 5 deneme)
 *  - Supabase DB'ye trendyol_listings tablosuna kayıt
 *  - TRENDYOL_SELLER_ID yoksa simülasyon modu
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizeTrendyolDescription } from "@/lib/trendyol-api-client";
import { extractColorFromStockCode, extractHeightFromText } from "@/lib/product-code-generator";
import { detectCategoryFromProduct } from "@/lib/trendyol-categories-static";

const SELLER_ID   = process.env.TRENDYOL_SELLER_ID ?? "";
const API_KEY     = process.env.TRENDYOL_API_KEY ?? "";
const API_SECRET  = process.env.TRENDYOL_API_SECRET ?? "";
const TRENDYOL_URL = "https://apigw.trendyol.com/integration";

function trendyolHeaders(): HeadersInit {
  const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  return {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/json",
    "User-Agent": `${SELLER_ID} - SelfIntegration`,
    "storeFrontCode": "TR",
  };
}

/** Otonom benzersiz barkod: TY + timestamp(base36) + random(4) */
function generateBarcode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TY${ts}${rand}`;
}

/** Otonom stok kodu */
function generateStockCode(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20)
    .replace(/^-|-$/g, "");
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `SKU-${slug}-${suffix}`;
}

/** Trendyol'a ürün gönder — barkod çakışmasında yeni barkod ile yeniden dene */
async function pushToTrendyol(
  item: Record<string, unknown>,
  attempt = 1
): Promise<{ success: boolean; batchId?: string; barcode: string; error?: string; attempts: number; savedAsDraft?: boolean }> {
  const MAX = 5;
  const barcode = item.barcode as string;
  const url = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/v2/products`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: trendyolHeaders(),
      body: JSON.stringify({ items: [item] }),
    });
  } catch (e) {
    return { success: false, barcode, error: `Ağ hatası: ${(e as Error).message}`, attempts: attempt };
  }

  if (res.ok) {
    const data = await res.json();
    return { success: true, batchId: data?.batchRequestId, barcode, attempts: attempt };
  }

  const errText = await res.text();
  let readableError = `Trendyol ${res.status}: ${errText.slice(0, 300)}`;
  try {
    const parsed = JSON.parse(errText);
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      readableError = parsed.errors.map((e: any) => e.message || e.key).join(", ");
    } else if (parsed.message) {
      readableError = parsed.message;
    }
  } catch { /* json parse error */ }

  // Barkod çakışması → yeni barkod ile yeniden dene
  if (res.status === 400 && attempt < MAX) {
    const isBarcodeDupe =
      errText.toLowerCase().includes("barcode") ||
      errText.includes("duplicate") ||
      errText.includes("already exist");

    if (isBarcodeDupe) {
      const newBarcode = generateBarcode();
      await new Promise(r => setTimeout(r, 150 * attempt));
      return pushToTrendyol({ ...item, barcode: newBarcode }, attempt + 1);
    }
    return { success: false, barcode, error: readableError, attempts: attempt };
  }

  // 5xx — Trendyol servisi geçici olarak erişilemiyor → direkt taslak kaydet
  if (res.status >= 500) {
    return {
      success: false,
      barcode,
      error: `Trendyol ürün servisi şu an erişilemiyor (${res.status}). Ürününüz taslak kaydedildi.`,
      attempts: attempt,
      savedAsDraft: true,
    };
  }

  return { success: false, barcode, error: readableError, attempts: attempt };
}

interface AttributeHints {
  color?: string;
  height?: string;
  material?: string;
  pieceCount?: string;
  stockCode?: string;
  title?: string;
}

/** Kategorinin zorunlu niteliklerini (Örn: Menşei, Boyut, Web Color, Renk) otomatik tespit edip eksikleri tamamlar */
async function enrichAndValidateAttributes(
  categoryId: number,
  existingAttributes: any[] = [],
  hints: AttributeHints = {}
): Promise<any[]> {
  const attrs = [...existingAttributes];
  try {
    const url = `${TRENDYOL_URL}/product/product-categories/${categoryId}/attributes`;
    const res = await fetch(url, { headers: trendyolHeaders() });
    if (!res.ok) return attrs;
    const data = await res.json();
    const categoryAttrs = data.categoryAttributes || [];

    // Rengi hints veya stockCode veya title üzerinden tespit et
    const resolvedColor =
      hints.color ||
      (hints.stockCode ? extractColorFromStockCode(hints.stockCode) : null) ||
      (hints.title?.toLowerCase().includes("çok renkli") ? "Çok Renkli" : null) ||
      "Çok Renkli";

    // Yüksekliği tespit et (Örn: "15-16 cm", "20 cm")
    const resolvedHeight =
      hints.height ||
      extractHeightFromText(hints.title);

    for (const catAttr of categoryAttrs) {
      const attrId = catAttr.attribute?.id;
      const attrName = (catAttr.attribute?.name || "").toLowerCase();
      const vals = catAttr.attributeValues || [];
      const hasAttr = attrs.some((a) => a.attributeId === attrId);

      // 1. Menşei kontrolü (ID: 1192 veya 1040)
      if ((catAttr.required || catAttr.mandatory || attrName.includes("menşe") || attrId === 1192 || attrId === 1040) && !hasAttr) {
        const trVal = vals.find((v: any) => v.name === "TR" || v.name.includes("Türkiye") || v.name === "TUR");
        if (trVal) {
          attrs.push({ attributeId: attrId, attributeValueId: trVal.id });
        } else if (vals.length > 0) {
          attrs.push({ attributeId: attrId, attributeValueId: vals[0].id });
        } else {
          attrs.push({ attributeId: attrId, customAttributeValue: "TR" });
        }
        continue;
      }

      // 2. Web Color (ID: 348 veya adı web color)
      if ((attrName.includes("web color") || attrId === 348) && !hasAttr) {
        if (resolvedColor) {
          const matchColorVal = vals.find((v: any) => {
            const vName = (v.name || "").toLowerCase();
            const target = resolvedColor.toLowerCase();
            return (
              vName === target ||
              vName.includes(target) ||
              (target.includes("çok") && (vName.includes("çok") || vName.includes("cok") || vName.includes("renkli")))
            );
          });
          if (matchColorVal) {
            attrs.push({ attributeId: attrId, attributeValueId: matchColorVal.id });
            continue;
          }
        }
        // Eğer kategori zorunlu kılıyorsa: Çok Renkli ara veya ilk değeri ver
        if (catAttr.required || catAttr.mandatory) {
          const defaultVal =
            vals.find((v: any) => v.name?.toLowerCase().includes("çok renkli") || v.name?.toLowerCase().includes("cok")) ||
            vals[0];
          if (defaultVal) attrs.push({ attributeId: attrId, attributeValueId: defaultVal.id });
        }
        continue;
      }

      // 3. Renk (ID: 47 veya adı renk)
      if ((attrName === "renk" || attrId === 47) && !hasAttr) {
        if (resolvedColor) {
          const matchColorVal = vals.find((v: any) => {
            const vName = (v.name || "").toLowerCase();
            const target = resolvedColor.toLowerCase();
            return (
              vName === target ||
              vName.includes(target) ||
              (target.includes("çok") && (vName.includes("çok") || vName.includes("cok") || vName.includes("renkli")))
            );
          });
          if (matchColorVal) {
            attrs.push({ attributeId: attrId, attributeValueId: matchColorVal.id });
          } else {
            attrs.push({ attributeId: attrId, customAttributeValue: resolvedColor });
          }
          continue;
        }
        if (catAttr.required || catAttr.mandatory) {
          const defaultVal =
            vals.find((v: any) => v.name?.toLowerCase().includes("çok renkli") || v.name?.toLowerCase().includes("cok")) ||
            vals[0];
          if (defaultVal) attrs.push({ attributeId: attrId, attributeValueId: defaultVal.id });
        }
        continue;
      }

      // 4. Boyut kontrolü (ID: 91 veya 4402)
      if ((attrName.includes("boyut") || attrName.includes("ebat") || attrId === 91 || attrId === 4402) && !hasAttr) {
        const midiVal = vals.find((v: any) => v.name === "Midi") || vals[0];
        if (midiVal) {
          attrs.push({ attributeId: attrId, attributeValueId: midiVal.id });
        }
        continue;
      }

      // 5. Yükseklik (ID: 286 veya adı yükseklik)
      if ((attrName.includes("yükseklik") || attrId === 286) && !hasAttr) {
        if (resolvedHeight) {
          const cleanTarget = resolvedHeight.toLowerCase().replace(/\s+/g, "");
          const numMatch = resolvedHeight.match(/\d+(\.\d+)?/);
          const targetNum = numMatch ? parseFloat(numMatch[0]) : null;

          // 1. Tam veya normalize eşleşme
          let matchHeight = vals.find((v: any) => {
            const vClean = (v.name || "").toLowerCase().replace(/\s+/g, "");
            return vClean === cleanTarget;
          });

          // 2. Sayısal tam eşleşme (Örn: "13" == "13 cm" veya "13")
          if (!matchHeight && targetNum !== null) {
            matchHeight = vals.find((v: any) => {
              const vNumMatch = (v.name || "").match(/^(\d+(\.\d+)?)\s*cm$/i);
              return vNumMatch && parseFloat(vNumMatch[1]) === targetNum;
            });
          }

          // 3. Aralık eşleşmesi (Örn: 13 için "11 - 30 cm", "0 - 10 cm", "10-15 cm")
          if (!matchHeight && targetNum !== null) {
            matchHeight = vals.find((v: any) => {
              const rangeMatch = (v.name || "").match(/(\d+)\s*[-–]\s*(\d+)/);
              if (rangeMatch) {
                const min = parseFloat(rangeMatch[1]);
                const max = parseFloat(rangeMatch[2]);
                return targetNum >= min && targetNum <= max;
              }
              return false;
            });
          }

          // 4. En yakın sayısal seçeneğe eşleme
          if (!matchHeight && targetNum !== null && vals.length > 0) {
            let closestVal = null;
            let minDiff = Infinity;
            for (const v of vals) {
              const vNum = (v.name || "").match(/\d+/);
              if (vNum) {
                const diff = Math.abs(parseFloat(vNum[0]) - targetNum);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestVal = v;
                }
              }
            }
            if (closestVal) matchHeight = closestVal;
          }

          if (matchHeight) {
            attrs.push({ attributeId: attrId, attributeValueId: matchHeight.id });
            continue;
          }
        }
        if (catAttr.required || catAttr.mandatory) {
          if (vals.length > 0) attrs.push({ attributeId: attrId, attributeValueId: vals[0].id });
        }
        continue;
      }

      // 6. Materyal (ID: 14 veya 338)
      if ((attrName.includes("materyal") || attrName.includes("malzeme") || attrId === 14 || attrId === 338) && !hasAttr) {
        const targetMat = hints.material || "Plastik";
        const matchMat = vals.find((v: any) => (v.name || "").toLowerCase() === targetMat.toLowerCase()) || vals[0];
        if (matchMat) {
          attrs.push({ attributeId: attrId, attributeValueId: matchMat.id });
        }
        continue;
      }

      // 7. Parça Sayısı (ID: 18 veya 1073)
      if ((attrName.includes("parça") || attrId === 18 || attrId === 1073) && !hasAttr) {
        const targetPiece = hints.pieceCount || "1";
        const matchPiece = vals.find((v: any) => (v.name || "").toLowerCase() === targetPiece.toLowerCase()) || vals[0];
        if (matchPiece) {
          attrs.push({ attributeId: attrId, attributeValueId: matchPiece.id });
        }
        continue;
      }

      // 8. Diğer Zorunlu alanlar varsa ve eklenmemişse ilk geçerli değeri ver
      if ((catAttr.required || catAttr.mandatory) && !hasAttr && vals.length > 0) {
        attrs.push({ attributeId: attrId, attributeValueId: vals[0].id });
      }
    }
  } catch (err) {
    console.warn("[trendyol-submit] Attribute zenginleştirme hatası:", err);
  }
  return attrs;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Supabase client (service role ile DB'ye yazar)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ?? ""
    );

    // ─── ÇOKLU VARYANT / ÇOKLU RENK GÖNDERİMİ (payload.items) ───
    if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
      const mainTitle = payload.title || payload.items[0].title || "Yeni Ürün";
      const modelCode =
        payload.model_code ||
        payload.product_main_id ||
        payload.items[0].modelCode ||
        payload.items[0].productMainId ||
        generateStockCode(mainTitle).replace(/^SKU-/, "MOD-");

      const defaultCat = detectCategoryFromProduct({
        title: mainTitle,
        categoryName: payload.category_name || payload.categoryName,
        category_id: payload.category_id || payload.trendyol_category_id,
      });
      let commonCatId = Number(
        payload.trendyol_category_id ??
        payload.category_id ??
        payload.items[0]?.category_id ??
        defaultCat.id
      );

      const preparedItems: any[] = [];
      const dbRecords: any[] = [];

      for (let idx = 0; idx < payload.items.length; idx++) {
        const variant = payload.items[idx];
        const rawTitle = variant.title || mainTitle;
        const vTitle = rawTitle
          .replace(/\bkoleksiyonluk\b/gi, "Özel Tasarım")
          .replace(/\bkoleksiyon\b/gi, "Özel Seri")
          .replace(/\bcollection\b/gi, "Special")
          .trim();
        const vBarcode = variant.barcode?.trim() || generateBarcode();
        const vStockCode = variant.stock_code?.trim() || variant.stockCode?.trim() || generateStockCode(vTitle);
        const vImages = (variant.image_urls ?? variant.images ?? payload.image_urls ?? []).map((img: any) =>
          typeof img === "string" ? img : img.url
        );
        const vSalePrice = Number(variant.sale_price ?? variant.salePrice ?? payload.sale_price ?? 330);
        const vListPrice = Number(variant.list_price ?? variant.listPrice ?? payload.list_price ?? vSalePrice);
        const rawQuantity = Number(variant.quantity ?? payload.quantity ?? 100);
        // Trendyol Platform Kuralı: Stok miktarı 20.000 üzerinde olamaz. Güvenli limit: 10.000
        const vQuantity = Math.min(Math.max(rawQuantity, 0), 10000);
        const vDesi = Number(variant.desi ?? variant.dimensionalWeight ?? payload.desi ?? 2);
        const vVatRate = Number(variant.vat_rate ?? variant.vatRate ?? payload.vat_rate ?? 20);

        const rawDesc = payload.description ?? variant.description ?? "-";
        const cleanDesc = rawDesc && rawDesc !== "-" ? sanitizeTrendyolDescription(rawDesc) : "-";

        // Nitelikleri kategori zorunlularına (Menşei, Boyut, Web Color, Renk vb.) göre zenginleştir
        const rawAttrs = variant.attributes ?? payload.attributes ?? [];
        const enrichedAttrs = await enrichAndValidateAttributes(commonCatId, rawAttrs, {
          color: variant.color || variant.customColorName || payload.color || payload.webColor,
          stockCode: vStockCode,
          title: vTitle,
          height: variant.height || payload.height,
          material: variant.material || payload.material,
          pieceCount: variant.pieceCount || payload.pieceCount,
        });

        // Trendyol kuralı: Aynı ürünün varyantları (renk, beden, boyut vb.) TEK bir ürün kartı altında
        // toplanabilmesi için TÜM varyantların `productMainId` (Model Kodu) BİREBİR AYNI olmalıdır.
        // Farklı olan kısımlar sadece `stockCode` (Stok Kodu) ve `barcode` (Barkod) olmalıdır.
        const itemMainId = variant.productMainId?.trim() || variant.modelCode?.trim() || modelCode.trim();

        // Trendyol v2 item
        preparedItems.push({
          barcode: vBarcode,
          title: vTitle,
          productMainId: itemMainId,
          brandId: payload.brand_id ?? variant.brand_id ?? 1066155,
          categoryId: commonCatId,
          quantity: vQuantity,
          stockCode: vStockCode,
          dimensionalWeight: vDesi,
          description: cleanDesc,
          currencyType: "TRY",
          listPrice: vListPrice,
          salePrice: vSalePrice,
          vatRate: vVatRate,
          cargoCompanyId: 10,
          images: vImages.slice(0, 8).map((url: string) => ({ url })),
          attributes: enrichedAttrs,
        });

        // Supabase DB record
        dbRecords.push({
          product_id: null,
          title: vTitle,
          description: cleanDesc,
          barcode: vBarcode,
          stock_code: vStockCode,
          brand_name: payload.brand_name ?? variant.brand_name ?? "ahenk tasarım",
          category_id: null,
          list_price: vListPrice,
          sale_price: vSalePrice,
          vat_rate: vVatRate,
          quantity: vQuantity,
          image_urls: vImages,
          cargo_company: payload.cargo_company ?? null,
          desi: vDesi,
          warranty_months: 0,
          trendyol_status: "pending",
          batch_id: modelCode, // Model Kodu batch_id alanında saklanır
          submitted_at: new Date().toISOString(),
        });
      }

      // Supabase'e toplu upsert
      try {
        await supabase.from("trendyol_listings").upsert(dbRecords, { onConflict: "barcode" });
      } catch (dbErr) {
        console.error("[trendyol-submit] DB toplu kayıt hatası:", dbErr);
      }

      // Simülasyon modu kontrolü
      if (!SELLER_ID || !API_KEY || !API_SECRET) {
        return NextResponse.json({
          success: true,
          simulation: true,
          model_code: modelCode,
          count: preparedItems.length,
          items: preparedItems,
        });
      }

      // Gerçek Trendyol API Toplu Gönderim
      const url = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/v2/products`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: trendyolHeaders(),
          body: JSON.stringify({ items: preparedItems }),
        });
      } catch (netErr) {
        return NextResponse.json(
          { success: false, error: `Trendyol ağ hatası: ${(netErr as Error).message}` },
          { status: 502 }
        );
      }

      if (!res.ok) {
        const errText = await res.text();
        let readableError = `Trendyol ${res.status}: ${errText.slice(0, 300)}`;
        try {
          const parsed = JSON.parse(errText);
          if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
            readableError = parsed.errors.map((e: any) => e.message || e.key).join(", ");
          } else if (parsed.message) {
            readableError = parsed.message;
          }
        } catch { /* json parse error */ }

        return NextResponse.json(
          { success: false, error: readableError },
          { status: 422 }
        );
      }

      const resJson = await res.json();
      const batchRequestId = resJson?.batchRequestId;

      let finalStatus = "pending";
      let failureReasons: string[] = [];

      if (batchRequestId) {
        // Trendyol batch'i asenkron işler; 4 kereye kadar 1.2 saniye aralıklarla durumunu kontrol edelim
        try {
          const checkUrl = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/batch-requests/${batchRequestId}`;
          for (let poll = 0; poll < 4; poll++) {
            await new Promise((r) => setTimeout(r, 1200));
            const checkRes = await fetch(checkUrl, { headers: trendyolHeaders() });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.status === "COMPLETED") {
                if (Number(checkData.failedItemCount) === 0) {
                  finalStatus = "approved";
                } else {
                  finalStatus = "rejected";
                  for (const it of checkData.items || []) {
                    if (Array.isArray(it.failureReasons) && it.failureReasons.length > 0) {
                      failureReasons.push(...it.failureReasons);
                    }
                  }
                }
                break;
              } else if (checkData.status === "FAILED") {
                finalStatus = "rejected";
                for (const it of checkData.items || []) {
                  if (Array.isArray(it.failureReasons) && it.failureReasons.length > 0) {
                    failureReasons.push(...it.failureReasons);
                  }
                }
                break;
              }
            }
          }
        } catch (checkErr) {
          console.warn("[trendyol-submit] Batch kontrol hatası:", checkErr);
        }

        try {
          const barcodes = dbRecords.map((r) => r.barcode);
          await supabase
            .from("trendyol_listings")
            .update({
              trendyol_product_id: batchRequestId,
              trendyol_status: finalStatus,
              rejection_reason: failureReasons.length > 0 ? failureReasons.join("; ") : null,
            })
            .in("barcode", barcodes);
        } catch { /* ignore */ }
      }

      // Eğer Trendyol batch'i hemen reddettiyse, frontend'e sahte başarı yerine hatayı dön!
      if (finalStatus === "rejected" && failureReasons.length > 0) {
        return NextResponse.json(
          {
            success: false,
            batch_id: batchRequestId,
            error: `Trendyol Doğrulama Hatası: ${failureReasons.join(". ")}`,
            failure_reasons: failureReasons,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        batch_id: batchRequestId,
        status: finalStatus,
        model_code: modelCode,
        count: preparedItems.length,
        items: preparedItems.map((p) => ({ barcode: p.barcode, stock_code: p.stockCode })),
      });
    }

    // ─── TEKİL ÜRÜN GÖNDERİMİ (Geriye Dönük Uyumluluk) ───
    if (!payload.title || !payload.sale_price) {
      return NextResponse.json(
        { success: false, error: "title ve sale_price zorunludur" },
        { status: 400 }
      );
    }

    const barcode = payload.barcode?.trim() || generateBarcode();
    const stockCode = payload.stock_code?.trim() || generateStockCode(payload.title);
    const modelCode =
      payload.model_code ||
      payload.product_main_id ||
      stockCode.split("-").slice(0, 3).join("-") ||
      stockCode;

    const rawSingleDesc = payload.description ?? "-";
    const cleanSingleDesc = rawSingleDesc && rawSingleDesc !== "-" ? sanitizeTrendyolDescription(rawSingleDesc) : "-";

    const defaultSingleCat = detectCategoryFromProduct({
      title: payload.title,
      categoryName: payload.category_name || payload.categoryName,
      category_id: payload.category_id || payload.trendyol_category_id,
    });
    let singleCatId = Number(
      payload.trendyol_category_id ?? payload.category_id ?? defaultSingleCat.id
    );

    const dbRecord = {
      product_id: payload.product_id ?? null,
      title: payload.title,
      description: cleanSingleDesc,
      barcode,
      stock_code: stockCode,
      brand_name: payload.brand_name ?? "Yok",
      category_id: null,
      list_price: payload.list_price ?? payload.sale_price,
      sale_price: payload.sale_price,
      vat_rate: payload.vat_rate ?? 20,
      quantity: payload.quantity ?? 100,
      image_urls: payload.image_urls ?? [],
      cargo_company: payload.cargo_company ?? null,
      desi: payload.desi ?? null,
      warranty_months: payload.warranty_months ?? 0,
      trendyol_status: "pending" as const,
      batch_id: modelCode, // Model Kodu
      submitted_at: new Date().toISOString(),
    };

    let listingId: string | null = payload.listing_id ?? null;
    try {
      if (listingId) {
        await supabase.from("trendyol_listings").update({ ...dbRecord, barcode, stock_code: stockCode }).eq("id", listingId);
      } else {
        const { data } = await supabase.from("trendyol_listings").insert(dbRecord).select("id").single();
        listingId = data?.id ?? null;
      }
    } catch (dbErr) {
      console.error("[trendyol-submit] DB hatası:", dbErr);
    }

    if (!SELLER_ID || !API_KEY || !API_SECRET) {
      if (listingId) {
        try {
          await supabase.from("trendyol_listings").update({
            trendyol_status: "approved",
            trendyol_product_id: `SIM-${barcode}`,
          }).eq("id", listingId);
        } catch { /* ignore */ }
      }
      return NextResponse.json({
        success: true,
        simulation: true,
        listing_id: listingId,
        barcode,
        stock_code: stockCode,
        model_code: modelCode,
      });
    }

    const singleTitle = (payload.title || "")
      .replace(/\bkoleksiyonluk\b/gi, "Özel Tasarım")
      .replace(/\bkoleksiyon\b/gi, "Özel Seri")
      .replace(/\bcollection\b/gi, "Special")
      .trim();

    const enrichedAttrs = await enrichAndValidateAttributes(singleCatId, payload.attributes ?? [], {
      color: payload.color || payload.webColor,
      stockCode,
      title: singleTitle,
      height: payload.height,
      material: payload.material,
      pieceCount: payload.pieceCount,
    });

    const trendyolItem = {
      barcode,
      title: singleTitle,
      productMainId: modelCode,
      brandId: payload.brand_id ?? 0,
      categoryId: singleCatId,
      quantity: payload.quantity ?? 100,
      stockCode,
      dimensionalWeight: payload.desi ?? 1,
      description: cleanSingleDesc,
      currencyType: "TRY",
      listPrice: payload.list_price ?? payload.sale_price,
      salePrice: payload.sale_price,
      vatRate: payload.vat_rate ?? 20,
      cargoCompanyId: 10,
      images: (payload.image_urls ?? []).slice(0, 8).map((url: string) => ({ url })),
      attributes: enrichedAttrs,
    };

    const result = await pushToTrendyol(trendyolItem);

    if (listingId) {
      try {
        await supabase.from("trendyol_listings").update({
          barcode: result.barcode,
          stock_code: stockCode,
          trendyol_status: result.success ? "pending" : result.savedAsDraft ? "draft" : "rejected",
          rejection_reason: result.success ? null : result.error,
          trendyol_product_id: result.batchId ?? null,
        }).eq("id", listingId);
      } catch { /* ignore */ }
    }

    return NextResponse.json(
      {
        success: result.success,
        listing_id: listingId,
        barcode: result.barcode,
        stock_code: stockCode,
        model_code: modelCode,
        trendyol_batch_id: result.batchId,
        attempts: result.attempts,
        error: result.error,
        saved_as_draft: result.savedAsDraft ?? false,
      },
      { status: result.success || result.savedAsDraft ? 200 : 422 }
    );
  } catch (err) {
    console.error("[trendyol-submit] Beklenmeyen hata:", err);
    return NextResponse.json(
      { success: false, error: `Sunucu hatası: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
