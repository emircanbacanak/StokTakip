"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Truck,
  User,
  MapPin,
  Calendar,
  CheckCircle,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { N11ShipmentPackage } from "@/lib/n11-api-client";

export function N11OrdersClient() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<N11ShipmentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalElements, setTotalElements] = useState(0);
  const [approvingLineId, setApprovingLineId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("orderNumber", search.trim());
      query.set("size", "50");

      const res = await fetch(`/api/n11/orders?${query.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setOrders(data.orders || []);
      setTotalElements(data.totalElements || 0);
    } catch (err: any) {
      toast({
        title: "N11 Sipariş Hatası",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApproveOrder = async (lineId: number) => {
    setApprovingLineId(lineId);
    try {
      const res = await fetch("/api/n11/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: [{ lineId }],
          status: "Picking",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Sipariş Onaylandı",
        description: `Ürün satırı (${lineId}) Hazırlanıyor (Picking) statüsüne alındı.`,
      });
      fetchOrders();
    } catch (err: any) {
      toast({ title: "Onaylama Hatası", description: err.message, variant: "destructive" });
    } finally {
      setApprovingLineId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-4 rounded-xl border">
        <div className="flex items-center gap-2 flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
          <Input
            placeholder="Sipariş numarası ile sorgula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold">
            {totalElements} n11 Siparişi
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
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">N11 siparişleri sorgulanıyor...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-xl border text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40 text-blue-500" />
          <p className="font-semibold text-foreground">Henüz sipariş bulunmuyor</p>
          <p className="text-xs mt-1">N11 mağazanıza yeni bir sipariş geldiğinde burada görüntülenecektir.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            return (
              <Card key={order.id || order.orderNumber} className="bg-card hover:border-blue-500/40 transition-all">
                <CardContent className="p-4 space-y-3">
                  {/* Order Head */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        #{order.orderNumber}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Paket: {order.id}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs font-semibold"
                      >
                        {order.shipmentPackageStatus || order.status || "Aktif"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {order.totalAmount !== undefined && (
                        <span className="font-bold text-sm text-foreground">
                          {order.totalAmount.toFixed(2)} TL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer and Shipping Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-lg">
                      <User className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">
                          {order.customerfullName || "Müşteri Adı Belirtilmemiş"}
                        </div>
                        {order.customerEmail && <div>{order.customerEmail}</div>}
                        {order.tcIdentityNumber && <div>TC: {order.tcIdentityNumber}</div>}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-lg">
                      <Truck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">
                          {order.cargoProviderName || "Kargo Sağlayıcısı"}
                        </div>
                        {order.cargoTrackingNumber && (
                          <div className="font-mono text-[11px]">
                            Takip: {order.cargoTrackingNumber}
                          </div>
                        )}
                        {order.shippingAddress && (
                          <div className="line-clamp-1">
                            {order.shippingAddress.district} / {order.shippingAddress.city}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  {order.lines && order.lines.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {order.lines.map((line) => (
                        <div
                          key={line.orderLineId}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-muted"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="font-medium text-foreground line-clamp-1">
                              {line.productName}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              SKU: {line.stockCode} | Adet: {line.quantity}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right font-bold text-foreground">
                              {line.price} TL
                            </div>
                            {line.orderItemLineItemStatusName === "Created" && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                onClick={() => handleApproveOrder(line.orderLineId)}
                                disabled={approvingLineId === line.orderLineId}
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                Onayla (Picking)
                              </Button>
                            )}
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
