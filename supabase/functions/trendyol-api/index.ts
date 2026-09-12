/// <reference path="./deno.d.ts" />
/**
 * Supabase Edge Function: trendyol-api
 * Deno/TypeScript — production-ready
 *
 * Görevler:
 *  1. Ürünü Trendyol Satıcı API'ye gönder (POST /products)
 *  2. Otonom barkod üret (timestamp + random, kullanıcıdan istenmez)
 *  3. Retry mekanizması: barkod çakışması (400) → yeni barkod üret, max 5 deneme
 *  4. Supabase DB'ye kayıt at (trendyol_listings tablosu)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── TİPLER ──────────────────────────────────────────────────────────────────
interface ProductPayload {
  listing_id?: string;        // var olan kaydı güncelle (opsiyonel)
  product_id?: string;
  category_id?: string;
  title: string;
  description: string;
  brand_name?: string;
  list_price: number;
  sale_price: number;
  vat_rate?: number;
  quantity: number;
  image_urls: string[];
  cargo_company?: string;
  desi?: number;
  warranty_months?: number;
  batch_id?: string;
}

interface TrendyolItem {
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  categoryId: number;
  quantity: number;
  stockCode: string;
  dimensionalWeight: number;
  description: string;
  currencyType: string;
  listPrice: number;
  salePrice: number;
  vatRate: number;
  cargoCompanyId: number;
  images: { url: string }[];
  attributes: { attributeId: number; attributeValueId: number }[];
}

// ─── YARDIMCILAR ─────────────────────────────────────────────────────────────

/** Otonom benzersiz barkod üret: TY + timestamp(ms, base36) + random(4 char) */
function generateBarcode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TY${ts}${rand}`;
}

/** Otonom benzersiz stok kodu üret */
function generateStockCode(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 20)
    .replace(/^-|-$/g, "");
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `SKU-${slug}-${suffix}`;
}

/** Trendyol API'ye bağlan: supplier_id, api_key, api_secret env'dan al */
function getTrendyolHeaders(): HeadersInit {
  const apiKey = Deno.env.get("TRENDYOL_API_KEY") ?? "";
  const apiSecret = Deno.env.get("TRENDYOL_API_SECRET") ?? "";
  const credentials = btoa(`${apiKey}:${apiSecret}`);
  return {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/json",
    "User-Agent": `${Deno.env.get("TRENDYOL_SELLER_ID") ?? "seller"} - SelfIntegration`,
  };
}

// ─── ANA FONKSİYON ───────────────────────────────────────────────────────────

/**
 * Trendyol'a ürün gönder — max 5 deneme.
 * 400 (barkod çakışması) durumunda yeni barkod üretir.
 */
async function pushToTrendyol(
  item: TrendyolItem,
  supplierId: string,
  attempt = 1
): Promise<{ success: boolean; batchId?: string; error?: string; attempts: number }> {
  const MAX_ATTEMPTS = 5;
  const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/v2/products`;

  const body = JSON.stringify({ items: [item] });
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: getTrendyolHeaders(),
      body,
    });
  } catch (e) {
    return { success: false, error: `Ağ hatası: ${(e as Error).message}`, attempts: attempt };
  }

  // Başarı
  if (response.ok) {
    const data = await response.json();
    return { success: true, batchId: data?.batchRequestId, attempts: attempt };
  }

  // Barkod çakışması → yeni barkod üret ve tekrar dene
  if (response.status === 400 && attempt < MAX_ATTEMPTS) {
    const errBody = await response.text();
    const isBarcodeDuplicate =
      errBody.includes("barcode") ||
      errBody.includes("Barkod") ||
      errBody.includes("duplicate") ||
      errBody.includes("already exist");

    if (isBarcodeDuplicate) {
      console.warn(`[trendyol-api] Barkod çakışması (deneme ${attempt}), yeni barkod üretiliyor…`);
      item.barcode = generateBarcode();
      // Kısa bekleme — rate-limit önlemi (100ms × deneme sayısı)
      await new Promise((r) => setTimeout(r, 100 * attempt));
      return pushToTrendyol(item, supplierId, attempt + 1);
    }

    return {
      success: false,
      error: `Trendyol 400: ${errBody.substring(0, 300)}`,
      attempts: attempt,
    };
  }

  // Diğer hatalar
  const errText = await response.text();
  return {
    success: false,
    error: `Trendyol ${response.status}: ${errText.substring(0, 300)}`,
    attempts: attempt,
  };
}

