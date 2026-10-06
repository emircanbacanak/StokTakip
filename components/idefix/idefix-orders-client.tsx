"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Truck,
  User,
  PackageCheck,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { IdefixOrder } from "@/lib/idefix-api-client";

export function IdefixOrdersClient() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<IdefixOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/idefix/orders?limit=50");
      const data = await res.json();
      if (!data.success) {
        if (data.error?.includes("VENDOR_SECRET_NOT_CORRECT") || data.error?.includes("VENDOR_TOKEN")) {
          setAuthError("Idefix API Secret Anahtarı henüz tanımlanmamış. Idefix Satıcı Paneli'nden oluşturulan Secret Key gereklidir.");
        }
        throw new Error(data.error);
      }

      setOrders(data.orders || []);
      setTotalCount(data.totalCount || data.orders?.length || 0);
    } catch (err: any) {
      toast({
        title: "Idefix Sipariş Hatası",
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
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerContactName?.toLowerCase().includes(q) ||
      o.cargoTrackingNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {authError && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <KeyRound className="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-sm">Idefix API Secret Gerekli</p>
            <p>{authError}</p>
          </div>
        </div>
      )}

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
            {totalCount} Idefix Siparişi
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
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-medium">Idefix siparişleri sorgulanıyor...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-xl border text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40 text-orange-500" />
          <p className="font-semibold text-foreground">Sipariş bulunmuyor</p>
          <p className="text-xs mt-1">
            {authError
              ? "API Secret tanımlandıktan sonra siparişleriniz burada listelenecektir."
              : "Idefix mağazanıza yeni bir sipariş geldiğinde burada görüntülenecektir."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            return (
              <Card key={String(order.id || order.orderNumber)} className="bg-card hover:border-orange-500/40 transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        #{order.orderNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs font-semibold"
                      >
                        {order.status || "Aktif"}
                      </Badge>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {order.totalPrice?.toFixed(2)} TL
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-lg">
                      <User className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">
                          {order.customerContactName || "Müşteri Adı"}
                        </div>
                        {order.customerContactMail && <div>{order.customerContactMail}</div>}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-lg">
                      <Truck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">
                          {order.cargoCompany || "Kargo"}
                        </div>
                        {order.cargoTrackingNumber && (
                          <div className="font-mono text-[11px]">
                            Takip No: {order.cargoTrackingNumber}
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
                              {item.productName}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              Barkod: {item.barcode}
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
