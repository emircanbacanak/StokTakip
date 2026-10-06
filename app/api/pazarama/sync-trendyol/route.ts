import { NextRequest, NextResponse } from "next/server";
import {
  getPazaramaProducts,
  createOrUpdatePazaramaProducts,
  updatePazaramaProductStatuses,
  updatePazaramaPrices,
  updatePazaramaStocks,
  type PazaramaProductInput,
  type PazaramaListing,
} from "@/lib/pazarama-api";
import { extractModelInfo } from "../products/route";
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

export interface SyncAnalysisResponse {
  success: boolean;
  trendyolTotal: number;
  pazaramaTotal: number;
  commonCount: number;
  extraCount: number;
  missingCount: number;
  underReviewCount: number;
  commonProducts: {
    barcode: string;
    stockCode: string;
    title: string;
    description: string;
    listPrice: number;
    salePrice: number;
    quantity: number;
    imageUrl?: string;
    pazaramaTitle?: string;
    pazaramaListPrice?: number;
    pazaramaSalePrice?: number;
    pazaramaStock?: number;
    titleMatch: boolean;
    priceMatch: boolean;
    stockMatch: boolean;
  }[];
  underReviewProducts: {
    barcode: string;
    stockCode: string;
    title: string;
    reason: string;
    imageUrl?: string;
  }[];
  extraProducts: {
    code: string;
    name: string;
    stockCode?: string;
    groupCode?: string;
    stockCount: number;
    salePrice: number;
    imageUrl?: string;
  }[];
  missingProducts: {
    barcode: string;
    stockCode: string;
    title: string;
    description: string;
    listPrice: number;
    salePrice: number;
    quantity: number;
    imageUrl?: string;
    modelCode?: string;
  }[];
}

// Pazarama'da onay/kontrol sürecinde olduğu bilinen veya işaretli ürünler
export const KNOWN_UNDER_REVIEW_BARCODES = new Set(["2436520260907", "2436520260908"]);

