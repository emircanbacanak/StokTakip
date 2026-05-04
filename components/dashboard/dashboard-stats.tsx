"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Factory, CheckCircle, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface Stats { totalOrders: number; inProduction: number; completed: number; totalDebt: number }

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, inProduction: 0, completed: 0, totalDebt: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let sb; try { sb = createClient(); } catch { setLoading(false); return; }
      const { data: ordersData } = await sb
        .from("orders")
        .select("status, total_amount, paid_amount, items:order_items(quantity, produced_quantity, unit_price)");
      
      if (ordersData) {
        // Fazla üretim dahil toplam borç hesapla
        const totalDebt = ordersData.reduce((sum, order) => {
          // Fazla üretim değeri
          const overProductionValue = (order.items || []).reduce((itemSum: number, item: any) => {
            const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
            return itemSum + (overProduced * (item.unit_price || 0));
          }, 0);
          
          // Gerçek toplam = sipariş tutarı + fazla üretim
          const actualTotal = order.total_amount + overProductionValue;
          return sum + (actualTotal - order.paid_amount);
        }, 0);
        
        setStats({
          totalOrders: ordersData.length,
          inProduction: ordersData.filter((o) => o.status === "in_production").length,
          completed: ordersData.filter((o) => o.status === "completed" || o.status === "delivered").length,
          totalDebt,
        });
      }
      setLoading(false);
    }
    
    load();
    
    // Supabase Realtime subscription - orders ve order_items değişikliklerini dinle
    const sb = createClient();
    const ordersChannel = sb
      .channel('dashboard-orders-changes')
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
      .channel('dashboard-items-changes')
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

  const cards = [
    {
      label: "Toplam Sipariş", value: stats.totalOrders.toString(),
      icon: ShoppingCart, gradient: "from-blue-500 to-blue-600",
      bg: "from-blue-500/10 to-blue-600/5", text: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Üretimde", value: stats.inProduction.toString(),
      icon: Factory, gradient: "from-orange-500 to-amber-500",
      bg: "from-orange-500/10 to-amber-500/5", text: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Tamamlanan", value: stats.completed.toString(),
      icon: CheckCircle, gradient: "from-emerald-500 to-green-500",
      bg: "from-emerald-500/10 to-green-500/5", text: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Tahsilat", value: formatCurrency(stats.totalDebt),
      icon: TrendingUp, gradient: "from-violet-500 to-purple-600",
      bg: "from-violet-500/10 to-purple-600/5", text: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} border border-border p-4`}>
            {/* Decorative circle */}
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${c.gradient} opacity-10`} />
            <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${c.gradient} shadow-lg mb-3`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className={`text-xl font-bold ${c.text} ${loading ? "opacity-30" : ""}`}>
              {loading ? "—" : c.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{c.label}</p>
          </div>
        );
      })}
    </div>
  );
}
