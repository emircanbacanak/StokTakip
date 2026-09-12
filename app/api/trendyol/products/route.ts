import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizeTrendyolDescription } from "@/lib/trendyol-api-client";

const SELLER_ID = process.env.TRENDYOL_SELLER_ID ?? "";
const API_KEY = process.env.TRENDYOL_API_KEY ?? "";
const API_SECRET = process.env.TRENDYOL_API_SECRET ?? "";
const TRENDYOL_URL = "https://apigw.trendyol.com/integration";

function trendyolHeaders(): HeadersInit {
  const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    "User-Agent": `${SELLER_ID} - SelfIntegration`,
    storeFrontCode: "TR",
  };
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      ""
  );
}

/**
 * GET /api/trendyol/products
 * Trendyol API'den canlı ürünleri çeker veya Supabase DB'den listeler.
 * ?sync=true verilirse Trendyol API'den güncel kataloğu çekip Supabase ile eşitler.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sync = searchParams.get("sync") === "true";
    const supabase = getSupabase();

    const barcodeParam = searchParams.get("barcode");
    const modelCodeParam = searchParams.get("modelCode");

    if (modelCodeParam) {
      const queryStr = `stock_code.ilike.%${modelCodeParam}%,batch_id.eq.${modelCodeParam}`;
      const { data } = await supabase
        .from("trendyol_listings")
        .select("id, barcode, stock_code, title, image_urls, trendyol_status, sale_price, quantity")
        .or(queryStr);
      const activeVariants = (data ?? []).filter(
        (t) => t.trendyol_status !== "passive" && t.trendyol_status !== "archived"
      );
      return NextResponse.json({
        success: true,
        count: activeVariants.length,
        variants: activeVariants,
      });
    }

    if (barcodeParam) {
      if (SELLER_ID && API_KEY && API_SECRET) {
        try {
          // Trendyol Product V2: Önce Onaylı (approved), sonra onay bekleyen/reddedilen (unapproved) kontrol et
          let v2Url = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?barcode=${encodeURIComponent(barcodeParam)}`;
          let res = await fetch(v2Url, { headers: trendyolHeaders() });
          let data = res.ok ? await res.json() : null;
          let item = data?.content?.[0];

          if (!item) {
            v2Url = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/unapproved?barcode=${encodeURIComponent(barcodeParam)}`;
            res = await fetch(v2Url, { headers: trendyolHeaders() });
            if (res.ok) {
              data = await res.json();
              item = data?.content?.[0];
            }
          }

          if (item) {
            let cleanDesc = item.description ? sanitizeTrendyolDescription(item.description) : "";

            // Eğer Trendyol API henüz gecikmeli indexliyorsa veya sadece tek satır başlık dönüyorsa:
            // Supabase'deki veya aynı modele ait diğer varyantlardaki zengin açıklamayı al
            try {
              const { data: dbItem } = await supabase
                .from("trendyol_listings")
                .select("description, batch_id")
                .eq("barcode", barcodeParam)
                .maybeSingle();

              if (dbItem?.description && dbItem.description.length > (cleanDesc?.length || 0)) {
                cleanDesc = sanitizeTrendyolDescription(dbItem.description);
              } else if ((!cleanDesc || cleanDesc.length < 150) && (item.productMainId || dbItem?.batch_id)) {
                const mCode = item.productMainId || dbItem?.batch_id;
                const { data: siblings } = await supabase
                  .from("trendyol_listings")
                  .select("description")
                  .or(`batch_id.eq.${mCode},stock_code.ilike.%${mCode}%`)
                  .order("updated_at", { ascending: false })
                  .limit(10);

                const bestDesc = siblings?.find((s: any) => s.description && s.description.length > 200)?.description;
                if (bestDesc) {
                  cleanDesc = sanitizeTrendyolDescription(bestDesc);
                }
              }
            } catch (fallbackErr) {
              console.warn("Description fallback error:", fallbackErr);
            }

            const matchedVariant = item.variants?.find((v: any) => v.barcode === barcodeParam) || item.variants?.[0];

            const normalizedProduct = {
              ...item,
              modelCode: item.productMainId || "",
              productMainId: item.productMainId || "",
              title: item.title,
              brand: typeof item.brand === "object" ? item.brand?.name : (item.brand || ""),
              brandId: typeof item.brand === "object" ? item.brand?.id : undefined,
              categoryName: typeof item.category === "object" ? item.category?.name : (item.category || ""),
              categoryId: typeof item.category === "object" ? item.category?.id : undefined,
              barcode: matchedVariant?.barcode || barcodeParam,
              stockCode: matchedVariant?.stockCode || item.stockCode || "",
              salePrice: matchedVariant?.price?.salePrice ?? item.salePrice,
              listPrice: matchedVariant?.price?.listPrice ?? item.listPrice,
              quantity: matchedVariant?.stock?.quantity ?? item.quantity,
              dimensionalWeight: matchedVariant?.dimensionalWeight ?? item.dimensionalWeight,
              vatRate: matchedVariant?.vatRate ?? item.vatRate,
              images: (item.images ?? []).map((img: any) => (typeof img === "string" ? img : img.url)),
              attributes: item.attributes || [],
              description: cleanDesc,
            };

            return NextResponse.json({
              success: true,
              description: cleanDesc,
              product: normalizedProduct,
            });
          }
        } catch (e) {
          console.warn("[trendyol/products GET by barcode] Live fetch error:", e);
        }
      }

      // Fallback: Supabase'den çek
      const { data: dbItem } = await supabase
        .from("trendyol_listings")
        .select("*")
        .eq("barcode", barcodeParam)
        .maybeSingle();

      if (dbItem) {
        const cleanDesc = dbItem.description ? sanitizeTrendyolDescription(dbItem.description) : "";
        const fallbackModelCode = dbItem.stock_code?.split("-").slice(0, 3).join("-") || dbItem.stock_code || "";
        return NextResponse.json({
          success: true,
          description: cleanDesc,
          listing: dbItem,
          product: {
            ...dbItem,
            modelCode: fallbackModelCode,
            productMainId: fallbackModelCode,
            stockCode: dbItem.stock_code,
            salePrice: dbItem.sale_price,
            listPrice: dbItem.list_price,
            quantity: dbItem.quantity,
            dimensionalWeight: dbItem.desi,
            brand: dbItem.brand_name,
            images: dbItem.image_urls || [],
            description: cleanDesc,
          },
        });
      }

      return NextResponse.json({ success: false, error: "Ürün bulunamadı" }, { status: 404 });
    }

    if (sync) {
      if (!SELLER_ID || !API_KEY || !API_SECRET) {
        return NextResponse.json(
          { error: "Trendyol API bilgileri (.env.local) eksik." },
          { status: 400 }
        );
      }

      let totalSynced = 0;
      const liveBarcodes = new Set<string>();

      // Mevcut veritabanındaki zengin açıklamaları haritala (Trendyol API gecikmeli veya kısa metin dönerse ezilmesin)
      const { data: dbExistingRows } = await supabase
        .from("trendyol_listings")
        .select("barcode, description, batch_id");
      const existingDescMap = new Map<string, string>();
      const modelDescMap = new Map<string, string>();
      (dbExistingRows ?? []).forEach((r: any) => {
        if (r.barcode && r.description && r.description.length > 150) {
          existingDescMap.set(r.barcode, r.description);
          if (r.batch_id) modelDescMap.set(r.batch_id, r.description);
        }
      });

      // 1. Onaylı Ürünler (V2 Approved)
      let page = 0;
      let hasMore = true;
      while (hasMore && page < 20) {
        const url = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?page=${page}&size=50`;
        const res = await fetch(url, { headers: trendyolHeaders() });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Trendyol get approved products error:", res.status, errText);
          break;
        }

        const data = await res.json();
        const items: any[] = data.content ?? [];
        if (items.length === 0) break;

        for (const item of items) {
          const imageUrls = (item.images ?? []).map((img: any) =>
            typeof img === "string" ? img : img.url
          );
          const cleanDesc = item.description ? sanitizeTrendyolDescription(item.description) : "-";
          const brandName = typeof item.brand === "object" ? item.brand?.name : (item.brand || "Yok");

          const variants: any[] = item.variants && item.variants.length > 0
            ? item.variants
            : [{
                barcode: item.barcode,
                stockCode: item.stockCode || item.productMainId,
                price: { salePrice: item.salePrice, listPrice: item.listPrice },
                stock: { quantity: item.quantity },
                dimensionalWeight: item.dimensionalWeight,
                vatRate: item.vatRate,
                onSale: true,
                archived: false,
              }];

          for (const variant of variants) {
            if (!variant.barcode) continue;
            liveBarcodes.add(variant.barcode);
            const status = variant.archived || !variant.onSale ? "passive" : "approved";

            let finalDesc = cleanDesc;
            if (!cleanDesc || cleanDesc.length < 150) {
              const byBarcode = existingDescMap.get(variant.barcode);
              const mId = item.productMainId || variant.stockCode;
              const byModel = mId ? modelDescMap.get(mId) : null;
              if (byBarcode && byBarcode.length > 150) {
                finalDesc = byBarcode;
              } else if (byModel && byModel.length > 150) {
                finalDesc = byModel;
              }
            }
            if (finalDesc && finalDesc.length > 150 && item.productMainId) {
              modelDescMap.set(item.productMainId, finalDesc);
            }

            const record = {
              title: item.title,
              description: finalDesc,
              barcode: variant.barcode,
              stock_code: variant.stockCode || item.productMainId || variant.barcode,
              brand_name: brandName,
              list_price: variant.price?.listPrice ?? variant.price?.salePrice ?? 0,
              sale_price: variant.price?.salePrice ?? 0,
              vat_rate: variant.vatRate ?? 20,
              quantity: variant.stock?.quantity ?? 0,
              image_urls: imageUrls,
              desi: variant.dimensionalWeight ?? null,
              batch_id: item.productMainId || null,
              trendyol_status: status,
              trendyol_product_id: String(item.contentId || ""),
              rejection_reason: null,
              submitted_at: variant.sellerCreatedDate ? new Date(variant.sellerCreatedDate).toISOString() : (item.creationDate ? new Date(item.creationDate).toISOString() : null),
              updated_at: variant.sellerModifiedDate ? new Date(variant.sellerModifiedDate).toISOString() : (item.lastModifiedDate ? new Date(item.lastModifiedDate).toISOString() : new Date().toISOString()),
            };

            let { error } = await supabase
              .from("trendyol_listings")
              .upsert(record, { onConflict: "barcode" });

            if (error && error.message?.includes("trendyol_listings_stock_code_key")) {
              record.stock_code = `${record.stock_code}-${variant.barcode.slice(-4)}`;
              const retry = await supabase
                .from("trendyol_listings")
                .upsert(record, { onConflict: "barcode" });
              error = retry.error;
            }

            if (!error) totalSynced++;
          }
        }

        page++;
        hasMore = page < (data.totalPages ?? 1);
      }

      // 2. Onay Bekleyen / Reddedilen Ürünler (V2 Unapproved)
      try {
        let unapprovedPage = 0;
        let hasMoreUnapproved = true;
        while (hasMoreUnapproved && unapprovedPage < 10) {
          const url = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/unapproved?page=${unapprovedPage}&size=50`;
          const res = await fetch(url, { headers: trendyolHeaders() });
          if (!res.ok) break;

          const data = await res.json();
          const items: any[] = data.content ?? [];
          if (items.length === 0) break;

          for (const item of items) {
            const imageUrls = (item.images ?? []).map((img: any) =>
              typeof img === "string" ? img : img.url
            );
            const cleanDesc = item.description ? sanitizeTrendyolDescription(item.description) : "-";
            const brandName = typeof item.brand === "object" ? item.brand?.name : (item.brand || "Yok");

            const variants: any[] = item.variants && item.variants.length > 0
              ? item.variants
              : [{
                  barcode: item.barcode,
                  stockCode: item.stockCode || item.productMainId,
                  price: { salePrice: item.salePrice, listPrice: item.listPrice },
                  stock: { quantity: item.quantity },
                  dimensionalWeight: item.dimensionalWeight,
                  vatRate: item.vatRate,
                  onSale: true,
                  archived: false,
                }];

            for (const variant of variants) {
              if (!variant.barcode) continue;
              liveBarcodes.add(variant.barcode);
              const status = item.rejected ? "rejected" : "pending";

              const record = {
                title: item.title,
                description: cleanDesc,
                barcode: variant.barcode,
                stock_code: variant.stockCode || item.productMainId || variant.barcode,
                brand_name: brandName,
                list_price: variant.price?.listPrice ?? variant.price?.salePrice ?? 0,
                sale_price: variant.price?.salePrice ?? 0,
                vat_rate: variant.vatRate ?? 20,
                quantity: variant.stock?.quantity ?? 0,
                image_urls: imageUrls,
                desi: variant.dimensionalWeight ?? null,
                batch_id: item.productMainId || null,
                trendyol_status: status,
                trendyol_product_id: String(item.contentId || ""),
                rejection_reason: item.rejectReasonDetails?.join(", ") || null,
                submitted_at: variant.sellerCreatedDate ? new Date(variant.sellerCreatedDate).toISOString() : (item.creationDate ? new Date(item.creationDate).toISOString() : null),
                updated_at: variant.sellerModifiedDate ? new Date(variant.sellerModifiedDate).toISOString() : (item.lastModifiedDate ? new Date(item.lastModifiedDate).toISOString() : new Date().toISOString()),
              };

              let { error } = await supabase
                .from("trendyol_listings")
                .upsert(record, { onConflict: "barcode" });

              if (error && error.message?.includes("trendyol_listings_stock_code_key")) {
                record.stock_code = `${record.stock_code}-${variant.barcode.slice(-4)}`;
                const retry = await supabase
                  .from("trendyol_listings")
                  .upsert(record, { onConflict: "barcode" });
                error = retry.error;
              }

              if (!error) totalSynced++;
            }
          }

          unapprovedPage++;
          hasMoreUnapproved = unapprovedPage < (data.totalPages ?? 1);
        }
      } catch (e) {
        console.warn("Unapproved sync error:", e);
      }

      // 3. Trendyol'da artık var olmayan veya silinmiş kayıtları Supabase'den temizle
      if (liveBarcodes.size > 0) {
        try {
          const { data: currentDbRows } = await supabase
            .from("trendyol_listings")
            .select("barcode");

          const staleBarcodes = (currentDbRows ?? [])
            .map((r: any) => r.barcode)
            .filter((b: string) => b && !liveBarcodes.has(b));

          if (staleBarcodes.length > 0) {
            console.log(`[trendyol/products sync] Trendyol canlı kataloğunda olmayan ${staleBarcodes.length} ürün temizleniyor:`, staleBarcodes);
            await supabase
              .from("trendyol_listings")
              .delete()
              .in("barcode", staleBarcodes);
          }
        } catch (cleanupErr) {
          console.warn("[trendyol/products sync] Temizleme hatası:", cleanupErr);
        }
      }

      console.log(`[trendyol/products] Eşitleme tamamlandı. ${totalSynced} ürün varyantı güncellendi.`);
    }

    // Supabase'den tüm ürünleri çek: Trendyol'daki gibi en yeniden eskiye sırala
    const { data: listings, error } = await supabase
      .from("trendyol_listings")
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Model koduna göre zengin açıklamaları topla
    const modelFullDescMap = new Map<string, string>();
    (listings ?? []).forEach((l: any) => {
      const m = l.batch_id || (l.stock_code?.includes("-") && l.stock_code.split("-").length > 2 ? l.stock_code.split("-").slice(0, 2).join("-") : l.stock_code);
      if (m && l.description && l.description.length > 200 && !modelFullDescMap.has(m)) {
        modelFullDescMap.set(m, l.description);
      }
    });

    const mappedListings = (listings ?? []).map((l: any) => {
      const mCode = l.batch_id || (l.stock_code?.includes("-") && l.stock_code.split("-").length > 2 ? l.stock_code.split("-").slice(0, 2).join("-") : l.stock_code);
      let desc = l.description;
      if ((!desc || desc.length < 150) && mCode && modelFullDescMap.has(mCode)) {
        desc = modelFullDescMap.get(mCode);
      }
      return {
        ...l,
        description: desc,
        model_code: mCode,
        product_main_id: l.batch_id || l.stock_code,
      };
    });

    return NextResponse.json({ success: true, listings: mappedListings });
  } catch (err) {
    console.error("[trendyol/products GET] Hata:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trendyol/products
 * Ürün güncelleme.
 * Eğer `updateByModelCode` true ise aynı modelCode (stock_code / productMainId) değerine sahip tüm ürünleri günceller.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      barcode,
      title,
      description,
      sale_price,
      list_price,
      quantity,
      vat_rate,
      desi,
      stock_code,
      brand_name,
      brand_id,
      category_name,
      category_id,
      image_urls,
      cargo_company,
      updateByModelCode,
      modelCode,
      changedFields = [],
      attributes,
      delivery_duration,
      shipment_address_id,
      returning_address_id,
      lot_number,
      special_consumption_tax,
      gift_wrap,
      customizable,
    } = body;

    if (!barcode && !id) {
      return NextResponse.json(
        { error: "Ürün ID veya Barkod zorunludur" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Hedef ürünleri tespit et
    let targetListings: any[] = [];
    if (updateByModelCode && modelCode) {
      const { data } = await supabase
        .from("trendyol_listings")
        .select("*")
        .or(`stock_code.ilike.%${modelCode}%,barcode.eq.${barcode},batch_id.eq.${modelCode}`);
      targetListings = data ?? [];

      // Trendyol V2 API'sinden bu model koduna (productMainId) ait tüm onaylı varyantları topla
      if (SELLER_ID && API_KEY && API_SECRET) {
        try {
          const v2ModelUrl = `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?productMainId=${encodeURIComponent(modelCode)}`;
          const v2Res = await fetch(v2ModelUrl, { headers: trendyolHeaders() });
          if (v2Res.ok) {
            const v2Data = await v2Res.json();
            const v2Barcodes: string[] = [];
            (v2Data.content ?? []).forEach((c: any) => {
              (c.variants ?? []).forEach((v: any) => {
                // Sadece satışta/aktif olan varyant barkodlarını topla
                if (v.barcode && v.onSale !== false) {
                  v2Barcodes.push(v.barcode);
                }
              });
            });
            if (v2Barcodes.length > 0) {
              const { data: matchedDb } = await supabase
                .from("trendyol_listings")
                .select("*")
                .in("barcode", v2Barcodes);
              if (matchedDb && matchedDb.length > 0) {
                const existingBarcodes = new Set(targetListings.map((t) => t.barcode));
                for (const m of matchedDb) {
                  if (!existingBarcodes.has(m.barcode)) {
                    targetListings.push(m);
                    existingBarcodes.add(m.barcode);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn("Trendyol V2 modelCode query error:", e);
        }
      }

      // Pasif veya arşivlenmiş ürünleri hariç tut (kullanıcının aktif varyant setini bozmamak için)
      targetListings = targetListings.filter((t) => t.trendyol_status !== "passive" && t.trendyol_status !== "archived");

      // Düzenlenen birincil ürünü listenin en başına al
      targetListings.sort((a, b) => {
        const isA = (id && a.id === id) || (barcode && a.barcode === barcode);
        const isB = (id && b.id === id) || (barcode && b.barcode === barcode);
        return isA ? -1 : isB ? 1 : 0;
      });
    } else {
      const query = id
        ? supabase.from("trendyol_listings").select("*").eq("id", id)
        : supabase.from("trendyol_listings").select("*").eq("barcode", barcode);
      const { data } = await query;
      targetListings = data ?? [];
    }

    if (targetListings.length === 0) {
      return NextResponse.json({ error: "Güncellenecek ürün bulunamadı" }, { status: 404 });
    }

    // 2. Trendyol API'ye Fiyat & Stok Gönder (V2 updatePriceAndInventory)
    let apiSuccess = true;
    let apiError: string | null = null;

    if (SELLER_ID && API_KEY && API_SECRET) {
      try {
        // 2a. Fiyat & Stok Güncelleme: POST /inventory/sellers/{sellerId}/products/price-and-inventory
        const inventoryItems = targetListings.map((item) => {
          const isPrimary = (id && item.id === id) || (barcode && item.barcode === barcode);
          return {
            barcode: item.barcode,
            quantity: isPrimary
              ? (quantity !== undefined ? Number(quantity) : item.quantity)
              : (changedFields.includes("quantity") && quantity !== undefined ? Number(quantity) : item.quantity),
            salePrice: isPrimary
              ? (sale_price !== undefined ? Number(sale_price) : item.sale_price)
              : (changedFields.includes("sale_price") && sale_price !== undefined ? Number(sale_price) : item.sale_price),
            listPrice: isPrimary
              ? (list_price !== undefined ? Number(list_price) : (item.list_price || item.sale_price))
              : (changedFields.includes("list_price") && list_price !== undefined ? Number(list_price) : (item.list_price || item.sale_price)),
          };
        });

        const invRes = await fetch(
          `${TRENDYOL_URL}/inventory/sellers/${SELLER_ID}/products/price-and-inventory`,
          {
            method: "POST",
            headers: trendyolHeaders(),
            body: JSON.stringify({ items: inventoryItems }),
          }
        );

        if (!invRes.ok) {
          const text = await invRes.text();
          console.warn("Trendyol inventory update warning:", text);
          apiError = `Trendyol Fiyat/Stok uyarısı: ${text.slice(0, 150)}`;
        }

        // 2b. İçerik & Nitelik Güncelleme (Başlık, Açıklama, Görseller, Özellikler, Desi): V2 content-bulk-update
        if (
          title ||
          description ||
          (image_urls && image_urls.length > 0) ||
          (attributes && attributes.length > 0) ||
          desi !== undefined ||
          delivery_duration !== undefined ||
          category_id !== undefined ||
          brand_id !== undefined
        ) {
          const contentItems = await Promise.all(
            targetListings.map(async (item) => {
              const isPrimary = (id && item.id === id) || (barcode && item.barcode === barcode);

              const descToUse = isPrimary
                ? (description !== undefined ? description : item.description)
                : (changedFields.includes("description") && description !== undefined ? description : item.description);
              const cleanedDesc = descToUse ? sanitizeTrendyolDescription(descToUse) : "";

              // Trendyol content-bulk-update için zorunlu olan contentId tespiti:
              let contentId = item.trendyol_product_id && /^\d+$/.test(String(item.trendyol_product_id))
                ? Number(item.trendyol_product_id)
                : undefined;

              // Eğer veritabanında numeric productContentId yoksa, Trendyol API'den canlı çek
              if (!contentId && item.barcode) {
                try {
                  const getLive = await fetch(
                    `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/approved?barcode=${encodeURIComponent(item.barcode)}`,
                    { headers: trendyolHeaders() }
                  );
                  if (getLive.ok) {
                    const liveJson = await getLive.json();
                    const liveItem = liveJson?.content?.[0];
                    if (liveItem?.contentId || liveItem?.productContentId) {
                      contentId = Number(liveItem.contentId || liveItem.productContentId);
                      item.trendyol_product_id = String(contentId);
                      await supabase
                        .from("trendyol_listings")
                        .update({ trendyol_product_id: String(contentId) })
                        .eq("id", item.id);
                    }
                  }
                } catch (e) {
                  console.warn("Could not fetch live contentId for barcode:", item.barcode, e);
                }
              }

              // Başlık: Birincil ise formdaki başlık, diğer varyant ise sadece changedFields'da 'title' varsa
              const titleToUse = isPrimary
                ? (title || item.title)
                : (changedFields.includes("title") && title ? title : item.title);

              // Görseller: BİRİNCİL ÜRÜNSE formdaki görseller, DİĞER VARYANTLARSA KESİNLİKLE KENDİ GÖRSELLERİ!
              const imagesToUse = isPrimary
                ? (image_urls ?? item.image_urls ?? [])
                : (item.image_urls ?? []);

              // Desi:
              const desiToUse = isPrimary
                ? (desi !== undefined ? Number(desi) : item.desi)
                : (changedFields.includes("desi") && desi !== undefined ? Number(desi) : item.desi);

              // Teslimat Süresi:
              const deliveryToUse = isPrimary
                ? (delivery_duration !== undefined ? Number(delivery_duration) : item.delivery_duration)
                : (changedFields.includes("delivery_duration") && delivery_duration !== undefined ? Number(delivery_duration) : item.delivery_duration);

              // Nitelikler (Attributes):
              // Diğer varyantlar için renk öznitelikleri (47 ve 348) ASLA ezilmez, sadece ortak öznitelikler güncellenir
              let attrsToUse = attributes;
              if (!isPrimary && Array.isArray(attributes)) {
                attrsToUse = attributes.filter((a: any) => a.attributeId !== 47 && a.attributeId !== 348);
              }

              const payloadItem: any = {
                barcode: item.barcode,
                title: titleToUse,
                description: cleanedDesc,
                images: imagesToUse.map((u: string) => ({ url: u })),
                productMainId: item.batch_id || modelCode || item.stock_code,
                stockCode: item.stock_code,
                vatRate: Number(vat_rate ?? item.vat_rate ?? 20),
              };

              if (contentId) {
                payloadItem.contentId = contentId;
                payloadItem.productContentId = contentId;
              }

              if (category_id || item.category_id) {
                payloadItem.categoryId = Number(category_id || item.category_id);
              }

              if (brand_id) {
                payloadItem.brandId = Number(brand_id);
              }

              if (attrsToUse && Array.isArray(attrsToUse) && attrsToUse.length > 0) {
                payloadItem.attributes = attrsToUse;
              }

              if (desiToUse !== undefined) {
                payloadItem.dimensionalWeight = Number(desiToUse);
                payloadItem.desi = Number(desiToUse);
              }

              if (deliveryToUse !== undefined) {
                payloadItem.deliveryDuration = Number(deliveryToUse);
              }

              if (shipment_address_id) {
                payloadItem.shipmentAddressId = Number(shipment_address_id);
              }

              if (returning_address_id) {
                payloadItem.returningAddressId = Number(returning_address_id);
              }

              return payloadItem;
            })
          );

          // Onaylı ürünler için content-bulk-update çağrısı (contentId ile)
          let contentRes = await fetch(
            `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/content-bulk-update`,
            {
              method: "POST",
              headers: trendyolHeaders(),
              body: JSON.stringify({ items: contentItems }),
            }
          );

          if (contentRes.ok) {
            const contentData = await contentRes.json();
            console.log(`[trendyol/products] İçerik güncellemesi Trendyol'a başarıyla iletildi. Batch ID: ${contentData.batchRequestId}`);
          } else {
            const prodText = await contentRes.text();
            console.warn("Trendyol content-bulk-update warning:", prodText);

            // Eğer Trendyol önceki güncelleme talebini hâlâ işliyorsa (rate-limit / recurring), fallback çağırmaya gerek yoktur
            if (prodText.includes("recurring.product.update.not.allowed")) {
              console.warn("Trendyol kuyruğunda önceki güncelleme talebi henüz işleniyor, tekrarlı istek engellendi.");
            } else {
              // Eğer contentId yoksa veya ürün onay bekleyen bir ürünse fallback: unapproved-bulk-update
              const unapprovedRes = await fetch(
                `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/unapproved-bulk-update`,
                {
                  method: "POST",
                  headers: trendyolHeaders(),
                  body: JSON.stringify({ items: contentItems }),
                }
              );

              if (!unapprovedRes.ok) {
                const unapprovedText = await unapprovedRes.text();
                console.warn("Trendyol unapproved-bulk-update warning:", unapprovedText);
              } else {
                const unapprovedData = await unapprovedRes.json();
                console.log(`[trendyol/products] Onaysız ürün güncellemesi iletildi. Batch ID: ${unapprovedData.batchRequestId}`);
              }
            }
          }
        }
      } catch (e) {
        console.error("Trendyol API update exception:", e);
        apiSuccess = false;
        apiError = (e as Error).message;
      }
    }

    // 3. Supabase DB'yi güncelle
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) {
      updatePayload.description = sanitizeTrendyolDescription(description);
    }
    if (sale_price !== undefined) updatePayload.sale_price = Number(sale_price);
    if (list_price !== undefined) updatePayload.list_price = Number(list_price);
    if (quantity !== undefined) updatePayload.quantity = Number(quantity);
    if (vat_rate !== undefined) updatePayload.vat_rate = Number(vat_rate);
    if (desi !== undefined) updatePayload.desi = Number(desi);
    if (brand_name !== undefined) updatePayload.brand_name = brand_name;
    if (category_id !== undefined && category_id) {
      updatePayload.category_id = Number(category_id);
    }
    const primaryTarget =
      targetListings.find((t) => (id && t.id === id) || (barcode && t.barcode === barcode)) ||
      targetListings[0];

    if (stock_code !== undefined && stock_code.trim()) {
      const cleanStock = stock_code.trim();
      const { data: conflict } = await supabase
        .from("trendyol_listings")
        .select("id, stock_code, title")
        .eq("stock_code", cleanStock)
        .neq("id", primaryTarget.id)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json(
          { error: `"${cleanStock}" stok koduna sahip başka bir ürün ("${conflict.title}") sistemde zaten kayıtlı!` },
          { status: 400 }
        );
      }
      updatePayload.stock_code = cleanStock;
    }
    if (image_urls !== undefined && Array.isArray(image_urls)) {
      updatePayload.image_urls = image_urls;
    }
    if (cargo_company !== undefined) {
      updatePayload.cargo_company = cargo_company || null;
    }

    for (const target of targetListings) {
      const isPrimary = (id && target.id === id) || (barcode && target.barcode === barcode);
      if (isPrimary) {
        await supabase
          .from("trendyol_listings")
          .update(updatePayload)
          .eq("id", target.id);
      } else {
        // Diğer varyantlar için SADECE changedFields içindeki alanları güncelle:
        const siblingPayload: any = { updated_at: new Date().toISOString() };
        if (changedFields.includes("description") && description !== undefined) {
          siblingPayload.description = sanitizeTrendyolDescription(description);
        }
        if (changedFields.includes("sale_price") && sale_price !== undefined) {
          siblingPayload.sale_price = Number(sale_price);
        }
        if (changedFields.includes("list_price") && list_price !== undefined) {
          siblingPayload.list_price = Number(list_price);
        }
        if (changedFields.includes("quantity") && quantity !== undefined) {
          siblingPayload.quantity = Number(quantity);
        }
        if (changedFields.includes("desi") && desi !== undefined) {
          siblingPayload.desi = Number(desi);
        }
        if (changedFields.includes("vat_rate") && vat_rate !== undefined) {
          siblingPayload.vat_rate = Number(vat_rate);
        }
        if (changedFields.includes("cargo_company") && cargo_company !== undefined) {
          siblingPayload.cargo_company = cargo_company || null;
        }
        if (changedFields.includes("title") && title !== undefined) {
          siblingPayload.title = title;
        }
        await supabase
          .from("trendyol_listings")
          .update(siblingPayload)
          .eq("id", target.id);
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: targetListings.length,
      apiSuccess,
      apiError,
    });
  } catch (err) {
    console.error("[trendyol/products PUT] Hata:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trendyol/products
 * Yeni ürün ekleme veya ürünü kopyalama.
 * Barkod ve Stok Kodu benzersizlik kontrolü yapar; çakışma varsa hata döndürür.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      barcode,
      stock_code,
      brand_name = "ahenk tasarım",
      sale_price,
      list_price,
      quantity = 100,
      vat_rate = 20,
      desi = 2.0,
      image_urls = [],
      cargo_company = null,
      trendyol_status = "approved",
    } = body;

    if (!barcode || !barcode.trim()) {
      return NextResponse.json({ error: "Barkod alanı zorunludur." }, { status: 400 });
    }
    if (!stock_code || !stock_code.trim()) {
      return NextResponse.json({ error: "Stok Kodu (SKU) alanı zorunludur." }, { status: 400 });
    }
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Ürün Başlığı zorunludur." }, { status: 400 });
    }

    const cleanBarcode = barcode.trim();
    const cleanStockCode = stock_code.trim();
    const cleanDescription = description ? sanitizeTrendyolDescription(description) : "-";

    const supabase = getSupabase();

    // 1. Barkod Çakışma Kontrolü
    const { data: existingBarcode } = await supabase
      .from("trendyol_listings")
      .select("id, barcode, title")
      .eq("barcode", cleanBarcode)
      .maybeSingle();

    if (existingBarcode) {
      return NextResponse.json(
        {
          error: `"${cleanBarcode}" barkoduna sahip bir ürün ("${existingBarcode.title}") sistemde zaten mevcut! Farklı bir barkod belirleyin.`,
          code: "DUPLICATE_BARCODE",
        },
        { status: 400 }
      );
    }

    // 2. Stok Kodu Çakışma Kontrolü
    const { data: existingStockCode } = await supabase
      .from("trendyol_listings")
      .select("id, stock_code, title")
      .eq("stock_code", cleanStockCode)
      .maybeSingle();

    if (existingStockCode) {
      return NextResponse.json(
        {
          error: `"${cleanStockCode}" stok koduna sahip bir ürün ("${existingStockCode.title}") sistemde zaten mevcut! Farklı bir stok kodu belirleyin.`,
          code: "DUPLICATE_STOCK_CODE",
        },
        { status: 400 }
      );
    }

    // 3. Supabase Tablosuna Yeni Ürün Kaydet
    const newRecord = {
      title: title.trim(),
      description: cleanDescription || "-",
      barcode: cleanBarcode,
      stock_code: cleanStockCode,
      brand_name: brand_name.trim(),
      list_price: Number(list_price) || Number(sale_price) || 0,
      sale_price: Number(sale_price) || 0,
      vat_rate: Number(vat_rate) || 20,
      quantity: Number(quantity) || 0,
      desi: Number(desi) || 2.0,
      image_urls: image_urls || [],
      cargo_company: cargo_company || null,
      trendyol_status: trendyol_status || "approved",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertedData, error: insertError } = await supabase
      .from("trendyol_listings")
      .insert(newRecord)
      .select()
      .single();

    if (insertError) {
      console.error("Yeni ürün ekleme DB hatası:", insertError);
      return NextResponse.json(
        { error: `Kayıt oluşturulamadı: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: insertedData,
      message: "Ürün başarıyla oluşturuldu.",
    });
  } catch (err) {
    console.error("[trendyol/products POST] Hata:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trendyol/products
 * Ürünü silme veya arşive alma (Trendyol V2 ve Supabase)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const barcode = searchParams.get("barcode");
    const archiveOnly = searchParams.get("archive") === "true";

    if (!id && !barcode) {
      return NextResponse.json(
        { error: "ID veya Barkod zorunludur" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (archiveOnly) {
      // 1. Supabase'de passive yap ve stok sıfırla
      const query = id
        ? supabase.from("trendyol_listings").update({ trendyol_status: "passive", quantity: 0 }).eq("id", id)
        : supabase.from("trendyol_listings").update({ trendyol_status: "passive", quantity: 0 }).eq("barcode", barcode);
      await query;

      // 2. Trendyol API: Resmî V2 archiveProducts (PUT /product/sellers/{sellerId}/products/archive-state)
      if (SELLER_ID && API_KEY && API_SECRET && barcode) {
        try {
          const archiveRes = await fetch(
            `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products/archive-state`,
            {
              method: "PUT",
              headers: trendyolHeaders(),
              body: JSON.stringify({
                items: [{ barcode, archive: true }],
              }),
            }
          );
          if (!archiveRes.ok) {
            // Fallback olarak stok sıfırla
            await fetch(
              `${TRENDYOL_URL}/inventory/sellers/${SELLER_ID}/products/price-and-inventory`,
              {
                method: "POST",
                headers: trendyolHeaders(),
                body: JSON.stringify({
                  items: [{ barcode, quantity: 0 }],
                }),
              }
            );
          }
        } catch (e) {
          console.warn("Trendyol archive exception:", e);
        }
      }

      return NextResponse.json({ success: true, archived: true });
    }

    // Tamamen sil: Resmî V2 DELETE /product/sellers/{sellerId}/products
    if (SELLER_ID && API_KEY && API_SECRET && barcode) {
      try {
        await fetch(
          `${TRENDYOL_URL}/product/sellers/${SELLER_ID}/products`,
          {
            method: "DELETE",
            headers: trendyolHeaders(),
            body: JSON.stringify({
              items: [{ barcode }],
            }),
          }
        );
      } catch (e) {
        console.warn("Trendyol delete exception:", e);
      }
    }

    const deleteQuery = id
      ? supabase.from("trendyol_listings").delete().eq("id", id)
      : supabase.from("trendyol_listings").delete().eq("barcode", barcode);
    await deleteQuery;

    return NextResponse.json({ success: true, deleted: true });
  } catch (err) {
    console.error("[trendyol/products DELETE] Hata:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Sunucu hatası" },
      { status: 500 }
    );
  }
}