// ─── REQUEST HANDLER ─────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: ProductPayload = await req.json();

    // Zorunlu alanlar
    if (!payload.title || !payload.sale_price || !payload.quantity) {
      return new Response(
        JSON.stringify({ error: "title, sale_price ve quantity zorunludur" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── Açıklama temizliği ───────────────────────────────────────
    const description = (payload.description ?? "")
      .replace(/Toptan sipari[şs] vermeyin\.?\s*/gi, "")
      .trim();

    // ── Otonom Barkod & SKU ───────────────────────────────────────
    const barcode = generateBarcode();
    const stockCode = generateStockCode(payload.title);

    // ── Supabase client (Service Role key ile) ────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supplierId = Deno.env.get("TRENDYOL_SELLER_ID") ?? "";
    const trendyolCategoryId = parseInt(Deno.env.get("TRENDYOL_DEFAULT_CATEGORY_ID") ?? "411") || 411;
    const trendyolBrandId = parseInt(Deno.env.get("TRENDYOL_BRAND_ID") ?? "0") || 0;
    const trendyolCargoId = parseInt(Deno.env.get("TRENDYOL_CARGO_COMPANY_ID") ?? "10") || 10;

    // ── Trendyol API payload ──────────────────────────────────────
    const trendyolItem: TrendyolItem = {
      barcode,
      title: payload.title,
      productMainId: stockCode,
      brandId: trendyolBrandId,
      categoryId: trendyolCategoryId,
      quantity: payload.quantity,
      stockCode,
      dimensionalWeight: payload.desi ?? 1,
      description,
      currencyType: "TRY",
      listPrice: payload.list_price,
      salePrice: payload.sale_price,
      vatRate: payload.vat_rate ?? 10,
      cargoCompanyId: trendyolCargoId,
      images: (payload.image_urls ?? []).slice(0, 8).map((url) => ({ url })),
      attributes: [],
    };

    // ── Önce DB'ye "pending" olarak yaz ──────────────────────────
    const dbRecord = {
      product_id: payload.product_id ?? null,
      category_id: payload.category_id ?? null,
      title: payload.title,
      description,
      barcode,
      stock_code: stockCode,
      brand_name: payload.brand_name ?? "Yok",
      list_price: payload.list_price,
      sale_price: payload.sale_price,
      vat_rate: payload.vat_rate ?? 10,
      quantity: payload.quantity,
      image_urls: payload.image_urls ?? [],
      cargo_company: payload.cargo_company ?? null,
      desi: payload.desi ?? null,
      warranty_months: payload.warranty_months ?? 0,
      trendyol_status: "pending" as const,
      batch_id: payload.batch_id ?? null,
      submitted_at: new Date().toISOString(),
    };

    let listingId: string | null = payload.listing_id ?? null;

    if (listingId) {
      // Var olan kaydı güncelle
      await supabase
        .from("trendyol_listings")
        .update({ ...dbRecord, barcode, stock_code: stockCode })
        .eq("id", listingId);
    } else {
      // Yeni kayıt oluştur
      const { data: inserted, error: insertError } = await supabase
        .from("trendyol_listings")
        .insert(dbRecord)
        .select("id")
        .single();

      if (insertError) {
        console.error("[trendyol-api] DB insert hatası:", insertError);
      } else {
        listingId = inserted?.id ?? null;
      }
    }

    // ── Trendyol API çağrısı (retry mekanizmalı) ─────────────────
    if (!supplierId) {
      // Gerçek API key yoksa simülasyon modu
      console.warn("[trendyol-api] TRENDYOL_SELLER_ID bulunamadı, simülasyon modunda çalışıyor");

      if (listingId) {
        await supabase
          .from("trendyol_listings")
          .update({
            barcode,
            stock_code: stockCode,
            trendyol_status: "approved",
            trendyol_product_id: `SIM-${barcode}`,
          })
          .eq("id", listingId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          simulation: true,
          listing_id: listingId,
          barcode,
          stock_code: stockCode,
          description_preview: description.substring(0, 100),
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const result = await pushToTrendyol(trendyolItem, supplierId);

    // ── DB'yi güncelle ────────────────────────────────────────────
    if (listingId) {
      await supabase
        .from("trendyol_listings")
        .update({
          barcode,              // retry sonrası barkod güncellendi olabilir
          stock_code: stockCode,
          trendyol_status: result.success ? "pending" : "rejected",
          rejection_reason: result.success ? null : result.error,
          trendyol_product_id: result.batchId ?? null,
        })
        .eq("id", listingId);
    }

    const status = result.success ? 200 : 422;
    return new Response(
      JSON.stringify({
        success: result.success,
        listing_id: listingId,
        barcode,
        stock_code: stockCode,
        trendyol_batch_id: result.batchId,
        attempts: result.attempts,
        error: result.error,
        description_preview: description.substring(0, 100),
      }),
      { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[trendyol-api] Beklenmeyen hata:", err);
    return new Response(
      JSON.stringify({ error: `Sunucu hatası: ${(err as Error).message}` }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
