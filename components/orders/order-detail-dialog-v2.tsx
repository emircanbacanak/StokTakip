"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Package, Truck, CreditCard, Plus, AlertCircle, ChevronDown, ChevronUp, Pencil, Trash2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getColorStyle } from "@/lib/color-map";
import { ORDER_STATUS_LABELS, type OrderStatus, type OrderItem, type Delivery, type Payment, type DeliveryItem } from "@/lib/types/database";
import { useToast } from "@/hooks/use-toast";
import { NewDeliveryDialog } from "./new-delivery-dialog";
import { NewPaymentDialog } from "./new-payment-dialog";
import { EditOrderDialog } from "./edit-order-dialog";
import { InvoiceDialog } from "./invoice-dialog";
import { ColorBadge } from "@/components/ui/color-badge";

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
    const size = 320; const margin = 8;
    let x = rect.right + margin; let y = rect.top;
    if (x + size > window.innerWidth) x = rect.left - size - margin;
    if (y + size > window.innerHeight - margin) y = window.innerHeight - size - margin;
    if (y < margin) y = margin;
    setPos({ x, y }); setHovered(true);
  }

  if (!url) return (
    <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center shrink-0 border border-border">
      <Package className="w-5 h-5 text-muted-foreground/30" />
    </div>
  );

  return (
    <>
      <div ref={ref} className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 cursor-zoom-in bg-muted border border-border flex items-center justify-center"
        onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)}>
        <img src={url} alt={name} className="max-w-full max-h-full object-contain p-1" />
      </div>
      {hovered && (
        <div className="fixed z-[200] pointer-events-none w-80 h-80 rounded-2xl overflow-hidden shadow-2xl border border-border bg-muted flex items-center justify-center"
          style={{ left: pos.x, top: pos.y }}>
          <img src={url} alt={name} className="max-w-full max-h-full object-contain p-2" />
        </div>
      )}
    </>
  );
}

interface Order {
  id: string; created_at: string; total_amount: number; paid_amount: number;
  status: OrderStatus; notes: string | null;
  buyer: { id: string; name: string }; items: OrderItem[];
}

const STATUSES: { value: OrderStatus; label: string; style: string; active: string }[] = [
  { value: "pending", label: "Bekliyor", style: "border-amber-400/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10", active: "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30" },
  { value: "in_production", label: "Üretimde", style: "border-blue-400/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10", active: "bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/30" },
  { value: "completed", label: "Tamamlandı", style: "border-emerald-400/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10", active: "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30" },
  { value: "delivered", label: "Teslim Edildi", style: "border-border text-muted-foreground hover:bg-muted/60", active: "bg-foreground text-background border-foreground shadow-sm" },
];

type DeliveryWithItems = Delivery & {
  items: (DeliveryItem & { order_item: OrderItem })[];
  payment?: Payment;
};

