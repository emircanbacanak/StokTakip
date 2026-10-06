/**
 * Trendruum REST API Entegrasyon İstemcisi
 * Resmi Trendruum Developer Dökümanlarına uygun olarak hazırlanmıştır.
 */

export interface TrendruumCategory {
  id: number;
  name: string;
  parent_id?: number | null;
  children?: TrendruumCategory[];
}

export interface TrendruumBrand {
  id: number;
  name: string;
}

export interface TrendruumProductVariant {
  barcode: string;
  stock_code: string;
  stock: number;
  price: number;
  compare_price?: number;
  attributes?: Record<string, string>; // e.g. { "Renk": "Mavi", "Beden": "M" }
}

export interface TrendruumProduct {
  id?: number | string;
  title: string;
  name?: string;           // Trendruum API'den gelen gerçek ad alanı
  description: string;
  category_id: number;
  brand_id?: number;
  brand_name?: string;
  brand_v2?: { name?: string };
  model_code?: string;     // Trendruum API'den gelen model kodu (gerçek alan)
  product_main_id?: string;
  stock_code?: string;     // Ürn: TVL-MINI-SET
  vat_rate?: number;
  tax?: number;
  images: string[];
  medias?: Array<{ url?: string; fullpath?: string } | string>; // Trendruum API görsel dizisi
  variants?: TrendruumProductVariant[];
  barcode?: string;
  stock?: number;
  price?: number;
  effective_price?: number;
  compare_price?: number;
  status?: "active" | "passive" | "rejected" | "pending";
  moderation?: string;
  created_at?: string;
  updated_at?: string;
  slug?: string;
  cpid?: string;           // Ürn: parent_id
  parent_id?: string;
}

export interface TrendruumOrder {
  id: number | string;
  order_number: string;
  status: string;
  total_amount: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: any;
  billing_address?: any;
  items?: {
    id: number | string;
    product_name: string;
    barcode: string;
    quantity: number;
    price: number;
  }[];
  cargo_tracking_number?: string;
  cargo_provider?: string;
  created_at?: string;
}

