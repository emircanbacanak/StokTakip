"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Trash2, ChevronRight, Package, ShoppingBag, Plus, AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus, type OrderItem } from "@/lib/types/database";
import { OrderDetailDialogV2 } from "./order-detail-dialog-v2";
import { NewOrderDialog } from "./new-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { ColorBadge } from "@/components/ui/color-badge";

interface Order {
  id: string; created_at: string; total_amount: number; paid_amount: number;
  status: OrderStatus; notes: string | null;
  buyer: { id: string; name: string };
  items: OrderItem[];
}

interface OverItem {
  product_name: string;
  color: string;
  ordered: number;
  produced: number;
  extra: number;
  unit_price: number;
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

function ProductThumbSmall({ name }: { name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const sb = createClient();
    sb.from("products").select("image_url").eq("name", name).maybeSingle().then(({ data }) => {
      if (!cancelled && data && (data as { image_url: string | null }).image_url)
        setUrl((data as { image_url: string }).image_url);
    });
    return () => { cancelled = true; };
  }, [name]);

  if (!url) return (
    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
      <Package className="w-4 h-4 text-muted-foreground/40" />
    </div>
  );
  return (
    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-muted">
      <img src={url} alt={name} className="w-full h-full object-contain p-0.5" />
    </div>
  );
}

function ProductThumb({ name }: { name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const sb = createClient();
    sb.from("products").select("image_url").eq("name", name).maybeSingle().then(({ data }) => {
      if (!cancelled && data && (data as { image_url: string | null }).image_url)
        setUrl((data as { image_url: string }).image_url);
    });
    return () => { cancelled = true; };
  }, [name]);

  if (!url) return (
    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
      <Package className="w-6 h-6 text-muted-foreground/40" />
    </div>
  );
  return (
    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-muted">
      <img src={url} alt={name} className="w-full h-full object-contain p-1" />
    </div>
  );
}

