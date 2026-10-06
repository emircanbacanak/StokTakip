/**
 * Idefix Marketplace REST API Entegrasyon İstemcisi
 * Resmi Idefix Developer Dökümanlarına (PIM & OMS) uygun olarak hazırlanmıştır.
 */

export interface IdefixProductItem {
  barcode: string;
  title: string;
  productMainId: string;
  brandId?: number;
  categoryId?: number;
  inventoryQuantity: number;
  vendorStockCode?: string;
  weight?: string | number;
  description?: string;
  price: number;
  comparePrice?: number;
  vatRate?: number;
  deliveryDuration?: number;
  deliveryType?: "regular" | "same_day_shipping";
  cargoCompanyId?: number | null;
  shipmentAddressId?: number | null;
  returnAddressId?: number | null;
  images?: { url: string }[];
  attributes?: {
    attributeId: number;
    attributeValueId?: number | null;
    customAttributeValue?: string | null;
  }[];
  status?: string;
  statusDateCreatedAt?: string;
  reference?: number;
}

export interface IdefixInventoryUploadItem {
  barcode: string;
  price: number;
  comparePrice?: number;
  inventoryQuantity: number;
  maximumPurchasableQuantity?: number;
  deliveryDuration?: number;
  deliveryType?: "regular" | "same_day_shipping";
  isZoneSale?: boolean | null;
}

export interface IdefixOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalPrice: number;
  discountedTotalPrice: number;
  customerContactName?: string;
  customerContactMail?: string;
  cargoTrackingNumber?: string;
  cargoTrackingUrl?: string;
  cargoCompany?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: {
    id: number;
    productName: string;
    barcode: string;
    price: number;
    discountedTotalPrice: number;
    itemStatus?: string;
    brandName?: string;
  }[];
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    city?: string;
    county?: string;
    fullAddress?: string;
  };
  invoiceAddress?: {
    fullName?: string;
    phone?: string;
    city?: string;
    county?: string;
    fullAddress?: string;
    taxOffice?: string;
    taxNumber?: string;
    identificationNumber?: string;
  };
}

export class IdefixApiClient {
  private sellerId: string;
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = "https://merchantapi.idefix.com";

  constructor(credentials?: { sellerId?: string; apiKey?: string; apiSecret?: string }) {
    this.sellerId = credentials?.sellerId || process.env.IDEFIX_SELLER_ID || "";
    this.apiKey = credentials?.apiKey || process.env.IDEFIX_API_KEY || "";
    this.apiSecret = credentials?.apiSecret || process.env.IDEFIX_API_SECRET || "";
  }

  /**
   * Header için VENDOR TOKEN oluşturma:
   * base64_encode(ApiKey:ApiSecret)
   */
  getVendorToken(): string {
    const apiKey = this.apiKey || process.env.IDEFIX_API_KEY || "";
    const apiSecret = this.apiSecret || process.env.IDEFIX_API_SECRET || "";

    if (!apiKey) {
      throw new Error("Idefix API Key eksik.");
    }
    // Secret henüz girilmemişse apiKey:apiKey denemesi veya açık uyarı
    return Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  }