function ItemsTab({ items, totalDelivered, totalOrdered, updateProduction }: {
  items: OrderItem[]; totalDelivered: number; totalOrdered: number;
  updateProduction: (id: string, qty: number, max: number) => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showRemaining, setShowRemaining] = useState(true);
  const [showDelivered, setShowDelivered] = useState(true);

  function toggle(name: string) {
    setOpenGroups((prev) => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; });
  }

  function handleUpdateProduction(id: string, qty: number, max: number, productName: string) {
    setLastUpdated(productName);
    updateProduction(id, qty, max);
  }

  // Teslim Edilenler: Gerçekten teslimat yapılmış (delivered_quantity > 0)
  const deliveredItems = items.filter(item => (item.delivered_quantity || 0) > 0);
  
  // Teslim Edilecek (Kalan): Henüz teslim edilmemiş veya kısmen teslim edilmiş
  const remainingItems = items.filter(item => (item.delivered_quantity || 0) < item.quantity);

  const groupMap = (itemList: OrderItem[]) => {
    const map = new Map<string, OrderItem[]>();
    itemList.forEach((item) => {
      if (!map.has(item.product_name)) map.set(item.product_name, []);
      map.get(item.product_name)!.push(item);
    });
    return map;
  };

  const deliveredGroups = Array.from(groupMap(deliveredItems).entries());
  const remainingGroups = Array.from(groupMap(remainingItems).entries());
  
  // Ürün sayısı (kategori sayısı)
  const remainingProductCount = remainingGroups.length;
  const deliveredProductCount = deliveredGroups.length;

  // Son güncellenen ürünü en üste taşı
  if (lastUpdated) {
    const moveToTop = (groups: [string, OrderItem[]][]) => [
      ...groups.filter(([name]) => name === lastUpdated),
      ...groups.filter(([name]) => name !== lastUpdated),
    ];
    deliveredGroups.splice(0, deliveredGroups.length, ...moveToTop(deliveredGroups));
    remainingGroups.splice(0, remainingGroups.length, ...moveToTop(remainingGroups));
  }

  const renderGroup = (productName: string, groupItems: OrderItem[]) => {
    const isOpen = openGroups.has(productName);
    const totalQty = groupItems.reduce((s, i) => s + i.quantity, 0);
    const totalProd = groupItems.reduce((s, i) => s + (i.produced_quantity || 0), 0);
    const prodPct = totalQty > 0 ? Math.round((totalProd / totalQty) * 100) : 0;
    const unitPrice = groupItems[0]?.unit_price || 0;
    const totalValue = groupItems.reduce((s, i) => s + i.quantity * (i.unit_price || 0), 0);
    const overProduced = Math.max(0, totalProd - totalQty);
    const overProductionValue = overProduced * unitPrice;
    const actualValue = totalValue + overProductionValue;

    return (
      <div key={productName} className="rounded-2xl border border-border bg-card overflow-hidden">
        <button onClick={() => toggle(productName)}
          className="w-full px-4 py-3.5 flex items-center gap-3.5 hover:bg-muted/30 transition-colors">
          <ProductThumb name={productName} />
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="font-semibold text-sm text-foreground leading-tight">{productName}</p>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground">{formatCurrency(actualValue)}</p>
                {overProduced > 0 && (
                  <p className="text-[10px] text-amber-600">+{overProduced} fazla ({formatCurrency(overProductionValue)})</p>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-wrap mb-2">
              {groupItems.map((i) => <ColorBadge key={i.id} color={i.color} size="sm" />)}
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 bg-muted rounded-full h-2 max-w-[120px] overflow-hidden">
                <div className={`h-2 rounded-full transition-all duration-300 ${prodPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
                  style={{ width: `${prodPct}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground">{totalQty} adet · {formatCurrency(unitPrice)}/ad</span>
            </div>
          </div>
          <div className="shrink-0 text-muted-foreground/60">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-border divide-y divide-border/60 bg-muted/20">
            {groupItems.map((item) => {
              const remaining = item.quantity - (item.delivered_quantity || 0);
              const deliveryPct = item.quantity > 0 ? Math.round(((item.delivered_quantity || 0) / item.quantity) * 100) : 0;
              const producedQty = item.produced_quantity || 0;
              const productionPct = item.quantity > 0 ? Math.min(100, Math.round((producedQty / item.quantity) * 100)) : 0;
              const isOverProduced = producedQty > item.quantity;

              return (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <ColorBadge color={item.color} />
                      <span className="text-xs text-muted-foreground">{item.quantity} adet</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-foreground">{formatCurrency(item.quantity * (item.unit_price || 0))}</span>
                      {isOverProduced && (
                        <span className="text-[10px] text-amber-600 block">
                          +{producedQty - item.quantity} fazla ({formatCurrency((producedQty - item.quantity) * (item.unit_price || 0))})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">Üretim</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleUpdateProduction(item.id, (item.produced_quantity || 0) - 1, item.quantity, productName)}
                          disabled={(item.produced_quantity || 0) <= 0}
                          className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 transition-all text-sm font-bold leading-none">−</button>
                        <span className={`text-[11px] font-semibold min-w-[40px] text-center ${isOverProduced ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                          {item.produced_quantity || 0}/{item.quantity}
                        </span>
                        <button onClick={() => handleUpdateProduction(item.id, (item.produced_quantity || 0) + 1, item.quantity, productName)}
                          disabled={false}
                          className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-foreground hover:bg-muted transition-all text-sm font-bold leading-none">+</button>
                      </div>
                    </div>
                    <div className="bg-muted rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all duration-300 ${isOverProduced ? "bg-amber-500" : productionPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
                        style={{ width: `${productionPct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">Teslimat</span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.delivered_quantity || 0}/{item.quantity}
                        {remaining > 0 && <span className="text-red-500 ml-1 font-medium">({remaining} kaldı)</span>}
                      </span>
                    </div>
                    <div className="bg-muted rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all duration-300 ${deliveryPct === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${deliveryPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Sipariş Kalemleri</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalDelivered}</span>/{totalOrdered} teslim
        </p>
      </div>

      {/* Eğer hiç teslimat yoksa, grupları gösterme - sadece normal liste */}
      {totalDelivered === 0 ? (
        <div className="space-y-2.5">
          {Array.from(groupMap(items).entries()).map(([productName, groupItems]) => renderGroup(productName, groupItems))}
        </div>
      ) : (
        <>
          {/* Teslim Edilecek (Kalan) */}
          {remainingGroups.length > 0 && (
            <div className="space-y-2.5">
              <button
                onClick={() => setShowRemaining(!showRemaining)}
                className="w-full flex items-center gap-2 group"
              >
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                    Teslim Edilecek ({remainingProductCount} ürün)
                  </p>
                  {showRemaining ? (
                    <ChevronUp className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 via-transparent to-transparent" />
              </button>
              {showRemaining && remainingGroups.map(([productName, groupItems]) => renderGroup(productName, groupItems))}
            </div>
          )}

          {/* Teslim Edilenler */}
          {deliveredGroups.length > 0 && (
            <div className="space-y-2.5">
              <button
                onClick={() => setShowDelivered(!showDelivered)}
                className="w-full flex items-center gap-2 group"
              >
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Teslim Edilenler ({deliveredProductCount} ürün)
                  </p>
                  {showDelivered ? (
                    <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 via-transparent to-transparent" />
              </button>
              {showDelivered && deliveredGroups.map(([productName, groupItems]) => renderGroup(productName, groupItems))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function OrderDetailDialogV2({ order: initialOrder, onClose, onStatusChange }: { order: Order; onClose: () => void; onStatusChange: () => void }) {
  const { toast } = useToast();
  const [order, setOrder] = useState(initialOrder);
  const [deliveries, setDeliveries] = useState<DeliveryWithItems[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "deliveries" | "payments">("items");
  const [tablesNotFound, setTablesNotFound] = useState(false);
  const [deletingDeliveryId, setDeletingDeliveryId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    const sb = createClient();
    try {
      const { data: deliveriesData, error: deliveriesError } = await sb
        .from("deliveries").select(`*, items:delivery_items(*, order_item:order_items(*))`)
        .eq("order_id", order.id).order("delivery_date", { ascending: false });
      const { data: paymentsData, error: paymentsError } = await sb
        .from("payments").select("*").eq("order_id", order.id).order("payment_date", { ascending: false });
      const { data: orderData } = await sb
        .from("orders").select("*, buyer:buyers(*), items:order_items(*)").eq("id", order.id).single();
      if (orderData) setOrder(orderData as any);
      setDeliveries((deliveriesData as any) || []);
      setPayments(paymentsData || []);
      if (deliveriesError || paymentsError) { setTablesNotFound(true); }
    } catch { setDeliveries([]); setPayments([]); } finally { setLoading(false); }
  }, [order.id]);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  async function changeStatus(status: OrderStatus) {
    const sb = createClient();
    await sb.from("orders").update({ status }).eq("id", order.id);
    toast({ title: "Durum güncellendi ✓" });
    onStatusChange(); setOrder({ ...order, status });
  }

  async function updateProduction(itemId: string, newQty: number, maxQty: number) {
    const qty = Math.max(0, newQty); // max sınırı yok, fazla üretim yapılabilir
    const sb = createClient();
    await sb.from("order_items").update({ produced_quantity: qty }).eq("id", itemId);
    setOrder((prev) => ({ ...prev, items: prev.items.map((i) => i.id === itemId ? { ...i, produced_quantity: qty } : i) }));
    onStatusChange();
  }

  async function deleteDelivery(deliveryId: string) {
    const sb = createClient();
    
    // Teslimat kalemlerini sil (trigger otomatik olarak delivered_quantity'yi güncelleyecek)
    await sb.from("delivery_items").delete().eq("delivery_id", deliveryId);
    
    // Teslimatı sil
    await sb.from("deliveries").delete().eq("id", deliveryId);
    
    toast({ title: "Teslimat silindi ✓" });
    setDeletingDeliveryId(null);
    
    // Trigger'ın çalışması için kısa bir bekleme
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verileri yeniden yükle
    await loadDetails();
    onStatusChange();
  }

  async function deletePayment(paymentId: string) {
    const sb = createClient();
    await sb.from("payments").delete().eq("id", paymentId);
    toast({ title: "Ödeme silindi ✓" });
    setDeletingPaymentId(null);
    loadDetails();
    onStatusChange();
  }

  const debt = order.total_amount - order.paid_amount;
  const totalDelivered = order.items.reduce((sum, item) => sum + (item.delivered_quantity || 0), 0);
  const totalOrdered = order.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Fazla üretim hesaplaması - her ürün için fazla üretilen miktar * birim fiyat
  const overProductionValue = order.items.reduce((sum, item) => {
    const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
    return sum + (overProduced * (item.unit_price || 0));
  }, 0);
  
  // Gerçek toplam tutar = sipariş tutarı + fazla üretim değeri
  const actualTotalAmount = order.total_amount + overProductionValue;
  const actualDebt = actualTotalAmount - order.paid_amount;
  
  // Beklenen ödeme hesaplaması - teslim edilen + fazla üretim
  const expectedPayment = order.items.reduce((sum, item) => {
    const dq = item.delivered_quantity || 0;
    const baseValue = (dq / item.quantity) * (item.quantity * (item.unit_price || 0));
    
    // Fazla üretim değeri ekle
    const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
    const overValue = overProduced * (item.unit_price || 0);
    
    return sum + baseValue + overValue;
  }, 0);
  const paymentDiff = order.paid_amount - expectedPayment;
  
  // Sadece ödeme alındıysa ve beklenen ödemeden farklıysa uyarı göster
  const hasOverpayment = order.paid_amount > 0 && paymentDiff > 1;
  const hasUnderpayment = order.paid_amount > 0 && expectedPayment > 0 && paymentDiff < -1;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-card w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[92vh] flex flex-col border border-border shadow-2xl">

          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-9 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="px-5 pt-4 pb-0">
            {/* Completed Badge */}
            {(order.status === "completed" || order.status === "delivered") && (
              <div className="mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tamamlandı</span>
                </div>
              </div>
            )}
            
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="min-w-0">
                <h2 className="font-bold text-foreground text-xl leading-tight truncate">{order.buyer.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setShowInvoice(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-500/10 px-2.5 py-1.5 rounded-lg transition-all border border-blue-500/20">
                  <FileText className="w-3 h-3" /><span>Fiş</span>
                </button>
                <button onClick={() => setShowEditOrder(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 py-1.5 rounded-lg transition-all border border-border">
                  <Pencil className="w-3 h-3" /><span>Düzenle</span>
                </button>
                <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary inline */}
            <div className="flex items-center gap-1.5 py-3 text-sm flex-wrap">
              <span className="text-muted-foreground">Sipariş</span>
              <span className="font-semibold text-foreground">{formatCurrency(order.total_amount)}</span>
              {overProductionValue > 0 && (
                <>
                  <span className="text-muted-foreground/40 mx-0.5">+</span>
                  <span className="text-muted-foreground">Fazla Üretim</span>
                  <span className="font-semibold text-amber-600">{formatCurrency(overProductionValue)}</span>
                </>
              )}
              <span className="text-muted-foreground/40 mx-0.5">·</span>
              <span className="text-muted-foreground">Toplam</span>
              <span className="font-semibold text-blue-600">{formatCurrency(actualTotalAmount)}</span>
              <span className="text-muted-foreground/40 mx-0.5">·</span>
              <span className="text-muted-foreground">Ödenen</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(order.paid_amount)}</span>
              <span className="text-muted-foreground/40 mx-0.5">·</span>
              <span className="text-muted-foreground">Kalan</span>
              <span className={`font-semibold ${actualDebt > 0 ? "text-red-500" : "text-emerald-600"}`}>{formatCurrency(Math.abs(actualDebt))}</span>
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-2 pb-4 flex-wrap">
              {STATUSES.map((s) => (
                <button key={s.value} onClick={() => changeStatus(s.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${order.status === s.value ? s.active : s.style + " border"}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Warnings */}
            {tablesNotFound && (
              <div className="mb-4 p-3 rounded-xl border bg-amber-500/5 border-amber-500/20 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Veritabanı Güncelleme Gerekli</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Teslimat ve ödeme özellikleri için <code className="bg-muted px-1 py-0.5 rounded">migration-v2.sql</code> dosyasını Supabase'de çalıştırın.
                  </p>
                </div>
              </div>
            )}

            {(hasOverpayment || hasUnderpayment) && !tablesNotFound && (
              <div className={`mb-4 p-3 rounded-xl border flex items-start gap-2.5 ${hasOverpayment ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${hasOverpayment ? "text-amber-600" : "text-red-500"}`} />
                <div>
                  <p className={`text-xs font-semibold ${hasOverpayment ? "text-amber-700 dark:text-amber-400" : "text-red-600"}`}>
                    {hasOverpayment ? "Fazla Ödeme" : "Eksik Ödeme"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Beklenen: {formatCurrency(expectedPayment)} · {hasOverpayment ? `${formatCurrency(paymentDiff)} fazla` : `${formatCurrency(Math.abs(paymentDiff))} eksik`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-5 gap-1">
            {(["items", "deliveries", "payments"] as const).map((tab) => {
              const labels: Record<string, string> = {
                items: `Ürünler (${order.items.length})`,
                deliveries: `Teslimatlar (${deliveries.length})`,
                payments: `Ödemeler (${payments.length})`,
              };
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {activeTab === "items" && (
              <ItemsTab items={order.items} totalDelivered={totalDelivered} totalOrdered={totalOrdered} updateProduction={updateProduction} />
            )}

            {activeTab === "deliveries" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Teslimat Geçmişi</p>
                  <button onClick={() => setShowNewDelivery(true)} disabled={tablesNotFound}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus className="w-3.5 h-3.5" /> Yeni Teslimat
                  </button>
                </div>
                {deliveries.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                      <Truck className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">Henüz teslimat yapılmadı</p>
                  </div>
                ) : deliveries.map((delivery) => {
                  const totalQty = delivery.items.reduce((sum, di) => sum + di.quantity, 0);
                  
                  // Ürün bazlı gruplama
                  const productGroups = new Map<string, typeof delivery.items>();
                  delivery.items.forEach((item) => {
                    if (!productGroups.has(item.order_item.product_name)) {
                      productGroups.set(item.order_item.product_name, []);
                    }
                    productGroups.get(item.order_item.product_name)!.push(item);
                  });

                  return (
                    <div key={delivery.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{totalQty} adet teslim edildi</p>
                          <p className="text-xs text-muted-foreground">{formatDate(delivery.delivery_date)}</p>
                        </div>
                        <button
                          onClick={() => setDeletingDeliveryId(delivery.id)}
                          className="p-2 text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Ürün grupları */}
                      <div className="divide-y divide-border">
                        {Array.from(productGroups.entries()).map(([productName, items]) => {
                          const productTotal = items.reduce((sum, i) => sum + i.quantity, 0);
                          return (
                            <div key={productName} className="px-4 py-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-foreground">{productName}</p>
                                <span className="text-xs font-bold text-muted-foreground">{productTotal} adet</span>
                              </div>
                              <div className="space-y-1.5 pl-2">
                                {items.map((di) => (
                                  <div key={di.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <ColorBadge color={di.order_item.color} size="sm" />
                                      <span className="text-muted-foreground">{di.order_item.color}</span>
                                    </div>
                                    <span className="font-semibold text-foreground">{di.quantity} adet</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {delivery.notes && (
                        <div className="px-4 py-3 border-t border-border bg-muted/20">
                          <p className="text-xs text-muted-foreground">{delivery.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Ödeme Geçmişi</p>
                  <button onClick={() => setShowNewPayment(true)} disabled={tablesNotFound}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus className="w-3.5 h-3.5" /> Ödeme Ekle
                  </button>
                </div>
                {payments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                      <CreditCard className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">Henüz ödeme alınmadı</p>
                  </div>
                ) : payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)}{payment.payment_method && ` · ${payment.payment_method}`}
                        </p>
                      </div>
                      <button
                        onClick={() => setDeletingPaymentId(payment.id)}
                        className="p-2 text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {payment.notes && <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border pl-12">{payment.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            {order.notes && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Sipariş Notu</p>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border">
            <button onClick={onClose}
              className="w-full border border-border text-muted-foreground font-medium py-2.5 rounded-xl text-sm hover:bg-muted hover:text-foreground transition-all">
              Kapat
            </button>
          </div>
        </div>
      </div>

      {showNewDelivery && (
        <NewDeliveryDialog order={order} onClose={() => setShowNewDelivery(false)}
          onSuccess={() => { setShowNewDelivery(false); loadDetails(); onStatusChange(); }} />
      )}
      {showNewPayment && (
        <NewPaymentDialog order={order} onClose={() => setShowNewPayment(false)}
          onSuccess={() => { setShowNewPayment(false); loadDetails(); onStatusChange(); }} />
      )}
      {showEditOrder && (
        <EditOrderDialog order={order} onClose={() => setShowEditOrder(false)}
          onSuccess={() => { setShowEditOrder(false); loadDetails(); onStatusChange(); }} />
      )}
      {showInvoice && (
        <InvoiceDialog order={order} onClose={() => setShowInvoice(false)} />
      )}
      
      {/* Teslimat Silme Popup */}
      {deletingDeliveryId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingDeliveryId(null)} />
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Teslimatı Sil</h3>
                <p className="text-xs text-muted-foreground">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Bu teslimatı silmek istediğinizden emin misiniz? Teslim edilen ürünler tekrar "teslim edilecek" durumuna dönecektir.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingDeliveryId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-all"
              >
                İptal
              </button>
              <button
                onClick={() => deleteDelivery(deletingDeliveryId)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Ödeme Silme Popup */}
      {deletingPaymentId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingPaymentId(null)} />
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Ödemeyi Sil</h3>
                <p className="text-xs text-muted-foreground">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Bu ödemeyi silmek istediğinizden emin misiniz? Ödeme kaydı tamamen silinecektir.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingPaymentId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-all"
              >
                İptal
              </button>
              <button
                onClick={() => deletePayment(deletingPaymentId)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
