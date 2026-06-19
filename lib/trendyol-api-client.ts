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