  private getHeaders(): Record<string, string> {
    return {
      "X-API-KEY": this.getVendorToken(),
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private getVendorId(): string {
    const vendorId = this.sellerId || process.env.IDEFIX_SELLER_ID || "";
    if (!vendorId) {
      throw new Error("Idefix Satıcı ID (Vendor ID) eksik.");
    }
    return vendorId;
  }

  /**
   * Ürünlerimi Listeleme
   * GET /pim/pool/{vendorId}/list
   */
  async getProducts(params?: {
    page?: number;
    limit?: number;
    barcode?: string;
    state?: string;
  }): Promise<{
    products: IdefixProductItem[];
    totalCount?: number;
    pageCount?: number;
    currentPage?: number;
  }> {
    const vendorId = this.getVendorId();
    const query = new URLSearchParams();
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 50));
    if (params?.barcode) query.set("barcode", params.barcode);
    if (params?.state) query.set("state", params.state);

    const res = await fetch(`${this.baseUrl}/pim/pool/${vendorId}/list?${query.toString()}`, {
      method: "GET",
      headers: this.getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Idefix getProducts error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      products: data.products || [],
      totalCount: data.totalCount,
      pageCount: data.pageCount,
      currentPage: data.currentPage,
    };
  }

  /**
   * Stok ve Fiyat Gönderimi
   * POST /pim/catalog/{vendorId}/inventory-upload
   */
  async updateInventory(items: IdefixInventoryUploadItem[]): Promise<{
    status: string;
    batchRequestId: string;
    items?: any[];
  }> {
    const vendorId = this.getVendorId();
    const res = await fetch(`${this.baseUrl}/pim/catalog/${vendorId}/inventory-upload`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ items }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Idefix updateInventory error (${res.status}): ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Yeni Ürün Oluşturma (Tekli veya Varyantlı)
   * POST /pim/pool/{vendorId}/create
   */
  async createProduct(products: Partial<IdefixProductItem>[]): Promise<{
    status: string;
    batchRequestId: string;
    products?: any[];
  }> {
    const vendorId = this.getVendorId();
    const res = await fetch(`${this.baseUrl}/pim/pool/${vendorId}/create`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ products }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Idefix createProduct error (${res.status}): ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Toplu Ürün Yükleme Durumu Sorgulama
   * GET /pim/pool/{vendorId}/batch-result/{batchRequestId}
   */
  async getBatchResult(batchRequestId: string): Promise<any> {
    const vendorId = this.getVendorId();
    const res = await fetch(`${this.baseUrl}/pim/pool/${vendorId}/batch-result/${batchRequestId}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Idefix getBatchResult error (${res.status}): ${err}`);
    }

    return await res.json();
  }

  /**
   * Stok ve Fiyat Gönderim Sonucu Sorgulama
   * GET /pim/catalog/{vendorId}/inventory-result/{batchRequestId}
   */
  async getInventoryResult(batchRequestId: string): Promise<any> {
    const vendorId = this.getVendorId();
    const res = await fetch(`${this.baseUrl}/pim/catalog/${vendorId}/inventory-result/${batchRequestId}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Idefix getInventoryResult error (${res.status}): ${err}`);
    }

    return await res.json();
  }

  /**
   * Sipariş (Shipment) Listeleme
   * GET /oms/{vendorId}/list
   */
  async getOrders(params?: {
    ids?: string;
    orderNumber?: string;
    state?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: IdefixOrder[];
    totalCount?: number;
    pageCount?: number;
    currentPage?: number;
  }> {
    const vendorId = this.getVendorId();
    const query = new URLSearchParams();
    query.set("vendor", vendorId);
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 20));
    if (params?.ids) query.set("ids", params.ids);
    if (params?.orderNumber) query.set("orderNumber", params.orderNumber);
    if (params?.state) query.set("state", params.state);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);

    const res = await fetch(`${this.baseUrl}/oms/${vendorId}/list?${query.toString()}`, {
      method: "GET",
      headers: this.getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Idefix getOrders error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      items: data.items || [],
      totalCount: data.totalCount,
      pageCount: data.pageCount,
      currentPage: data.currentPage,
    };
  }

  /**
   * Sipariş Statü Güncelleme (Örn: shipment_picking, shipment_invoiced)
   * PUT /oms/{vendorId}/shipment-status
   */
  async updateShipmentStatus(payload: {
    shipmentId: number | string;
    status: "shipment_picking" | "shipment_invoiced" | "shipment_in_cargo" | string;
  }): Promise<any> {
    const vendorId = this.getVendorId();
    const res = await fetch(`${this.baseUrl}/oms/${vendorId}/shipment-status`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Idefix updateShipmentStatus error (${res.status}): ${JSON.stringify(data)}`);
    }

    return data;
  }
}

export const idefixClient = new IdefixApiClient();
