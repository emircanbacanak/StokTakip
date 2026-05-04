"use client";

import { useEffect, useState } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  ArrowUpRight,
  Calendar,
  Package,
  Users,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface OrderSummary {
  order_id: string;
  order_date: string;
  buyer_id: string;
  buyer_name: string;
  total_amount: number;
  paid_amount: number;
  remaining: number;
  total_items: number;
  total_quantity: number;
}

interface BuyerSummary {
  buyer_id: string;
  buyer_name: string;
  total_orders: number;
  total_amount: number;
  total_paid: number;
  total_remaining: number;
  total_filament_kg: number;
  orders: OrderSummary[];
}

interface ProductSummary {
  product_name: string;
  total_quantity: number;
  total_produced: number;
  total_revenue: number;
  order_count: number;
  total_filament_kg: number;
}

export function AccountingClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [buyerSummaries, setBuyerSummaries] = useState<BuyerSummary[]>([]);
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [expandedBuyer, setExpandedBuyer] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const sb = createClient();
      
      const { data: orders } = await sb
        .from("orders")
        .select(`
          id,
          created_at,
          total_amount,
          paid_amount,
          buyer:buyers(id, name),
          items:order_items(id, product_name, quantity, unit_price, produced_quantity)
        `)
        .order("created_at", { ascending: false });

      if (!orders) {
        setLoading(false);
        return;
      }

      const buyerMap = new Map<string, BuyerSummary>();
      const productMap = new Map<string, ProductSummary>();

      orders.forEach((order: any) => {
        const buyerId = order.buyer.id;
        const buyerName = order.buyer.name;
        
        const overProductionValue = order.items.reduce((sum: number, item: any) => {
          const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
          return sum + (overProduced * (item.unit_price || 0));
        }, 0);
        
        const actualTotal = order.total_amount + overProductionValue;
        const remaining = actualTotal - order.paid_amount;

        // Buyer summary
        if (!buyerMap.has(buyerId)) {
          buyerMap.set(buyerId, {
            buyer_id: buyerId,
            buyer_name: buyerName,
            total_orders: 0,
            total_amount: 0,
            total_paid: 0,
            total_remaining: 0,
            total_filament_kg: 0,
            orders: [],
          });
        }

        const buyerSummary = buyerMap.get(buyerId)!;
        buyerSummary.total_orders++;
        buyerSummary.total_amount += actualTotal;
        buyerSummary.total_paid += order.paid_amount;
        buyerSummary.total_remaining += remaining;
        buyerSummary.total_filament_kg += (order.filament_kg || 0);
        buyerSummary.orders.push({
          order_id: order.id,
          order_date: order.created_at,
          buyer_id: buyerId,
          buyer_name: buyerName,
          total_amount: actualTotal,
          paid_amount: order.paid_amount,
          remaining: remaining,
          total_items: order.items.length,
          total_quantity: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        });

        // Product summary
        order.items.forEach((item: any) => {
          const productName = item.product_name;
          const producedQty = item.produced_quantity || item.quantity;
          const itemRevenue = producedQty * (item.unit_price || 0);

          if (!productMap.has(productName)) {
            productMap.set(productName, {
              product_name: productName,
              total_quantity: 0,
              total_produced: 0,
              total_revenue: 0,
              order_count: 0,
              total_filament_kg: 0,
            });
          }

          const productSummary = productMap.get(productName)!;
          productSummary.total_quantity += item.quantity;
          productSummary.total_produced += producedQty;
          productSummary.total_revenue += itemRevenue;
          productSummary.order_count++;
          
          // Filament'i sipariş seviyesinden al ve ürünlere oranla dağıt
          const orderFilamentKg = order.filament_kg || 0;
          const orderTotalQty = order.items.reduce((sum: number, i: any) => sum + (i.produced_quantity || i.quantity), 0);
          if (orderTotalQty > 0) {
            const itemFilamentShare = (producedQty / orderTotalQty) * orderFilamentKg;
            productSummary.total_filament_kg += itemFilamentShare;
          }
        });
      });

      setBuyerSummaries(Array.from(buyerMap.values()).sort((a, b) => b.total_amount - a.total_amount));
      setProductSummaries(Array.from(productMap.values()).sort((a, b) => b.total_revenue - a.total_revenue));
      setLoading(false);
    }

    load();
    
    // Supabase Realtime subscription - orders ve order_items değişikliklerini dinle
    const sb = createClient();
    const ordersChannel = sb
      .channel('accounting-orders-changes')
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
      .channel('accounting-items-changes')
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
  }, []);

  const totalRevenue = buyerSummaries.reduce((sum, b) => sum + b.total_amount, 0);
  const totalPaid = buyerSummaries.reduce((sum, b) => sum + b.total_paid, 0);
  const totalRemaining = buyerSummaries.reduce((sum, b) => sum + b.total_remaining, 0);
  const totalOrders = buyerSummaries.reduce((sum, b) => sum + b.total_orders, 0);
  const totalFilamentKg = buyerSummaries.reduce((sum, b) => sum + b.total_filament_kg, 0);
  const paidOrders = buyerSummaries.reduce((sum, b) => sum + b.orders.filter(o => o.remaining === 0).length, 0);
  const unpaidOrders = totalOrders - paidOrders;

  // Chart data - Top 5 buyers by revenue
  const topBuyersData = buyerSummaries.slice(0, 5).map(b => ({
    name: b.buyer_name.length > 12 ? b.buyer_name.substring(0, 12) + '...' : b.buyer_name,
    ciro: b.total_amount,
    tahsilat: b.total_paid,
  }));

  // Top 5 products by revenue
  const topProductsData = productSummaries.slice(0, 5).map(p => ({
    name: p.product_name.length > 15 ? p.product_name.substring(0, 15) + '...' : p.product_name,
    gelir: p.total_revenue,
    adet: p.total_produced,
  }));

  console.log('Product Summaries:', productSummaries);
  console.log('Top Products Data:', topProductsData);

  // Pie chart data - Payment status
  const paymentStatusData = [
    { name: 'Ödendi', value: paidOrders, color: '#10b981' },
    { name: 'Bekliyor', value: unpaidOrders, color: '#ef4444' }
  ];

  // Recent activity - Last 5 orders
  const recentOrders = buyerSummaries
    .flatMap(b => b.orders.map(o => ({ ...o, buyer_name: b.buyer_name })))
    .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-muted/30 p-4 lg:p-8 pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Muhasebe</h1>
            <p className="text-muted-foreground mt-1">Finansal özet ve alıcı detayları</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Stats Grid - 4 columns */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Toplam Ciro */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">
                Toplam
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Toplam Ciro</p>
            <h3 className="text-2xl font-bold text-foreground mb-2">{formatCurrency(totalRevenue)}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {buyerSummaries.length} alıcı · {totalOrders} sipariş
            </p>
          </div>

          {/* Tahsil Edilen */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-1 rounded">
                %{totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(0) : 0}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Tahsil Edilen</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">{formatCurrency(totalPaid)}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {paidOrders} sipariş ödendi
            </p>
          </div>

          {/* Kalan Alacak */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950 px-2 py-1 rounded">
                %{totalRevenue > 0 ? ((totalRemaining / totalRevenue) * 100).toFixed(0) : 0}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Kalan Alacak</p>
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">{formatCurrency(totalRemaining)}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              {unpaidOrders} sipariş bekliyor
            </p>
          </div>

          {/* Ortalama Sipariş */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                <Package className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950 px-2 py-1 rounded">
                Ort.
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Ortalama Sipariş</p>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Sipariş başına
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top 5 Buyers Chart */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">En Çok Ciro Yapan Alıcılar</h2>
              <p className="text-sm text-muted-foreground mt-1">İlk 5 alıcının ciro karşılaştırması</p>
            </div>
            {loading ? (
              <div className="h-64 bg-muted/20 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topBuyersData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="ciro" fill="#3b82f6" name="Ciro" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="tahsilat" fill="#10b981" name="Tahsilat" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top 5 Products Chart */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">En Çok Satılan Ürünler</h2>
              <p className="text-sm text-muted-foreground mt-1">İlk 5 ürünün gelir analizi</p>
            </div>
            {loading ? (
              <div className="h-64 bg-muted/20 rounded-lg animate-pulse" />
            ) : topProductsData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Henüz ürün verisi yok
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProductsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Gelir') return formatCurrency(value);
                      return `${value} adet`;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="gelir" fill="#8b5cf6" name="Gelir" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Product Summary Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Ürün Bazlı Analiz</h2>
            <p className="text-sm text-muted-foreground mt-1">Hangi üründen kaç adet satıldı ve ne kadar gelir elde edildi</p>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/20 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ürün Adı
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sipariş Edilen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Üretilen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Filament (kg)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Toplam Gelir
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sipariş Sayısı
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {productSummaries.map((product, index) => (
                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {product.product_name.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium text-foreground">{product.product_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-foreground">{product.total_quantity} adet</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-blue-600 dark:text-blue-400">{product.total_produced} adet</p>
                        {product.total_produced > product.total_quantity && (
                          <p className="text-xs text-muted-foreground">
                            +{product.total_produced - product.total_quantity} fazla
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-violet-600 dark:text-violet-400">{product.total_filament_kg.toFixed(2)} kg</p>
                        {product.total_produced > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {(product.total_filament_kg / product.total_produced).toFixed(3)} kg/adet
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(product.total_revenue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.total_revenue / product.total_produced)}/adet
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-sm font-medium rounded-full">
                          {product.order_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Son Siparişler</h2>
            <p className="text-sm text-muted-foreground mt-1">En son eklenen 5 sipariş</p>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/20 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentOrders.map((order) => (
                <button
                  key={order.order_id}
                  onClick={() => router.push(`/dashboard/orders/${order.buyer_id}`)}
                  className="w-full p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                      {order.buyer_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{order.buyer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.order_date)} · {order.total_items} ürün
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-foreground">{formatCurrency(order.total_amount)}</p>
                      {order.remaining > 0 ? (
                        <span className="text-xs text-red-500 font-medium">Bekliyor</span>
                      ) : (
                        <span className="text-xs text-emerald-500 font-medium">Ödendi</span>
                      )}
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buyers List */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Tüm Alıcılar</h2>
            <p className="text-sm text-muted-foreground mt-1">Detaylı alıcı listesi ve sipariş geçmişi</p>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {buyerSummaries.map((buyer) => (
                <div key={buyer.buyer_id} className="hover:bg-muted/30 transition-colors">
                  {/* Buyer Row */}
                  <button
                    onClick={() => setExpandedBuyer(expandedBuyer === buyer.buyer_id ? null : buyer.buyer_id)}
                    className="w-full p-6 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {buyer.buyer_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{buyer.buyer_name}</h3>
                        <p className="text-sm text-muted-foreground">{buyer.total_orders} sipariş</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right hidden lg:block">
                        <p className="text-xs text-muted-foreground">Ciro</p>
                        <p className="font-semibold text-foreground">{formatCurrency(buyer.total_amount)}</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-muted-foreground">Tahsilat</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(buyer.total_paid)}</p>
                      </div>
                      <div className="text-right hidden xl:block">
                        <p className="text-xs text-muted-foreground">Filament</p>
                        <p className="font-semibold text-violet-600 dark:text-violet-400">{buyer.total_filament_kg.toFixed(2)} kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Kalan</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(buyer.total_remaining)}</p>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                          expandedBuyer === buyer.buyer_id ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded Orders */}
                  {expandedBuyer === buyer.buyer_id && (
                    <div className="px-6 pb-6 bg-muted/20">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground mb-3">Sipariş Geçmişi</p>
                        {buyer.orders.map((order) => (
                          <button
                            key={order.order_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/orders/${buyer.buyer_id}`);
                            }}
                            className="w-full bg-card rounded-lg border border-border p-4 hover:border-blue-500/50 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-foreground">{formatDate(order.order_date)}</p>
                                  {order.remaining === 0 && (
                                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded">
                                      Ödendi
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {order.total_items} ürün · {order.total_quantity} adet
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-foreground text-lg">{formatCurrency(order.total_amount)}</p>
                                {order.remaining > 0 && (
                                  <p className="text-sm text-red-500 font-medium">Kalan: {formatCurrency(order.remaining)}</p>
                                )}
                              </div>
                              <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
