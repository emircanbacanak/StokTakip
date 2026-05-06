"use client";

import { useState, useEffect } from "react";
import { X, Truck, Save, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { type OrderItem, type Delivery, type DeliveryItem } from "@/lib/types/database";
import { useToast } from "@/hooks/use-toast";
import { ColorBadge } from "@/components/ui/color-badge";

interface Order {
  id: string;
  buyer: { name: string };
  items: OrderItem[];
}

type DeliveryWithItems = Delivery & {
  items: (DeliveryItem & { order_item: OrderItem })[];
};

interface EditDeliveryItemInput {
  id?: string;
  order_item_id: string;
  quantity: number;
  max_quantity: number;
  product_name: string;
  color: string;
  unit_price: number;
  isDeleted?: boolean;
}

export function EditDeliveryDialog({
  order,
  delivery,
  onClose,
  onSuccess,
}: {
  order: Order;
  delivery: DeliveryWithItems;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [deliveryDate, setDeliveryDate] = useState(delivery.delivery_date);
  const [notes, setNotes] = useState(delivery.notes || "");
  const [loading, setLoading] = useState(false);
  
  // Mevcut teslimat kalemlerini dönüştür
  const [deliveryItems, setDeliveryItems] = useState<EditDeliveryItemInput[]>(() => {
    return delivery.items.map((item) => {
      // Bu teslimat içindeki miktar + henüz teslim edilmemiş miktar = max
      const alreadyDelivered = item.order_item.delivered_quantity || 0;
      const currentDeliveryQty = item.quantity; // Bu teslimat içindeki miktar
      const totalOrdered = item.order_item.quantity;
      const otherDeliveries = alreadyDelivered - currentDeliveryQty; // Diğer teslimatlar
      const remaining = totalOrdered - otherDeliveries; // Bu teslimat için max
      
      return {
        id: item.id,
        order_item_id: item.order_item_id,
        quantity: item.quantity,
        max_quantity: remaining, // Sipariş miktarı - diğer teslimatlar
        product_name: item.order_item.product_name,
        color: item.order_item.color,
        unit_price: item.order_item.unit_price,
        isDeleted: false,
      };
    });
  });

  // Eklenebilecek yeni ürünler (henüz bu teslimat içinde olmayan)
  const [availableItems, setAvailableItems] = useState<EditDeliveryItemInput[]>([]);

  useEffect(() => {
    // Siparişteki tüm ürünlerden, bu teslimat içinde olmayanları bul
    const currentItemIds = new Set(deliveryItems.map(di => di.order_item_id));
    const available = order.items
      .filter(item => {
        // Bu teslimat içinde değil VE teslim edilebilir miktarı var
        if (currentItemIds.has(item.id)) return false;
        const producedQty = item.produced_quantity || 0;
        const alreadyDelivered = item.delivered_quantity || 0;
        return producedQty > alreadyDelivered;
      })
      .map(item => {
        const producedQty = item.produced_quantity || 0;
        const alreadyDelivered = item.delivered_quantity || 0;
        return {
          order_item_id: item.id,
          quantity: 0,
          max_quantity: producedQty - alreadyDelivered,
          product_name: item.product_name,
          color: item.color,
          unit_price: item.unit_price,
          isDeleted: false,
        };
      });
    setAvailableItems(available);
  }, [order.items, deliveryItems]);

  const updateQuantity = (itemId: string, quantity: number) => {
    setDeliveryItems((prev) =>
      prev.map((item) =>
        item.order_item_id === itemId
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.max_quantity)) }
          : item
      )
    );
  };

  const toggleDelete = (itemId: string) => {
    setDeliveryItems((prev) =>
      prev.map((item) =>
        item.order_item_id === itemId
          ? { ...item, isDeleted: !item.isDeleted }
          : item
      )
    );
  };

  const addNewItem = (orderItemId: string) => {
    const availableItem = availableItems.find(ai => ai.order_item_id === orderItemId);
    if (!availableItem) return;

    // Available items'dan kaldır ve delivery items'a ekle
    setAvailableItems(prev => prev.filter(ai => ai.order_item_id !== orderItemId));
    setDeliveryItems(prev => [...prev, { ...availableItem, quantity: 1 }]);
  };

  const removeNewItem = (orderItemId: string) => {
    const item = deliveryItems.find(di => di.order_item_id === orderItemId && !di.id);
    if (!item) return;

    // Delivery items'dan kaldır ve available items'a geri ekle
    setDeliveryItems(prev => prev.filter(di => di.order_item_id !== orderItemId));
    setAvailableItems(prev => [...prev, { ...item, quantity: 0 }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeItems = deliveryItems.filter(item => !item.isDeleted && item.quantity > 0);
    
    if (activeItems.length === 0) {
      toast({ 
        title: "En az bir ürün olmalı", 
        description: "Teslimat en az bir ürün içermelidir",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const sb = createClient();

      // 1. Teslimat bilgilerini güncelle
      const { error: deliveryError } = await sb
        .from("deliveries")
        .update({
          delivery_date: deliveryDate,
          notes: notes || null,
        })
        .eq("id", delivery.id);

      if (deliveryError) throw deliveryError;

      // 2. Silinmek üzere işaretlenen kalemleri sil
      const itemsToDelete = deliveryItems.filter(item => item.id && item.isDeleted);
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await sb
          .from("delivery_items")
          .delete()
          .in("id", itemsToDelete.map(i => i.id!));
        
        if (deleteError) throw deleteError;
      }

      // 3. Mevcut kalemleri güncelle
      const itemsToUpdate = deliveryItems.filter(item => item.id && !item.isDeleted);
      for (const item of itemsToUpdate) {
        const { error: updateError } = await sb
          .from("delivery_items")
          .update({ quantity: item.quantity })
          .eq("id", item.id!);
        
        if (updateError) throw updateError;
      }

      // 4. Yeni kalemleri ekle
      const itemsToInsert = deliveryItems.filter(item => !item.id && !item.isDeleted && item.quantity > 0);
      if (itemsToInsert.length > 0) {
        const { error: insertError } = await sb
          .from("delivery_items")
          .insert(
            itemsToInsert.map(item => ({
              delivery_id: delivery.id,
              order_item_id: item.order_item_id,
              quantity: item.quantity,
            }))
          );
        
        if (insertError) throw insertError;
      }

      toast({ title: "Teslimat güncellendi ✓" });
      onSuccess();
    } catch (error: any) {
      console.error("Edit delivery error:", error);
      toast({ 
        title: "Hata oluştu", 
        description: error?.message || "Teslimat güncellenemedi",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const activeItems = deliveryItems.filter(item => !item.isDeleted);
  const totalDelivering = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = activeItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // Ürünleri grupla
  const groupedItems = new Map<string, EditDeliveryItemInput[]>();
  activeItems.forEach((item) => {
    if (!groupedItems.has(item.product_name)) {
      groupedItems.set(item.product_name, []);
    }
    groupedItems.get(item.product_name)!.push(item);
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col border border-border shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Teslimatı Düzenle</h2>
              <p className="text-xs text-muted-foreground">{order.buyer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Content */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Özet Kartı */}
            <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Teslimat Özeti
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Toplam Adet</p>
                  <p className="text-2xl font-bold text-foreground">{totalDelivering}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Toplam Değer</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </div>

            {/* Teslimat Tarihi */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Teslimat Tarihi
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Teslim Edilen Ürünler */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                Teslim Edilen Ürünler
              </label>
              <div className="space-y-3">
                {Array.from(groupedItems.entries()).map(([productName, items]) => {
                  const productTotal = items.reduce((sum, i) => sum + i.quantity, 0);
                  
                  return (
                    <div key={productName}>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <p className="text-sm font-bold text-foreground">{productName}</p>
                        <span className="text-xs font-bold text-muted-foreground">{productTotal} adet</span>
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div 
                            key={item.order_item_id} 
                            className={`bg-muted/30 rounded-xl p-3 border transition-all ${
                              item.isDeleted 
                                ? 'border-red-500/30 opacity-40' 
                                : 'border-border hover:border-border/60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <ColorBadge color={item.color} />
                                <span className="text-xs text-muted-foreground">
                                  Max: {item.max_quantity} adet
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => item.id ? toggleDelete(item.order_item_id) : removeNewItem(item.order_item_id)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  item.isDeleted 
                                    ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-semibold px-3' 
                                    : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
                                }`}
                              >
                                {item.isDeleted ? (
                                  "Geri Al"
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            {!item.isDeleted && (
                              <>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.order_item_id, item.quantity - 1)}
                                    disabled={item.quantity <= 0}
                                    className="w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center font-bold text-foreground"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      updateQuantity(item.order_item_id, value);
                                    }}
                                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-center font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.order_item_id, item.quantity + 1)}
                                    disabled={item.quantity >= item.max_quantity}
                                    className="w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center font-bold text-foreground"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.order_item_id, item.max_quantity)}
                                    className="px-3 h-9 rounded-lg border border-border bg-background hover:bg-muted transition-all text-xs font-bold text-foreground"
                                  >
                                    Max
                                  </button>
                                </div>

                                {item.quantity > 0 && (
                                  <p className="text-xs text-emerald-600 font-semibold mt-2">
                                    Değer: {formatCurrency(item.quantity * item.unit_price)}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Eklenebilecek Ürünler */}
            {availableItems.length > 0 && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                  Eklenebilecek Ürünler
                </label>
                <div className="space-y-2">
                  {availableItems.map((item) => (
                    <button
                      key={item.order_item_id}
                      type="button"
                      onClick={() => addNewItem(item.order_item_id)}
                      className="w-full bg-muted/20 hover:bg-muted/40 rounded-xl p-3 border border-dashed border-border hover:border-blue-500/50 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <ColorBadge color={item.color} />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">{item.color} · {item.max_quantity} adet mevcut</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-600 group-hover:text-blue-500">
                          <Plus className="w-4 h-4" />
                          <span className="text-xs font-bold">Ekle</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Not */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Not (Opsiyonel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Teslimat hakkında not ekleyin..."
                className="w-full h-24 px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border space-y-2">
            <button
              type="submit"
              disabled={loading || totalDelivering === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full border border-border text-foreground font-semibold py-3 rounded-xl hover:bg-muted transition-all"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
