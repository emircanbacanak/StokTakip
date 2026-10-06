/**
 * Hepsiburada API Client & Yardımcı Fonksiyonlar
 *
 * Test (SIT) ve Canlı (Prod) ortamlarını destekler.
 * Server-side API rotaları üzerinden güvenli şekilde çalışır.
 */

export interface HepsiburadaProductVariant {
  merchantSku: string;
  barcode: string;
  price: number;
  availableStock: number;
  desi?: number;
  vatRate?: number;
  images: string[];
  attributes?: Record<string, any>;
  cargoCompany1?: string;
  cargoCompany2?: string;
  cargoCompany3?: string;
  shippingAddressLabel?: string;
  claimAddressLabel?: string;
}

export interface SubmitHepsiburadaProductPayload {
  listing_id?: string;
  product_id?: string;
  categoryId: number;
  categoryName?: string;
  productName: string;
  description: string;
  brand: string;
  images: string[];
  variants: HepsiburadaProductVariant[];
  attributes?: Record<string, any>;
}

export interface HepsiburadaSubmitResult {
  success: boolean;
  trackingId?: string;
  listing_id?: string;
  status?: string;
  message?: string;
  error?: string;
  environment?: "sit" | "prod";
}

export interface HepsiburadaCategory {
  categoryId: number;
  name: string;
  displayName: string;
  parentCategoryId?: number;
  paths?: string[];
  leaf: boolean;
  status: string;
}

export interface HepsiburadaAttribute {
  id: string;
  name: string;
  mandatory: boolean;
  type: string;
  values?: Array<{ id: string; value: string }>;
  description?: string;
}

export interface HepsiburadaListingItem {
  listingId: string;
  hepsiburadaSku?: string;
  merchantSku: string;
  price: number;
  availableStock: number;
  dispatchTime?: number;
  cargoCompany1?: string;
  isSalable: boolean;
  status?: string;
}

/**
 * Hepsiburada API Bağlantısını Test Et
 */
export async function testHepsiburadaConnection(): Promise<{
  success: boolean;
  merchantId?: string;
  environment?: "sit" | "prod";
  message: string;
  listingCount?: number;
}> {
  try {
    const res = await fetch("/api/hepsiburada/test-connection");
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: `Bağlantı hatası: ${err.message}`,
    };
  }
}

/**
 * Hepsiburada Kategorilerini Ara
 */
export async function searchHepsiburadaCategories(query: string): Promise<HepsiburadaCategory[]> {
  try {
    const res = await fetch(`/api/hepsiburada/categories?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

/**
 * Kategoriye Ait Zorunlu & İsteğe Bağlı Özellikleri Getir
 */
export async function getHepsiburadaCategoryAttributes(categoryId: number): Promise<HepsiburadaAttribute[]> {
  try {
    const res = await fetch(`/api/hepsiburada/categories?categoryId=${categoryId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.attributes || [];
  } catch {
    return [];
  }
}

/**
 * Hepsiburada'ya Ürün Gönder
 */
export async function submitProductToHepsiburada(
  payload: SubmitHepsiburadaProductPayload
): Promise<HepsiburadaSubmitResult> {
  const res = await fetch("/api/hepsiburada-submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return data as HepsiburadaSubmitResult;
}

/**
 * Hepsiburada Aktif Listelemelerini Getir
 */
export async function getHepsiburadaListings(offset = 0, limit = 20): Promise<{
  listings: HepsiburadaListingItem[];
  total: number;
  environment: "sit" | "prod";
}> {
  try {
    const res = await fetch(`/api/hepsiburada/listings?offset=${offset}&limit=${limit}`);
    if (!res.ok) return { listings: [], total: 0, environment: "sit" };
    return await res.json();
  } catch {
    return { listings: [], total: 0, environment: "sit" };
  }
}
