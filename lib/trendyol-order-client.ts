/**
 * Trendyol Order API Client
 * 
 * Trendyol API'den sipariş verilerini çekmek için kullanılır.
 * Dökümantasyon: https://developers.trendyol.com/docs/marketplace/orders
 */

export interface TrendyolOrderItem {
  orderLineId: string;
  productName: string;
  productCode: string;
  merchantSku: string;
  quantity: number;
  price: number;
  discount: number;
  vatBaseAmount: number;
  barcode: string;
  orderLineItemStatusName: string; // "Created", "Picking", "Shipped", "Delivered", etc.
}

export interface TrendyolOrder {
  orderNumber: string;
  customerId: number;
  customerFirstName: string;
  customerLastName: string;
  orderDate: number; // Unix timestamp
  status: string; // "Created", "Picking", "Shipped", "Delivered", etc.
  totalPrice: number;
  totalDiscount: number;
  taxNumber: string | null;
  invoiceAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    district: string;
  };
  shipmentAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    district: string;
  };
  lines: TrendyolOrderItem[];
  cargoTrackingNumber?: string;
  cargoProviderName?: string;
  deliveryType?: string;
}

export interface TrendyolOrdersResponse {
  content: TrendyolOrder[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
}

export interface FetchOrdersParams {
  page?: number;
  size?: number;
  startDate?: number; // Unix timestamp
  endDate?: number; // Unix timestamp
  status?: string; // "Created", "Picking", "Shipped", "Delivered", etc.
  orderNumber?: string;
}

/**
 * Trendyol API'den siparişleri çeker
 * CORS sorununu önlemek için Next.js API Route kullanılır
 */
export async function fetchTrendyolOrders(
  params: FetchOrdersParams = {}
): Promise<TrendyolOrdersResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.page !== undefined) queryParams.append("page", params.page.toString());
  if (params.size !== undefined) queryParams.append("size", params.size.toString());
  if (params.startDate !== undefined) queryParams.append("startDate", params.startDate.toString());
  if (params.endDate !== undefined) queryParams.append("endDate", params.endDate.toString());
  if (params.status) queryParams.append("status", params.status);
  if (params.orderNumber) queryParams.append("orderNumber", params.orderNumber);

  const res = await fetch(`/api/trendyol-orders?${queryParams.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Siparişler alınamadı");
  }

  const data = await res.json();
  return data as TrendyolOrdersResponse;
}

/**
 * Belirli bir tarih aralığındaki siparişleri çeker
 */
export async function fetchOrdersByDateRange(
  startDate: Date,
  endDate: Date,
  status?: string
): Promise<TrendyolOrder[]> {
  const allOrders: TrendyolOrder[] = [];
  let currentPage = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchTrendyolOrders({
      page: currentPage,
      size: 200, // Max page size
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      status,
    });

    allOrders.push(...response.content);
    currentPage++;
    hasMore = currentPage < response.totalPages;
  }

  return allOrders;
}

/**
 * Teslim edilmiş siparişleri çeker
 */
export async function fetchDeliveredOrders(
  startDate: Date,
  endDate: Date
): Promise<TrendyolOrder[]> {
  return fetchOrdersByDateRange(startDate, endDate, "Delivered");
}

/**
 * Trendyol sipariş durumlarını yerel statülere map et
 */
export function mapTrendyolStatusToLocal(trendyolStatus: string): "pending" | "in_production" | "completed" | "delivered" {
  const statusMap: Record<string, "pending" | "in_production" | "completed" | "delivered"> = {
    "Created": "pending",
    "Picking": "in_production",
    "Invoiced": "in_production",
    "Shipped": "completed",
    "Delivered": "delivered",
    "Cancelled": "pending", // İptal edilenler için
    "Returned": "pending", // İade edilenler için
  };

  return statusMap[trendyolStatus] || "pending";
}
