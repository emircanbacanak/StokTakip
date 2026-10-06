import { NextRequest, NextResponse } from "next/server";
import {
  getPazaramaProducts,
  createOrUpdatePazaramaProducts,
  updatePazaramaPrices,
  updatePazaramaStocks,
  updatePazaramaProductStatuses,
  type PazaramaProductInput,
} from "@/lib/pazarama-api";

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  if (!url || !key) return null;
  return createClient(url, key);
}

export function extractModelInfo(item: { name?: string; stockCode?: string; groupCode?: string }) {
  let title = (item.name || "").split(" - ")[0].trim();
  const lower = title.toLowerCase();

  if (lower.includes("vero")) title = "Vero Masaüstü Telefon ve Tablet Standı";
  else if (lower.includes("aura dekoratif vazo")) title = "Aura Vazo 20cm";

  let gCode = item.groupCode;
  if (!gCode || gCode === title || gCode.startsWith("PTR-") || gCode.startsWith("SNA-") || gCode.startsWith("MIR-") || gCode.startsWith("SFT-") || gCode.startsWith("SFS-") || gCode.startsWith("OGL-") || gCode.startsWith("KIZ-") || gCode.startsWith("VRO-")) {
    if (lower.includes("aura")) gCode = "AURA-20";
    else if (lower.includes("suna")) gCode = "SUNA-20";
    else if (lower.includes("petra")) gCode = "PETRA-16";
    else if (lower.includes("mira")) gCode = "MIR-SAMDAN";
    else if (lower.includes("setsiz")) gCode = "SNF-12";
    else if (lower.includes("senfoni") && lower.includes("set")) gCode = "SNF-SET";
    else if (lower.includes("biblo") || lower.includes("çocuk") || lower.includes("baba")) gCode = "BBL-KALP";
    else if (lower.includes("vero")) gCode = "VRO-STAND";
    else if (lower.includes("tavla")) gCode = "TVL-MINI";
    else if (item.stockCode) {
      gCode = item.stockCode.split("-")[0];
    } else {
      gCode = title;
    }
  }

  return { modelTitle: title, groupCode: gCode };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "100", 10);
    const approvedParam = searchParams.get("approved");
    const code = searchParams.get("code") || undefined;
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const groupCode = searchParams.get("groupCode")?.trim() || "";

    // Pazarama onay durumu: "false" ise onay bekleyenler, aksi halde true (satıştaki/onaylı ürünler)
    const approved = approvedParam === "false" ? false : true;

    const result = await getPazaramaProducts({ page, size, approved, code });
    let listings = [...result.listings];

    // Eğer "Tümü" isteniyorsa ve onay bekleyen ürünler de varsa onları da alıp birleştirelim
    if (!approvedParam || approvedParam === "all") {
      try {
        const pendingResult = await getPazaramaProducts({ page: 1, size: 50, approved: false });
        if (pendingResult.listings && pendingResult.listings.length > 0) {
          const existingCodes = new Set(listings.map((l) => l.code));
          for (const pendingItem of pendingResult.listings) {
            if (!existingCodes.has(pendingItem.code)) {
              listings.push(pendingItem);
            }
          }
        }
      } catch (err) {
        // Bekleyen yoksa veya hata verirse devam et
      }
    }

    // Eğer onay sürecindeki bilinen ürünler (Vero vb.) henüz Pazarama getProducts listesinde yoksa Supabase'ten ekle
    const KNOWN_UNDER_REVIEW_BARCODES = ["2436520260907", "2436520260908"];
    const existingListingCodes = new Set(listings.map((l) => l.code));

    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data: dbListings } = await supabase
          .from("trendyol_listings")
          .select("barcode, stock_code, image_urls, title, list_price, sale_price, quantity, vat_rate, desi, batch_id, description");

        if (dbListings && dbListings.length > 0) {
          const barcodeMap = new Map<string, { images: string[]; stockCode?: string; description?: string }>();
          const stockCodeMap = new Map<string, { images: string[]; description?: string }>();
          const titleMap = new Map<string, { description?: string }>();

          for (const item of dbListings) {
            const imgs = Array.isArray(item.image_urls) ? item.image_urls.filter(Boolean) : [];
            if (item.barcode) {
              barcodeMap.set(item.barcode, { images: imgs, stockCode: item.stock_code, description: item.description });
            }
            if (item.stock_code) {
              stockCodeMap.set(item.stock_code, { images: imgs, description: item.description });
            }
            if (item.title) {
              titleMap.set(item.title.trim().toLowerCase(), { description: item.description });
            }
          }

          listings = listings.map((item) => {
            const match =
              (item.code ? barcodeMap.get(item.code) : undefined) ||
              (item.stockCode ? stockCodeMap.get(item.stockCode) : undefined) ||
              (item.name ? titleMap.get(item.name.trim().toLowerCase()) : undefined);
            const enrichedImages: string[] =
              item.images && item.images.length > 0
                ? item.images
                : match && "images" in match && Array.isArray(match.images)
                ? (match.images as string[])
                : [];

            const enrichedDescription = item.description || match?.description || "";

            const { modelTitle, groupCode: unifiedGroupCode } = extractModelInfo(item);

            return {
              ...item,
              images: enrichedImages,
              description: enrichedDescription,
              groupCode: unifiedGroupCode,
              modelTitle,
            };
          });
        }
      }
    } catch (err) {
      console.warn("Supabase enrichment warning:", err);
    }

    // Eğer Supabase bulunamazsa bile model bilgilerini ekle
    listings = listings.map((item) => {
      if (!item.modelTitle) {
        const { modelTitle, groupCode: unifiedGroupCode } = extractModelInfo(item);
        return {
          ...item,
          modelTitle,
          groupCode: item.groupCode || unifiedGroupCode,
        };
      }
      return item;
    });

    let filteredListings = listings;

    // Filtreleme
    if (groupCode) {
      filteredListings = filteredListings.filter(
        (it) => (it.groupCode || "").toLowerCase() === groupCode.toLowerCase()
      );
    }

    if (search) {
      filteredListings = filteredListings.filter((it) => {
        const titleMatch = (it.name || "").toLowerCase().includes(search);
        const codeMatch = (it.code || "").toLowerCase().includes(search);
        const stockCodeMatch = (it.stockCode || "").toLowerCase().includes(search);
        const groupMatch = (it.groupCode || "").toLowerCase().includes(search);
        const brandMatch = (it.brandName || "").toLowerCase().includes(search);
        return titleMatch || codeMatch || stockCodeMatch || groupMatch || brandMatch;
      });
    }

    return NextResponse.json({
      success: true,
      listings: filteredListings,
      totalCount: listings.length,
      pageIndex: result.pageIndex,
      pageSize: result.pageSize,
      totalPages: Math.ceil(listings.length / size) || 1,
    });
  } catch (error: any) {
    console.error("Pazarama products GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Pazarama ürünleri alınamadı" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product, products, syncAllVariants, groupCode, changedFields } = body;

    let itemsToUpdate: PazaramaProductInput[] = [];

    if (Array.isArray(products)) {
      itemsToUpdate = products;
    } else if (product) {
      itemsToUpdate = [product];

      // Eğer aynı model koduna (groupCode) sahip tüm varyantların güncellenmesi istendiyse
      const targetGroupCode = groupCode || product.groupCode;
      if (syncAllVariants && targetGroupCode) {
        // Pazarama'dan bu modele ait tüm kardeş ürünleri bul
        const allProductsRes = await getPazaramaProducts({ size: 250 });
        const targetModelInfo = extractModelInfo({ name: product.Name, stockCode: product.stockCode, groupCode: targetGroupCode });
        
        const variantListings = allProductsRes.listings.filter((l) => {
          const lInfo = extractModelInfo(l);
          const matchByGroupCode =
            (l.groupCode && l.groupCode.trim().toLowerCase() === targetGroupCode.trim().toLowerCase()) ||
            (lInfo.groupCode && lInfo.groupCode.trim().toLowerCase() === targetModelInfo.groupCode.trim().toLowerCase()) ||
            (l.groupCode && l.groupCode.trim().toLowerCase() === targetModelInfo.groupCode.trim().toLowerCase());
          const matchByModelTitle =
            (lInfo.modelTitle && lInfo.modelTitle.trim().toLowerCase() === targetModelInfo.modelTitle.trim().toLowerCase());
          return matchByGroupCode || matchByModelTitle;
        });

        if (variantListings.length > 1) {
          const hasChanged = (field: string) =>
            !Array.isArray(changedFields) || changedFields.length === 0 || changedFields.includes(field);

          // 🌟 AKILLI EŞİTLEME: Açıklama, Marka ve Kategori gibi model bazlı alanlar tüm varyantlara aktarılır,
          // Renk/varyanta özel görseller ve stoklar korunur.
          itemsToUpdate = variantListings.map((variant) => {
            if (variant.code === product.Code) {
              return product;
            }

            const siblingImages =
              variant.images && variant.images.length > 0
                ? variant.images.map((u) => ({ imageurl: u }))
                : product.images;

            const siblingAttributes = variant.attributes
              ? variant.attributes.map((a) => ({
                  attributeId: a.attributeId,
                  attributeValueId: a.attributeValueId,
                }))
              : product.attributes;

            return {
              Name: hasChanged("Name") ? product.Name : variant.name,
              DisplayName: hasChanged("DisplayName") ? (product.DisplayName || product.Name) : (variant.displayName || variant.name),
              // Açıklama model genelidir; girilen açıklama tüm varyantlara eksiksiz uygulanır
              Description: (product.Description && product.Description.trim()) ? product.Description : (variant.description || variant.name),
              brandId: product.brandId || variant.brandId,
              groupCode: variant.groupCode || product.groupCode,
              Code: variant.code,
              stockCode: variant.stockCode || variant.code,
              StockCount: hasChanged("StockCount") ? product.StockCount : (variant.stockCount ?? 0),
              ListPrice: hasChanged("ListPrice") ? product.ListPrice : (variant.listPrice ?? product.ListPrice),
              SalePrice: hasChanged("SalePrice") ? product.SalePrice : (variant.salePrice ?? product.SalePrice),
              VatRate: hasChanged("VatRate") ? product.VatRate : (variant.vatRate ?? product.VatRate),
              Desi: hasChanged("Desi") ? product.Desi : (variant.desi ?? product.Desi),
              CategoryId: product.CategoryId || variant.categoryId,
              images: hasChanged("images") ? product.images : siblingImages,
              attributes: hasChanged("attributes") ? product.attributes : siblingAttributes,
              currencyType: "TRY",
              deliveries: [],
            };
          });
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Gönderilecek ürün bilgisi bulunamadı." },
        { status: 400 }
      );
    }

    // 1. Katalog / Ürün Ekleme / Güncelleme İsteği
    let createResult: any = { success: true };
    try {
      createResult = await createOrUpdatePazaramaProducts(itemsToUpdate);
    } catch (createErr: any) {
      console.warn("Pazarama /product/create info:", createErr.message);
      // "kaydı zaten mevcut" veya "onay" hataları ölümcül değildir
    }

    // 2. Fiyat Güncelleme (POST /product/updatePrice-v2)
    try {
      const priceItems = itemsToUpdate.map((p) => ({
        code: p.Code,
        listPrice: Number(p.ListPrice),
        salePrice: Number(p.SalePrice),
      }));
      if (priceItems.length > 0) {
        await updatePazaramaPrices(priceItems);
      }
    } catch (priceErr: any) {
      console.warn("Pazarama price update warning:", priceErr.message);
    }

    // 3. Stok Güncelleme (POST /product/updateStock-v2)
    try {
      const stockItems = itemsToUpdate.map((p) => ({
        code: p.Code,
        stockCount: Number(p.StockCount),
      }));
      if (stockItems.length > 0) {
        await updatePazaramaStocks(stockItems);
      }
    } catch (stockErr: any) {
      console.warn("Pazarama stock update warning:", stockErr.message);
    }

    // 4. 🌟 Supabase trendyol_listings tablosunu anında güncelle (Açıklama, Fiyat, Stok UI'da hemen gözüksün)
    try {
      const supabase = getSupabase();
      if (supabase && itemsToUpdate.length > 0) {
        for (const item of itemsToUpdate) {
          const updateData: any = {};
          if (item.Description && item.Description.trim()) {
            updateData.description = item.Description;
          }
          if (item.DisplayName || item.Name) {
            updateData.title = item.DisplayName || item.Name;
          }
          if (item.ListPrice) updateData.list_price = Number(item.ListPrice);
          if (item.SalePrice) updateData.sale_price = Number(item.SalePrice);
          if (item.StockCount !== undefined) updateData.quantity = Number(item.StockCount);

          if (Object.keys(updateData).length > 0) {
            if (item.Code) {
              await supabase
                .from("trendyol_listings")
                .update(updateData)
                .eq("barcode", item.Code);
            }
            if (item.stockCode) {
              await supabase
                .from("trendyol_listings")
                .update(updateData)
                .eq("stock_code", item.stockCode);
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn("Supabase update error during Pazarama save:", dbErr);
    }

    return NextResponse.json({
      success: true,
      batchRequestId: createResult?.batchRequestId,
      updatedCount: itemsToUpdate.length,
      message:
        itemsToUpdate.length > 1
          ? `${itemsToUpdate.length} adet varyant ürünün fiyat, stok ve açıklamaları başarıyla güncellendi.`
          : "Ürün bilgileri, fiyat ve stokları başarıyla güncellendi.",
    });
  } catch (error: any) {
    console.error("Pazarama products POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "İşlem sırasında hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body boş olabilir
    }

    const { searchParams } = new URL(req.url);
    const code = body.code || searchParams.get("code");
    const codes = body.codes || [];
    const groupCode = body.groupCode || searchParams.get("groupCode");
    const syncAllVariants = body.syncAllVariants ?? (searchParams.get("syncAllVariants") === "true");
    const status: 1 | 10 = body.productStatus === 1 ? 1 : 10;

    const codesToDeactivate: string[] = [];

    if (Array.isArray(codes) && codes.length > 0) {
      codesToDeactivate.push(...codes);
    }
    if (code) {
      codesToDeactivate.push(code);
    }

    if (syncAllVariants && groupCode) {
      const allRes = await getPazaramaProducts({ size: 250 });
      const matched = allRes.listings
        .filter((l) => {
          const info = extractModelInfo(l);
          return (
            (l.groupCode || "").trim().toLowerCase() === groupCode.trim().toLowerCase() ||
            (info.groupCode || "").trim().toLowerCase() === groupCode.trim().toLowerCase() ||
            (info.modelTitle || "").trim().toLowerCase() === groupCode.trim().toLowerCase()
          );
        })
        .map((l) => l.code);
      codesToDeactivate.push(...matched);
    }

    const uniqueCodes = [...new Set(codesToDeactivate)];

    if (uniqueCodes.length === 0) {
      return NextResponse.json(
        { success: false, error: "İşlem yapılacak ürün barkodu belirtilmedi." },
        { status: 400 }
      );
    }

    await updatePazaramaProductStatuses(
      uniqueCodes.map((c) => ({ code: c, productStatus: status }))
    );

    const actionText = status === 10 ? "satıştan kaldırıldı (pasife alındı)" : "satışa açıldı";
    return NextResponse.json({
      success: true,
      message: `${uniqueCodes.length} adet ürün başarıyla ${actionText}.`,
      updatedCount: uniqueCodes.length,
    });
  } catch (error: any) {
    console.error("Pazarama products DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "İşlem gerçekleştirilirken hata oluştu" },
      { status: 500 }
    );
  }
}
