"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  ChevronRight, TrendingUp, DollarSign, AlertCircle, ArrowUpRight,
  Calendar, Package, Users, Clock, CheckCircle2, XCircle, Filter,
  Truck, CreditCard, ShoppingBag
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── Zaman filtresi seçenekleri ───────────────────────────────────────────────
type DateRange = "all" | "today" | "week" | "month" | "3months";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all",     label: "Tüm Zamanlar" },
  { value: "3months", label: "Son 3 Ay" },
  { value: "month",   label: "Son 1 Ay" },
  { value: "week",    label: "Son 1 Hafta" },
  { value: "today",   label: "Bugün" },
];

function getDateRangeStart(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case "today":   { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    case "week":    { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "month":   { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    case "3months": { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    default: return null;
  }
}

// ─── Tipler ───────────────────────────────────────────────────────────────────
interface RawOrder {
  id: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  buyer: { id: string; name: string };
  items: Array<{ id: string; product_name: string; quantity: number; unit_price: number; produced_quantity: number }>;
  deliveries: Array<{ id: string; delivery_date: string; notes: string | null }>;
  payments: Array<{ id: string; amount: number; payment_date: string; payment_method: string | null; notes: string | null }>;
}

interface OrderRow {
  order_id: string;
  order_date: string;
  buyer_id: string;
  buyer_name: string;
  total_amount: number;
  paid_amount: number;
  remaining: number;
  total_items: number;
  total_quantity: number;
  status: string;
  last_delivery_date: string | null;
  last_payment_date: string | null;
  payments: RawOrder["payments"];
  deliveries: RawOrder["deliveries"];
}

interface BuyerSummary {
  buyer_id: string;
  buyer_name: string;
  total_orders: number;
  total_amount: number;
  total_paid: number;
  total_remaining: number;
  orders: OrderRow[];
}

interface ProductSummary {
  product_name: string;
  total_quantity: number;
  total_produced: number;
  total_revenue: number;
  order_count: number;
}
export function AccountingOverviewTab() {
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<RawOrder[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [expandedBuyer, setExpandedBuyer] = useState<string | null>(null);

  // ─── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    async function load() {
      setLoading(true);
      const { data } = await sb.from("orders").select(`
        id, created_at, total_amount, paid_amount, status,
        buyer:buyers(id, name),
        items:order_items(id, product_name, quantity, unit_price, produced_quantity),
        deliveries(id, delivery_date, notes),
        payments(id, amount, payment_date, payment_method, notes)
      `).order("created_at", { ascending: false });
      setAllOrders((data as unknown as RawOrder[]) ?? []);
      setLoading(false);
    }
    load();

    const ordersChannel = sb
      .channel("accounting-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => load())
      .subscribe();

    return () => { sb.removeChannel(ordersChannel); };
  }, []);

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const rangeStart = getDateRangeStart(dateRange);
    if (!rangeStart) return allOrders;
    return allOrders.filter(o => new Date(o.created_at) >= rangeStart);
  }, [allOrders, dateRange]);

  // ─── Computed data ─────────────────────────────────────────────────────────
  const { buyerSummaries, productSummaries } = useMemo(() => {
    const buyerMap = new Map<string, BuyerSummary>();
    const productMap = new Map<string, ProductSummary>();

    for (const order of filteredOrders) {
      const buyerId = order.buyer?.id ?? "unknown";
      const buyerName = order.buyer?.name ?? "Bilinmeyen";

      // Overproduction value
      const overProductionValue = (order.items ?? []).reduce((sum, item) => {
        const extra = Math.max(0, (item.produced_quantity ?? 0) - item.quantity);
        return sum + extra * item.unit_price;
      }, 0);

      const actualTotal = order.total_amount + overProductionValue;
      const remaining = actualTotal - order.paid_amount;

      const lastDeliveryDate = (order.deliveries ?? []).reduce<string | null>((max, d) => {
        if (!max) return d.delivery_date;
        return d.delivery_date > max ? d.delivery_date : max;
      }, null);

      const lastPaymentDate = (order.payments ?? []).reduce<string | null>((max, p) => {
        if (!max) return p.payment_date;
        return p.payment_date > max ? p.payment_date : max;
      }, null);

      const orderRow: OrderRow = {
        order_id: order.id,
        order_date: order.created_at,
        buyer_id: buyerId,
        buyer_name: buyerName,
        total_amount: actualTotal,
        paid_amount: order.paid_amount,
        remaining,
        total_items: (order.items ?? []).length,
        total_quantity: (order.items ?? []).reduce((s, i) => s + i.quantity, 0),
        status: order.status,
        last_delivery_date: lastDeliveryDate,
        last_payment_date: lastPaymentDate,
        payments: order.payments ?? [],
        deliveries: order.deliveries ?? [],
      };

      if (!buyerMap.has(buyerId)) {
        buyerMap.set(buyerId, {
          buyer_id: buyerId,
          buyer_name: buyerName,
          total_orders: 0,
          total_amount: 0,
          total_paid: 0,
          total_remaining: 0,
          orders: [],
        });
      }
      const bs = buyerMap.get(buyerId)!;
      bs.total_orders += 1;
      bs.total_amount += actualTotal;
      bs.total_paid += order.paid_amount;
      bs.total_remaining += remaining;
      bs.orders.push(orderRow);

      // Product summaries
      for (const item of order.items ?? []) {
        const key = item.product_name;
        if (!productMap.has(key)) {
          productMap.set(key, {
            product_name: key,
            total_quantity: 0,
            total_produced: 0,
            total_revenue: 0,
            order_count: 0,
          });
        }
        const ps = productMap.get(key)!;
        ps.total_quantity += item.quantity;
        ps.total_produced += item.produced_quantity ?? 0;
        ps.total_revenue += item.quantity * item.unit_price;
        ps.order_count += 1;
      }
    }

    const buyerSummaries = Array.from(buyerMap.values()).sort((a, b) => b.total_amount - a.total_amount);
    const productSummaries = Array.from(productMap.values()).sort((a, b) => b.total_revenue - a.total_revenue);
    return { buyerSummaries, productSummaries };
  }, [filteredOrders]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalRevenue = buyerSummaries.reduce((s, b) => s + b.total_amount, 0);
  const totalPaid = buyerSummaries.reduce((s, b) => s + b.total_paid, 0);
  const totalRemaining = buyerSummaries.reduce((s, b) => s + b.total_remaining, 0);
  const totalOrders = filteredOrders.length;
  const paidOrders = filteredOrders.filter(o => o.status === "paid").length;
  const unpaidOrders = totalOrders - paidOrders;

  // ─── Chart data ────────────────────────────────────────────────────────────
  const topBuyersChartData = buyerSummaries.slice(0, 6).map(b => ({
    name: b.buyer_name.length > 12 ? b.buyer_name.slice(0, 12) + "…" : b.buyer_name,
    Toplam: parseFloat(b.total_amount.toFixed(2)),
    Ödenen: parseFloat(b.total_paid.toFixed(2)),
    Kalan: parseFloat(b.total_remaining.toFixed(2)),
  }));

  const topProductsChartData = productSummaries.slice(0, 6).map(p => ({
    name: p.product_name.length > 12 ? p.product_name.slice(0, 12) + "…" : p.product_name,
    Adet: p.total_quantity,
    Üretilen: p.total_produced,
  }));

  // ─── Recent orders (last 5 from buyerSummaries flattened) ─────────────────
  const recentOrders = useMemo(() => {
    return filteredOrders
      .slice(0, 5)
      .map(o => {
        const overProductionValue = (o.items ?? []).reduce((sum, item) => {
          const extra = Math.max(0, (item.produced_quantity ?? 0) - item.quantity);
          return sum + extra * item.unit_price;
        }, 0);
        const actualTotal = o.total_amount + overProductionValue;
        const remaining = actualTotal - o.paid_amount;
        const lastDeliveryDate = (o.deliveries ?? []).reduce<string | null>((max, d) => {
          if (!max) return d.delivery_date;
          return d.delivery_date > max ? d.delivery_date : max;
        }, null);
        const lastPaymentDate = (o.payments ?? []).reduce<string | null>((max, p) => {
          if (!max) return p.payment_date;
          return p.payment_date > max ? p.payment_date : max;
        }, null);
        return {
          order_id: o.id,
          order_date: o.created_at,
          buyer_name: o.buyer?.name ?? "Bilinmeyen",
          buyer_id: o.buyer?.id ?? "",
          total_amount: actualTotal,
          paid_amount: o.paid_amount,
          remaining,
          status: o.status,
          last_delivery_date: lastDeliveryDate,
          last_payment_date: lastPaymentDate,
        };
      });
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* A) HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Muhasebe</h1>
          <p className="text-muted-foreground mt-1">Finansal özet ve alıcı detayları</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      {/* B) DATE FILTER BAR */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {DATE_RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dateRange === opt.value
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* C) STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Toplam Ciro</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</span>
          <span className="text-xs text-muted-foreground">{totalOrders} sipariş</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Tahsil Edilen</span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <span className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</span>
          <span className="text-xs text-muted-foreground">{paidOrders} ödendi</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Kalan Alacak</span>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-2xl font-bold text-orange-600">{formatCurrency(totalRemaining)}</span>
          <span className="text-xs text-muted-foreground">{unpaidOrders} bekliyor</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Ortalama Sipariş</span>
            <ShoppingBag className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            {totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : formatCurrency(0)}
          </span>
          <span className="text-xs text-muted-foreground">{buyerSummaries.length} alıcı</span>
        </div>
      </div>

      {/* D) CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top buyers bar chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-foreground">En Çok Alışveriş Yapan Alıcılar</h2>
          </div>
          {topBuyersChartData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topBuyersChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₺${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Toplam" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Ödenen" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="Kalan" fill="#f97316" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products bar chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-foreground">En Çok Sipariş Edilen Ürünler</h2>
          </div>
          {topProductsChartData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProductsChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Adet" fill="#8b5cf6" radius={[4,4,0,0]} />
                <Bar dataKey="Üretilen" fill="#06b6d4" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* E) PRODUCT SUMMARY TABLE */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Package className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-foreground">Ürün Özeti</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Ürün</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Sipariş Adedi</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Üretilen</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Sipariş Sayısı</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Toplam Gelir</th>
              </tr>
            </thead>
            <tbody>
              {productSummaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Veri yok</td>
                </tr>
              ) : (
                productSummaries.map(p => (
                  <tr key={p.product_name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{p.product_name}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{p.total_quantity}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{p.total_produced}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{p.order_count}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{formatCurrency(p.total_revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* F) RECENT ORDERS */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Clock className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-foreground">Son Siparişler</h2>
        </div>
        <div className="divide-y divide-border/50">
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Sipariş yok</div>
          ) : (
            recentOrders.map(order => (
              <div key={order.order_id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                {/* Buyer avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {order.buyer_name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{order.buyer_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(order.order_date)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Truck className="w-3 h-3" />
                      {order.last_delivery_date ? formatDate(order.last_delivery_date) : "Teslimat yok"}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CreditCard className="w-3 h-3" />
                      {order.last_payment_date ? formatDate(order.last_payment_date) : "Ödeme yok"}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-foreground">{formatCurrency(order.total_amount)}</div>
                  {order.remaining > 0.01 ? (
                    <div className="text-xs text-orange-500 font-medium">{formatCurrency(order.remaining)} kalan</div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-green-500 font-medium justify-end">
                      <CheckCircle2 className="w-3 h-3" /> Ödendi
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* G) ALL BUYERS EXPANDABLE LIST */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Users className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-foreground">Tüm Alıcılar</h2>
          <span className="ml-auto text-xs text-muted-foreground">{buyerSummaries.length} alıcı</span>
        </div>
        <div className="divide-y divide-border/50">
          {buyerSummaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Alıcı yok</div>
          ) : (
            buyerSummaries.map(buyer => (
              <div key={buyer.buyer_id}>
                {/* Buyer header row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => setExpandedBuyer(expandedBuyer === buyer.buyer_id ? null : buyer.buyer_id)}
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {buyer.buyer_name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground">{buyer.buyer_name}</div>
                    <div className="text-xs text-muted-foreground">{buyer.total_orders} sipariş</div>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <div className="text-sm font-semibold text-foreground">{formatCurrency(buyer.total_amount)}</div>
                    {buyer.total_remaining > 0.01 ? (
                      <div className="text-xs text-orange-500">{formatCurrency(buyer.total_remaining)} kalan</div>
                    ) : (
                      <div className="text-xs text-green-500">Tamamlandı</div>
                    )}
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${
                      expandedBuyer === buyer.buyer_id ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {/* Expanded orders */}
                {expandedBuyer === buyer.buyer_id && (
                  <div className="bg-muted/20 border-t border-border/50 divide-y divide-border/30">
                    {buyer.orders.map(order => (
                      <div key={order.order_id} className="px-6 py-3 space-y-2">
                        {/* Order meta */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="font-medium text-foreground">Sipariş Tarihi:</span>
                            {formatDateTime(order.order_date)}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Truck className="w-3.5 h-3.5" />
                            <span className="font-medium text-foreground">Son Teslimat:</span>
                            {order.last_delivery_date ? formatDate(order.last_delivery_date) : "-"}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="font-medium text-foreground">Son Ödeme:</span>
                            {order.last_payment_date ? formatDate(order.last_payment_date) : "-"}
                          </span>
                          <span className="ml-auto text-xs font-semibold text-foreground">
                            {formatCurrency(order.total_amount)}
                            {order.remaining > 0.01 && (
                              <span className="text-orange-500 ml-1">({formatCurrency(order.remaining)} kalan)</span>
                            )}
                          </span>
                        </div>

                        {/* Payments */}
                        {order.payments && order.payments.length > 0 && (
                          <div className="pl-2 space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Ödemeler</div>
                            {order.payments.map(payment => (
                              <div key={payment.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CreditCard className="w-3 h-3 text-green-500 flex-shrink-0" />
                                <span className="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
                                <span>{formatDate(payment.payment_date)}</span>
                                {payment.payment_method && (
                                  <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{payment.payment_method}</span>
                                )}
                                {payment.notes && <span className="text-muted-foreground italic">{payment.notes}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Deliveries */}
                        {order.deliveries && order.deliveries.length > 0 && (
                          <div className="pl-2 space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Teslimatlar</div>
                            {order.deliveries.map(delivery => (
                              <div key={delivery.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Truck className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                <span>{formatDate(delivery.delivery_date)}</span>
                                {delivery.notes && <span className="italic">{delivery.notes}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
