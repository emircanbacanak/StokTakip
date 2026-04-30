"use client";

import { useState } from "react";
import { X, Truck, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { type OrderItem } from "@/lib/types/database";
import { useToast } from "@/hooks/use-toast";
import { ColorBadge } from "@/components/ui/color-badge";

interface Order {
  id: string;
  buyer: { name: string };
  items: OrderItem[];
}

interface DeliveryItemInput {
  order_item_id: string;
  quantity: number;
  max_quantity: number;
}

export function NewDeliveryDialog({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItemInput[]>(
    order.items
      .filter((item) => (item.delivered_quantity || 0) < item.quantity)
      .map((item) => ({
        order_item_id: item.id,
        quantity: 0, // Başlangıçta 0, kullanıcı istediği kadarını girer
        max_quantity: item.quantity - (item.delivered_quantity || 0),
      }))
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [showProduced, setShowProduced] = useState(false);

  const updateQuantity = (itemId: string, quantity: number) => {
    setDeliveryItems((prev) =>
      prev.map((item) =>
        item.order_item_id === itemId
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.max_quantity)) }
          : item
      )
    );
  };

  const toggleGroup = (productName: string) => {
    setOpenGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productName)) {
        newSet.delete(productName);
      } else {
        newSet.add(productName);
      }
      return newSet;
    });
  };

  const fillProducedQuantities = () => {
    setDeliveryItems((prev) =>
      prev.map((item) => {
        const orderItem = order.items.find((oi) => oi.id === item.order_item_id);
        if (!orderItem) return item;
        const producedQty = orderItem.produced_quantity || 0;
        const alreadyDelivered = orderItem.delivered_quantity || 0;
        const availableToDeliver = Math.max(0, producedQty - alreadyDelivered);
        // Sadece üretilmiş kadarını doldur, fazlasını değil
        return { ...item, quantity: Math.min(availableToDeliver, item.max_quantity) };
      })
    );
    setShowProduced(false);
    toast({ 
      title: "Üretilmiş miktarlar dolduruldu", 
      description: "Sadece üretilmiş ürünler teslimat listesine eklendi" 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemsToDeliver = deliveryItems.filter((item) => item.quantity > 0);
    
    if (itemsToDeliver.length === 0) {
      toast({ title: "En az bir ürün seçmelisiniz", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const sb = createClient();

      // Create delivery
      const { data: delivery, error: deliveryError } = await sb
        .from("deliveries")
        .insert({
          order_id: order.id,
          notes: notes || null,
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Create delivery items
      const { error: itemsError } = await sb.from("delivery_items").insert(
        itemsToDeliver.map((item) => ({
          delivery_id: delivery.id,
          order_item_id: item.order_item_id,
          quantity: item.quantity,
        }))
      );

      if (itemsError) throw itemsError;

      toast({ title: "Teslimat kaydedildi ✓" });
      onSuccess();
    } catch (error) {
      console.error("Delivery error:", error);
      toast({ title: "Hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalDelivering = deliveryItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Teslimat değeri hesaplama (sadece teslim edilen miktar)
  const totalValue = deliveryItems.reduce((sum, item) => {
    const orderItem = order.items.find((oi) => oi.id === item.order_item_id);
    if (!orderItem) return sum;
    
    // Sadece teslim edilen miktar
    const deliveryValue = item.quantity * orderItem.unit_price;
    
    return sum + deliveryValue;
  }, 0);
  
  // Fazla üretim bilgisi (sadece gösterim için)
  const totalOverProduction = order.items.reduce((sum, item) => {
    const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
    return sum + overProduced;
  }, 0);
  
  const totalOverProductionValue = order.items.reduce((sum, item) => {
    const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
    return sum + (overProduced * item.unit_price);
  }, 0);

  // Ürünleri grupla
  const groupedItems = new Map<string, OrderItem[]>();
  order.items.forEach((item) => {
    const remaining = item.quantity - (item.delivered_quantity || 0);
    if (remaining <= 0) return;
    if (!groupedItems.has(item.product_name)) {
      groupedItems.set(item.product_name, []);
    }
    groupedItems.get(item.product_name)!.push(item);
  });

  // Üretilmiş ürünleri grupla
  const producedGrouped = new Map<string, OrderItem[]>();
  order.items.forEach((item) => {
    const producedQty = item.produced_quantity || 0;
    const alreadyDelivered = item.delivered_quantity || 0;
    const availableToDeliver = producedQty - alreadyDelivered;
    if (availableToDeliver <= 0) return;
    if (!producedGrouped.has(item.product_name)) {
      producedGrouped.set(item.product_name, []);
    }
    producedGrouped.get(item.product_name)!.push(item);
  });

  // Toplam üretilmiş adet (henüz teslim edilmemiş)
  const totalProducedAvailable = order.items.reduce((sum, item) => {
    const producedQty = item.produced_quantity || 0;
    const alreadyDelivered = item.delivered_quantity || 0;
    return sum + Math.max(0, producedQty - alreadyDelivered);
  }, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col border border-border shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Yeni Teslimat</h2>
              <p className="text-xs text-muted-foreground">{order.buyer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Content */}
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {/* Özet */}
            <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Teslimat Özeti
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Adet</p>
                  <p className="text-lg font-bold text-foreground">{totalDelivering}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Değer</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totalValue)}</p>
                </div>
              </div>
              
              {/* Fazla Üretim Bilgisi */}
              {totalOverProduction > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-600 font-semibold">Fazla Üretim</p>
                      <p className="text-[10px] text-muted-foreground">Otomatik fiyatlandırmaya dahil</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">+{totalOverProduction} adet</p>
                      <p className="text-xs text-amber-600">{formatCurrency(totalOverProductionValue)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Şu Ana Kadar Yapılanlar - Üretilmiş Ürünler */}
            <div>
              <button
                type="button"
                onClick={() => setShowProduced(!showProduced)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-semibold text-foreground flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Şu Ana Kadar Yapılanlar ({totalProducedAvailable} adet)
                {showProduced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showProduced && (
                <div className="mt-3 bg-blue-500/5 rounded-xl p-4 border border-blue-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                      Üretilmiş Ürünler
                    </p>
                    <button
                      type="button"
                      onClick={fillProducedQuantities}
                      className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                    >
                      Tümünü Doldur
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Array.from(producedGrouped.entries()).map(([productName, items]) => {
                      const totalProduced = items.reduce((sum, i) => {
                        const producedQty = i.produced_quantity || 0;
                        const alreadyDelivered = i.delivered_quantity || 0;
                        return sum + Math.max(0, producedQty - alreadyDelivered);
                      }, 0);

                      if (totalProduced === 0) return null;

                      return (
                        <div key={productName} className="bg-background rounded-lg p-3 border border-border">
                          <p className="font-semibold text-sm text-foreground mb-2">
                            {productName} ({totalProduced} adet)
                          </p>
                          <div className="space-y-1.5">
                            {items.map((item) => {
                              const producedQty = item.produced_quantity || 0;
                              const alreadyDelivered = item.delivered_quantity || 0;
                              const availableToDeliver = Math.max(0, producedQty - alreadyDelivered);
                              if (availableToDeliver <= 0) return null;

                              return (
                                <div key={item.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <ColorBadge color={item.color} size="sm" />
                                    <span className="text-muted-foreground">{availableToDeliver} adet hazır</span>
                                  </div>
                                  <span className="font-semibold text-foreground">
                                    {formatCurrency(availableToDeliver * item.unit_price)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Ürünler - Kategori Bazlı */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Teslim Edilecek Ürünler
              </p>
              <div className="space-y-2">
                {Array.from(groupedItems.entries()).map(([productName, items]) => {
                  const isOpen = openGroups.has(productName);
                  const totalRemaining = items.reduce((sum, i) => sum + (i.quantity - (i.delivered_quantity || 0)), 0);
                  const unitPrice = items[0]?.unit_price || 0;

                  return (
                    <div key={productName} className="bg-muted/50 rounded-xl border border-border overflow-hidden">
                      {/* Ürün Başlığı */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(productName)}
                        className="w-full px-3 py-3 flex items-center justify-between hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-sm text-foreground">{productName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex gap-1">
                              {items.map((i) => (
                                <ColorBadge key={i.id} color={i.color} size="sm" />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {totalRemaining} adet · {formatCurrency(unitPrice)}/adet
                            </span>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {/* Renkler */}
                      {isOpen && (
                        <div className="border-t border-border bg-background/50 p-3 space-y-2">
                          {items.map((item) => {
                            const remaining = item.quantity - (item.delivered_quantity || 0);
                            const deliveryItem = deliveryItems.find((di) => di.order_item_id === item.id);
                            const currentQty = deliveryItem?.quantity || 0;

                            return (
                              <div key={item.id} className="bg-muted/30 rounded-lg p-2.5 border border-border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <ColorBadge color={item.color} />
                                    <span className="text-xs text-muted-foreground">{remaining} adet kaldı</span>
                                  </div>
                                </div>

                                {/* Quantity Input */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, currentQty - 1)}
                                    className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted transition-colors flex items-center justify-center font-bold text-foreground text-sm"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={remaining}
                                    value={currentQty}
                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                                    className="flex-1 h-7 px-2 rounded-lg border border-border bg-background text-center font-semibold text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, currentQty + 1)}
                                    className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted transition-colors flex items-center justify-center font-bold text-foreground text-sm"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, remaining)}
                                    className="px-2.5 h-7 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs font-semibold text-foreground"
                                  >
                                    Tümü
                                  </button>
                                </div>

                                {currentQty > 0 && (
                                  <p className="text-xs text-emerald-600 mt-2">
                                    Değer: {formatCurrency(currentQty * item.unit_price)}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Not (Opsiyonel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Teslimat hakkında not ekleyin..."
                className="w-full h-20 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border space-y-2">
            <button
              type="submit"
              disabled={loading || totalDelivering === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Kaydediliyor..." : "Teslimatı Kaydet"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full border border-border text-foreground font-semibold py-3 rounded-xl text-sm hover:bg-muted transition-all"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