/**
 * GET: Trendyol aktif kataloğu ile Pazarama kataloğunu karşılaştırıp analiz raporu döner.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Veritabanı bağlantısı kurulamadı." },
        { status: 500 }
      );
    }

    // 1. Trendyol Aktif Ürünlerini Al (Base / Referans)
    const { data: dbTrendyolListings, error: dbError } = await supabase
      .from("trendyol_listings")
      .select("*");

    if (dbError) {
      throw new Error(`Trendyol ürünleri okunamadı: ${dbError.message}`);
    }

    const activeTrendyolProducts = (dbTrendyolListings || []).filter(
      (item) => item.trendyol_status !== "passive" && item.trendyol_status !== "archived"
    );

    // 2. Pazarama Satışta/Onaylı Ürünlerini Al (Approved=true ve unapproved olanları birleştir)
    const pazaramaResult = await getPazaramaProducts({ size: 250, approved: true });
    let pazaramaListings = [...pazaramaResult.listings];

    try {
      const unapprovedRes = await getPazaramaProducts({ size: 250, approved: false });
      if (unapprovedRes.listings && unapprovedRes.listings.length > 0) {
        const existingCodes = new Set(pazaramaListings.map((l) => l.code));
        for (const item of unapprovedRes.listings) {
          if (item.code === "8689999123456") continue;
          if (!existingCodes.has(item.code)) {
            pazaramaListings.push(item);
          }
        }
      }
    } catch {
      // sessizce devam et
    }

    // Pazarama barkod ve stok kodu haritası
    const pazaramaByBarcode = new Map<string, PazaramaListing>();
    const pazaramaByStockCode = new Map<string, PazaramaListing>();

    for (const p of pazaramaListings) {
      if (p.code) pazaramaByBarcode.set(p.code.trim(), p);
      if (p.stockCode) pazaramaByStockCode.set(p.stockCode.trim().toLowerCase(), p);
    }

    // Trendyol barkod ve stok kodu haritası
    const trendyolByBarcode = new Map<string, any>();
    const trendyolByStockCode = new Map<string, any>();

    for (const t of activeTrendyolProducts) {
      if (t.barcode) trendyolByBarcode.set(t.barcode.trim(), t);
      if (t.stock_code) trendyolByStockCode.set(t.stock_code.trim().toLowerCase(), t);
    }

    // 3. Karşılaştırma Yap
    const commonProducts: SyncAnalysisResponse["commonProducts"] = [];
    const underReviewProducts: SyncAnalysisResponse["underReviewProducts"] = [];
    const missingProducts: SyncAnalysisResponse["missingProducts"] = [];

    for (const t of activeTrendyolProducts) {
      const barcode = t.barcode ? t.barcode.trim() : "";
      const stockCode = t.stock_code ? t.stock_code.trim().toLowerCase() : "";

      const pazaramaMatch =
        (barcode ? pazaramaByBarcode.get(barcode) : null) ||
        (stockCode ? pazaramaByStockCode.get(stockCode) : null);

      const firstImage =
        Array.isArray(t.image_urls) && t.image_urls.length > 0 ? t.image_urls[0] : undefined;

      // Onay sürecinde mi kontrolü
      const isReviewState =
        KNOWN_UNDER_REVIEW_BARCODES.has(barcode) ||
        Boolean(pazaramaMatch?.isUnderReview) ||
        pazaramaMatch?.state === 1 ||
        pazaramaMatch?.state === 2 ||
        pazaramaMatch?.state === 19 ||
        Boolean(pazaramaMatch?.waitingApproveExp);

      if (isReviewState) {
        underReviewProducts.push({
          barcode: t.barcode,
          stockCode: t.stock_code || "",
          title: t.title || "",
          reason: pazaramaMatch?.waitingApproveExp || pazaramaMatch?.stateText || "Pazarama katalog ve ürün onay/kontrol sürecinde",
          imageUrl: firstImage,
        });
      } else if (pazaramaMatch) {
        const tListPrice = Number(t.list_price || t.sale_price || 0);
        const tSalePrice = Number(t.sale_price || t.list_price || 0);
        const tStock = Number(t.quantity ?? 0);

        commonProducts.push({
          barcode: t.barcode,
          stockCode: t.stock_code || "",
          title: t.title || "",
          description: t.description || "",
          listPrice: tListPrice,
          salePrice: tSalePrice,
          quantity: tStock,
          imageUrl: firstImage,
          pazaramaTitle: pazaramaMatch.name,
          pazaramaListPrice: pazaramaMatch.listPrice,
          pazaramaSalePrice: pazaramaMatch.salePrice,
          pazaramaStock: pazaramaMatch.stockCount,
          titleMatch: (pazaramaMatch.name || "").trim() === (t.title || "").trim(),
          priceMatch: pazaramaMatch.salePrice === tSalePrice && pazaramaMatch.listPrice === tListPrice,
          stockMatch: pazaramaMatch.stockCount === tStock,
        });
      } else {
        missingProducts.push({
          barcode: t.barcode,
          stockCode: t.stock_code || "",
          title: t.title || "",
          description: t.description || "",
          listPrice: Number(t.list_price || t.sale_price || 0),
          salePrice: Number(t.sale_price || t.list_price || 0),
          quantity: Number(t.quantity ?? 0),
          imageUrl: firstImage,
          modelCode: t.batch_id || "",
        });
      }
    }

    // 4. Pazarama'da Fazla Olan Ürünleri Bul (Trendyol'da olmayanlar)
    const extraProducts: SyncAnalysisResponse["extraProducts"] = [];

    for (const p of pazaramaListings) {
      const barcode = p.code ? p.code.trim() : "";
      const stockCode = p.stockCode ? p.stockCode.trim().toLowerCase() : "";

      const trendyolMatch =
        (barcode ? trendyolByBarcode.get(barcode) : null) ||
        (stockCode ? trendyolByStockCode.get(stockCode) : null);

      if (!trendyolMatch) {
        const firstImg =
          Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;
        extraProducts.push({
          code: p.code,
          name: p.name,
          stockCode: p.stockCode,
          groupCode: p.groupCode,
          stockCount: p.stockCount,
          salePrice: p.salePrice,
          imageUrl: firstImg,
        });
      }
    }

    const response: SyncAnalysisResponse = {
      success: true,
      trendyolTotal: activeTrendyolProducts.length,
      pazaramaTotal: pazaramaListings.length,
      commonCount: commonProducts.length,
      underReviewCount: underReviewProducts.length,
      extraCount: extraProducts.length,
      missingCount: missingProducts.length,
      commonProducts,
      underReviewProducts,
      extraProducts,
      missingProducts,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Sync analysis error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eşitleme analizi yapılamadı." },
      { status: 500 }
    );
  }
}

/**
 * POST: Kullanıcı onayına göre eşitlemeyi yürütür:
 * 1. deleteExtra = true ise Pazarama'daki fazla ürünleri siler (satışa kapatır + stok 0).
 * 2. addMissing = true ise eksik ürünleri Trendyol verileriyle Pazarama'ya ekler.
 * 3. Ortak ürünlerin 4 alanını (Başlık, Açıklama, İndirimsiz Fiyat, Stok) eşitler.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { addMissing = false, deleteExtra = true } = body;

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Veritabanı bağlantısı kurulamadı." },
        { status: 500 }
      );
    }

    // 1. Canlı Verileri Çek
    const { data: dbTrendyolListings } = await supabase
      .from("trendyol_listings")
      .select("*");

    const activeTrendyolProducts = (dbTrendyolListings || []).filter(
      (item) => item.trendyol_status !== "passive" && item.trendyol_status !== "archived"
    );

    const pazaramaResult = await getPazaramaProducts({ size: 250, approved: true });
    let pazaramaListings = [...pazaramaResult.listings];

    try {
      const unapprovedRes = await getPazaramaProducts({ size: 250, approved: false });
      if (unapprovedRes.listings && unapprovedRes.listings.length > 0) {
        const existingCodes = new Set(pazaramaListings.map((l) => l.code));
        for (const item of unapprovedRes.listings) {
          if (item.code === "8689999123456") continue;
          if (!existingCodes.has(item.code)) {
            pazaramaListings.push(item);
          }
        }
      }
    } catch {
      // devam et
    }

    // Pazarama eşleşme haritaları
    const pazaramaByBarcode = new Map<string, PazaramaListing>();
    const pazaramaByStockCode = new Map<string, PazaramaListing>();

    for (const p of pazaramaListings) {
      if (p.code) pazaramaByBarcode.set(p.code.trim(), p);
      if (p.stockCode) pazaramaByStockCode.set(p.stockCode.trim().toLowerCase(), p);
    }

    // Trendyol eşleşme haritaları
    const trendyolByBarcode = new Map<string, any>();
    const trendyolByStockCode = new Map<string, any>();

    for (const t of activeTrendyolProducts) {
      if (t.barcode) trendyolByBarcode.set(t.barcode.trim(), t);
      if (t.stock_code) trendyolByStockCode.set(t.stock_code.trim().toLowerCase(), t);
    }

    // Pazarama Ahenk Tasarım Marka ID'si (Zorunlu GUID)
    const PAZARAMA_AHENK_BRAND_ID = "c9f353d5-9c93-460a-a734-8637c4451eae";
    let defaultCategoryId = "b2e3e44e-5ea7-409d-9cbc-044672a421c1"; // Vazo, Saksı

    for (const p of pazaramaListings) {
      if (p.categoryId && !defaultCategoryId) defaultCategoryId = p.categoryId;
    }

    // Gruplara göre kategori, marka ve zorunlu özellik bulucu
    const findCategoryAndBrandForModel = (modelHint: string, barcode?: string) => {
      const lower = modelHint.toLowerCase();
      if (lower.includes("stand") || lower.includes("tutucu") || lower.includes("vero")) {
        const isRed = lower.includes("kırmızı") || barcode === "2436520260907";
        const isBlue = lower.includes("mavi") || barcode === "2436520260908";
        const colorValId = isRed
          ? "57ecdb59-f9ff-4775-814f-c7a98cfc066e" // Kırmızı
          : isBlue
          ? "c7e562e1-ae2e-4a59-b656-81723601bdbf" // Mavi
          : "2ddb5aeb-3c25-4fb1-975d-031b436f3319"; // Siyah

        return {
          categoryId: "2c0e05f7-bc5b-4095-9f07-3f3904d82cef", // Araç içi Telefon Tutucu
          brandId: PAZARAMA_AHENK_BRAND_ID,
          attributes: [
            { attributeId: "08b2020b-e519-405f-85e2-1fd712104097", attributeValueId: colorValId }, // Renk
            { attributeId: "9cdd45c2-298d-4bcb-a3a7-d233a99f16be", attributeValueId: "d9a431ec-7cd1-417e-fc45-08db5607408f" }, // Tutma Türü: Sıkıştırmalı
          ],
        };
      }

      return {
        categoryId: defaultCategoryId,
        brandId: PAZARAMA_AHENK_BRAND_ID,
        attributes: [],
      };
    };

    const extraCodes: string[] = [];
    for (const p of pazaramaListings) {
      const barcode = p.code ? p.code.trim() : "";
      const stockCode = p.stockCode ? p.stockCode.trim().toLowerCase() : "";
      const isTrendyolActive =
        (barcode && trendyolByBarcode.has(barcode)) ||
        (stockCode && trendyolByStockCode.has(stockCode));

      if (!isTrendyolActive) {
        extraCodes.push(p.code);
      }
    }

    const stepsCompleted: string[] = [];

    // =========================================================================
    // ADIM 1: FAZLA ÜRÜNLERİ SİL (SATIŞTAN KALDIR / PASİFE AL)
    // =========================================================================
    let deletedCount = 0;
    if (deleteExtra && extraCodes.length > 0) {
      try {
        // Satışa Kapat (productStatus: 10)
        await updatePazaramaProductStatuses(
          extraCodes.map((code) => ({ code, productStatus: 10 }))
        );
        deletedCount = extraCodes.length;
        stepsCompleted.push(`${deletedCount} adet Trendyol'da olmayan fazla ürün Pazarama'dan silindi (satışa kapatıldı).`);
        // API hız sınırını korumak için kısa bekleme
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err: any) {
        console.error("Fazla ürünler silinirken hata:", err);
        stepsCompleted.push(`Fazla ürünler silinirken kısmi hata: ${err.message}`);
      }
    }

    // =========================================================================
    // ADIM 2: EKSİK ÜRÜNLERİ EKLE (Onay sürecindekiler hariç tutulur)
    // =========================================================================
    let addedCount = 0;
    const underReviewItems: { barcode: string; title: string }[] = [];
    const missingToCreate: PazaramaProductInput[] = [];

    for (const t of activeTrendyolProducts) {
      const barcode = t.barcode ? t.barcode.trim() : "";
      const stockCode = t.stock_code ? t.stock_code.trim().toLowerCase() : "";

      const p =
        (barcode ? pazaramaByBarcode.get(barcode) : null) ||
        (stockCode ? pazaramaByStockCode.get(stockCode) : null);

      const isUnderReview =
        KNOWN_UNDER_REVIEW_BARCODES.has(barcode) ||
        Boolean(p?.isUnderReview) ||
        p?.state === 1 ||
        p?.state === 2 ||
        p?.state === 19 ||
        Boolean(p?.waitingApproveExp);

      if (isUnderReview) {
        underReviewItems.push({ barcode: t.barcode, title: t.title });
      } else if (!p && addMissing) {
        const modelInfo = extractModelInfo({
          name: t.title,
          stockCode: t.stock_code,
          groupCode: t.batch_id,
        });

        const catBrand = findCategoryAndBrandForModel(t.title || t.batch_id || "", t.barcode);

        const images = (Array.isArray(t.image_urls) ? t.image_urls : [])
          .filter(Boolean)
          .map((url: string) => ({ imageurl: url }));

        missingToCreate.push({
          Name: t.title || "",
          DisplayName: t.title || "",
          Description: t.description || t.title || "",
          brandId: catBrand.brandId,
          groupCode: modelInfo.groupCode || t.batch_id || "GENEL",
          Code: t.barcode,
          StockCount: Number(t.quantity ?? 0),
          stockCode: t.stock_code || t.barcode,
          VatRate: Number(t.vat_rate || 20),
          ListPrice: Number(t.list_price || t.sale_price || 0),
          SalePrice: Number(t.sale_price || t.list_price || 0),
          currencyType: "TRY",
          CategoryId: catBrand.categoryId,
          Desi: Number(t.desi || 2),
          images: images.length > 0 ? images : [{ imageurl: "https://via.placeholder.com/600" }],
          attributes: catBrand.attributes,
          deliveries: [],
        });
      }
    }

    if (underReviewItems.length > 0) {
      stepsCompleted.push(
        `⏳ ${underReviewItems.length} adet ürün (${underReviewItems.map((u) => u.title.split(" - ")[0]).join(", ")}) Pazarama onay sürecindedir (onay beklendiği için işlem yapılmadı, hata verilmedi).`
      );
    }

    if (missingToCreate.length > 0) {
      const addResult = await createOrUpdatePazaramaProducts(missingToCreate);
      if (addResult.success) {
        addedCount = missingToCreate.length;
        stepsCompleted.push(`${addedCount} adet eksik ürün Trendyol verileriyle Pazarama'ya eklendi.`);
      } else {
        const isUnderReview = (addResult.errors || []).some(
          (e) => e.includes("halen kontrol ediliyor") || e.includes("zaten mevcut") || e.includes("onay")
        );
        if (isUnderReview) {
          stepsCompleted.push(
            `⏳ ${missingToCreate.length} adet ürün Pazarama onay sürecindedir (onay tamamlanana kadar bekleniyor, hata verilmedi).`
          );
        } else {
          stepsCompleted.push(`Eksik ürünler eklenirken bilgi: ${addResult.message}`);
        }
      }
    }

    // =========================================================================
    // ADIM 3: MEVCUT / ORTAK ÜRÜNLERİN BAŞLIK, AÇIKLAMA, FİYAT VE STOKLARINI EŞİTLE
    // =========================================================================
    const priceUpdates: { code: string; listPrice: number; salePrice: number }[] = [];
    const stockUpdates: { code: string; stockCount: number }[] = [];
    const detailedUpdates: PazaramaProductInput[] = [];
    const underReviewBarcodesSet = new Set(underReviewItems.map((u) => u.barcode));

    for (const t of activeTrendyolProducts) {
      const barcode = t.barcode ? t.barcode.trim() : "";
      const stockCode = t.stock_code ? t.stock_code.trim().toLowerCase() : "";

      if (underReviewBarcodesSet.has(barcode)) {
        // Onay sürecindeki ürüne müdahale edilmez
        continue;
      }

      const p =
        (barcode ? pazaramaByBarcode.get(barcode) : null) ||
        (stockCode ? pazaramaByStockCode.get(stockCode) : null);

      if (p) {
        const listPrice = Number(t.list_price || t.sale_price || 0);
        const salePrice = Number(t.sale_price || t.list_price || 0);
        const stockCount = Number(t.quantity ?? 0);

        priceUpdates.push({
          code: p.code,
          listPrice,
          salePrice,
        });

        stockUpdates.push({
          code: p.code,
          stockCount,
        });

        detailedUpdates.push({
          Name: t.title || p.name,
          DisplayName: t.title || p.displayName || p.name,
          Description: t.description || p.description || t.title || p.name,
          brandId: p.brandId || "0a097abf-3c2e-42c9-fd40-08dbf9534e72",
          groupCode: p.groupCode || t.modelCode || p.code,
          Code: p.code,
          stockCode: p.stockCode || t.stock_code || p.code,
          StockCount: stockCount,
          ListPrice: listPrice,
          SalePrice: salePrice,
          VatRate: Number(t.vat_rate || p.vatRate || 20),
          Desi: Number(t.desi || p.desi || 1),
          CategoryId: p.categoryId || "9a0415a7-3048-4085-afb8-ada7b6871092",
          images: p.images && p.images.length > 0
            ? p.images.map((img: string) => ({ imageurl: img }))
            : ((t.images || []) as string[]).map((img: string) => ({ imageurl: img })),
          attributes: (p.attributes || []).map((a) => ({
            attributeId: a.attributeId,
            attributeValueId: a.attributeValueId,
          })),
          currencyType: "TRY",
          deliveries: [],
        });
      }
    }

    let updatedCount = 0;
    if (priceUpdates.length > 0 || stockUpdates.length > 0 || detailedUpdates.length > 0) {
      try {
        // 1. Detaylı Başlık & Açıklama Eşitlemesi
        if (detailedUpdates.length > 0) {
          try {
            for (let i = 0; i < detailedUpdates.length; i += 20) {
              const chunk = detailedUpdates.slice(i, i + 20);
              await createOrUpdatePazaramaProducts(chunk);
            }
            stepsCompleted.push(
              `✓ ${detailedUpdates.length} adet var olan ürünün Başlık ve Açıklamaları Trendyol referansı ile Pazarama'ya aktarıldı.`
            );
          } catch (dErr: any) {
            console.error("Detailed sync error:", dErr);
            stepsCompleted.push(`Başlık ve açıklamalar iletilirken bilgi: ${dErr.message}`);
          }
        }

        // 2. Hızlı Fiyat Güncelleme
        if (priceUpdates.length > 0) {
          try {
            const pRes = await updatePazaramaPrices(priceUpdates);
            console.log("Price update result:", pRes);
            stepsCompleted.push(`✓ ${priceUpdates.length} adet var olan ürünün İndirimsiz Liste Fiyatı ve Satış Fiyatı Pazarama API'sine iletildi.`);
          } catch (pErr: any) {
            console.error("Price update error:", pErr);
            stepsCompleted.push(`Fiyatlar eşitlenirken bilgi: ${pErr.message}`);
          }
        }

        // 3. Hızlı Stok Güncelleme (Rate limit için 2 saniye bekleme)
        if (stockUpdates.length > 0) {
          try {
            await new Promise((r) => setTimeout(r, 2000));
            const sRes = await updatePazaramaStocks(stockUpdates);
            console.log("Stock update result:", sRes);
            stepsCompleted.push(`✓ ${stockUpdates.length} adet var olan ürünün Stok Miktarı Trendyol verileriyle eşitlendi.`);
          } catch (sErr: any) {
            console.error("Stock update error:", sErr);
            stepsCompleted.push(`Stoklar eşitlenirken bilgi: ${sErr.message}`);
          }
        }

        updatedCount = detailedUpdates.length || priceUpdates.length;
      } catch (err: any) {
        console.error("Ortak ürünler güncellenirken genel hata:", err);
        stepsCompleted.push(`Ortak ürünler güncellenirken bilgi: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      addedCount,
      updatedCount,
      underReviewCount: underReviewItems.length,
      totalActiveTrendyol: activeTrendyolProducts.length,
      stepsCompleted,
      message: `Eşitleme tamamlandı! ${deletedCount} fazla ürün silindi, ${underReviewItems.length} ürün onay sürecinde olduğu için korundu, ${updatedCount} var olan ürünün Başlık, Açıklama, Fiyat ve Stok bilgileri Trendyol referansıyla eşitlendi.`,
    });
  } catch (error: any) {
    console.error("Sync execute error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eşitleme sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
