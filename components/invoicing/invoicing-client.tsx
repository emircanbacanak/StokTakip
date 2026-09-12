"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Calendar, User, Package, AlertCircle, Trash2, Zap, Download, RefreshCw, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, cleanProductName } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { InvoiceDetailModal } from "./invoice-detail-modal";
import { GibEarsivModal } from "./gib-earsiv-modal";
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
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{
    success: boolean;
    fetched: number;
    created: number;
    delivered?: number;
    notInvoiced?: number;
    updated?: number;
    deleted?: number;
    errors: number;
    errorMessage?: string;
  } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showGibModal, setShowGibModal] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const sb = createClient();
      const now = new Date();
      
      // "Delivered" siparişleri çek — en yeni sipariş en üstte olacak şekilde
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
        .eq("status", "Delivered")
        .order("order_date", { ascending: false }) // En yeni sipariş en üstte
        .limit(500);

      if (trendyolError) {
        console.error("Trendyol siparişleri yüklenemedi:", trendyolError);
        toast({ 
          title: "Yükleme hatası", 
          description: trendyolError.message || "Bilinmeyen hata", 
          variant: "destructive" 
        });
        setOrders([]);
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
          // order_date DB'de epoch ms (number) olarak tutuluyor — normalize et
          const parseDate = (val: any): Date => {
            if (!val) return new Date();
            if (val instanceof Date) return val;
            const num = Number(val);
            if (!isNaN(num) && num > 1000000000000) return new Date(num);
            return new Date(val);
          };

          const deliveryDate = order.delivered_at
            ? parseDate(order.delivered_at)
            : (() => {
                const estimated = parseDate(order.order_date);
                estimated.setDate(estimated.getDate() + 3);
                return estimated;
              })();

          const rawDiff = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
          const daysDiff = Math.max(0, rawDiff);

          const customerName = `${order.customer_first_name} ${order.customer_last_name}`.trim();
          const city = order.shipment_address?.city || "";
          
          // Fatura kesilmiş mi kontrol et
          const hasInvoice = order.invoice_status === "Invoiced";

          // Bu siparişin items'larını al
          const orderItems = itemsByOrderId[order.id] || [];

          return {
            id: order.id,
            buyer_id: order.id,
            total_amount: order.total_price,
            paid_amount: 0,
            status: "delivered" as const,
            notes: `📦 Trendyol #${order.order_number} [✅ Teslim Edildi]${city ? ` - ${city}` : ""}`,
            created_at: parseDate(order.order_date).toISOString(),
            updated_at: order.last_updated_at,
            order_number: order.order_number,
            customer_first_name: order.customer_first_name,
            customer_last_name: order.customer_last_name,
            shipment_address: order.shipment_address,
            invoice_address: order.invoice_address,
            tax_number: order.tax_number,
            total_price: order.total_price,
            order_date: order.order_date,
            buyer: {
              id: order.id,
              name: customerName || "Trendyol Müşterisi",
              phone: null,
              address: null,
              created_at: parseDate(order.order_date).toISOString(),
            },
            items: orderItems.map((item: any) => ({
              id: item.id,
              order_id: item.trendyol_order_id,
              product_name: cleanProductName(item.product_name),
              quantity: item.quantity,
              price: item.price,
              created_at: new Date().toISOString(),
            })),
            daysSinceDelivery: daysDiff,
            hasInvoice,
          };
        })
        // Tarihe göre yakından uzağa doğru (en yeni tarih en üstte)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

  const handleSync = async (days: number = 30) => {
    setSyncing(true);
    setLastSync(null);
    setOrders([]); // Önbelleği / ekranı sıfırla
    toast({
      title: "Senkronizasyon Başladı",
      description: `Eski veriler temizleniyor ve son ${days} günün siparişleri Trendyol'dan çekiliyor...`,
    });

    try {
      const response = await fetch("/api/trendyol-orders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || "Senkronizasyon başarısız oldu");
      }

      setLastSync(result);

      if (result.success) {
        toast({
          title: "✅ Senkronizasyon Tamamlandı!",
          description: `${result.fetched} sipariş çekildi, ${result.created} sipariş veritabanına kaydedildi.`,
        });
      } else {
        toast({
          title: "⚠️ Senkronizasyon Tamamlandı (Hatalarla)",
          description: `${result.created} sipariş kaydedildi, ${result.errors} hata oluştu.`,
          variant: "destructive",
        });
      }

      // Verileri yeniden yükle
      await load();
    } catch (err) {
      console.error("Sync hatası:", err);
      toast({
        title: "Senkronizasyon Hatası",
        description: err instanceof Error ? err.message : "Bilinmeyen hata oluştu",
        variant: "destructive",
      });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = await confirm({
      title: "Tüm Kayıtları Sil",
      message: "Tüm sipariş ve fatura kayıtlarını veritabanından kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Evet, Tümünü Sil",
      cancelText: "Vazgeç",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      setLoading(true);
      const sb = createClient();
      await sb.from("trendyol_order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await sb.from("trendyol_orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      setOrders([]);
      toast({ 
        title: "Tüm Kayıtlar Silindi", 
        description: "Tüm siparişler ve fatura kayıtları başarıyla silindi." 
      });
      await load();
    } catch (err) {
      console.error("Tümünü silme hatası:", err);
      toast({ 
        title: "Hata", 
        description: "Kayıtlar silinirken bir hata oluştu", 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

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
      {/* Başlık ve İşlem Butonları */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Trendyol Siparişleri</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Trendyol'dan siparişleri otomatik olarak çekin ve fatura yönetiminde takip edin
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowGibModal(true)}
            disabled={syncing || loading || orders.filter(o => !o.hasInvoice).length === 0}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98]"
            title="Bekleyen tüm siparişleri GİB e-Arşiv Taslaklara aktarır"
          >
            <Zap className="w-4 h-4 fill-current" />
            ⚡ e-Arşive Gönder ({orders.filter(o => !o.hasInvoice).length})
          </button>

          <button
            onClick={handleDeleteAll}
            disabled={syncing || loading || orders.length === 0}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
            title="Tüm veritabanı kayıtlarını sil"
          >
            <Trash2 className="w-4 h-4" />
            Tümünü Sil
          </button>
        </div>
      </div>

      {/* Sync Butonları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => handleSync(7)}
          disabled={syncing || loading}
          className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Son 7 Gün</p>
            <p className="text-xs text-muted-foreground">Hızlı sync</p>
          </div>
        </button>

        <button
          onClick={() => handleSync(30)}
          disabled={syncing || loading}
          className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
            <Calendar className="w-6 h-6 text-violet-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Son 30 Gün</p>
            <p className="text-xs text-muted-foreground">Aylık sync</p>
          </div>
        </button>

        <button
          onClick={() => handleSync(90)}
          disabled={syncing || loading}
          className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <Calendar className="w-6 h-6 text-amber-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Son 90 Gün</p>
            <p className="text-xs text-muted-foreground">Çeyrek sync</p>
          </div>
        </button>

        <button
          onClick={() => handleSync(365)}
          disabled={syncing || loading}
          className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
            <Download className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Son 1 Yıl</p>
            <p className="text-xs text-muted-foreground">Tam sync</p>
          </div>
        </button>
      </div>

      {/* Syncing Progress */}
      {syncing && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Siparişler çekiliyor...</p>
              <p className="text-sm text-muted-foreground">
                Bu işlem birkaç dakika sürebilir
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Last Sync Result */}
      {lastSync && !syncing && (
        <div className={`border rounded-2xl p-6 ${
          lastSync.success && lastSync.errors === 0
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-amber-500/10 border-amber-500/20"
        }`}>
          <div className="flex items-start gap-4">
            {lastSync.success && lastSync.errors === 0 ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-foreground mb-2">
                Son Senkronizasyon Sonucu
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Toplam</p>
                  <p className="font-bold text-foreground">{lastSync.fetched}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kaydedilen</p>
                  <p className="font-bold text-emerald-600">{lastSync.created}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teslim Edilmiş</p>
                  <p className="font-bold text-blue-600">{lastSync.delivered ?? lastSync.updated ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fatura Bekleyen</p>
                  <p className="font-bold text-orange-600">{lastSync.notInvoiced ?? lastSync.deleted ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hata</p>
                  <p className="font-bold text-red-600">{lastSync.errors}</p>
                </div>
              </div>
              {lastSync.errorMessage && (
                <p className="text-xs text-muted-foreground mt-3">
                  {lastSync.errorMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bilgilendirme */}
      <div className="bg-card/50 border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-3">💡 Nasıl Çalışır?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0 font-bold">1.</span>
            <span>
              Yukarıdaki butonlardan birini seçerek Trendyol'dan siparişleri çekin
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0 font-bold">2.</span>
            <span>
              Siparişler otomatik olarak veritabanına kaydedilir
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0 font-bold">3.</span>
            <span>
              "Teslim Edildi" statüsündeki siparişler <strong>Fatura Yönetimi</strong> sayfasında görünür
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0 font-bold">4.</span>
            <span>
              3+ gün geçmiş ve fatura kesilmemiş siparişler otomatik olarak listelenir
            </span>
          </li>
        </ul>
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
              <div
                key={order.id}
                onClick={() => handleOrderClick(order)}
                className={`w-full rounded-2xl border ${urgencyColor} p-5 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group relative`}
              >
                {/* Fatura kesilmiş badge */}
                {order.hasInvoice && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
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
              </div>
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

      {/* GİB e-Arşiv Automation Modal */}
      {showGibModal && (
        <GibEarsivModal
          orders={orders.filter((o) => !o.hasInvoice)}
          onClose={() => setShowGibModal(false)}
          onSuccess={load}
        />
      )}

      {/* Onay Pop-up Dialog */}
      <ConfirmDialog />
    </div>
  );
}
