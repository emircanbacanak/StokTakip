/**
 * GET /api/trendyol-meta
 *
 * Trendyol API'den marka ve kategori verisi çeker.
 * Production'da gerçek API kullanılır.
 * Localhost / API erişilemezse gerçek Trendyol TR kategori ağacını (statik) döndürür.
 *
 * ?type=brands&name=Samsung
 * ?type=categories
 * ?type=ping
 */

import { NextRequest, NextResponse } from "next/server";
import { TRENDYOL_CATEGORIES_TR } from "@/lib/trendyol-categories-static";

const SELLER_ID  = process.env.TRENDYOL_SELLER_ID ?? "";
const API_KEY    = process.env.TRENDYOL_API_KEY ?? "";
const API_SECRET = process.env.TRENDYOL_API_SECRET ?? "";

// V3 entegrasyon endpoint
const BASE_URL = "https://apigw.trendyol.com/integration";
// V1 fallback
const BASE_URL_V1 = "https://api.trendyol.com/sapigw";

// Kategori ağacını 1 saat önbellekle (in-memory, sunucu restart'ta sıfırlanır)
let categoryCache: { data: unknown; ts: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

// Marka listesi önbelleği — tüm markalar (10k+) tek seferde çekilir
interface BrandItem { id: number; name: string; }
let brandCache: { data: BrandItem[]; ts: number } | null = null;
const BRAND_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 saat
let brandCacheLoading = false;

async function loadBrandCache(): Promise<void> {
  if (brandCacheLoading) return;
  brandCacheLoading = true;
  try {
    const allBrands: BrandItem[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore && page < 20) { // max 20 sayfa = 20k marka
      const url = `${BASE_URL}/product/brands?page=${page}&size=${pageSize}`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) break;
      const data = await res.json();
      const brands: BrandItem[] = data.brands ?? [];
      allBrands.push(...brands);
      hasMore = brands.length === pageSize;
      page++;
    }

    if (allBrands.length > 0) {
      brandCache = { data: allBrands, ts: Date.now() };
      console.info(`[trendyol-meta] ${allBrands.length} marka önbelleğe alındı`);
    }
  } catch (e) {
    console.error("[trendyol-meta/loadBrandCache]", e);
  } finally {
    brandCacheLoading = false;
  }
}

function headers(): HeadersInit {
  const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  return {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/json",
    "User-Agent": `${SELLER_ID} - SelfIntegration`,
    // V3 için storeFrontCode gerekli
    "storeFrontCode": "TR",
  };
}

function isConfigured() {
  return !!(SELLER_ID && API_KEY && API_SECRET);
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  // ── Marka Arama ────────────────────────────────────────────────────────────
  if (type === "brands") {
    const name = req.nextUrl.searchParams.get("name") ?? "";
    if (name.length < 2) return NextResponse.json({ brands: [] });

    if (!isConfigured()) {
      return NextResponse.json({ brands: [], _fallback: true, reason: "API key eksik" });
    }

    // Trendyol brand API'sinde name filtresi çalışmıyor.
    // Önbelleğe alınmış marka listesinden client-side search yapıyoruz.
    // İlk çağrıda tüm sayfaları çekip önbelleğe alır.
    if (!brandCache || Date.now() - brandCache.ts > BRAND_CACHE_TTL) {
      // Arka planda yükle — ilk sorgu boş dönebilir, ikincisi cache'den gelir
      loadBrandCache().catch(() => {});
    }

    if (brandCache) {
      const q = name.toLowerCase();
      const filtered = brandCache.data
        .filter(b => b.name.toLowerCase().includes(q))
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
          return aStarts - bStarts || a.name.localeCompare(b.name, "tr");
        })
        .slice(0, 15);
      return NextResponse.json({ brands: filtered });
    }

    return NextResponse.json({ brands: [], _loading: true });
  }

  // ── Kategori Ağacı ──────────────────────────────────────────────────────────
  if (type === "categories") {
    // Önbellek varsa döndür
    if (categoryCache && Date.now() - categoryCache.ts < CACHE_TTL_MS) {
      return NextResponse.json({ categories: categoryCache.data, _cached: true });
    }

    // Canlı API'yi dene (V3 → V1 fallback)
    if (isConfigured()) {
      const urls = [
        `${BASE_URL}/product/product-categories`,
        `${BASE_URL_V1}/product-categories`,
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url, { headers: headers() });
          if (res.ok) {
            const data = await res.json();
            const cats = data.categories ?? (Array.isArray(data) ? data : []);
            if (cats.length > 0) {
              categoryCache = { data: cats, ts: Date.now() };
              return NextResponse.json({ categories: cats, _source: "live" });
            }
          }
          console.warn(`[trendyol-meta/categories] ${url} → ${res.status}`);
        } catch (e) {
          console.warn(`[trendyol-meta/categories] ${url} → ${(e as Error).message}`);
        }
      }
    }

    // API erişilemedi → gerçek TR kategori ağacını döndür
    console.info("[trendyol-meta/categories] Statik Trendyol TR ağacı kullanılıyor");
    categoryCache = { data: TRENDYOL_CATEGORIES_TR, ts: Date.now() };
    return NextResponse.json({
      categories: TRENDYOL_CATEGORIES_TR,
      _source: "static",
      _note: "Gerçek Trendyol TR kategori ağacı — API erişilemedi",
    });
  }

  // ── Kategori Attribute'ları (varyant/özellik alanları) ───────────────────────
  if (type === "attributes") {
    const catId = req.nextUrl.searchParams.get("categoryId");
    if (!catId) return NextResponse.json({ categoryAttributes: [] });
    if (!isConfigured()) return NextResponse.json({ categoryAttributes: [] });

    try {
      const url = `${BASE_URL}/product/product-categories/${catId}/attributes`;
      const res = await fetch(url, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ categoryAttributes: data.categoryAttributes ?? [] });
      }
      console.warn(`[trendyol-meta/attributes] ${res.status}`);
      return NextResponse.json({ categoryAttributes: [] });
    } catch (e) {
      return NextResponse.json({ categoryAttributes: [], error: (e as Error).message });
    }
  }

  // ── Bağlantı Testi ──────────────────────────────────────────────────────────
  if (type === "ping") {
    if (!isConfigured()) {
      return NextResponse.json({ ok: false, configured: false, reason: "Env değişkenleri eksik" });
    }
    const testUrls = [
      `${BASE_URL}/product/suppliers/${SELLER_ID}/products?page=0&size=1`,
      `${BASE_URL_V1}/suppliers/${SELLER_ID}/products?page=0&size=1`,
    ];
    for (const url of testUrls) {
      try {
        const res = await fetch(url, { headers: headers() });
        const text = await res.text();
        if (res.ok) {
          return NextResponse.json({ ok: true, status: res.status, url, preview: text.substring(0, 200) });
        }
        return NextResponse.json({ ok: false, status: res.status, url, preview: text.substring(0, 200) });
      } catch (e) {
        continue;
      }
    }
    return NextResponse.json({ ok: false, reason: "Tüm endpoint'ler başarısız" });
  }

  return NextResponse.json({ error: "type: brands | categories | ping" }, { status: 400 });
}
