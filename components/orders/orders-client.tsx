"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Trash2, ShoppingBag, Package, ChevronRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus, type OrderItem } from "@/lib/types/database";
import { NewOrderDialog } from "./new-order-dialog";
import { OrderDetailDialogV2 } from "./order-detail-dialog-v2";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";

interface Order {
  id: string; created_at: string; total_amount: number; paid_amount: number;
  status: OrderStatus; notes: string | null;
  buyer: { id: string; name: string };
  items: OrderItem[];
}

interface BuyerGroup {
  buyer_id: string;
  buyer_name: string;
  orders: Order[];
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  in_production: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  delivered: "bg-gray-500/10 text-gray-500 dark:text-gray-400",
};

const STATUS_DOT: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  in_production: "bg-blue-500",
  completed: "bg-emerald-500",
  delivered: "bg-gray-400",
};

const checkerStyle: React.CSSProperties = {};

function ProductThumb({ name }: { name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    const sb = createClient();
    // Boyut bilgisini kaldır (örn: "Vazo (13cm)" → "Vazo")
    const productName = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    sb.from("products").select("image_url").eq("name", productName).maybeSingle().then(({ data }) => {
      if (!cancelled && data && (data as { image_url: string | null }).image_url) {
        setUrl((data as { image_url: string }).image_url);
      }
    });
    return () => { cancelled = true; };
  }, [name]);

  function handleMouseEnter() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const size = 280; const margin = 8;
    let x = rect.right + margin; let y = rect.top;
    if (x + size > window.innerWidth) x = rect.left - size - margin;
    if (y + size > window.innerHeight - margin) y = window.innerHeight - size - margin;
    if (y < margin) y = margin;
    setPos({ x, y }); setHovered(true);
  }

  if (!url) return (
    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
      <Package className="w-6 h-6 text-muted-foreground/40" />
    </div>
  );

  return (
    <>
      <div ref={ref} className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-muted cursor-zoom-in"
        onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)}>
        <img src={url} alt={name} className="w-full h-full object-contain p-1" />
      </div>
      {hovered && (
        <div className="fixed z-[200] pointer-events-none w-72 h-72 rounded-2xl overflow-hidden shadow-2xl border border-border bg-muted"
          style={{ left: pos.x, top: pos.y }}>
          <img src={url} alt={name} className="w-full h-full object-cover" />
        </div>
      )}
    </>
  );
}

