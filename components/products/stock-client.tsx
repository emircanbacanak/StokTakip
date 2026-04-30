"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, RefreshCw, TrendingUp, ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StockItem {
  id: string;
  product_name: string;
  color: string;
  quantity: number;
  produced_quantity: number;
  delivered_quantity: number;
}

interface BuyerStock {
  buyer_id: string;
  buyer_name: string;
  order_id: string;
  order_date: string;
  items: StockItem[];
}

const COLOR_MAP: Record<string, string> = {
  "Siyah": "#1f2937", "Beyaz": "#e5e7eb", "Kırmızı": "#ef4444", "Mavi": "#3b82f6",
  "Yeşil": "#22c55e", "Sarı": "#eab308", "Turuncu": "#f97316", "Mor": "#a855f7",
  "Pembe": "#ec4899", "Gri": "#6b7280", "Kahverengi": "#92400e", "Lacivert": "#1e3a5f",
  "Bordo": "#881337", "Bej": "#d4b896",
};

export function StockClient() {
  const [buyers, setBuyers] = useState<BuyerStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [showRemaining, setShowRemaining] = useState<Record<string, boolean>>({});
  const [showCompleted, setShowCompleted] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  function toggleGroup(name: string) {
    setOpenGroups((prev) => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; });
  }

  function toggleRemaining(buyerId: string) {
    setShowRemaining(prev => ({ ...prev, [buyerId]: !prev[buyerId] }));
  }

  function toggleCompleted(buyerId: string) {
    setShowCompleted(prev => ({ ...prev, [buyerId]: !prev[buyerId] }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    let sb: ReturnType<typeof createClient>;
    try { sb = createClient(); } catch { setLoading(false); return; }

    const { data, error } = await sb
      .from("order_items")
      .select("id, product_name, color, quantity, produced_quantity, delivered_quantity, order_id, order:orders(id, created_at, buyer:buyers(id, name))")
      .order("order_id");

    if (error) { toast({ title: "Hata", variant: "destructive" }); setLoading(false); return; }

    // Group by buyer
    const map: Record<string, BuyerStock> = {};
    (data as any[] || []).forEach((i) => {
      const key = i.order.buyer.id;
      if (!map[key]) map[key] = {
        buyer_id: i.order.buyer.id,
        buyer_name: i.order.buyer.name,
        order_id: i.order_id,
        order_date: i.order.created_at,
        items: [],
      };
      map[key].items.push({
        id: i.id,
        product_name: i.product_name,
        color: i.color,
        quantity: i.quantity,
        produced_quantity: i.produced_quantity,
        delivered_quantity: i.delivered_quantity || 0,
      });
    });

    setBuyers(Object.values(map).sort((a, b) => a.buyer_name.localeCompare(b.buyer_name)));
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function adjust(itemId: string, current: number, delta: number) {
    const next = Math.max(0, current + delta);
    setUpdating(itemId);
    let sb: ReturnType<typeof createClient>;
    try { sb = createClient(); } catch { setUpdating(null); return; }
    const { error } = await sb.from("order_items").update({ produced_quantity: next }).eq("id", itemId);
    if (error) { toast({ title: "Güncelleme hatası", variant: "destructive" }); }
    else {
      setBuyers((prev) => prev.map((b) => ({
        ...b,
        items: b.items.map((i) => i.id === itemId ? { ...i, produced_quantity: next } : i),
      })));
    }
    setUpdating(null);
  }

  function toggleCollapse(buyerId: string) {
    setCollapsed((prev) => {
      const s = new Set(prev);
      s.has(buyerId) ? s.delete(buyerId) : s.add(buyerId);
      return s;
    });
  }

  const totalOrdered = buyers.flatMap((b) => b.items).reduce((s, i) => s + i.quantity, 0);
  const totalProduced = buyers.flatMap((b) => b.items).reduce((s, i) => s + i.produced_quantity, 0);
  const overall = totalOrdered > 0 ? Math.round((totalProduced / totalOrdered) * 100) : 0;

  return (
    <div className="space-y-4">
      {!loading && buyers.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 p-5 text-white shadow-xl shadow-blue-500/25">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 opacity-80" />
              <p className="text-sm font-medium opacity-90">Genel Üretim İlerlemesi</p>
            </div>
            <p className="text-4xl font-bold mb-3">{overall}%</p>
            <div className="bg-white/20 rounded-full h-2 mb-2">
              <div className="bg-white h-2 rounded-full transition-all duration-700" style={{ width: `${overall}%` }} />
            </div>
            <p className="text-xs opacity-75">{totalProduced} / {totalOrdered} adet üretildi</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{buyers.length} müşteri</p>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Yenile
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : buyers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-blue-500" />
          </div>
          <p className="font-semibold text-foreground mb-1">Henüz stok verisi yok</p>
          <p className="text-sm text-muted-foreground">Sipariş oluşturduğunuzda burada görünür</p>
        </div>
      ) : (
        <div className="space-y-3">
          {buyers.map((b) => {
            const isOpen = !collapsed.has(b.buyer_id);
            const bTotal = b.items.reduce((s, i) => s + i.quantity, 0);
            const bProduced = b.items.reduce((s, i) => s + i.produced_quantity, 0);
            const bDelivered = b.items.reduce((s, i) => s + (i.delivered_quantity || 0), 0);
            const bPct = bTotal > 0 ? Math.round((bProduced / bTotal) * 100) : 0;
            const isCompleted = bDelivered >= bTotal && bTotal > 0;

            return (
              <div key={b.buyer_id} className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Completed Badge */}
                {isCompleted && (
                  <div className="px-4 pt-3 pb-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tamamlandı</span>
                    </div>
                  </div>
                )}
                
                {/* Buyer header */}
                <button
                  onClick={() => toggleCollapse(b.buyer_id)}
                  className={`w-full px-4 ${isCompleted ? 'py-2.5' : 'py-3.5'} flex items-center justify-between hover:bg-muted/40 transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {b.buyer_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{b.buyer_name}</p>
                      <p className="text-[10px] text-muted-foreground">{b.items.length} ürün · {bProduced}/{bTotal} üretildi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`text-sm font-bold ${bPct === 100 ? "text-emerald-500" : "text-foreground"}`}>{bPct}%</span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Progress bar */}
                <div className="px-4 pb-1">
                  <div className="bg-muted rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-1 rounded-full transition-all duration-500 ${bPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
                      style={{ width: `${bPct}%` }}
                    />
                  </div>
                </div>

                {/* Items */}
{isOpen && (
                  <div className="border-t border-border mt-1">
                    {(() => {
                      // Ürün bazlı gruplama
                      const groupByProduct = (items: StockItem[]) => {
                        const map = new Map<string, StockItem[]>();
                        items.forEach(item => {
                          if (!map.has(item.product_name)) map.set(item.product_name, []);
                          map.get(item.product_name)!.push(item);
                        });
                        return Array.from(map.entries());
                      };

                      // Teslim Edilenler: Gerçekten teslimat yapılmış (delivered_quantity > 0)
                      const deliveredItems = b.items.filter(item => (item.delivered_quantity || 0) > 0);
                      
                      // Teslim Edilecek (Kalan): Henüz teslim edilmemiş veya kısmen teslim edilmiş
                      const remainingItems = b.items.filter(item => (item.delivered_quantity || 0) < item.quantity);

                      const deliveredGroups = groupByProduct(deliveredItems);
                      const remainingGroups = groupByProduct(remainingItems);

                      // Hiç teslimat yoksa normal liste göster
                      if (deliveredItems.length === 0) {
                        const allGroups = groupByProduct(b.items);
                        return (
                          <div className="p-3 space-y-2">
                            {allGroups.map(([productName, items]) => {
                              const groupKey = `${b.buyer_id}-${productName}`;
                              const isGroupOpen = openGroups.has(groupKey);
                              const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                              const totalProd = items.reduce((s, i) => s + i.produced_quantity, 0);
                              const pct = totalQty > 0 ? Math.round((totalProd / totalQty) * 100) : 0;

                              return (
                                <div key={productName} className="bg-muted/30 rounded-xl border border-border overflow-hidden">
                                  <button
                                    onClick={() => toggleGroup(groupKey)}
                                    className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex-1 text-left">
                                      <p className="font-semibold text-xs text-foreground">{productName}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {items.length} renk · {totalProd}/{totalQty} üretildi
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-xs font-bold ${pct === 100 ? "text-emerald-500" : "text-foreground"}`}>{pct}%</span>
                                      {isGroupOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </div>
                                  </button>

                                  {isGroupOpen && (
                                    <div className="border-t border-border divide-y divide-border/40 bg-background/50">
                                      {items.map((item) => {
                                        const pct = item.quantity > 0 ? Math.round((item.produced_quantity / item.quantity) * 100) : 0;
                                        const busy = updating === item.id;
                                        const dotColor = COLOR_MAP[item.color] || "#6b7280";
                                        const remaining = item.quantity - item.produced_quantity;

                                        return (
                                          <div key={item.id} className="px-3 py-2.5">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full shrink-0 border border-border/50" style={{ backgroundColor: dotColor }} />
                                                <span className="text-xs font-semibold text-foreground">{item.color}</span>
                                                <span className="text-[10px] text-muted-foreground">{item.quantity} adet</span>
                                              </div>
                                              <span className={`text-[10px] font-bold ${remaining === 0 ? "text-emerald-500" : remaining < 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                                                {remaining === 0 ? "Tamamlandı ✓" : remaining < 0 ? `+${Math.abs(remaining)} fazla` : `${remaining} kalan`}
                                              </span>
                                            </div>

                                            {/* Üretim */}
                                            <div className="mb-2">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-medium text-muted-foreground">Üretim</span>
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    disabled={busy || item.produced_quantity <= 0}
                                                    onClick={() => adjust(item.id, item.produced_quantity, -1)}
                                                    className="w-5 h-5 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 disabled:opacity-30 active:scale-90 transition-all"
                                                  >
                                                    <Minus className="w-2.5 h-2.5" />
                                                  </button>
                                                  <span className="text-[11px] font-bold text-foreground min-w-[35px] text-center">
                                                    {item.produced_quantity}/{item.quantity}
                                                  </span>
                                                  <button
                                                    disabled={busy}
                                                    onClick={() => adjust(item.id, item.produced_quantity, 1)}
                                                    className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all"
                                                  >
                                                    <Plus className="w-2.5 h-2.5" />
                                                  </button>
                                                </div>
                                              </div>
                                              <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                                                <div
                                                  className="h-1.5 rounded-full transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500"
                                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                              </div>
                                            </div>

                                            {/* Teslimat */}
                                            <div>
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-medium text-muted-foreground">Teslimat</span>
                                                <span className="text-[11px] font-bold text-muted-foreground">
                                                  {item.delivered_quantity || 0}/{item.quantity}
                                                  {(item.quantity - (item.delivered_quantity || 0)) > 0 && (
                                                    <span className="text-red-500 ml-1">
                                                      ({item.quantity - (item.delivered_quantity || 0)} kaldı)
                                                    </span>
                                                  )}
                                                </span>
                                              </div>
                                              <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                                                <div
                                                  className="h-1.5 rounded-full transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-500"
                                                  style={{ width: `${Math.min(100, Math.round(((item.delivered_quantity || 0) / item.quantity) * 100))}%` }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      // Teslimat varsa: Teslim Edilecek / Teslim Edilenler grupları
                      return (
                        <div className="p-3 space-y-3">
                          {/* Grup Başlıkları - Yan Yana */}
                          <div className="flex items-center gap-2">
                            {/* Teslim Edilecek (Kalan) */}
                            {Array.from(remainingGroups).length > 0 && (
                              <button
                                onClick={() => toggleRemaining(b.buyer_id)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                              >
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                                  Teslim Edilecek ({Array.from(remainingGroups).length} ürün)
                                </p>
                                {showRemaining[b.buyer_id] ? (
                                  <ChevronUp className="w-3 h-3 text-amber-600" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-amber-600" />
                                )}
                              </button>
                            )}

                            {/* Teslim Edilenler */}
                            {Array.from(deliveredGroups).length > 0 && (
                              <button
                                onClick={() => toggleCompleted(b.buyer_id)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                              >
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                  Teslim Edilenler ({Array.from(deliveredGroups).length} ürün)
                                </p>
                                {showCompleted[b.buyer_id] ? (
                                  <ChevronUp className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-emerald-600" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Teslim Edilecek İçerik */}
                          {Array.from(remainingGroups).length > 0 && showRemaining[b.buyer_id] && (
                            <div className="space-y-2">
                              <button
                                onClick={() => toggleRemaining(b.buyer_id)}
                                className="w-full flex items-center gap-2 group hidden"
                              >
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                                    Teslim Edilecek ({Array.from(remainingGroups).length} ürün)
                                  </p>
                                  {showRemaining[b.buyer_id] ? (
                                    <ChevronUp className="w-3 h-3 text-amber-600" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 text-amber-600" />
                                  )}
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 via-transparent to-transparent" />
                              </button>

                              {showRemaining[b.buyer_id] && Array.from(remainingGroups).map(([productName, items]) => {
                                const groupKey = `${b.buyer_id}-remaining-${productName}`;
                                const isGroupOpen = openGroups.has(groupKey);
                                const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                                const totalProd = items.reduce((s, i) => s + i.produced_quantity, 0);
                                const totalDelivered = items.reduce((s, i) => s + (i.delivered_quantity || 0), 0);
                                const remaining = totalQty - totalDelivered;

                                return (
                                  <div key={productName} className="bg-muted/30 rounded-xl border border-amber-500/20 overflow-hidden">
                                    <button
                                      onClick={() => toggleGroup(groupKey)}
                                      className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-amber-500/5 transition-colors"
                                    >
                                      <div className="flex-1 text-left">
                                        <p className="font-semibold text-xs text-foreground">{productName}</p>
                                        <p className="text-[10px] text-muted-foreground">{items.length} renk · {remaining} kalan</p>
                                      </div>
                                      {isGroupOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </button>

                                    {isGroupOpen && (
                                      <div className="border-t border-amber-500/20 divide-y divide-border/40 bg-background/50">
                                        {items.map((item) => {
                                          const pct = item.quantity > 0 ? Math.round((item.produced_quantity / item.quantity) * 100) : 0;
                                          const busy = updating === item.id;
                                          const dotColor = COLOR_MAP[item.color] || "#6b7280";
                                          const itemRemaining = item.quantity - (item.delivered_quantity || 0);

                                          return (
                                            <div key={item.id} className="px-3 py-2.5">
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-3 h-3 rounded-full shrink-0 border border-border/50" style={{ backgroundColor: dotColor }} />
                                                  <span className="text-xs font-semibold text-foreground">{item.color}</span>
                                                  <span className="text-[10px] text-muted-foreground">{item.quantity} adet</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-amber-600">{itemRemaining} kalan</span>
                                              </div>

                                              {/* Üretim */}
                                              <div className="mb-2">
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-[10px] font-medium text-muted-foreground">Üretim</span>
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      disabled={busy || item.produced_quantity <= 0}
                                                      onClick={() => adjust(item.id, item.produced_quantity, -1)}
                                                      className="w-5 h-5 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 disabled:opacity-30 active:scale-90 transition-all"
                                                    >
                                                      <Minus className="w-2.5 h-2.5" />
                                                    </button>
                                                    <span className="text-[11px] font-bold text-foreground min-w-[35px] text-center">
                                                      {item.produced_quantity}/{item.quantity}
                                                    </span>
                                                    <button
                                                      disabled={busy}
                                                      onClick={() => adjust(item.id, item.produced_quantity, 1)}
                                                      className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all"
                                                    >
                                                      <Plus className="w-2.5 h-2.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                                <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                                                  <div
                                                    className="h-1.5 rounded-full transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500"
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                  />
                                                </div>
                                              </div>

                                              {/* Teslimat */}
                                              <div>
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-[10px] font-medium text-muted-foreground">Teslimat</span>
                                                  <span className="text-[11px] font-bold text-muted-foreground">
                                                    {item.delivered_quantity || 0}/{item.quantity}
                                                    {itemRemaining > 0 && (
                                                      <span className="text-red-500 ml-1">
                                                        ({itemRemaining} kaldı)
                                                      </span>
                                                    )}
                                                  </span>
                                                </div>
                                                <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                                                  <div
                                                    className="h-1.5 rounded-full transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-500"
                                                    style={{ width: `${Math.min(100, Math.round(((item.delivered_quantity || 0) / item.quantity) * 100))}%` }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Teslim Edilenler İçerik */}
                          {Array.from(deliveredGroups).length > 0 && showCompleted[b.buyer_id] && (
                            <div className="space-y-2">
                              <button
                                onClick={() => toggleCompleted(b.buyer_id)}
                                className="w-full flex items-center gap-2 group hidden"
                              >
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                    Teslim Edilenler ({Array.from(deliveredGroups).length} ürün)
                                  </p>
                                  {showCompleted[b.buyer_id] ? (
                                    <ChevronUp className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 text-emerald-600" />
                                  )}
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 via-transparent to-transparent" />
                              </button>

                              {showCompleted[b.buyer_id] && Array.from(deliveredGroups).map(([productName, items]) => {
                                const groupKey = `${b.buyer_id}-delivered-${productName}`;
                                const isGroupOpen = openGroups.has(groupKey);
                                const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                                const totalProd = items.reduce((s, i) => s + i.produced_quantity, 0);
                                const totalDelivered = items.reduce((s, i) => s + (i.delivered_quantity || 0), 0);

                                return (
                                  <div key={productName} className="bg-muted/30 rounded-xl border border-emerald-500/20 overflow-hidden">
                                    <button
                                      onClick={() => toggleGroup(groupKey)}
                                      className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-emerald-500/5 transition-colors"
                                    >
                                      <div className="flex-1 text-left">
                                        <p className="font-semibold text-xs text-foreground">{productName}</p>
                                        <p className="text-[10px] text-muted-foreground">{items.length} renk · {totalDelivered} teslim edildi</p>
                                      </div>
                                      {isGroupOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </button>

                                    {isGroupOpen && (
                                      <div className="border-t border-emerald-500/20 divide-y divide-border/40 bg-background/50">
                                        {items.map((item) => {
                                          const pct = item.quantity > 0 ? Math.round((item.produced_quantity / item.quantity) * 100) : 0;
                                          const busy = updating === item.id;
                                          const dotColor = COLOR_MAP[item.color] || "#6b7280";

                                          return (
                                            <div key={item.id} className="px-3 py-2.5">
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-3 h-3 rounded-full shrink-0 border border-border/50" style={{ backgroundColor: dotColor }} />
                                                  <span className="text-xs font-semibold text-foreground">{item.color}</span>
                                                  <span className="text-[10px] text-muted-foreground">{item.quantity} adet</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-emerald-600">
                                                  {item.delivered_quantity}/{item.quantity} teslim
                                                </span>
                                              </div>

                                              {/* Üretim */}
                                              <div className="mb-2">
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-[10px] font-medium text-muted-foreground">Üretim</span>
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      disabled={busy || item.produced_quantity <= 0}
                                                      onClick={() => adjust(item.id, item.produced_quantity, -1)}
                                                      className="w-5 h-5 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 disabled:opacity-30 active:scale-90 transition-all"
                                                    >
                                                      <Minus className="w-2.5 h-2.5" />
                                                    </button>
                                                    <span className="text-[11px] font-bold text-foreground min-w-[35px] text-center">
                                                      {item.produced_quantity}/{item.quantity}
                                                    </span>
                                                    <button
                                                      disabled={busy}
                                                      onClick={() => adjust(item.id, item.produced_quantity, 1)}
                                                      className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all"
                                                    >
                                                      <Plus className="w-2.5 h-2.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                                <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                                                  <div
                                                    className="h-1.5 rounded-full transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500"
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                  />
                                                </div>
                                              </div>

                                              {/* Teslimat */}
                                              <div>
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-[10px] font-medium text-muted-foreground">Teslimat</span>
                                                  <span className="text-[11px] font-bold text-emerald-600">
                                                    {item.delivered_quantity || 0}/{item.quantity}
                                                  </span>
                                                </div>
                                                <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                                                  <div
                                                    className="h-1.5 rounded-full transition-all duration-300 bg-emerald-500"
                                                    style={{ width: `${Math.min(100, Math.round(((item.delivered_quantity || 0) / item.quantity) * 100))}%` }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