export class TrendruumApiClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl = "https://api.trendruum.com/api/v1/integration";
  private token: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(credentials?: { clientId?: string; clientSecret?: string }) {
    this.clientId = credentials?.clientId || process.env.TRENDRUUM_CLIENT_ID || "";
    this.clientSecret = credentials?.clientSecret || process.env.TRENDRUUM_CLIENT_SECRET || "";
  }

  /**
   * OAuth Bearer Token Alma ve Önbellekleme
   */
  async getAuthToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.tokenExpiresAt && now < this.tokenExpiresAt - 60000) {
      return this.token;
    }

    const clientId = this.clientId || process.env.TRENDRUUM_CLIENT_ID || "";
    const clientSecret = this.clientSecret || process.env.TRENDRUUM_CLIENT_SECRET || "";

    if (!clientId || !clientSecret) {
      throw new Error("Trendruum API istemci bilgileri eksik (TRENDRUUM_CLIENT_ID veya TRENDRUUM_CLIENT_SECRET)");
    }

    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Trendruum auth/login failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const token = data.data?.token || data.token || data.access_token;
    if (!token) {
      throw new Error(`Trendruum login yanıtında token bulunamadı: ${JSON.stringify(data)}`);
    }

    this.token = token;
    // Varsayılan olarak 30 gün veya gelen expires_in süresi
    const expiresInSec = data.data?.expires_in || data.expires_in || 30 * 24 * 3600;
    this.tokenExpiresAt = now + expiresInSec * 1000;
    return token;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    };

    let res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Token geçersizleşmişse bir kez yenilemeyi dene
    if (res.status === 401) {
      this.token = null;
      const newToken = await this.getAuthToken();
      (headers as any).Authorization = `Bearer ${newToken}`;
      res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });
    }

    return res;
  }

  /**
   * Entegrasyon ve Hesap Kontrolü
   * GET /auth/me
   */
  async getMe(): Promise<any> {
    const res = await this.fetchWithAuth("/auth/me");
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Trendruum getMe error (${res.status}): ${err}`);
    }
    return await res.json();
  }

  /**
   * Kategorileri Listeleme
   * GET /categories
   */
  async getCategories(limit = 5000): Promise<TrendruumCategory[]> {
    const res = await this.fetchWithAuth(`/categories?limit=${limit}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Trendruum getCategories error (${res.status}): ${err}`);
    }
    const data = await res.json();
    return data.data || data.categories || data || [];
  }

  /**
   * Marka Listeleme ve Arama
   * GET /brands
   */
  async getBrands(search?: string, limit = 50): Promise<TrendruumBrand[]> {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    query.set("limit", String(limit));

    const res = await this.fetchWithAuth(`/brands?${query.toString()}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Trendruum getBrands error (${res.status}): ${err}`);
    }
    const data = await res.json();
    return data.data || data.brands || data || [];
  }

  /**
   * Ürünleri Listeleme
   * GET /products
   */
  async getProducts(params?: {
    page?: number;
    limit?: number;
    per_page?: number;
    barcode?: string;
    status?: string;
    fetchAll?: boolean;
  }): Promise<{
    data: TrendruumProduct[];
    total?: number;
    current_page?: number;
    last_page?: number;
  }> {
    const fetchAll = params?.fetchAll ?? true;
    const perPage = params?.per_page ?? params?.limit ?? 100;
    let currentPage = params?.page ?? 1;

    const fetchSinglePage = async (page: number) => {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("per_page", String(perPage));
      query.set("limit", String(perPage));
      if (params?.barcode) query.set("barcode", params.barcode);
      if (params?.status) query.set("status", params.status);

      const res = await this.fetchWithAuth(`/products?${query.toString()}`);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Trendruum getProducts error (${res.status}): ${err}`);
      }
      return await res.json();
    };

    const firstData = await fetchSinglePage(currentPage);
    let rawProducts: any[] = firstData.data || firstData.products || (Array.isArray(firstData) ? firstData : []);

    const totalFromMeta =
      firstData.meta?.pagination?.total ??
      firstData.meta?.total ??
      firstData.total;
    const totalPages =
      firstData.meta?.pagination?.total_pages ??
      firstData.meta?.last_page ??
      firstData.last_page ??
      1;

    // Eğer fetchAll aktifse ve birden fazla sayfa varsa kalan tüm sayfaları çek ve birleştir
    if (fetchAll && totalPages > 1 && !params?.page) {
      const pagePromises: Promise<any>[] = [];
      for (let p = 2; p <= totalPages; p++) {
        pagePromises.push(fetchSinglePage(p));
      }
      const restResults = await Promise.all(pagePromises);
      for (const res of restResults) {
        const pageItems: any[] = res.data || res.products || (Array.isArray(res) ? res : []);
        rawProducts = rawProducts.concat(pageItems);
      }
    }

    // Trendruum API'si 'name' kullanır, 'title' değil; 'model_code' kullanır, 'product_main_id' değil
    const normalized: TrendruumProduct[] = rawProducts.map((p: any) => {
      const medias: any[] = p.medias || [];
      const images: string[] = medias
        .map((m: any) => {
          if (typeof m === "string") {
            return m.startsWith("http") ? m : `https://tr-126.b-cdn.net/${m.replace(/^\//, "")}`;
          }
          if (m.url && typeof m.url === "string" && m.url.startsWith("http")) {
            return m.url;
          }
          if (m.fullpath && typeof m.fullpath === "string") {
            return m.fullpath.startsWith("http")
              ? m.fullpath
              : `https://tr-126.b-cdn.net/${m.fullpath.replace(/^\//, "")}`;
          }
          return "";
        })
        .filter(Boolean);

      return {
        ...p,
        title: p.name || p.title || "", // API 'name' gönderiyor
        product_main_id: p.model_code || p.product_main_id || "", // API 'model_code' gönderiyor
        images, // medias'tan tam CDN URL'i
        medias,
        price: p.price ?? p.effective_price ?? 0,
        brand_name: p.brand_v2?.name || p.brand_name || "",
      };
    });

    return {
      data: normalized,
      total: totalFromMeta ?? normalized.length,
      current_page: currentPage,
      last_page: totalPages,
    };
  }

  /**
   * Tekli Ürün Oluşturma
   * POST /products
   */
  async createProduct(product: Partial<TrendruumProduct>): Promise<any> {
    const res = await this.fetchWithAuth("/products", {
      method: "POST",
      body: JSON.stringify(product),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Trendruum createProduct error (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  }

  /**
   * Toplu Stok Güncelleme
   * POST /products/stock-update
   * items: [{ barcode: string, stock: number }]
   */
  async updateStock(items: { barcode: string; stock: number }[]): Promise<any> {
    const res = await this.fetchWithAuth("/products/stock-update", {
      method: "POST",
      body: JSON.stringify({ items }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Trendruum updateStock error (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  }

  /**
   * Toplu Fiyat Güncelleme
   * POST /products/price-update
   * items: [{ barcode: string, price: number, compare_price?: number }]
   */
  async updatePrice(items: { barcode: string; price: number; compare_price?: number }[]): Promise<any> {
    const res = await this.fetchWithAuth("/products/price-update", {
      method: "POST",
      body: JSON.stringify({ items }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Trendruum updatePrice error (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  }

  /**
   * Ürün Durumu Güncelleme (Aktif / Pasif)
   * POST /products/status-update
   * items: [{ barcode: string, status: "active" | "passive" }]
   */
  async updateStatus(items: { barcode: string; status: "active" | "passive" }[]): Promise<any> {
    const res = await this.fetchWithAuth("/products/status-update", {
      method: "POST",
      body: JSON.stringify({ items }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Trendruum updateStatus error (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  }

  /**
   * Ürün Silme
   * DELETE /products/{id}
   */
  async deleteProduct(productId: number | string): Promise<any> {
    const res = await this.fetchWithAuth(`/products/${productId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Trendruum deleteProduct error (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  }

  /**
   * Siparişleri Listeleme
   * GET /orders
   */
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    data: TrendruumOrder[];
    total?: number;
    current_page?: number;
    last_page?: number;
  }> {
    const query = new URLSearchParams();
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 50));
    if (params?.status) query.set("status", params.status);

    const res = await this.fetchWithAuth(`/orders?${query.toString()}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Trendruum getOrders error (${res.status}): ${err}`);
    }
    const data = await res.json();
    return {
      data: data.data || data.orders || (Array.isArray(data) ? data : []),
      total: data.total ?? data.meta?.total ?? (data.data?.length || 0),
      current_page: data.current_page ?? data.meta?.current_page ?? 1,
      last_page: data.last_page ?? data.meta?.last_page ?? 1,
    };
  }

  /**
   * Sipariş Durumu Güncelleme
   * PUT /orders/{ogid}/status/{status}
   */
  async updateOrderStatus(ogid: string | number, status: string): Promise<any> {
    const res = await this.fetchWithAuth(`/orders/${ogid}/status/${status}`, {
      method: "PUT",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Trendruum updateOrderStatus error (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  }
}

export const trendruumClient = new TrendruumApiClient();
