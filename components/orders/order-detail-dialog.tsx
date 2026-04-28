"use client";

import { useEffect, useState } from "react";
import { X, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types/database";
import { useToast } from "@/hooks/use-toast";

const checkerStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
};

function ProductThumb({ name }: { name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const sb = createClient();
    sb.from("products").select("image_url").eq("name", name).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.image_url) setUrl(data.image_url);
    });
    return () => { cancelled = true; };
  }, [name]);

  if (!url) return (
    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
      <Package className="w-5 h-5 text-muted-foreground/30" />
    </div>
  );
  return (
    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={checkerStyle}>
      <img src={url} alt={name} className="w-full h-full object-contain" />
    </div>
  );
}

interface OrderItem { id: string; product_name: string; color: string; quantity: number; produced_quantity: number; unit_price: number }
interface Order {
  id: string; created_at: string; total_amount: number; paid_amount: number;
  status: OrderStatus; notes: string | null;
  buyer: { id: string; name: string }; items: OrderItem[];
}

const STATUSES: { value: OrderStatus; label: string; style: string; active: string }[] = [
  { value: "pending", label: "Bekliyor", style: "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10", active: "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30" },
  { value: "in_production", label: "Üretimde", style: "border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10", active: "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30" },
  { value: "completed", label: "Tamamlandı", style: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10", active: "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30" },
  { value: "delivered", label: "Teslim Edildi", style: "border-gray-400/30 text-gray-500 hover:bg-gray-500/10", active: "bg-gray-500 text-white border-gray-500 shadow-lg shadow-gray-500/30" },
];

export function OrderDetailDialog({ order, onClose, onStatusChange }: { order: Order; onClose: () => void; onStatusChange: () => void }) {
  const { toast } = useToast();

  async function changeStatus(status: OrderStatus) {
    let sb; try { sb = createClient(); } catch { return; }
    await sb.from("orders").update({ status }).eq("id", order.id);
    toast({ title: "Durum güncellendi ✓" });
    onStatusChange(); onClose();
  }

  const debt = order.total_amount - order.paid_amount;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col border border-border shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">Sipariş Detayı</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Alıcı */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-foreground">{order.buyer.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
            </div>
          </div>

          {/* Durum */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Durum</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button key={s.value} onClick={() => changeStatus(s.value)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${order.status === s.value ? s.active : s.style + " border"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ürünler */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ürünler</p>
            <div className="space-y-2">
              {order.items.map((item) => {
                const pct = item.quantity > 0 ? Math.round((item.produced_quantity / item.quantity) * 100) : 0;
                return (
                  <div key={item.id} className="bg-muted/50 rounded-xl p-3 border border-border">
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex items-center gap-3">
                        <ProductThumb name={item.product_name} />
                        <div>
                          <p className="font-semibold text-sm text-foreground">{item.product_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-background border border-border px-2 py-0.5 rounded-full text-muted-foreground font-medium">{item.color}</span>
                            <span className="text-xs text-muted-foreground">{item.quantity} adet · {formatCurrency(item.unit_price)}/adet</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground shrink-0">{formatCurrency(item.quantity * item.unit_price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-background rounded-full h-1.5 border border-border">
                        <div className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">{item.produced_quantity}/{item.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ödeme */}
          <div className="bg-muted/50 rounded-xl p-4 border border-border space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ödeme Özeti</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Toplam</span>
              <span className="font-semibold text-foreground">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ödenen</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(order.paid_amount)}</span>
            </div>
            {debt > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="font-bold text-red-500">Kalan Borç</span>
                <span className="font-bold text-red-500">{formatCurrency(debt)}</span>
              </div>
            )}
          </div>

          {order.notes && (
            <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Not</p>
              </div>
              <p className="text-sm text-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border">
          <button onClick={onClose} className="w-full border border-border text-foreground font-semibold py-3 rounded-xl text-sm hover:bg-muted transition-all">Kapat</button>
        </div>
      </div>
    </div>
  );
}
