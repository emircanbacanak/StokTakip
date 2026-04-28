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
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    let sb: ReturnType<typeof createClient>;
    try { sb = createClient(); } catch { setLoading(false); return; }

    const { data, error } = await sb
      .from("order_items")
      .select("id, product_name, color, quantity, produced_quantity, order_id, order:orders(id, created_at, buyer:buyers(id, name))")
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
            const bPct = bTotal > 0 ? Math.round((bProduced / bTotal) * 100) : 0;

            return (
              <div key={b.buyer_id} className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Buyer header */}
                <button
                  onClick={() => toggleCollapse(b.buyer_id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
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
                  <div className="divide-y divide-border border-t border-border mt-1">
                    {b.items.map((item) => {
                      const pct = item.quantity > 0 ? Math.round((item.produced_quantity / item.quantity) * 100) : 0;
                      const busy = updating === item.id;
                      const dotColor = COLOR_MAP[item.color] || "#6b7280";
                      const remaining = item.quantity - item.produced_quantity;

                      return (
                        <div key={item.id} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* Color + name */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-3 h-3 rounded-full shrink-0 border border-border/50" style={{ backgroundColor: dotColor }} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{item.product_name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.color}</p>
                              </div>
                            </div>

                            {/* Counter */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                disabled={busy || item.produced_quantity <= 0}
                                onClick={() => adjust(item.id, item.produced_quantity, -1)}
                                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 disabled:opacity-30 active:scale-90 transition-all"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <div className="w-14 text-center">
                                <span className="text-base font-bold text-foreground">{item.produced_quantity}</span>
                                <span className="text-xs text-muted-foreground">/{item.quantity}</span>
                              </div>
                              <button
                                disabled={busy}
                                onClick={() => adjust(item.id, item.produced_quantity, 1)}
                                className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 disabled:opacity-30 active:scale-90 transition-all"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Remaining badge */}
                            <div className="shrink-0 w-12 text-right">
                              <span className={`text-xs font-bold ${remaining === 0 ? "text-emerald-500" : remaining < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                {remaining === 0 ? "✓" : remaining < 0 ? `+${Math.abs(remaining)} fire` : `${remaining} kalan`}
                              </span>
                            </div>
                          </div>

                          {/* Mini progress */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-1 overflow-hidden">
                              <div
                                className={`h-1 rounded-full transition-all duration-300 ${pct >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-6 text-right">{pct}%</span>
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
}
