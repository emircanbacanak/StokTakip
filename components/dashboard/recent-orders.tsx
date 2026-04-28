"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types/database";

interface RecentOrder {
  id: string; created_at: string; total_amount: number;
  status: OrderStatus; buyer: { name: string };
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  in_production: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  delivered: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export function RecentOrders() {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sb; try { sb = createClient(); } catch { setLoading(false); return; }
    sb.from("orders")
      .select("id, created_at, total_amount, status, buyer:buyers(name)")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setOrders(data as unknown as RecentOrder[]); setLoading(false); });
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-sm text-foreground">Son Siparişler</h2>
        <Link href="/dashboard/orders" className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium hover:gap-2 transition-all">
          Tümü <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex gap-3 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-2.5 bg-muted rounded w-1/3" />
              </div>
              <div className="w-16 h-3 bg-muted rounded" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Henüz sipariş yok</p>
        ) : (
          orders.map((o, i) => (
            <div key={o.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{o.buyer.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-sm font-semibold text-foreground">{formatCurrency(o.total_amount)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[o.status]}`}>
                  {ORDER_STATUS_LABELS[o.status]}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
