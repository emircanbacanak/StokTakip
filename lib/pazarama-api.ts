/**
 * Pazarama İş Ortağım API Entegrasyon İstemcisi
 * Resmi Dokümantasyon Standartlarında
 */

const AUTH_URL = "https://isortagimgiris.pazarama.com/connect/token";
const API_BASE_URL = "https://isortagimapi.pazarama.com";

// Önbellek token nesnesi
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export interface PazaramaImageItem {
  imageurl: string;
}

export interface PazaramaAttributeItem {
  attributeId: string;
  attributeValueId: string;
}

export interface PazaramaProductInput {
  Name: string;
  DisplayName?: string;
  Description: string;
  brandId: string;
  groupCode: string;
  Code: string;
  StockCount: number;
  stockCode: string;
  VatRate: number;
  ListPrice: number;
  SalePrice: number;
  currencyType?: string;
  CategoryId: string;
  Desi?: number;
  images: PazaramaImageItem[];
  attributes?: PazaramaAttributeItem[];
  deliveries?: any[];
}

export interface PazaramaListing {
  id?: string;
  code: string; // Barkod
  stockCode?: string;
  groupCode?: string; // Model Kodu
  modelTitle?: string; // Model Başlığı (örn. Aura Vazo 20cm)
  name: string;
  displayName?: string;
  description?: string;
  brandId?: string;
  brandName?: string;
  categoryId?: string;
  categoryName?: string;
  stockCount: number;
  listPrice: number;
  salePrice: number;
  vatRate?: number;
  desi?: number;
  currencyType?: string;
  images?: string[];
  attributes?: { attributeId: string; attributeValueId: string; attributeName?: string; attributeValue?: string }[];
  state?: number; // 1: Onay Bekliyor, 2: Güncelleme Onay Bekliyor, 6: Reddedildi, etc.
  productStatus?: number;
  stateText?: string;
  waitingApproveExp?: string | null;
  isUnderReview?: boolean;
  approved?: boolean;
  isActive?: boolean;
  isSoldOut?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PazaramaCategoryNode {
  id: string;
  parentId: string | null;
  code?: string | null;
  name: string;
  displayName: string;
  leaf: boolean;
  parentCategories?: string[];
  subCategories?: PazaramaCategoryNode[];
}

export interface PazaramaCategoryAttribute {
  id: string;
  name: string;
  displayName: string;
  isVariantable: boolean;
  isRequired: boolean;
  description?: string | null;
  attributeValues: { id: string; value: string }[];
}

export interface PazaramaBrand {
  id: string;
  name: string;
  logoUrl?: string | null;
  website?: string | null;
  status: boolean;
}

/**
 * Pazarama API kimlik bilgilerini ortam değişkenlerinden alır
 */
function getPazaramaCredentials() {
  const apiKey = process.env.PAZARAMA_API_KEY || "";
  const apiSecret = process.env.PAZARAMA_API_SECRET || "";
  const sellerId = process.env.PAZARAMA_SELLER_ID || "";

  if (!apiKey || !apiSecret) {
    throw new Error("Pazarama API Key ve API Secret ortam değişkenlerinde (.env.local) tanımlı değil.");
  }

  return { apiKey, apiSecret, sellerId };
}

/**
 * Pazarama Access Token alır (1 saat geçerli, bellek içi önbellekleme)
 */
export async function getPazaramaToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60 * 1000) {
    return cachedToken.accessToken;
  }

  const { apiKey, apiSecret } = getPazaramaCredentials();
  const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=merchantgatewayapi.fullaccess",
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Pazarama Token Hatası (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (!data?.data?.accessToken) {
    throw new Error(data?.message || "Pazarama Access Token alınamadı");
  }

  const expiresIn = data.data.expiresIn || 3600;
  cachedToken = {
    accessToken: data.data.accessToken,
    expiresAt: now + expiresIn * 1000,
  };

  return cachedToken.accessToken;
}

/**
 * Pazarama API istekleri için yetkilendirilmiş fetch yardımcısı
 */
async function pazaramaFetch(
  endpoint: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  const token = await getPazaramaToken();
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "x-channelcode": "22",
    "x-lang-code": "tr",
    ...(options.headers as Record<string, string>),
  };

  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  // Hız sınırı (429) durumunda kademeli bekleme ve tekrar deneme
  if (response.status === 429 && retries > 0) {
    const delay = (4 - retries) * 2000 + 1000; // 3000ms, 5000ms, 7000ms
    console.warn(`Pazarama rate limit (429) algılandı. ${delay}ms beklenip tekrar deneniyor... (${retries} deneme hakkı kaldı)`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return pazaramaFetch(endpoint, options, retries - 1);
  }

  return response;
}