export function OrdersClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<OrderStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    let sb; try { sb = createClient(); } catch { setLoading(false); return; }

    // Önce siparişleri çek
    const { data: ordersData, error: ordersError } = await sb
      .from("orders")
      .select("id, created_at, total_amount, paid_amount, status, notes, buyer_id")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Siparişler yüklenemedi:", JSON.stringify(ordersError), ordersError.code, ordersError.message);
      toast({ title: "Yükleme hatası", description: ordersError.message || ordersError.code || "Bilinmeyen hata", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!ordersData || ordersData.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = ordersData.map((o: any) => o.id);
    const buyerIds = [...new Set(ordersData.map((o: any) => o.buyer_id))];

    // Alıcıları çek
    const { data: buyersData } = await sb
      .from("buyers")
      .select("id, name")
      .in("id", buyerIds as string[]);

    // Sipariş kalemlerini çek
    const { data: itemsData } = await sb
      .from("order_items")
      .select("id, order_id, product_name, color, quantity, produced_quantity, delivered_quantity, unit_price, size_name, includes_candle")
      .in("order_id", orderIds);

    const buyerMap: Record<string, { id: string; name: string }> = {};
    (buyersData || []).forEach((b: any) => { buyerMap[b.id] = b; });

    const itemsMap: Record<string, any[]> = {};
    (itemsData || []).forEach((item: any) => {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    });

    const list: Order[] = (ordersData as any[]).map((o: any) => ({
      ...o,
      buyer: buyerMap[o.buyer_id] || { id: o.buyer_id, name: "Bilinmiyor" },
      items: itemsMap[o.id] || [],
    }));

    setOrders(list);
    setLoading(false);
  }, []);

  useEffect(() => { 
    load(); 
    
    // Supabase Realtime subscription - orders ve order_items değişikliklerini dinle
    const sb = createClient();
    const ordersChannel = sb
      .channel('orders-page-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => load()
      )
      .subscribe();
      
    const itemsChannel = sb
      .channel('orders-page-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
        () => load()
      )
      .subscribe();

    return () => {
      sb.removeChannel(ordersChannel);
      sb.removeChannel(itemsChannel);
    };
  }, [load]);

  async function del(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    
    const confirmed = await confirm({
      title: "Siparişi Sil",
      message: "Bu siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "İptal",
      variant: "danger",
    });
    
    if (!confirmed) return;
    
    const sb = createClient();
    await sb.from("order_items").delete().eq("order_id", id);
    await sb.from("orders").delete().eq("id", id);
    toast({ title: "Sipariş silindi" });
    load();
  }

  // Group by buyer
  const groups: BuyerGroup[] = [];
  const seen: Record<string, BuyerGroup> = {};
  
  // Durum Sayaçları
  const counts = {
    all: orders.filter(o => o.status !== "delivered").length,
    pending: orders.filter(o => o.status === "pending").length,
    in_production: orders.filter(o => o.status === "in_production").length,
    completed: orders.filter(o => o.status === "completed").length,
    delivered: orders.filter(o => o.status === "delivered").length,
  };

  // Tab ve Arama Filtresi
  const filteredOrders = (activeTab === "all" 
    ? orders.filter(o => o.status !== "delivered") // "Tümü" seçeneği: delivered hariç tümü
    : orders.filter(o => o.status === activeTab)
  ).filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      o.buyer.name.toLowerCase().includes(q) ||
      o.items.some(i => i.product_name.toLowerCase().includes(q))
    );
  });
  
  filteredOrders.forEach((o) => {
    if (!seen[o.buyer.id]) {
      seen[o.buyer.id] = { buyer_id: o.buyer.id, buyer_name: o.buyer.name, orders: [] };
      groups.push(seen[o.buyer.id]);
    }
    seen[o.buyer.id].orders.push(o);
  });

  // Toplam borç hesaplamasında fazla üretimi dahil et
  const calculateTotalDebt = (orders: Order[]) => {
    return orders.reduce((sum, order) => {
      // Fazla üretim değeri
      const overProductionValue = order.items.reduce((itemSum, item) => {
        const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
        return itemSum + (overProduced * (item.unit_price || 0));
      }, 0);
      
      // Gerçek toplam = sipariş tutarı + fazla üretim
      const actualTotal = order.total_amount + overProductionValue;
      return sum + (actualTotal - order.paid_amount);
    }, 0);
  };

  // Teslim edilecek ürün sayısı — fazla üretim dahil (produced_quantity > quantity olan kalemleri de sayar)
  const calculateRemainingToDeliver = (orders: Order[]) => {
    return orders.reduce((sum, order) => {
      const orderRemaining = order.items.reduce((itemSum, item) => {
        const deliveredQty = item.delivered_quantity || 0;
        // Fazla üretim dahil: max(sipariş miktarı, üretilen miktar) - teslim edilen
        const maxToDeliver = Math.max(item.quantity, item.produced_quantity || 0);
        const remaining = Math.max(0, maxToDeliver - deliveredQty);
        return itemSum + remaining;
      }, 0);
      return sum + orderRemaining;
    }, 0);
  };

  const tabsConfig = [
    { id: "all", label: "Tümü", count: counts.all },
    { id: "pending", label: "Bekliyor", count: counts.pending },
    { id: "in_production", label: "Üretimde", count: counts.in_production },
    { id: "completed", label: "Tamamlandı", count: counts.completed },
    { id: "delivered", label: "Teslim Edildi", count: counts.delivered },
  ];

  return (
    <div className="space-y-4">
      {/* Üst Araç Çubuğu: Arama + Yeni Sipariş */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Alıcı veya ürün adına göre ara..."
            className="w-full pl-10 pr-9 py-2 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <p className="text-xs text-muted-foreground hidden md:block">
            {groups.length} alıcı · {filteredOrders.length} sipariş
          </p>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 active:scale-98 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Sipariş</span>
          </button>
        </div>
      </div>

      {/* Durum Sekmeleri (Tabs) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabsConfig.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-card rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">
            {searchQuery ? "Aramaya uygun alıcı bulunamadı" : "Henüz sipariş yok"}
          </p>
          <p className="text-xs text-muted-foreground mb-5">
            {searchQuery ? `"${searchQuery}" kelimesini içeren bir sipariş bulunamadı.` : "Yeni bir sipariş oluşturarak başlayın."}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Aramayı Temizle
            </button>
          ) : (
            <button
              onClick={() => setNewOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20"
            >
              Sipariş Oluştur
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) => {
            const totalDebt = calculateTotalDebt(g.orders);
            const remainingToDeliver = calculateRemainingToDeliver(g.orders);

            return (
              <button
                key={g.buyer_id}
                onClick={() => router.push(`/dashboard/orders/${g.buyer_id}`)}
                className="w-full bg-card rounded-2xl border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 hover:border-blue-500/40 hover:shadow-md hover:shadow-blue-500/5 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                    {g.buyer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm sm:text-base text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {g.buyer_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {g.orders.length} aktif sipariş
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                  {remainingToDeliver > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {remainingToDeliver} adet teslimat bekliyor
                    </span>
                  )}
                  {totalDebt > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      {formatCurrency(totalDebt)} borç
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Borçsuz
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all ml-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <NewOrderDialog open={newOpen} onClose={() => setNewOpen(false)} onSuccess={() => { setNewOpen(false); load(); }} />
      {selected && <OrderDetailDialogV2 order={selected} onClose={() => setSelected(null)} onStatusChange={load} />}
      <ConfirmDialog />
    </div>
  );
}
