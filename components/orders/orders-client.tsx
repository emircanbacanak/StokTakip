"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Trash2, ShoppingBag, Package, ChevronRight } from "lucide-react";
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
    sb.from("products").select("image_url").eq("name", name).maybeSingle().then(({ data }) => {
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
  const [activeTab, setActiveTab] = useState<OrderStatus>("pending");
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    let sb; try { sb = createClient(); } catch { setLoading(false); return; }
    const { data } = await sb
      .from("orders")
      .select("id, created_at, total_amount, paid_amount, status, notes, buyer:buyers(id,name), items:order_items(id,product_name,color,quantity,produced_quantity,unit_price)")
      .order("created_at", { ascending: false });
    const list = (data as unknown as Order[]) || [];
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
  
  // Tab'a göre filtrele
  const filteredOrders = orders.filter(o => o.status === activeTab);
  
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

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
            activeTab === "pending"
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-amber-500/30"
          }`}
        >
          Bekliyor
        </button>
        <button
          onClick={() => setActiveTab("in_production")}
          className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
            activeTab === "in_production"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-blue-500/30"
          }`}
        >
          Üretimde
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
            activeTab === "completed"
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-emerald-500/30"
          }`}
        >
          Tamamlandı
        </button>
        <button
          onClick={() => setActiveTab("delivered")}
          className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
            activeTab === "delivered"
              ? "bg-gray-500 text-white shadow-lg shadow-gray-500/25"
              : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-gray-500/30"
          }`}
        >
          Teslim Edildi
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-base text-muted-foreground">{groups.length} alıcı · {orders.length} sipariş</p>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5" /> Yeni Sipariş
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-9 h-9 text-blue-500" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">Henüz sipariş yok</p>
          <p className="text-base text-muted-foreground mb-6">İlk siparişinizi oluşturun</p>
          <button onClick={() => setNewOpen(true)} className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25">
            Sipariş Oluştur
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const totalDebt = calculateTotalDebt(g.orders);

            return (
              <button
                key={g.buyer_id}
                onClick={() => router.push(`/dashboard/orders/${g.buyer_id}`)}
                className="w-full bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between hover:bg-muted/40 hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 active:scale-[0.99] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                    <span className="text-base font-bold text-white">{g.buyer_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-base font-bold text-foreground">{g.buyer_name}</p>
                    <p className="text-sm text-muted-foreground">{g.orders.length} sipariş{totalDebt > 0 && <span className="text-red-500 ml-2">· {formatCurrency(totalDebt)} borç</span>}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
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