/**
 * Güvenli JSON ayrıştırıcı (boş veya geçersiz yanıt durumunda patlamaz)
 */
export async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text, message: text };
  }
}

/**
 * 1. Ürünleri Listele & Filtrele
 */
export async function getPazaramaProducts(params: {
  page?: number;
  size?: number;
  approved?: boolean;
  code?: string;
}): Promise<{
  listings: PazaramaListing[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = params.page || 1;
  const size = params.size || 50;
  const query = new URLSearchParams({
    Page: page.toString(),
    Size: size.toString(),
  });

  // Pazarama API'sinde Approved parametresi zorunludur, belirtilmezse sonuç boş döner.
  const approved = params.approved !== undefined ? params.approved : true;
  query.set("Approved", approved.toString());

  if (params.code) {
    query.set("Code", params.code);
  }

  const res = await pazaramaFetch(`/product/products?${query.toString()}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ürünler çekilemedi (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const rawList = Array.isArray(json?.data)
    ? json.data
    : json?.data?.items || json?.data?.products || [];

  const listings: PazaramaListing[] = rawList.map((item: any) => {
    // Görsel dizisini normalize et
    let images: string[] = [];
    if (Array.isArray(item.images)) {
      images = item.images
        .map((img: any) => (typeof img === "string" ? img : img.imageurl || img.imageUrl || img.url || ""))
        .filter(Boolean);
    } else if (item.imageUrl || item.image) {
      images = [item.imageUrl || item.image];
    }

    const stockCount = Number(item.stockCount ?? item.stock ?? 0);
    const isUnderReview =
      approved === false ||
      item.state === 1 ||
      item.state === 2 ||
      item.state === 19 ||
      Boolean(item.waitingApproveExp) ||
      item.approved === false;

    const isApproved = approved === false ? false : (item.approved !== undefined ? Boolean(item.approved) : !isUnderReview);
    const isSoldOut = stockCount === 0;
    const isPassive = item.productStatus === 10 || item.state === 10;
    const isActive = isApproved && !isUnderReview && !isSoldOut && !isPassive;

    // Durum metni (Pazarama Satıcı Paneliyle %100 uyumlu)
    let stateText = "Satışta";
    if (!isApproved || isUnderReview) {
      if (item.state === 1) stateText = "Onay Bekliyor";
      else if (item.state === 2) stateText = "Güncelleme Onayında";
      else if (item.state === 19) stateText = "Katalog İncelemesinde";
      else if (item.state === 6) stateText = "Reddedildi";
      else stateText = "Onay Bekliyor";
    } else if (isPassive) {
      stateText = "Satışa Kapalı";
    } else if (isSoldOut) {
      stateText = "Stoğu Bitti";
    }

    return {
      id: item.id || item.productId || item.code,
      code: item.code || item.barcode || "",
      stockCode: item.stockCode || item.stock_code || "",
      groupCode: item.groupCode || item.modelCode || "",
      name: item.name || item.title || "",
      displayName: item.displayName || item.name || "",
      description: item.description || "",
      brandId: item.brandId || "",
      brandName: item.brandName || item.brand || "",
      categoryId: item.categoryId || "",
      categoryName: item.categoryName || item.category || "",
      stockCount,
      listPrice: Number(item.listPrice ?? item.price ?? 0),
      salePrice: Number(item.salePrice ?? item.price ?? 0),
      vatRate: Number(item.vatRate ?? 20),
      desi: Number(item.desi ?? 1),
      currencyType: item.currencyType || "TRY",
      images,
      attributes: item.attributes || [],
      state: item.state,
      productStatus: item.productStatus,
      stateText,
      waitingApproveExp: item.waitingApproveExp || null,
      isUnderReview,
      approved: isApproved,
      isActive,
      isSoldOut,
      createdAt: item.createdDate || item.creationDate,
      updatedAt: item.modifiedDate || item.updatedDate,
    };
  });

  return {
    listings,
    totalCount: json?.totalCount || json?.data?.totalCount || listings.length,
    pageIndex: json?.pageIndex || page,
    pageSize: json?.pageSize || size,
    totalPages: json?.totalPages || Math.ceil((json?.totalCount || listings.length) / size),
  };
}

/**
 * 2. Ürün Ekle / Detaylı Güncelle (POST /product/create)
 * Pazarama'da ürün ekleme ve tüm detaylarıyla güncelleme bu servis üzerinden yapılır.
 */
export async function createOrUpdatePazaramaProducts(
  products: PazaramaProductInput[]
): Promise<{
  success: boolean;
  batchRequestId?: string;
  message?: string;
  errors?: string[];
}> {
  if (!products || products.length === 0) {
    throw new Error("Eklenecek / güncellenecek ürün listesi boş olamaz.");
  }

  const payload = {
    products: products.map((p) => ({
      Name: p.Name,
      DisplayName: p.DisplayName || p.Name,
      Description: p.Description,
      brandId: p.brandId,
      groupCode: p.groupCode,
      Code: p.Code,
      StockCount: Number(p.StockCount),
      stockCode: p.stockCode,
      VatRate: Number(p.VatRate || 20),
      ListPrice: Number(p.ListPrice),
      SalePrice: Number(p.SalePrice),
      currencyType: p.currencyType || "TRY",
      CategoryId: p.CategoryId,
      Desi: Number(p.Desi || 1),
      images: p.images.map((img) => ({
        imageurl: typeof img === "string" ? img : img.imageurl,
      })),
      attributes: (p.attributes || []).map((attr) => ({
        attributeId: attr.attributeId,
        attributeValueId: attr.attributeValueId,
      })),
      deliveries: p.deliveries || [],
    })),
  };

  const res = await pazaramaFetch("/product/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);

  const hasErrors =
    !res.ok ||
    data?.success === false ||
    (data?.data?.error?.errors && data.data.error.errors.length > 0) ||
    data?.data?.batchRequestId === "00000000-0000-0000-0000-000000000000" ||
    (data?.userMessage && data.userMessage.toLowerCase().includes("hata"));

  if (hasErrors) {
    const errorList: string[] = [];
    if (data?.data?.error?.errors && Array.isArray(data.data.error.errors)) {
      errorList.push(...data.data.error.errors);
    }
    if (data?.message) errorList.push(data.message);
    if (data?.userMessage) errorList.push(data.userMessage);

    return {
      success: false,
      message: errorList.join(" | ") || "Ürün oluşturulurken/güncellenirken hata oluştu.",
      errors: errorList,
    };
  }

  return {
    success: true,
    batchRequestId: data?.data?.batchRequestId,
    message: data?.userMessage || "Ürün başarıyla iletildi ve onay sürecine alındı.",
  };
}

/**
 * 3. Hızlı Fiyat Güncelleme (POST /product/updatePrice-v2)
 */
export async function updatePazaramaPrices(
  items: { code: string; listPrice: number; salePrice: number }[]
): Promise<{ success: boolean; data?: any; message?: string }> {
  if (!items || items.length === 0) {
    throw new Error("Güncellenecek ürün fiyat listesi boş olamaz.");
  }

  const payload = {
    items: items.map((it) => ({
      code: it.code,
      listPrice: Number(it.listPrice),
      salePrice: Number(it.salePrice),
    })),
  };

  const res = await pazaramaFetch("/product/updatePrice-v2", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  const msg = (data?.message || data?.userMessage || "").toLowerCase();
  const isAlreadyEqual = msg.includes("aynı olamaz") || msg.includes("önceki değerleriyle aynı");
  const isUnderReview = msg.includes("kontrol") || msg.includes("onay") || (Array.isArray(data?.data?.error?.errors) && data.data.error.errors.some((e: string) => e.toLowerCase().includes("kontrol")));

  if (isUnderReview) {
    return {
      success: true,
      data: data?.data,
      message: "İlgili ürün Pazarama onay sürecindedir.",
    };
  }

  if (!res.ok || (data?.success === false && !isAlreadyEqual)) {
    throw new Error(data?.userMessage || data?.message || "Fiyat güncellenemedi.");
  }

  return {
    success: true,
    data: data?.data,
    message: isAlreadyEqual ? "Fiyatlar zaten güncel." : (data?.message || "Fiyat güncelleme isteği sıraya alındı."),
  };
}

/**
 * 4. Hızlı Stok Güncelleme (POST /product/updateStock-v2)
 */
export async function updatePazaramaStocks(
  items: { code: string; stockCount: number }[]
): Promise<{ success: boolean; data?: any; message?: string }> {
  if (!items || items.length === 0) {
    throw new Error("Güncellenecek ürün stok listesi boş olamaz.");
  }

  const payload = {
    items: items.map((it) => ({
      code: it.code,
      stockCount: Number(it.stockCount),
    })),
  };

  const res = await pazaramaFetch("/product/updateStock-v2", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  const msg = (data?.message || data?.userMessage || "").toLowerCase();
  const isAlreadyEqual = msg.includes("aynı olamaz") || msg.includes("önceki değerleriyle aynı");
  const isUnderReview = msg.includes("kontrol") || msg.includes("onay") || (Array.isArray(data?.data?.error?.errors) && data.data.error.errors.some((e: string) => e.toLowerCase().includes("kontrol")));

  if (isUnderReview) {
    return {
      success: true,
      data: data?.data,
      message: "İlgili ürün Pazarama onay sürecindedir.",
    };
  }

  if (!res.ok || (data?.success === false && !isAlreadyEqual)) {
    throw new Error(data?.userMessage || data?.message || "Stok güncellenemedi.");
  }

  return {
    success: true,
    data: data?.data,
    message: isAlreadyEqual ? "Stoklar zaten güncel." : (data?.message || "Stok güncelleme isteği sıraya alındı."),
  };
}

/**
 * 5. Satışa Kapatma / Açma (Silme / Aktif-Pasif Yapma)
 * POST /product/bulkUpdateProductStatusFromApi
 * productStatus: 1 => Satışa Aç (Aktif)
 * productStatus: 10 => Satışa Kapat (Pasif / Silinmiş)
 */
export async function updatePazaramaProductStatuses(
  items: { code: string; productStatus: 1 | 10 }[]
): Promise<{ success: boolean; message?: string }> {
  if (!items || items.length === 0) {
    throw new Error("Durumu güncellenecek ürün listesi boş olamaz.");
  }

  const payload = {
    productItems: items.map((it) => ({
      code: it.code,
      productStatus: it.productStatus,
    })),
  };

  const res = await pazaramaFetch("/product/bulkUpdateProductStatusFromApi", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok || data?.success === false) {
    throw new Error(data?.userMessage || data?.message || "Ürün durumu güncellenemedi.");
  }

  return {
    success: true,
    message: "Ürün durum güncellemesi sıraya alındı.",
  };
}

/**
 * 6. KDV Oranı Güncelleme (PUT /product/vatRate/bulk)
 */
export async function updatePazaramaVatRates(
  items: { productCode: string; vatRate: number }[]
): Promise<{ success: boolean; message?: string }> {
  const payload = {
    listingVatRates: items.map((it) => ({
      productCode: it.productCode,
      vatRate: Number(it.vatRate),
    })),
  };

  const res = await pazaramaFetch("/product/vatRate/bulk", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data?.success === false) {
    throw new Error(data?.userMessage || data?.message || "KDV oranı güncellenemedi.");
  }

  return { success: true, message: data?.message || "KDV oranları güncellendi." };
}

/**
 * 7. Kategori Ağacı (GET /category/getCategoryTree)
 */
export async function getPazaramaCategoryTree(): Promise<PazaramaCategoryNode[]> {
  const res = await pazaramaFetch("/category/getCategoryTree");
  if (!res.ok) {
    throw new Error(`Kategori ağacı alınamadı (${res.status})`);
  }
  const json = await res.json();
  return json?.data || [];
}

/**
 * 8. Kategori Özellikleri ve Değerleri (GET /category/getCategoryWithAttributes?Id=...)
 */
export async function getPazaramaCategoryAttributes(
  categoryId: string
): Promise<{ id: string; name: string; attributes: PazaramaCategoryAttribute[] }> {
  const res = await pazaramaFetch(`/category/getCategoryWithAttributes?Id=${categoryId}`);
  if (!res.ok) {
    throw new Error(`Kategori özellikleri alınamadı (${res.status})`);
  }
  const json = await res.json();
  return json?.data || { id: categoryId, name: "", attributes: [] };
}

/**
 * 9. Markalar (GET /brand/getBrands)
 */
export async function getPazaramaBrands(
  page = 1,
  size = 100
): Promise<{ brands: PazaramaBrand[]; totalCount: number }> {
  const res = await pazaramaFetch(`/brand/getBrands?page=${page}&size=${size}`);
  if (!res.ok) {
    throw new Error(`Marka listesi alınamadı (${res.status})`);
  }
  const json = await res.json();
  const brands: PazaramaBrand[] = (json?.data || []).map((b: any) => ({
    id: b.id,
    name: (b.name || "").trim(),
    logoUrl: b.logoUrl,
    website: b.website,
    status: b.status ?? true,
  }));
  return { brands, totalCount: json?.totalCount || brands.length };
}

/**
 * 10. Toplu İstek / Batch Sorgulama (GET /product/getProductBatchResult)
 */
export async function getPazaramaBatchResult(batchRequestId: string): Promise<any> {
  const res = await pazaramaFetch(`/product/getProductBatchResult?BatchRequestId=${batchRequestId}`);
  if (!res.ok) {
    throw new Error(`Batch sonucu sorgulanamadı (${res.status})`);
  }
  return await res.json();
}
