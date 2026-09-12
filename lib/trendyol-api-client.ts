/**
 * Trendyol API Client — Frontend yardımcı fonksiyonları
 *
 * CORS sorununu önlemek için Supabase Edge Function yerine
 * Next.js API Route (/api/trendyol-submit) kullanılır.
 */

export interface SubmitProductPayload {
  listing_id?: string;
  product_id?: string;
  trendyol_category_id?: number | null;
  brand_id?: number | null;
  brand_name?: string;
  title: string;
  description: string;
  list_price: number;
  sale_price: number;
  vat_rate?: number;
  quantity: number;
  image_urls: string[];
  cargo_company?: string;
  desi?: number;
  warranty_months?: number;
  batch_id?: string;
  attributes?: Array<{
    attributeId: number;
    attributeValueId?: number | null;
    customAttributeValue?: string;
  }>;
}

export interface SubmitProductResult {
  success: boolean;
  listing_id?: string;
  barcode?: string;
  stock_code?: string;
  trendyol_batch_id?: string;
  attempts?: number;
  simulation?: boolean;
  saved_as_draft?: boolean;
  error?: string;
}

/**
 * Tek ürün Trendyol'a gönder.
 * /api/trendyol-submit üzerinden server-side çalışır — CORS yok.
 */
export async function submitProductToTrendyol(
  payload: SubmitProductPayload,
  // supabaseUrl ve anonKey artık kullanılmıyor, geriye dönük uyumluluk için bırakıldı
  _supabaseUrl?: string,
  _anonKey?: string,
): Promise<SubmitProductResult> {
  const res = await fetch("/api/trendyol-submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return data as SubmitProductResult;
}

/**
 * Toplu gönderim — rate-limit güvenli (her istek arası gecikme)
 */
export async function submitBatchToTrendyol(
  products: SubmitProductPayload[],
  _supabaseUrl?: string,
  _anonKey?: string,
  options: {
    delayMs?: number;
    onProgress?: (current: number, total: number, result: SubmitProductResult) => void;
    onError?: (index: number, error: string) => void;
    batchId?: string;
  } = {}
): Promise<{ results: SubmitProductResult[]; successCount: number; failCount: number }> {
  const { delayMs = 800, onProgress, onError, batchId } = options;
  const results: SubmitProductResult[] = [];
  let successCount = 0;
  let failCount = 0;

  const batchTag = batchId ?? `BATCH-${Date.now().toString(36).toUpperCase()}`;

  for (let i = 0; i < products.length; i++) {
    const item: SubmitProductPayload = { ...products[i], batch_id: batchTag };
    try {
      const result = await submitProductToTrendyol(item);
      results.push(result);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        onError?.(i, result.error ?? "Bilinmeyen hata");
      }
      onProgress?.(i + 1, products.length, result);
    } catch (e) {
      const msg = (e as Error).message;
      results.push({ success: false, error: msg });
      failCount++;
      onError?.(i, msg);
    }

    if (i < products.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return { results, successCount, failCount };
}

// Geriye dönük uyumluluk için bırakıldı
export function enforceDescriptionPrefix(desc: string): string {
  return (desc ?? "").trim();
}

/**
 * Trendyol Ürün Açıklaması Temizleme & Normalizasyon
 * - Escaped HTML (&lt;div&gt;) kalıntılarını çözer
 * - İç içe geçmiş 10-15 katmanlı gereksiz <div> piramidini temizler
 * - Tek bir standart <div id="rich-content-wrapper"> köküyle döndürür
 */
export function sanitizeTrendyolDescription(html: string): string {
  if (!html) return "";
  let clean = html.trim();

  // 1. Toptan sipariş ibaresini temizle
  clean = clean.replace(/Toptan sipari[şs] vermeyin\.?\s*/gi, "").trim();

  // 1b. HTML Yorumlarını (<!--StartFragment-->, <!--EndFragment--> vb.) tamamen temizle
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");

  // 2. Eğer HTML escape edilmişse (&lt;div... veya &lt;p...) decode et
  if (clean.includes("&lt;") && clean.includes("&gt;")) {
    let prev = "";
    while (clean !== prev && clean.includes("&lt;")) {
      prev = clean;
      clean = clean
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&");
    }
  }

  // 3. Script ve Style bloklarını tamamen temizle
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 4. İç içe geçmiş veya mükerrer <div id="rich-content-wrapper"> ve benzeri etiketleri sök
  clean = clean.replace(/<div[^>]*id=["']rich-content-wrapper["'][^>]*>/gi, "");
  clean = clean.replace(/<div[^>]*class=["']rt-editor-body["'][^>]*>/gi, "");
  
  // 5. Piramit haline gelmiş içi boş veya sadece başka bir div barındıran sarmalayıcı <div>'leri temizle
  clean = clean.replace(/<div[^>]*>/gi, "\n").replace(/<\/div>/gi, "\n");

  // 6. TÜM <br> özniteliklerini temizle ve Trendyol standart <br> formatına çevir
  clean = clean.replace(/<br\b[^>]*\/?>/gi, "<br>");

  // 7. Inline style temizliği (Tailwind, CSS custom variables, dark mode inherit renkleri)
  clean = clean.replace(/style=(["'])([\s\S]*?)\1/gi, (match, quote, styleContent) => {
    const declarations = styleContent.split(";");
    const allowedDeclarations: string[] = [];

    for (const decl of declarations) {
      const parts = decl.split(":");
      if (parts.length < 2) continue;
      const prop = parts[0].trim().toLowerCase();
      const val = parts.slice(1).join(":").trim();

      // CSS değişkenleri (--tw-*, --bl-*, vb.) tamamen at
      if (prop.startsWith("--")) continue;

      // Tailwind reset stillerini ve çerçeve stillerini at
      if (
        prop.startsWith("border") ||
        prop.startsWith("outline") ||
        prop.startsWith("margin") ||
        prop.startsWith("padding") ||
        prop.startsWith("transform") ||
        prop.startsWith("transition") ||
        prop.startsWith("box-shadow") ||
        prop.startsWith("filter") ||
        prop.startsWith("backdrop") ||
        prop.startsWith("display")
      ) {
        continue;
      }

      // Tailwind dark-mode renklerini at (koyu tema arka plan/metin renkleri)
      if (prop === "color") {
        if (/rgb\(\s*(248|255|2|15|38)\s*,\s*(250|255|8|23|52)\s*,\s*(252|255|23|42|75)\s*\)/i.test(val)) {
          continue;
        }
      }

      // font-weight: 700 !important -> font-weight: bold
      if (prop === "font-weight") {
        if (/700|bold/i.test(val)) {
          allowedDeclarations.push("font-weight: bold");
          continue;
        }
      }

      // İzin verilen özellikler: color, font-size, font-weight, text-align, text-decoration
      if (["color", "font-size", "font-weight", "text-align", "text-decoration"].includes(prop)) {
        const cleanVal = val.replace(/!important/gi, "").trim();
        allowedDeclarations.push(`${prop}: ${cleanVal}`);
      }
    }

    if (allowedDeclarations.length === 0) return "";
    return `style="${allowedDeclarations.join("; ")}"`;
  });

  // 8. Boş veya gereksiz span'leri temizle
  clean = clean.replace(/<span\s+style=["']font-weight:\s*bold;?["']\s*>([\s\S]*?)<\/span>/gi, "<b>$1</b>");

  let prevClean = "";
  while (prevClean !== clean) {
    prevClean = clean;
    clean = clean
      .replace(/<span\s*(style=["']\s*["'])?\s*>([\s\S]*?)<\/span>/gi, (m, s, inner) => {
        if (!inner.trim()) return "";
        if (!s || s.trim() === 'style=""' || s.trim() === "style=''") {
          return inner;
        }
        return m;
      })
      .replace(/<span\s*><\/span>/gi, "")
      .replace(/<span\s+style=["']\s*["']\s*><\/span>/gi, "")
      .replace(/<span>\s*<span>/gi, "<span>")
      .replace(/<\/span>\s*<\/span>/gi, "</span>");
  }

  // 9. Arka arkaya gelen 3+ boşluk/br etiketlerini sadeleştir
  clean = clean.replace(/(<br>\s*){3,}/gi, "<br><br>");
  clean = clean.replace(/\n{3,}/g, "\n\n").trim();

  // 10. Karakter limiti güvenlik bariyeri (Trendyol limiti 30.000)
  if (clean.length > 25000) {
    clean = clean.replace(/\s*style=(["'])[\s\S]*?\1/gi, "");
  }

  // 11. Dış sarmalayıcı div ve id="rich-content-wrapper" etiketlerini tamamen temizle.
  // Trendyol satıcı panelinde "Zengin (HTML) İçeriği Getir" butonuna basmaya gerek kalmadan
  // doğrudan standart metin editöründe tüm biçimlendirmelerle (p, b, ul, li) açılması için
  // kök elementlerin div sarmalayıcısı olmadan yalın HTML olması gerekir.
  clean = clean
    .replace(/<div[^>]*id=["']rich-content-wrapper["'][^>]*>/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .trim();

  return clean;
}
