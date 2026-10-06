"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Truck,
  User,
  PackageCheck,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { TrendruumOrder } from "@/lib/trendruum-api-client";

export function TrendruumOrdersClient() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<TrendruumOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trendruum/orders?limit=50");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setOrders(data.orders || []);
      setTotal(data.total || data.orders?.length || 0);
    } catch (err: any) {
      toast({
        title: "Trendruum Sipariş Hatası",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.cargo_tracking_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-4 rounded-xl border">
        <div className="flex items-center gap-2 flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
          <Input
            placeholder="Sipariş no veya müşteri ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold">
            {total} Trendruum Siparişi
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm font-medium">Trendruum siparişleri yükleniyor...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-xl border text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40 text-purple-500" />
          <p className="font-semibold text-foreground">Henüz sipariş bulunmuyor</p>
          <p className="text-xs mt-1">Trendruum mağazanıza yeni bir sipariş geldiğinde burada listelenecektir.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            return (
              <Card key={String(order.id || order.order_number)} className="bg-card hover:border-purple-500/40 transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        #{order.order_number}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs font-semibold"
                      >
                        {order.status || "Aktif"}
                      </Badge>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {order.total_amount?.toFixed(2)} TL
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-lg">
                      <User className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">
                          {order.customer_name || "Müşteri Adı"}
                        </div>
                        {order.customer_email && <div>{order.customer_email}</div>}
                        {order.customer_phone && <div>Tel: {order.customer_phone}</div>}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-lg">
                      <Truck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">
                          {order.cargo_provider || "Kargo"}
                        </div>
                        {order.cargo_tracking_number && (
                          <div className="font-mono text-[11px]">
                            Takip No: {order.cargo_tracking_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {order.items.map((item) => (
                        <div
                          key={String(item.id || item.barcode)}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-muted"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="font-medium text-foreground line-clamp-1">
                              {item.product_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              Barkod: {item.barcode} | Adet: {item.quantity}
                            </div>
                          </div>
                          <div className="text-right font-bold text-foreground">
                            {item.price} TL
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
