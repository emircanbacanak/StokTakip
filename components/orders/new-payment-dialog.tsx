"use client";

import { useState } from "react";
import { X, CreditCard, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/types/database";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  total_amount: number;
  paid_amount: number;
  buyer: { name: string };
  items: Array<{
    id: string;
    quantity: number;
    delivered_quantity: number;
    produced_quantity: number;
    unit_price: number;
  }>;
}

export function NewPaymentDialog({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const remainingDebt = Math.max(0, order.total_amount - order.paid_amount);
  const amountNum = parseFloat(amount) || 0;
  const willOverpay = amountNum > remainingDebt && remainingDebt > 0;
  const overpayAmount = amountNum - remainingDebt;

  // Teslim edilen ürünlerin toplam değeri (fazla üretim dahil)
  const deliveredValue = order.items.reduce((sum, item) => {
    const deliveredQty = item.delivered_quantity || 0;
    const baseValue = deliveredQty * item.unit_price;
    
    // Fazla üretim değeri
    const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
    const overValue = overProduced * item.unit_price;
    
    return sum + baseValue + overValue;
  }, 0);

  // Teslim edilen ürünler için alınması gereken ödeme
  const expectedPaymentForDelivered = deliveredValue;
  
  // Teslimatlardan kalan borç = Teslim edilen değer - Alınan ödeme
  const deliveryDebt = Math.max(0, expectedPaymentForDelivered - order.paid_amount);
  
  // Fazla üretim toplam değeri
  const totalOverProductionValue = order.items.reduce((sum, item) => {
    const overProduced = Math.max(0, (item.produced_quantity || 0) - item.quantity);
    return sum + (overProduced * item.unit_price);
  }, 0);
  
  // Gerçek toplam tutar (sipariş + fazla üretim)
  const actualTotalAmount = order.total_amount + totalOverProductionValue;
  const actualRemainingDebt = Math.max(0, actualTotalAmount - order.paid_amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amountNum <= 0) {
      toast({ title: "Geçerli bir tutar girin", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const sb = createClient();

      const { error } = await sb.from("payments").insert({
        order_id: order.id,
        amount: amountNum,
        payment_method: paymentMethod,
        notes: notes || null,
      });

      if (error) throw error;

      toast({ title: "Ödeme kaydedildi ✓" });
      onSuccess();
    } catch (error) {
      console.error("Payment error:", error);
      toast({ title: "Hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col border border-border shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Ödeme Ekle</h2>
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
            {/* Teslim Edilen Ürünler Özeti */}
            {deliveredValue > 0 && (
              <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    Teslim Edilen Ürünler
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Teslim Edilen Değer</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(deliveredValue)}</span>
                  </div>
                  
                  {totalOverProductionValue > 0 && (
                    <div className="flex justify-between items-center text-xs pl-3">
                      <span className="text-muted-foreground">• Fazla Üretim Dahil</span>
                      <span className="font-semibold text-amber-600">{formatCurrency(totalOverProductionValue)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Alınan Ödeme</span>
                    <span className="text-base font-bold text-emerald-600">-{formatCurrency(order.paid_amount)}</span>
                  </div>
                  
                  <div className="h-px bg-blue-500/20 my-2" />
                  
                  {deliveryDebt > 0 ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">Teslimatlardan Kalan</span>
                      <span className="text-lg font-bold text-emerald-600">{formatCurrency(deliveryDebt)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">Teslimatlar</span>
                      <span className="text-lg font-bold text-emerald-600">✓ Ödendi</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Genel Özet */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sipariş Tutarı</span>
                  <span className="text-base font-semibold text-foreground">{formatCurrency(order.total_amount)}</span>
                </div>
                
                {totalOverProductionValue > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Fazla Üretim</span>
                    <span className="text-base font-semibold text-amber-600">+{formatCurrency(totalOverProductionValue)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Toplam Tutar</span>
                  <span className="text-lg font-bold text-foreground">{formatCurrency(actualTotalAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ödenen</span>
                  <span className="text-base font-bold text-emerald-600">-{formatCurrency(order.paid_amount)}</span>
                </div>
                
                <div className="h-px bg-border my-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-foreground">
                    {order.paid_amount > actualTotalAmount ? "Fazla Ödeme" : "Kalan Borç"}
                  </span>
                  <span className={`text-xl font-bold ${
                    order.paid_amount > actualTotalAmount 
                      ? "text-red-500" 
                      : actualRemainingDebt > 0 
                        ? "text-emerald-600" 
                        : "text-emerald-600"
                  }`}>
                    {order.paid_amount > actualTotalAmount 
                      ? `-${formatCurrency(order.paid_amount - actualTotalAmount)}`
                      : formatCurrency(actualRemainingDebt)
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Fazla Ödeme Uyarısı */}
            {order.paid_amount > actualTotalAmount && (
              <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-600">Zaten Fazla Ödeme Var</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bu sipariş için {formatCurrency(order.paid_amount - actualTotalAmount)} fazla ödeme alınmış.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Ödeme Tutarı
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-border bg-background text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                  TL
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setAmount(Math.max(0, deliveryDebt).toFixed(2))}
                  disabled={deliveryDebt <= 0}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs font-semibold text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Teslimat Borcu
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(Math.max(0, actualRemainingDebt).toFixed(2))}
                  disabled={actualRemainingDebt <= 0}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs font-semibold text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Kalan Tümü
                </button>
              </div>
            </div>

            {/* Overpayment Warning */}
            {willOverpay && actualRemainingDebt > 0 && (
              <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-600">Fazla Ödeme Uyarısı</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kalan borçtan {formatCurrency(amountNum - actualRemainingDebt)} fazla ödeme alınacak.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Ödeme Yöntemi
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      paymentMethod === method.value
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
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
                placeholder="Ödeme hakkında not ekleyin..."
                className="w-full h-20 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border space-y-2">
            <button
              type="submit"
              disabled={loading || amountNum <= 0}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Kaydediliyor..." : `${formatCurrency(amountNum)} Ödeme Al`}
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