function OverProductionDialog({ items, onClose }: { items: OverItem[]; onClose: () => void }) {
  const totalExtra = items.reduce((s, i) => s + i.extra * i.unit_price, 0);

  // Ürün adına göre grupla
  const groupMap = new Map<string, OverItem[]>();
  items.forEach((item) => {
    if (!groupMap.has(item.product_name)) groupMap.set(item.product_name, []);
    groupMap.get(item.product_name)!.push(item);
  });
  const groups = Array.from(groupMap.entries());

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] flex flex-col border border-border shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Fazla Üretim</h2>
              <p className="text-xs text-muted-foreground">{groups.length} ürün · {items.length} kalem</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {groups.map(([productName, productItems]) => {
            const productExtra = productItems.reduce((s, i) => s + i.extra * i.unit_price, 0);
            return (
              <div key={productName} className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
                {/* Ürün başlığı */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-500/15">
                  <ProductThumbSmall name={productName} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{productName}</p>
                    <p className="text-xs text-muted-foreground">{productItems.length} renk</p>
                  </div>
                  <p className="text-sm font-bold text-amber-600 shrink-0">{formatCurrency(productExtra)}</p>
                </div>
                {/* Renkler */}
                <div className="divide-y divide-amber-500/10">
                  {productItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <ColorBadge color={item.color} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {item.ordered} sipariş · {item.produced} üretildi
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-amber-600">+{item.extra} adet</span>
                        <span className="text-xs text-muted-foreground ml-1.5">{formatCurrency(item.extra * item.unit_price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">Toplam Fazla Değer</span>
            <span className="text-lg font-bold text-amber-600">{formatCurrency(totalExtra)}</span>
          </div>
          <button onClick={onClose}
            className="w-full border border-border text-muted-foreground font-medium py-2.5 rounded-xl text-sm hover:bg-muted hover:text-foreground transition-all">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export function BuyerOrdersClient({ buyerId }: { buyerId: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [showOverProduction, setShowOverProduction] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    let sb; try { sb = createClient(); } catch { setLoading(false); return; }
    const [{ data: buyer }, { data: ordersData }] = await Promise.all([
      sb.from("buyers").select("name").eq("id", buyerId).single(),
      sb.from("orders")
        .select("id, created_at, total_amount, paid_amount, status, notes, buyer:buyers(id,name), items:order_items(id,product_name,color,quantity,produced_quantity,delivered_quantity,unit_price)")
        .eq("buyer_id", buyerId)
        .order("created_at", { ascending: false }),
    ]);
    if (buyer) setBuyerName((buyer as { name: string }).name);
    setOrders((ordersData as unknown as Order[]) || []);
    setLoading(false);
  }, [buyerId]);

  useEffect(() => { 
    load(); 
    
    // Supabase Realtime subscription - orders ve order_items değişikliklerini dinle
    const sb = createClient();
    const ordersChannel = sb
      .channel('buyer-orders-orders-changes')
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
      .channel('buyer-orders-items-changes')
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
      confirmText: "Sil", cancelText: "İptal", variant: "danger",
    });
    if (!confirmed) return;
    const sb = createClient();
    await sb.from("order_items").delete().eq("order_id", id);
    await sb.from("orders").delete().eq("id", id);
    toast({ title: "Sipariş silindi" });
    load();
  }

  const totalDebt = orders.reduce((s, o) => {
    // Fazla üretim değeri
    const overProductionValue = o.items.reduce((itemSum, item) => {
      const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
      return itemSum + (overProduced * (item.unit_price || 0));
    }, 0);
    
    // Gerçek toplam = sipariş tutarı + fazla üretim
    const actualTotal = o.total_amount + overProductionValue;
    return s + (actualTotal - o.paid_amount);
  }, 0);
  
  const totalAmount = orders.reduce((s, o) => {
    // Fazla üretim değeri
    const overProductionValue = o.items.reduce((itemSum, item) => {
      const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
      return itemSum + (overProduced * (item.unit_price || 0));
    }, 0);
    
    return s + o.total_amount + overProductionValue;
  }, 0);

  // Fazla üretim hesabı
  const overItems: OverItem[] = orders.flatMap((o) =>
    o.items
      .filter((item) => (item.produced_quantity || 0) > item.quantity)
      .map((item) => ({
        product_name: item.product_name,
        color: item.color,
        ordered: item.quantity,
        produced: item.produced_quantity || 0,
        extra: (item.produced_quantity || 0) - item.quantity,
        unit_price: item.unit_price || 0,
      }))
  );
  const totalOverValue = overItems.reduce((s, i) => s + i.extra * i.unit_price, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground truncate">{buyerName || "Alıcı"}</h2>
          <p className="text-sm text-muted-foreground">{orders.length} sipariş</p>
        </div>
        <button onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all shrink-0">
          <Plus className="w-4 h-4" /> Sipariş Ekle
        </button>
      </div>

      {/* Summary */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Toplam Ciro</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Toplam Borç</p>
            <p className={`text-xl font-bold ${totalDebt > 0 ? "text-red-500" : "text-emerald-500"}`}>
              {formatCurrency(totalDebt)}
            </p>
          </div>

          {/* Fazla Üretim Kartı */}
          {overItems.length > 0 && (
            <button
              onClick={() => setShowOverProduction(true)}
              className="col-span-2 bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between hover:bg-amber-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Fazla Üretim</p>
                  <p className="text-xs text-muted-foreground">{overItems.length} kalem · detaylar için tıkla</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-amber-600">{formatCurrency(totalOverValue)}</p>
                <p className="text-xs text-muted-foreground">fazla değer</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Orders */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-9 h-9 text-blue-500" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">Henüz sipariş yok</p>
          <button onClick={() => setNewOpen(true)} className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 mt-2">
            Sipariş Oluştur
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            // Fazla üretim değeri hesapla
            const overProductionValue = o.items.reduce((sum, item) => {
              const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
              return sum + (overProduced * (item.unit_price || 0));
            }, 0);
            
            const actualTotal = o.total_amount + overProductionValue;
            const remainingDebt = actualTotal - o.paid_amount;
            
            return (
              <div key={o.id} onClick={() => setSelected(o)}
                className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center gap-4 cursor-pointer hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 active:scale-[0.99] transition-all group">
                {o.items[0] && <ProductThumb name={o.items[0].product_name} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[o.status]}`}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{formatDate(o.created_at)} · {o.items.length} ürün</p>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-foreground">{formatCurrency(actualTotal)}</span>
                    {overProductionValue > 0 && (
                      <span className="text-xs text-amber-600 font-medium">+{formatCurrency(overProductionValue)} fazla</span>
                    )}
                    {remainingDebt > 0 && (
                      <span className="text-sm text-red-500 font-medium">Kalan: {formatCurrency(remainingDebt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[o.status]}`} />
                  <button onClick={(e) => del(o.id, e)}
                    className="p-2 text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewOrderDialog open={newOpen} onClose={() => setNewOpen(false)} onSuccess={() => { setNewOpen(false); load(); }} />
      {selected && <OrderDetailDialogV2 order={selected} onClose={() => setSelected(null)} onStatusChange={load} />}
      {showOverProduction && <OverProductionDialog items={overItems} onClose={() => setShowOverProduction(false)} />}
      <ConfirmDialog />
    </div>
  );
}
