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
  const url = `${TRENDYOL_URL}/product/suppliers/${SELLER_ID}/v2/products`;

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

  // Barkod çakışması → yeni barkod ile yeniden dene
  if (res.status === 400 && attempt < MAX) {
    const errText = await res.text();
    const isBarcodeDupe =
      errText.toLowerCase().includes("barcode") ||
      errText.includes("duplicate") ||
      errText.includes("already exist");

    if (isBarcodeDupe) {
      const newBarcode = generateBarcode();
      await new Promise(r => setTimeout(r, 150 * attempt));
      return pushToTrendyol({ ...item, barcode: newBarcode }, attempt + 1);
    }
    return { success: false, barcode, error: `Trendyol hatası: ${errText.slice(0, 300)}`, attempts: attempt };
  }

  // 5xx — Trendyol servisi geçici olarak erişilemiyor → direkt taslak kaydet, retry yok
  if (res.status >= 500) {
    return {
      success: false,
      barcode,
      error: `Trendyol ürün servisi şu an erişilemiyor (${res.status}). Ürününüz taslak kaydedildi — Trendyol düzelince "Listelerim" sekmesinden "Yeniden Gönder" butonunu kullanın.`,
      attempts: attempt,
      savedAsDraft: true,
    };
  }

  const errText = await res.text();
  return { success: false, barcode, error: `Trendyol ${res.status}: ${errText.slice(0, 300)}`, attempts: attempt };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (!payload.title || !payload.sale_price) {
      return NextResponse.json(
        { success: false, error: "title ve sale_price zorunludur" },
        { status: 400 }
      );
    }

    const barcode   = generateBarcode();
    const stockCode = generateStockCode(payload.title);

    // Supabase client (service role ile DB'ye yazar)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // fallback: anon key
        ?? ""
    );

    const dbRecord = {
      product_id:      payload.product_id ?? null,
      title:           payload.title,
      description:     payload.description ?? "-",
      barcode,
      stock_code:      stockCode,
      brand_name:      payload.brand_name ?? "Yok",
      list_price:      payload.list_price ?? payload.sale_price,
      sale_price:      payload.sale_price,
      vat_rate:        payload.vat_rate ?? 20,
      quantity:        payload.quantity ?? 100,
      image_urls:      payload.image_urls ?? [],
      cargo_company:   payload.cargo_company ?? null,
      desi:            payload.desi ?? null,
      warranty_months: payload.warranty_months ?? 0,
      trendyol_status: "pending" as const,
      batch_id:        payload.batch_id ?? null,
      submitted_at:    new Date().toISOString(),
    };

    // DB'ye kayıt — hata olsa da devam et
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
    }    // Simülasyon modu — SELLER_ID yoksa gerçek API çağrısı yapma
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
      });
    }

    // Gerçek Trendyol API çağrısı
    const trendyolItem = {
      barcode,
      title:            payload.title,
      productMainId:    stockCode,
      brandId:          payload.brand_id ?? 0,
      categoryId:       payload.trendyol_category_id ?? 411,
      quantity:         payload.quantity ?? 100,
      stockCode,
      dimensionalWeight: payload.desi ?? 1,
      description:      payload.description ?? "-",
      currencyType:     "TRY",
      listPrice:        payload.list_price ?? payload.sale_price,
      salePrice:        payload.sale_price,
      vatRate:          payload.vat_rate ?? 20,
      cargoCompanyId:   10,
      images:           (payload.image_urls ?? []).slice(0, 8).map((url: string) => ({ url })),
      attributes:       payload.attributes ?? [],
    };

    const result = await pushToTrendyol(trendyolItem);

    // DB güncelle
    if (listingId) {
      try {
        await supabase.from("trendyol_listings").update({
          barcode:              result.barcode,
          stock_code:           stockCode,
          // 5xx geçici hata → draft olarak bırak (sonra "Yeniden Gönder" ile denenebilir)
          trendyol_status:      result.success ? "pending" : result.savedAsDraft ? "draft" : "rejected",
          rejection_reason:     result.success ? null : result.error,
          trendyol_product_id:  result.batchId ?? null,
        }).eq("id", listingId);
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      success:           result.success,
      listing_id:        listingId,
      barcode:           result.barcode,
      stock_code:        stockCode,
      trendyol_batch_id: result.batchId,
      attempts:          result.attempts,
      error:             result.error,
      saved_as_draft:    result.savedAsDraft ?? false,
    // savedAsDraft → taslak kaydedildi, kullanıcıya başarı gibi göster (200)
    }, { status: (result.success || result.savedAsDraft) ? 200 : 422 });

  } catch (err) {
    console.error("[trendyol-submit] Beklenmeyen hata:", err);
    return NextResponse.json(
      { success: false, error: `Sunucu hatası: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
