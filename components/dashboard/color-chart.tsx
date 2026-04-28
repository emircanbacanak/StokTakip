"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";

const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#f97316","#6366f1"];

export function ColorChart() {
  const [data, setData] = useState<{ color: string; adet: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { resolved } = useTheme();

  useEffect(() => {
    let sb; try { sb = createClient(); } catch { setLoading(false); return; }
    sb.from("order_items").select("color, quantity").then(({ data: items }) => {
      if (items) {
        const rows = items as { color: string; quantity: number }[];
        const map: Record<string, number> = {};
        rows.forEach((i) => { map[i.color] = (map[i.color] || 0) + i.quantity; });
        setData(Object.entries(map).map(([color, adet]) => ({ color, adet })).sort((a, b) => b.adet - a.adet).slice(0, 7));
      }
      setLoading(false);
    });
  }, []);

  const gridColor = resolved === "dark" ? "#1e293b" : "#f1f5f9";
  const textColor = resolved === "dark" ? "#64748b" : "#94a3b8";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-sm text-foreground">Renk Bazlı Sipariş</h2>
        <p className="text-xs text-muted-foreground mt-0.5">En çok sipariş edilen renkler</p>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="h-44 flex items-center justify-center">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 bg-muted rounded-t animate-pulse" style={{ height: `${40 + i * 15}px` }} />
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
        ) : (
          <ResponsiveContainer width="100%" height={176}>
            <BarChart data={data} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="color" tick={{ fontSize: 10, fill: textColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: textColor }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: resolved === "dark" ? "#0f172a" : "#fff",
                  border: `1px solid ${resolved === "dark" ? "#1e293b" : "#e2e8f0"}`,
                  borderRadius: 12, fontSize: 12,
                }}
                cursor={{ fill: resolved === "dark" ? "#1e293b" : "#f8fafc" }}
              />
              <Bar dataKey="adet" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
