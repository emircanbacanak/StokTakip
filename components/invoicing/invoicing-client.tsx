"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Calendar, User, Package, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { InvoiceDetailModal } from "./invoice-detail-modal";
import type { Order, OrderItem, Buyer } from "@/lib/types/database";

interface OrderWithInvoiceStatus extends Order {
  buyer: Buyer;
  items: OrderItem[];
  daysSinceDelivery: number;
  hasInvoice: boolean;
}

export function InvoicingClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithInvoiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const sb = createClient();
      const now = new Date();
      
      // Sadece "Delivered" ve faturası kesilmemiş siparişleri çek
      const { data: ordersData, error: trendyolError } = await sb
        .from("trendyol_orders")
        .select(`
          id,
          order_number,
          customer_first_name,
          customer_last_name,
          order_date,
          status,
          total_price,
          delivered_at,
          last_updated_at,
          shipment_address,
          invoice_address,
          tax_number,
          cargo_tracking_number,
          cargo_provider_name,
          invoice_status
        `)
        .eq("status", "Delivered") // Sadece teslim edilmiş
        .or("invoice_status.eq.NotInvoiced,invoice_status.is.null") // Faturası kesilmemiş veya status yok
        .order("order_date", { ascending: true }) // Eskiden yeniye (en eski en üstte)
        .limit(200);

      if (trendyolError) {
        console.error("Trendyol siparişleri yüklenemedi:", trendyolError);
        console.error("Error details:", {
          message: trendyolError.message,
          code: trendyolError.code,
          details: trendyolError.details,
          hint: trendyolError.hint
        });
        toast({ 
          title: "Yükleme hatası", 
          description: trendyolError.message || trendyolError.code || "Bilinmeyen hata", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Sipariş ID'lerini topla
      const orderIds = ordersData.map(o => o.id);
      
      // Tüm order items'ları tek query ile çek
      const { data: allItems } = await sb
        .from("trendyol_order_items")
        .select("*")
        .in("trendyol_order_id", orderIds);
      
      // Items'ları sipariş ID'sine göre grupla
      const itemsByOrderId = (allItems || []).reduce((acc, item) => {
        if (!acc[item.trendyol_order_id]) {
          acc[item.trendyol_order_id] = [];
        }
        acc[item.trendyol_order_id].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      // Client-side processing
      const processed: OrderWithInvoiceStatus[] = ordersData
        .map(order => {
          // Teslimat tarihini kullan — delivered_at yoksa sipariş tarihine 3 gün ekle (tahmini teslimat)
          const deliveryDate = order.delivered_at 
            ? new Date(order.delivered_at) 
            : (() => {
                const estimated = new Date(order.order_date);
                estimated.setDate(estimated.getDate() + 3);
                return estimated;
              })();
          
          // Gün farkı hesapla (mutlak değer al)
          const daysDiff = Math.abs(Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)));

          const customerName = `${order.customer_first_name} ${order.customer_last_name}`.trim();
          const city = order.shipment_address?.city || "";
          
          // Fatura kesilmiş mi kontrol et
          const hasInvoice = false; // or filter zaten invoice_number NULL olanları getiriyor

          // Bu siparişin items'larını al
          const orderItems = itemsByOrderId[order.id] || [];

          return {
            id: order.id,
            buyer_id: order.id,
            total_amount: order.total_price,
            paid_amount: 0,
            status: "delivered" as const,
            notes: `📦 Trendyol #${order.order_number} [✅ Teslim Edildi]${city ? ` - ${city}` : ""}`,
            created_at: new Date(order.order_date).toISOString(),
            updated_at: order.last_updated_at,
            buyer: {
              id: order.id,
              name: customerName || "Trendyol Müşterisi",
              phone: null,
              address: null,
              created_at: new Date(order.order_date).toISOString(),
            },
            items: orderItems.map((item: any) => ({
              id: item.id,
              order_id: item.trendyol_order_id,
              product_name: item.product_name,
              quantity: item.quantity,
              price: item.price,
              created_at: new Date().toISOString(),
            })),
            daysSinceDelivery: daysDiff,
            hasInvoice,
          };
        })
        .filter(o => o.daysSinceDelivery >= 0) // Tüm teslim edilmiş siparişler (delivered_at hesabı zaten 3 gün ekliyor)
        .sort((a, b) => b.daysSinceDelivery - a.daysSinceDelivery); // En eski en üstte (büyük gün sayısı = eski)

      const filtered = showAll ? processed : processed.filter(o => !o.hasInvoice);

      setOrders(filtered);
      setLoading(false);
    } catch (error) {
      console.error("Beklenmeyen hata:", error);
      toast({ 
        title: "Beklenmeyen hata", 
        description: "Veriler yüklenirken bir hata oluştu", 
        variant: "destructive" 
      });
      setLoading(false);
    }
  }, [toast, showAll]);

  useEffect(() => {
    load();

    // Realtime subscription
    const sb = createClient();
    const ordersChannel = sb
      .channel("invoicing-trendyol-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "trendyol_orders" }, load)
      .subscribe();

    const itemsChannel = sb
      .channel("invoicing-trendyol-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "trendyol_order_items" }, load)
      .subscribe();

    return () => {
      sb.removeChannel(ordersChannel);
      sb.removeChannel(itemsChannel);
    };
  }, [load]);

  const handleOrderClick = (order: OrderWithInvoiceStatus) => {
    // Trendyol siparişi ise detay modalını aç
    if (order.notes?.includes("Trendyol")) {
      setSelectedOrderId(order.id);
    } else {
      // Manuel siparişler için buyer sayfasına git
      router.push(`/dashboard/orders/${order.buyer_id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bilgi Kartı */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Fatura Bekleyen Trendyol Siparişleri
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Trendyol'dan <strong>"Teslim Edildi"</strong> statüsüne geçmiş, üzerinden <strong>3+ gün</strong> geçmiş siparişler burada listelenir.
              <br />
              💰 Sadece <strong>fatura kesilmemiş</strong> siparişler görünür
              <br />
              📅 En eski siparişler en üstte (acil olanlar öncelikli)
              <br />
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                📋 Siparişe tıklayarak fatura bilgilerini görebilirsiniz
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* İstatistikler */}
      {!loading && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Özet</h3>
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {showAll ? "Sadece Bekleyenleri Göster" : "Tümünü Göster"}
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-amber-500" />
                <span className="text-3xl font-bold text-foreground">
                  {orders.filter(o => !o.hasInvoice).length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Bekleyen Sipariş</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <User className="w-8 h-8 text-blue-500" />
                <span className="text-3xl font-bold text-foreground">
                  {new Set(orders.map(o => o.buyer_id)).size}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Farklı Alıcı</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-orange-500" />
                <span className="text-3xl font-bold text-foreground">
                  {orders.filter(o => o.daysSinceDelivery >= 7 && !o.hasInvoice).length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">7+ Gün Geçmiş</p>
            </div>

            <div className="bg-card rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <span className="text-3xl font-bold text-foreground">
                  {orders.filter(o => o.daysSinceDelivery >= 10 && !o.hasInvoice).length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">10+ Gün (ACİL)</p>
            </div>
          </div>
        </>
      )}

      {/* Sipariş Listesi */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center mx-auto mb-5">
            <FileText className="w-9 h-9 text-emerald-500" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">
            Harika! Bekleyen fatura yok
          </p>
          <p className="text-base text-muted-foreground">
            Tüm teslim edilmiş siparişlerin faturaları kesilmiş
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const urgencyColor = 
              order.daysSinceDelivery >= 7 
                ? "border-red-500/30 bg-red-500/5" 
                : order.daysSinceDelivery >= 5
                ? "border-orange-500/30 bg-orange-500/5"
                : "border-border";

            return (
              <button
                key={order.id}
                onClick={() => handleOrderClick(order)}
                className={`w-full rounded-2xl border ${urgencyColor} p-5 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group relative`}
              >
                {/* Fatura kesilmiş badge */}
                {order.hasInvoice && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Fatura Kesildi
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Sol: Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                    <span className="text-lg font-bold text-white">
                      {order.buyer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Orta: Bilgiler */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-base font-bold text-foreground mb-1">
                          {order.buyer.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(order.updated_at)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {totalItems} adet
                          </span>
                        </div>
                      </div>

                      {/* Sağ: Geçen Gün Badge ve Acil Durumu */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {order.daysSinceDelivery >= 10 && (
                          <div className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-bold animate-pulse">
                            ⚠️ ACİL
                          </div>
                        )}
                        <div
                          className={`px-3 py-1.5 rounded-lg font-semibold text-sm whitespace-nowrap ${
                            order.daysSinceDelivery >= 7
                              ? "bg-red-500/20 text-red-700 dark:text-red-300"
                              : order.daysSinceDelivery >= 5
                              ? "bg-orange-500/20 text-orange-700 dark:text-orange-300"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {order.daysSinceDelivery} gün önce
                        </div>
                      </div>
                    </div>

                    {/* Ürünler */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-muted rounded-lg text-xs font-medium text-muted-foreground"
                        >
                          {item.product_name} × {item.quantity}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="px-2.5 py-1 bg-muted rounded-lg text-xs font-medium text-muted-foreground">
                          +{order.items.length - 3} daha
                        </span>
                      )}
                    </div>

                    {/* Tutar Bilgisi */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sipariş Tutarı</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>

                    {/* Not varsa göster */}
                    {order.notes && (
                      <div className="mt-3 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                        <strong>Not:</strong> {order.notes}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedOrderId && (
        <InvoiceDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
