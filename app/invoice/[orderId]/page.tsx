"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useParams, useSearchParams } from "next/navigation";

export default function InvoicePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const mode = searchParams.get("mode") || "all";
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          buyer:buyers(id, name),
          items:order_items(
            id,
            product_name,
            color,
            quantity,
            produced_quantity,
            delivered_quantity,
            unit_price
          )
        `)
        .eq("id", orderId)
        .single();

      if (error || !data) {
        console.error("Sipariş yüklenemedi:", error);
        setLoading(false);
        return;
      }

      setOrder(data);
      setLoading(false);
    }

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg">İrsaliye bulunamadı.</p>
      </div>
    );
  }

  // İrsaliye öğelerini hazırla
  let invoiceItems: Array<{
    product_name: string;
    color: string;
    quantity: number;
    unit_price: number;
    total: number;
  }> = [];

  if (mode === "all") {
    invoiceItems = order.items.map((item: any) => ({
      product_name: item.product_name,
      color: item.color,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));
  } else if (mode === "produced") {
    invoiceItems = order.items
      .map((item: any) => {
        const remainingProduced = (item.produced_quantity || 0) - (item.delivered_quantity || 0);
        if (remainingProduced <= 0) return null;
        
        return {
          product_name: item.product_name,
          color: item.color,
          quantity: remainingProduced,
          unit_price: item.unit_price,
          total: remainingProduced * item.unit_price,
        };
      })
      .filter((item: any): item is NonNullable<typeof item> => item !== null);
  }

  const totalAmount = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const totalQuantity = invoiceItems.reduce((sum, item) => sum + item.quantity, 0);

  // Ürün bazlı gruplama
  const groupedItems = invoiceItems.reduce((acc, item) => {
    if (!acc[item.product_name]) {
      acc[item.product_name] = [];
    }
    acc[item.product_name].push(item);
    return acc;
  }, {} as Record<string, typeof invoiceItems>);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white text-black p-8 rounded-lg shadow-lg">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-gray-300">
          <h1 className="text-4xl font-bold mb-4">İRSALİYE</h1>
          <div className="flex justify-between text-sm">
            <div>
              <p className="font-semibold">Tarih:</p>
              <p>{formatDate(new Date().toISOString())}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Sipariş Tarihi:</p>
              <p>{formatDate(order.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">MÜŞTERİ BİLGİLERİ</h2>
          <p className="text-2xl font-semibold">{order.buyer.name}</p>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">ÜRÜNLER</h2>
          
          {Object.entries(groupedItems).map(([productName, items]) => {
            const productTotal = items.reduce((s, i) => s + i.total, 0);
            const productQty = items.reduce((s, i) => s + i.quantity, 0);
            
            return (
              <div key={productName} className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">{productName}</h3>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{productQty} adet</p>
                      <p className="font-bold">{formatCurrency(productTotal)}</p>
                    </div>
                  </div>
                </div>
                
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm">
                      <th className="px-4 py-2 font-semibold">Renk</th>
                      <th className="px-4 py-2 font-semibold text-center">Adet</th>
                      <th className="px-4 py-2 font-semibold text-right">Birim Fiyat</th>
                      <th className="px-4 py-2 font-semibold text-right">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t border-gray-200">
                        <td className="px-4 py-3">{item.color}</td>
                        <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="border-t-2 border-gray-300 pt-6 mt-8">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xl font-bold">Toplam Adet:</p>
            <p className="text-3xl font-bold">{totalQuantity} adet</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xl font-bold">Toplam Tutar:</p>
            <p className="text-4xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-300 text-center text-sm text-gray-600">
          <p>Bu belge elektronik ortamda oluşturulmuştur.</p>
          <p className="mt-4 text-xs">
            İrsaliye Tipi: {mode === "all" ? "Tüm Ürünler" : "Şu Ana Kadar Yapılanlar"}
          </p>
        </div>

        {/* Print Button */}
        <div className="mt-8 text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all"
          >
            Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
