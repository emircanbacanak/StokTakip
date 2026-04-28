"use client";

import { useState } from "react";
import { X, Truck, AlertCircle } from "lucide-react";
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
        quantity: item.quantity - (item.delivered_quantity || 0), // Varsayılan: kalan tümü
        max_quantity: item.quantity - (item.delivered_quantity || 0),
      }))
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const updateQuantity = (itemId: string, quantity: number) => {
    setDeliveryItems((prev) =>
      prev.map((item) =>
        item.order_item_id === itemId
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.max_quantity)) }
          : item
      )
    );
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
  const totalValue = deliveryItems.reduce((sum, item) => {
    const orderItem = order.items.find((oi) => oi.id === item.order_item_id);
    return sum + (orderItem ? item.quantity * orderItem.unit_price : 0);
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
            </div>

            {/* Ürünler */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Teslim Edilecek Ürünler
              </p>
              <div className="space-y-2">
                {order.items.map((item) => {
                  const remaining = item.quantity - (item.delivered_quantity || 0);
                  if (remaining <= 0) return null;

                  const deliveryItem = deliveryItems.find((di) => di.order_item_id === item.id);
                  const currentQty = deliveryItem?.quantity || 0;

                  return (
                    <div key={item.id} className="bg-muted/50 rounded-xl p-3 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-foreground">{item.product_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <ColorBadge color={item.color} />
                            <span className="text-xs text-muted-foreground">
                              {remaining} adet kaldı · {formatCurrency(item.unit_price)}/adet
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Input */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, currentQty - 1)}
                          className="w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted transition-colors flex items-center justify-center font-bold text-foreground"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={currentQty}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="flex-1 h-8 px-3 rounded-lg border border-border bg-background text-center font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, currentQty + 1)}
                          className="w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted transition-colors flex items-center justify-center font-bold text-foreground"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, remaining)}
                          className="px-3 h-8 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs font-semibold text-foreground"
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
