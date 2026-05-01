"use client";

import { useState, useEffect } from "react";
import { X, FileText, Printer, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ColorBadge } from "@/components/ui/color-badge";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  product_name: string;
  color: string;
  quantity: number;
  produced_quantity: number;
  delivered_quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  created_at: string;
  buyer: { id: string; name: string };
  items: OrderItem[];
}

interface InvoiceDialogProps {
  order: Order;
  onClose: () => void;
}

export function InvoiceDialog({ order, onClose }: InvoiceDialogProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"all" | "produced" | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<Array<{
    product_name: string;
    color: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>>([]);

  useEffect(() => {
    if (mode === "all") {
      // Tüm sipariş ürünleri
      const items = order.items.map(item => ({
        product_name: item.product_name,
        color: item.color,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));
      setInvoiceItems(items);
    } else if (mode === "produced") {
      // Üretilmiş ama henüz teslim edilmemiş ürünler
      const items = order.items
        .map(item => {
          // Üretilen - Teslim edilen = Kalan üretilmiş
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
        .filter(item => item !== null) as typeof invoiceItems;
      
      setInvoiceItems(items);
    }
  }, [mode, order.items]);

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

  function handlePrint() {
    window.print();
    toast({ title: "Fiş yazdırılıyor..." });
  }

  if (!mode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Fiş Oluştur</h3>
                <p className="text-xs text-muted-foreground">{order.buyer.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Hangi ürünler için fiş oluşturmak istiyorsunuz?
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setMode("all")}
              className="w-full p-4 rounded-xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all text-left group"
            >
              <p className="font-semibold text-foreground mb-1 group-hover:text-blue-600">Tüm Ürünler</p>
              <p className="text-xs text-muted-foreground">
                Siparişin tamamı ({order.items.reduce((s, i) => s + i.quantity, 0)} adet)
              </p>
            </button>

            <button
              onClick={() => setMode("produced")}
              className="w-full p-4 rounded-xl border-2 border-border hover:border-emerald-500 hover:bg-emerald-500/5 transition-all text-left group"
            >
              <p className="font-semibold text-foreground mb-1 group-hover:text-emerald-600">
                Şu Ana Kadar Yapılanlar
                {order.items.reduce((s, i) => s + ((i.produced_quantity || 0) - (i.delivered_quantity || 0)), 0) > 0 && (
                  <span className="ml-2 text-xs font-bold text-emerald-600">
                    ({order.items.reduce((s, i) => s + ((i.produced_quantity || 0) - (i.delivered_quantity || 0)), 0)} adet)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Üretilmiş ama henüz teslim edilmemiş ürünler
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 invoice-print-container">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm print:hidden" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col print:max-h-none print:shadow-none print:border-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">İrsaliye / Fiş</h3>
              <p className="text-xs text-muted-foreground">
                {mode === "all" ? "Tüm Ürünler" : "Şu Ana Kadar Yapılanlar"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-all"
            >
              <Printer className="w-4 h-4" />
              Yazdır
            </button>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          <div id="printable-invoice" className="max-w-3xl mx-auto bg-white text-black p-4 print:max-w-none print:p-2" style={{ colorScheme: 'light' }}>
            {/* Header */}
            <div className="mb-4 pb-3 border-b-2 border-gray-300">
              <h1 className="text-3xl font-bold mb-1">İRSALİYE</h1>
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
            <div className="mb-4">
              <h2 className="text-lg font-bold mb-1">MÜŞTERİ BİLGİLERİ</h2>
              <p className="text-xl font-semibold">{order.buyer.name}</p>
            </div>

            {/* Items Table */}
            <div className="mb-4">
              <h2 className="text-lg font-bold mb-2">ÜRÜNLER</h2>
              
              {Object.entries(groupedItems).map(([productName, items]) => {
                const productTotal = items.reduce((s, i) => s + i.total, 0);
                const productQty = items.reduce((s, i) => s + i.quantity, 0);
                
                return (
                  <div key={productName} className="mb-4 border border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-base">{productName}</h3>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{productQty} adet</p>
                          <p className="font-bold">{formatCurrency(productTotal)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-xs">
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
            <div className="summary-section border-t-2 border-gray-300 pt-4 mt-4 bg-white">
              <div className="flex justify-between items-center mb-2 bg-white">
                <p className="text-lg font-bold text-black">Toplam Adet:</p>
                <p className="text-2xl font-bold text-black">{totalQuantity} adet</p>
              </div>
              <div className="flex justify-between items-center bg-white">
                <p className="text-lg font-bold text-black">Toplam Tutar:</p>
                <p className="text-3xl font-bold text-black">{formatCurrency(totalAmount)}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
              <p>Bu belge elektronik ortamda oluşturulmuştur.</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between print:hidden">
          <button
            onClick={() => setMode(null)}
            className="px-4 py-2 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-all"
          >
            Geri
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all"
          >
            <Printer className="w-4 h-4" />
            Yazdır
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0.3cm;
            size: A4;
          }
          
          /* Body ve HTML'i sıfırla */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Her şeyi gizle */
          body * {
            visibility: hidden !important;
          }
          
          /* Sadece printable-invoice ve içeriğini göster */
          #printable-invoice,
          #printable-invoice * {
            visibility: visible !important;
          }
          
          /* Printable invoice'i normal flow'da tut - ABSOLUTE DEĞİL */
          #printable-invoice {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            page-break-after: auto !important;
            orphans: 3 !important;
            widows: 3 !important;
          }
          
          /* Tüm elementleri beyaz arka plan, siyah yazı */
          #printable-invoice * {
            color: black !important;
          }
          
          /* Summary section için özel kurallar */
          #printable-invoice .summary-section {
            background-color: white !important;
            border-top: 2px solid #6b7280 !important;
            padding-top: 12px !important;
            margin-top: 16px !important;
            page-break-inside: avoid !important;
            page-break-before: auto !important;
          }
          
          #printable-invoice .summary-section * {
            background-color: white !important;
            color: black !important;
            font-weight: bold !important;
          }
          
          /* Ürün gruplarının içindeki tabloların bölünmesine izin ver */
          #printable-invoice .mb-4 {
            page-break-inside: auto !important;
          }
          
          /* Sadece tablo satırlarının bölünmesini engelle */
          #printable-invoice tbody tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          
          /* Ürün başlıklarının yalnız kalmamasını sağla */
          #printable-invoice .bg-gray-100 {
            page-break-after: avoid !important;
          }
          
          /* Font boyutları - KOMPAKT */
          #printable-invoice h1 {
            font-size: 20pt !important;
            font-weight: bold !important;
            margin-bottom: 4px !important;
            margin-top: 0 !important;
          }
          
          #printable-invoice h2 {
            font-size: 12pt !important;
            font-weight: bold !important;
            margin-bottom: 4px !important;
            margin-top: 8px !important;
          }
          
          #printable-invoice h3 {
            font-size: 11pt !important;
            font-weight: bold !important;
          }
          
          #printable-invoice p,
          #printable-invoice td,
          #printable-invoice th {
            font-size: 9pt !important;
            line-height: 1.2 !important;
          }
          
          #printable-invoice .text-xs {
            font-size: 7pt !important;
          }
          
          #printable-invoice .text-sm {
            font-size: 8pt !important;
          }
          
          #printable-invoice .text-lg {
            font-size: 10pt !important;
          }
          
          #printable-invoice .text-xl {
            font-size: 12pt !important;
          }
          
          #printable-invoice .text-2xl {
            font-size: 14pt !important;
          }
          
          #printable-invoice .text-3xl {
            font-size: 16pt !important;
          }
          
          /* Gri arka planlar - ZORUNLU */
          #printable-invoice .bg-gray-100 {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #printable-invoice .bg-gray-50 {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Border'lar - KALIN VE NET */
          #printable-invoice .border,
          #printable-invoice .border-gray-300,
          #printable-invoice .border-gray-200 {
            border-color: #9ca3af !important;
            border-style: solid !important;
            border-width: 1px !important;
          }
          
          #printable-invoice .border-b-2 {
            border-bottom-width: 3px !important;
            border-bottom-color: #6b7280 !important;
          }
          
          #printable-invoice .border-t-2 {
            border-top-width: 3px !important;
            border-top-color: #6b7280 !important;
          }
          
          #printable-invoice .border-t {
            border-top-width: 1px !important;
          }
          
          #printable-invoice .border-b {
            border-bottom-width: 1px !important;
          }
          
          /* Text colors */
          #printable-invoice .text-gray-600 {
            color: #4b5563 !important;
          }
          
          /* Tablolar - KOMPAKT */
          #printable-invoice table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 4px 0 !important;
          }
          
          #printable-invoice th,
          #printable-invoice td {
            padding: 4px 6px !important;
            text-align: left !important;
            border: 1px solid #d1d5db !important;
          }
          
          #printable-invoice th {
            background-color: #f9fafb !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Rounded corners'ı kaldır (yazdırmada sorun çıkarabilir) */
          #printable-invoice .rounded-lg,
          #printable-invoice .rounded-xl,
          #printable-invoice .rounded-2xl {
            border-radius: 0 !important;
          }
          
          /* Margin ve padding'leri düzelt - ÇOK KOMPAKT */
          #printable-invoice .mb-8 {
            margin-bottom: 8px !important;
          }
          
          #printable-invoice .mb-6 {
            margin-bottom: 6px !important;
          }
          
          #printable-invoice .mb-4 {
            margin-bottom: 4px !important;
          }
          
          #printable-invoice .mb-2 {
            margin-bottom: 2px !important;
          }
          
          #printable-invoice .pb-6 {
            padding-bottom: 6px !important;
          }
          
          #printable-invoice .pt-4 {
            padding-top: 4px !important;
          }
          
          #printable-invoice .pt-8 {
            padding-top: 8px !important;
          }
          
          #printable-invoice .mt-12 {
            margin-top: 12px !important;
          }
          
          /* Padding'leri minimize et */
          #printable-invoice .px-4 {
            padding-left: 6px !important;
            padding-right: 6px !important;
          }
          
          #printable-invoice .py-3 {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
          
          #printable-invoice .py-2 {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
          }
          
          #printable-invoice .p-8 {
            padding: 8px !important;
          }
          
          /* Renkli yazdırma - ZORUNLU */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
