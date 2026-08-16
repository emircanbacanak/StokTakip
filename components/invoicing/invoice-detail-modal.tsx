"use client";

import { X, Copy, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface InvoiceDetailModalProps {
  orderId: string;
  onClose: () => void;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  discount: number;
}

interface OrderDetail {
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  total_price: number;
  delivered_at: string;
  shipment_address: any;
  items: OrderItem[];
}

export function InvoiceDetailModal({ orderId, onClose }: InvoiceDetailModalProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const loadOrderDetail = async () => {
    try {
      const sb = createClient();
      
      // Sipariş bilgilerini çek
      const { data: orderData, error: orderError } = await sb
        .from("trendyol_orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Sipariş kalemlerini çek
      const { data: itemsData } = await sb
        .from("trendyol_order_items")
        .select("*")
        .eq("trendyol_order_id", orderId);

      setOrder({
        ...orderData,
        items: itemsData || [],
      });
      setLoading(false);
    } catch (error) {
      console.error("Sipariş detayı yüklenemedi:", error);
      toast({
        title: "Hata",
        description: "Sipariş detayı yüklenemedi",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card rounded-2xl p-8 max-w-2xl w-full">
          <p className="text-center text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const customerName = `${order.customer_first_name} ${order.customer_last_name}`.trim();
  
  // Teslimat Adresi
  const shipmentAddress = order.shipment_address;
  const shipmentFullName = shipmentAddress 
    ? `${shipmentAddress.firstName || ""} ${shipmentAddress.lastName || ""}`.trim()
    : customerName;
  
  // Tam adres oluştur
  const shipmentFullAddress = shipmentAddress 
    ? [
        shipmentAddress.address1,
        shipmentAddress.address2,
        shipmentAddress.neighborhood,
        shipmentAddress.district,
        shipmentAddress.city,
        shipmentAddress.postalCode
      ].filter(Boolean).join(", ")
    : "";

  // Fatura Adresi
  const invoiceAddress = (order as any).invoice_address || (order as any).billing_address;
  const invoiceFullName = invoiceAddress 
    ? `${invoiceAddress.firstName || ""} ${invoiceAddress.lastName || ""}`.trim()
    : customerName;
  
  // Tam adres oluştur
  const invoiceFullAddress = invoiceAddress 
    ? [
        invoiceAddress.address1,
        invoiceAddress.address2,
        invoiceAddress.neighborhood,
        invoiceAddress.district,
        invoiceAddress.city,
        invoiceAddress.postalCode
      ].filter(Boolean).join(", ")
    : "";

  // Kurumsal mı yoksa bireysel mi?
  const taxNumber = (order as any).invoice_address?.taxNumber || (order as any).tax_number || "";
  const isCorporate = !!taxNumber;
  const taxOffice = (order as any).invoice_address?.taxOffice || "";
  const companyName = (order as any).invoice_address?.company || "";

  // KDV hesaplamaları (%20)
  const VAT_RATE = 0.20;
  const totalWithVAT = order.total_price;
  const totalWithoutVAT = totalWithVAT / (1 + VAT_RATE);
  const vatAmount = totalWithVAT - totalWithoutVAT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">Fatura Bilgileri</h2>
              {isCorporate && (
                <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">🏢 Kurumsal Fatura</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Sipariş #{order.order_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Fatura Tipi */}
          {isCorporate && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏢</span>
                <div>
                  <p className="font-bold text-blue-700 dark:text-blue-300">Kurumsal Fatura</p>
                  <p className="text-sm text-muted-foreground">
                    Vergi No: <strong>{taxNumber}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Teslimat Adresi */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground mb-3">📦 Teslimat Adresi</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ad-Soyad:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{shipmentFullName}</span>
                  <button
                    onClick={() => copyToClipboard(shipmentFullName, "shipment-name")}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    {copied === "shipment-name" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {shipmentFullAddress && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground">Adres:</span>
                  <div className="flex items-start gap-2 max-w-md text-right">
                    <span className="font-medium text-sm">{shipmentFullAddress}</span>
                    <button
                      onClick={() => copyToClipboard(shipmentFullAddress, "shipment-address")}
                      className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                    >
                      {copied === "shipment-address" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fatura Adresi */}
          <div className={`rounded-xl p-4 space-y-3 ${isCorporate ? 'bg-blue-500/10 border-2 border-blue-500/30' : 'bg-muted/50'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">📄 Fatura Adresi</h3>
              {isCorporate && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold">
                  🏢 KURUMSAL
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ad-Soyad:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{invoiceFullName}</span>
                  <button
                    onClick={() => copyToClipboard(invoiceFullName, "invoice-name")}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    {copied === "invoice-name" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {companyName && (
                <div className="flex items-center justify-between bg-blue-500/10 p-2 rounded-lg">
                  <span className="text-sm text-muted-foreground">Firma Adı:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700 dark:text-blue-300">{companyName}</span>
                    <button
                      onClick={() => copyToClipboard(companyName, "company-name")}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      {copied === "company-name" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {invoiceFullAddress && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground">Adres:</span>
                  <div className="flex items-start gap-2 max-w-md text-right">
                    <span className="font-medium text-sm">{invoiceFullAddress}</span>
                    <button
                      onClick={() => copyToClipboard(invoiceFullAddress, "invoice-address")}
                      className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                    >
                      {copied === "invoice-address" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {isCorporate && (
                <>
                  <div className="flex items-center justify-between pt-2 border-t border-border bg-blue-500/10 p-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">VKN:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-700 dark:text-blue-300">{taxNumber}</span>
                      <button
                        onClick={() => copyToClipboard(taxNumber, "tax-number")}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        {copied === "tax-number" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {taxOffice && (
                    <div className="flex items-center justify-between bg-blue-500/10 p-2 rounded-lg">
                      <span className="text-sm text-muted-foreground">Vergi Dairesi:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-700 dark:text-blue-300">{taxOffice}</span>
                        <button
                          onClick={() => copyToClipboard(taxOffice, "tax-office")}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          {copied === "tax-office" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">E-Fatura Mükellefi:</span>
                <span className="font-medium">{isCorporate ? "Evet" : "Hayır"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teslimat Tarihi:</span>
                <span className="font-medium">{formatDate(order.delivered_at)}</span>
              </div>
            </div>
          </div>

          {/* Ürünler */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">🛍️ Ürünler ({order.items.length} kalem)</h3>
            <div className="space-y-2">
              {order.items.map((item, idx) => {
                const itemPriceWithVAT = item.price;
                const itemPriceWithoutVAT = itemPriceWithVAT / (1 + VAT_RATE);
                const itemTotal = itemPriceWithVAT * item.quantity;
                
                return (
                  <div key={idx} className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-lg">{item.product_name}</span>
                          <button
                            onClick={() => copyToClipboard(item.product_name, `product-${idx}`)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            {copied === `product-${idx}` ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {item.quantity} adet × {formatCurrency(itemPriceWithoutVAT)} (KDV Hariç)
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(itemTotal)}</p>
                        <p className="text-xs text-muted-foreground">KDV Dahil</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm pt-3 border-t border-border">
                      <div>
                        <p className="text-muted-foreground text-xs">Miktar</p>
                        <p className="font-medium">{item.quantity} adet</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Birim (KDV Hariç)</p>
                        <p className="font-medium text-blue-600">{formatCurrency(itemPriceWithoutVAT)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Birim (KDV Dahil)</p>
                        <p className="font-medium">{formatCurrency(itemPriceWithVAT)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toplam Tutar */}
          <div className="bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-xl p-6 space-y-3">
            <h3 className="font-semibold text-foreground mb-3">💰 Fatura Tutarları</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ara Toplam (KDV Hariç)</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600 text-lg">
                    {formatCurrency(totalWithoutVAT)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(totalWithoutVAT.toFixed(2), "total-without-vat")}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    {copied === "total-without-vat" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">KDV (%20)</span>
                <span className="font-medium">{formatCurrency(vatAmount)}</span>
              </div>

              <div className="h-px bg-border my-2" />

              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Genel Toplam (KDV Dahil)</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-xl">
                    {formatCurrency(totalWithVAT)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(totalWithVAT.toFixed(2), "total-with-vat")}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    {copied === "total-with-vat" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bilgilendirme */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>💡 Not:</strong> Faturaya girerken <strong>"KDV Hariç"</strong> fiyatı kullanın.
              Sistem otomatik olarak %20 KDV ekleyecektir.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-all"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
