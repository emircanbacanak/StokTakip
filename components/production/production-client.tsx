"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Minus, Plus, RefreshCw, Zap, ChevronDown, ChevronUp, Package, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ColorBadge } from "@/components/ui/color-badge";

interface PItem {
  id: string; product_name: string; color: string;
  quantity: number; produced_quantity: number; order_id: string;
  order: { id: string; created_at: string; buyer: { name: string } };
}

function ProductThumb({ name }: { name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const sb = createClient();
    sb.from("products").select("image_url").eq("name", name).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.image_url) setUrl(data.image_url);
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
    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
      <Package className="w-5 h-5 text-muted-foreground/30" />
    </div>
  );

  return (
    <>
      <div ref={ref} className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted cursor-zoom-in"
        onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)}>
        <img src={url} alt={name} className="w-full h-full object-contain p-1" />
      </div>
      {hovered && (
        <div className="fixed z-[200] pointer-events-none w-72 h-72 rounded-2xl overflow-hidden shadow-2xl border border-border bg-muted"
          style={{ left: pos.x, top: pos.y }}>
          <img src={url} alt={name} className="w-full h-full object-contain p-4" />
        </div>
      )}
    </>
  );
}

export function ProductionClient() {
  const [items, setItems] = useState<PItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [openBuyers, setOpenBuyers] = useState<Set<string>>(new Set());
  const [openProducts, setOpenProducts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const load = useCallback(async () => {
    let sb; try { sb = createClient(); } catch { setLoading(false); return; }
    const { data } = await sb
      .from("order_items")
      .select("id, product_name, color, quantity, produced_quantity, order_id, order:orders(id, created_at, buyer:buyers(name))")
      .order("product_name");
    const incomplete = ((data as unknown as PItem[]) || []).filter((i) => i.produced_quantity < i.quantity);
    setItems(incomplete);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function update(id: string, cur: number, delta: number, max: number) {
    // max'tan fazla üretim yapılabilir (fazla üretim durumu)
    const next = Math.max(0, cur + delta);
    setUpdating(id);
    const sb = createClient();
    await sb.from("order_items").update({ produced_quantity: next }).eq("id", id);
    setItems((prev) =>
      prev.map((i) => i.id === id ? { ...i, produced_quantity: next } : i)
    );
    setUpdating(null);
  }

  function toggleBuyer(name: string) {
    setOpenBuyers((prev) => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; });
  }

  function toggleProduct(key: string) {
    setOpenProducts((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  }

  // Alıcı → Ürün → Renkler şeklinde grupla
  const buyerMap = new Map<string, Map<string, PItem[]>>();
  items.forEach((item) => {
    const buyerName = item.order.buyer.name;
    const productName = item.product_name;
    if (!buyerMap.has(buyerName)) buyerMap.set(buyerName, new Map());
    const productMap = buyerMap.get(buyerName)!;
    if (!productMap.has(productName)) productMap.set(productName, []);
    productMap.get(productName)!.push(item);
  });

  const buyerGroups = Array.from(buyerMap.entries()).map(([buyerName, productMap]) => ({
    buyerName,
    products: Array.from(productMap.entries()).map(([productName, productItems]) => ({
      productName,
      items: productItems,
      totalQty: productItems.reduce((s, i) => s + i.quantity, 0),
      totalProd: productItems.reduce((s, i) => s + i.produced_quantity, 0),
    })),
    totalQty: Array.from(productMap.values()).flat().reduce((s, i) => s + i.quantity, 0),
    totalProd: Array.from(productMap.values()).flat().reduce((s, i) => s + i.produced_quantity, 0),
  }));

  const totalItems = items.length;
  const totalBuyers = buyerGroups.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalBuyers} alıcı · {totalItems} kalem bekliyor
        </p>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Yenile
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : buyerGroups.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="font-semibold text-foreground mb-1">Tüm üretimler tamamlandı!</p>
          <p className="text-sm text-muted-foreground">Bekleyen üretim yok 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {buyerGroups.map((buyer) => {
            const buyerOpen = openBuyers.has(buyer.buyerName);
            const buyerPct = buyer.totalQty > 0 ? Math.round((buyer.totalProd / buyer.totalQty) * 100) : 0;

            return (
              <div key={buyer.buyerName} className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Alıcı başlığı */}
                <button
                  onClick={() => toggleBuyer(buyer.buyerName)}
                  className="w-full px-6 py-5 flex items-center gap-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                    <span className="text-xl font-bold text-white">{buyer.buyerName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <p className="font-bold text-xl text-foreground truncate">{buyer.buyerName}</p>
                      <span className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full shrink-0">
                        {buyer.products.length} ürün
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden max-w-[220px]">
                        <div
                          className={`h-3 rounded-full transition-all ${buyerPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
                          style={{ width: `${buyerPct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {buyer.totalProd}/{buyer.totalQty}
                      </span>
                    </div>
                  </div>
                  {buyerOpen
                    ? <ChevronUp className="w-6 h-6 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-6 h-6 text-muted-foreground shrink-0" />}
                </button>

                {/* Ürünler */}
                {buyerOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {buyer.products.map((product) => {
                      const productKey = `${buyer.buyerName}__${product.productName}`;
                      const productOpen = openProducts.has(productKey);
                      const productPct = product.totalQty > 0 ? Math.round((product.totalProd / product.totalQty) * 100) : 0;

                      return (
                        <div key={productKey}>
                          {/* Ürün başlığı */}
                          <button
                            onClick={() => toggleProduct(productKey)}
                            className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-muted/20 transition-colors bg-muted/10"
                          >
                            <ProductThumb name={product.productName} />
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <p className="font-semibold text-sm text-foreground truncate">{product.productName}</p>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {product.items.length} renk
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-[140px]">
                                  <div
                                    className={`h-2 rounded-full transition-all ${productPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
                                    style={{ width: `${productPct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  {product.totalProd}/{product.totalQty}
                                </span>
                              </div>
                            </div>
                            {productOpen
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                          </button>

                          {/* Renkler */}
                          {productOpen && (
                            <div className="divide-y divide-border/60">
                              {product.items.map((item) => {
                                const isOver = item.produced_quantity > item.quantity;
                                const extra = item.produced_quantity - item.quantity;
                                const pct = item.quantity > 0 ? Math.min(100, Math.round((item.produced_quantity / item.quantity) * 100)) : 0;
                                const busy = updating === item.id;
                                return (
                                  <div key={item.id} className={`px-5 py-3 pl-[72px] ${isOver ? "bg-amber-500/5" : ""}`}>
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2">
                                        <ColorBadge color={item.color} />
                                        {isOver && (
                                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                            +{extra} fazla
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          disabled={busy || item.produced_quantity <= 0}
                                          onClick={() => update(item.id, item.produced_quantity, -1, item.quantity)}
                                          className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 active:scale-90 transition-all"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <div className="w-14 text-center">
                                          <span className={`text-base font-bold ${isOver ? "text-amber-600" : "text-foreground"}`}>{item.produced_quantity}</span>
                                          <span className="text-[10px] text-muted-foreground">/{item.quantity}</span>
                                        </div>
                                        <button
                                          disabled={busy}
                                          onClick={() => update(item.id, item.produced_quantity, 1, item.quantity)}
                                          className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 disabled:opacity-30 active:scale-90 transition-all"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-1.5 rounded-full transition-all duration-500 ${isOver ? "bg-amber-500" : pct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className={`text-[10px] font-semibold w-7 text-right ${isOver ? "text-amber-600" : "text-muted-foreground"}`}>
                                        {isOver ? `+${extra}` : `${pct}%`}
                                      </span>
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
          })}
        </div>
      )}
    </div>
  );
}
