/**
 * N11 REST API Entegrasyon İstemcisi
 * Resmi N11 REST API Dökümantasyonuna (2024 Güncel Sürüm) uygun olarak hazırlanmıştır.
 */

export interface N11Category {
  id: number;
  name: string;
  subCategories?: N11Category[] | null;
}

export interface N11CategoryAttributeValue {
  id: number;
  value: string;
}

export interface N11CategoryAttribute {
  attributeId: number;
  categoryId: number;
  attributeName: string;
  isMandatory: boolean;
  isVariant: boolean;
  isSlicer: boolean;
  isCustomValue: boolean;
  isN11Grouping?: boolean;
  attributeOrder?: number;
  attributeValues: N11CategoryAttributeValue[];
}

export interface N11ProductItem {
  n11ProductId?: number;
  id?: number;
  sellerId?: number;
  stockCode: string;
  title: string;
  description?: string;
  categoryId?: number;
  productMainId?: string;
  status?: "Active" | "Suspended" | "InCatalogApproval" | "CatalogRejected" | "Unlisted" | "Prohibited" | "InApproval";
  saleStatus?: "Before_Sale" | "On_Sale" | "Out_Of_Stock" | "Sale_Closed";
  preparingDay?: number;
  shipmentTemplate?: string;
  maxPurchaseQuantity?: number;
  catalogId?: number | null;
  barcode?: string | null;
  currencyType?: string;
  salePrice: number;
  listPrice: number;
  quantity: number;
  images?: { url: string; order: number }[];
  attributes?: {
    attributeId?: number;
    id?: number;
    attributeName?: string;
    attributeValue?: string;
    valueId?: number | null;
    customValue?: string | null;
  }[];
}

export interface N11ProductCreateSku {
  title: string;
  description: string;
  categoryId: number;
  currencyType: string;
  productMainId: string;
  preparingDay: number;
  shipmentTemplate: string;
  maxPurchaseQuantity?: number;
  stockCode: string;
  catalogId?: number | null;
  barcode?: string | number | null;
  quantity: number;
  images: { url: string; order: number }[];
  attributes: {
    id: number;
    valueId?: number | null;
    customValue?: string | null;
  }[];
  salePrice: number;
  listPrice: number;
  vatRate: number;
}

export interface N11PriceStockUpdateItem {
  stockCode: string;
  listPrice?: number;
  salePrice?: number;
  quantity?: number;
  currencyType?: string;
}

export interface N11ProductUpdateItem {
  stockCode: string;
  status?: "Active" | "Suspended";
  preparingDay?: number;
  shipmentTemplate?: string;
  currencyType?: string;
  deleteProductMainId?: boolean;
  productMainId?: string;
  deleteMaxPurchaseQuantity?: boolean;
  maxPurchaseQuantity?: number;
  description?: string;
  vatRate?: number;
}

export interface N11TaskResponse {
  id: number;
  type: string;
  status: "IN_QUEUE" | "PROCESSED" | "REJECT";
  reasons?: string[];
}

export interface N11ShipmentPackage {
  id: string;
  orderNumber: string;
  status?: string;
  shipmentPackageStatus?: string;
  customerEmail?: string;
  customerfullName?: string;
  customerId?: number;
  taxId?: string;
  taxOffice?: string;
  tcIdentityNumber?: string;
  cargoTrackingNumber?: string;
  cargoTrackingLink?: string;
  cargoProviderName?: string;
  totalAmount?: number;
  totalDiscountAmount?: number;
  lastModifiedDate?: number;
  agreedDeliveryDate?: number;
  billingAddress?: {
    address?: string;
    city?: string;
    district?: string;
    neighborhood?: string;
    fullName?: string;
    gsm?: string;
    tcId?: string;
    postalCode?: string;
  };
  shippingAddress?: {
    address?: string;
    city?: string;
    district?: string;
    neighborhood?: string;
    fullName?: string;
    gsm?: string;
    tcId?: string;
    postalCode?: string;
  };
  lines?: {
    orderLineId: number;
    productId: number;
    productName: string;
    stockCode: string;
    quantity: number;
    price: number;
    dueAmount: number;
    sellerInvoiceAmount: number;
    orderItemLineItemStatusName?: string;
    variantAttributes?: { name: string; value: string }[];
  }[];
}

export class N11ApiClient {
  private appKey: string;
  private appSecret: string;
  private integrator: string;
  private baseUrl = "https://api.n11.com";

  constructor(credentials?: { appKey?: string; appSecret?: string; integrator?: string }) {
    this.appKey = credentials?.appKey || process.env.N11_APP_KEY || "";
    this.appSecret = credentials?.appSecret || process.env.N11_APP_SECRET || "";
    this.integrator = credentials?.integrator || process.env.N11_INTEGRATOR || "AhenkEntegrasyon";

    if (!this.appKey || !this.appSecret) {
      console.warn("⚠️ N11 API anahtarları eksik (N11_APP_KEY veya N11_APP_SECRET)");
    }
  }

  private getHeaders(includeSecret = true): Record<string, string> {
    const appKey = this.appKey || process.env.N11_APP_KEY || "";
    const appSecret = this.appSecret || process.env.N11_APP_SECRET || "";
    const headers: Record<string, string> = {
      appkey: appKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (includeSecret) {
      headers.appsecret = appSecret;
    }
    return headers;
  }

  /**
   * Kategori Ağacı Listeleme
   * GET https://api.n11.com/cdn/categories
   */
  async getCategories(): Promise<{ categories: N11Category[] }> {
    const res = await fetch(`${this.baseUrl}/cdn/categories`, {
      method: "GET",
      headers: this.getHeaders(false),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`N11 getCategories failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return { categories: Array.isArray(data) ? data : data.categories || [] };
  }

  /**
   * Kategori Özellikleri Listeleme
   * GET https://api.n11.com/cdn/category/{categoryId}/attribute
   */
  async getCategoryAttributes(categoryId: number): Promise<{
    id: number;
    name: string;
    categoryAttributes: N11CategoryAttribute[];
  }> {
    const res = await fetch(`${this.baseUrl}/cdn/category/${categoryId}/attribute`, {
      method: "GET",
      headers: this.getHeaders(false),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`N11 getCategoryAttributes failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Satıcı Ürünlerini Listeleme
   * GET https://api.n11.com/ms/product-query
   */
  async getProducts(params?: {
    id?: number;
    productMainId?: string;
    stockCode?: string;
    saleStatus?: string;
    productStatus?: string;
    brandName?: string;
    categoryIds?: number[];
    page?: number;
    size?: number;
  }): Promise<{
    content: N11ProductItem[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  }> {
    const query = new URLSearchParams();
    if (params?.id) query.set("id", String(params.id));
    if (params?.productMainId) query.set("productMainId", params.productMainId);
    if (params?.stockCode) query.set("stockCode", params.stockCode);
    if (params?.saleStatus) query.set("saleStatus", params.saleStatus);
    if (params?.productStatus) query.set("productStatus", params.productStatus);
    if (params?.brandName) query.set("brandName", params.brandName);
    if (params?.categoryIds?.length) query.set("categoryIds", params.categoryIds.join(","));
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(Math.min(params?.size ?? 50, 50)));

    const res = await fetch(`${this.baseUrl}/ms/product-query?${query.toString()}`, {
      method: "GET",
      headers: this.getHeaders(true),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`N11 getProducts failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      content: data.content || [],
      totalElements: data.totalElements ?? (data.content?.length || 0),
      totalPages: data.totalPages ?? 1,
      number: data.number ?? 0,
      size: data.size ?? (data.content?.length || 0),
    };
  }

  /**
   * Yeni Ürün Yükleme (Varyantlı veya Tekil)
   * POST https://api.n11.com/ms/product/tasks/product-create
   */
  async createProduct(skus: N11ProductCreateSku[]): Promise<N11TaskResponse> {
    const body = {
      payload: {
        integrator: this.integrator,
        skus,
      },
    };

    const res = await fetch(`${this.baseUrl}/ms/product/tasks/product-create`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || data.status === "REJECT") {
      throw new Error(
        `N11 createProduct error: ${data.reasons ? data.reasons.join(", ") : JSON.stringify(data)}`
      );
    }

    return data;
  }

  /**
   * Ürün Fiyat & Stok Güncelleme
   * POST https://api.n11.com/ms/product/tasks/price-stock-update
   */
  async updatePriceAndStock(skus: N11PriceStockUpdateItem[]): Promise<N11TaskResponse> {
    const formattedSkus = skus.map((item) => {
      const formatted: any = { stockCode: item.stockCode };
      if (item.listPrice !== undefined) formatted.listPrice = Number(item.listPrice.toFixed(2));
      if (item.salePrice !== undefined) formatted.salePrice = Number(item.salePrice.toFixed(2));
      if (item.quantity !== undefined) formatted.quantity = Math.floor(item.quantity);
      if (item.currencyType) formatted.currencyType = item.currencyType;
      else formatted.currencyType = "TL";
      return formatted;
    });

    const body = {
      payload: {
        integrator: this.integrator,
        skus: formattedSkus,
      },
    };

    const res = await fetch(`${this.baseUrl}/ms/product/tasks/price-stock-update`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || data.status === "REJECT") {
      throw new Error(
        `N11 updatePriceAndStock error: ${data.reasons ? data.reasons.join(", ") : JSON.stringify(data)}`
      );
    }

    return data;
  }

  /**
   * Ürün Bilgisi Güncelleme (Durum, Başlık, Kargo Şablonu vb.)
   * POST https://api.n11.com/ms/product/tasks/product-update
   */
  async updateProduct(skus: N11ProductUpdateItem[]): Promise<N11TaskResponse> {
    const body = {
      payload: {
        integrator: this.integrator,
        skus,
      },
    };

    const res = await fetch(`${this.baseUrl}/ms/product/tasks/product-update`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || data.status === "REJECT") {
      throw new Error(
        `N11 updateProduct error: ${data.reasons ? data.reasons.join(", ") : JSON.stringify(data)}`
      );
    }

    return data;
  }

  /**
   * Görev Sonucu Sorgulama (Task Details)
   * POST https://api.n11.com/ms/product/task-details/page-query
   */
  async getTaskDetails(taskId: number, page = 0, size = 100): Promise<any> {
    const res = await fetch(`${this.baseUrl}/ms/product/task-details/page-query`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify({
        taskId,
        pageable: { page, size },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`N11 getTaskDetails failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Sipariş Listeleme (Shipment Packages)
   * GET https://api.n11.com/rest/delivery/v1/shipmentPackages
   */
  async getShipmentPackages(params?: {
    orderNumber?: string;
    packageIds?: string;
    startDate?: number;
    endDate?: number;
    status?: "Created" | "Picking" | "Shipped" | "Cancelled" | "Delivered" | "UnPacked" | "UnSupplied";
    page?: number;
    size?: number;
    orderByDirection?: "ASC" | "DESC";
    orderbyField?: boolean;
  }): Promise<{
    content: N11ShipmentPackage[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
  }> {
    const query = new URLSearchParams();
    if (params?.orderNumber) query.set("orderNumber", params.orderNumber);
    if (params?.packageIds) query.set("packageIds", params.packageIds);
    if (params?.startDate) query.set("startDate", String(params.startDate));
    if (params?.endDate) query.set("endDate", String(params.endDate));
    if (params?.status) query.set("status", params.status);
    if (params?.orderbyField) query.set("orderbyField", "true");
    if (params?.orderByDirection) query.set("orderByDirection", params.orderByDirection);
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(Math.min(params?.size ?? 50, 100)));

    const res = await fetch(`${this.baseUrl}/rest/delivery/v1/shipmentPackages?${query.toString()}`, {
      method: "GET",
      headers: this.getHeaders(true),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`N11 getShipmentPackages failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      content: data.content || [],
      totalElements: data.totalElements ?? (data.content?.length || 0),
      totalPages: data.totalPages ?? 1,
      page: data.page ?? 0,
      size: data.size ?? (data.content?.length || 0),
    };
  }

  /**
   * Sipariş Kalemlerini Güncelleme (Örn: Picking Onayı)
   * PUT https://api.n11.com/rest/order/v1/update
   */
  async updateOrder(lines: { lineId: number }[], status: "Picking" = "Picking"): Promise<any> {
    const res = await fetch(`${this.baseUrl}/rest/order/v1/update`, {
      method: "PUT",
      headers: this.getHeaders(true),
      body: JSON.stringify({ lines, status }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`N11 updateOrder failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }
}

export const n11Client = new N11ApiClient();
