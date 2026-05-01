"use client";

import { useState, useEffect } from "react";
import { X, FileText, Printer, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ColorBadge } from "@/components/ui/color-badge";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

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

  // QR kod oluştur
  useEffect(() => {
    if (mode && invoiceItems.length > 0) {
      // İrsaliye URL'i oluştur (production'da gerçek domain kullanılacak)
      const invoiceUrl = `${window.location.origin}/invoice/${order.id}?mode=${mode}`;
      
      QRCode.toDataURL(invoiceUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(url => {
        setQrCodeDataUrl(url);
      }).catch(err => {
        console.error('QR kod oluşturma hatası:', err);
      });
    }
  }, [mode, invoiceItems, order.id]);

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

  // HTML içeriğini oluştur
  function generateInvoiceHTML() {
    const productRows = Object.entries(groupedItems).map(([productName, items]) => {
      const productTotal = items.reduce((s, i) => s + i.total, 0);
      const productQty = items.reduce((s, i) => s + i.quantity, 0);
      
      const colorRows = items.map(item => `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${item.color}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600;">${item.quantity}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(item.unit_price)}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
        </tr>
      `).join('');
      
      return `
        <div style="margin-bottom: 12px; border: 1px solid #9ca3af; overflow: hidden;">
          <div style="background-color: #f3f4f6; padding: 12px 16px; border-bottom: 1px solid #9ca3af;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-weight: bold; font-size: 11pt; margin: 0;">${productName}</h3>
              <div style="text-align: right;">
                <p style="font-size: 9pt; color: #4b5563; margin: 0 0 4px 0;">${productQty} adet</p>
                <p style="font-weight: bold; font-size: 10pt; margin: 0;">${formatCurrency(productTotal)}</p>
              </div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background-color: #f9fafb;">
              <tr>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: 600; font-size: 8pt;">Renk</th>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; font-size: 8pt;">Adet</th>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; font-weight: 600; font-size: 8pt;">Birim Fiyat</th>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; font-weight: 600; font-size: 8pt;">Toplam</th>
              </tr>
            </thead>
            <tbody>
              ${colorRows}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>İrsaliye - ${order.buyer.name}</title>
  <style>
    @page {
      margin: 1cm;
      size: A4 portrait;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #000;
      background: #fff;
      line-height: 1.4;
    }
    
    .container {
      max-width: 100%;
      margin: 0 auto;
    }
    
    h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    h2 {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 8px;
      margin-top: 12px;
    }
    
    p {
      font-size: 9pt;
      margin-bottom: 4px;
    }
    
    .header {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #6b7280;
    }
    
    .header-dates {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      margin-top: 8px;
    }
    
    .customer-info {
      margin-bottom: 12px;
    }
    
    .customer-name {
      font-size: 12pt;
      font-weight: 600;
    }
    
    .products {
      margin-bottom: 12px;
    }
    
    .summary {
      border-top: 2px solid #6b7280;
      padding-top: 12px;
      margin-top: 16px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .summary-label {
      font-size: 10pt;
      font-weight: bold;
    }
    
    .summary-value {
      font-size: 13pt;
      font-weight: bold;
    }
    
    .summary-value-large {
      font-size: 15pt;
      font-weight: bold;
    }
    
    .footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #9ca3af;
      text-align: center;
      font-size: 8pt;
      color: #4b5563;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      table tr {
        page-break-inside: avoid !important;
      }
      
      .summary {
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>İRSALİYE</h1>
      <div class="header-dates">
        <div>
          <p style="font-weight: 600;">Tarih:</p>
          <p>${formatDate(new Date().toISOString())}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-weight: 600;">Sipariş Tarihi:</p>
          <p>${formatDate(order.created_at)}</p>
        </div>
      </div>
    </div>
    
    <div class="customer-info">
      <h2>MÜŞTERİ BİLGİLERİ</h2>
      <p class="customer-name">${order.buyer.name}</p>
    </div>
    
    <div class="products">
      <h2>ÜRÜNLER</h2>
      ${productRows}
    </div>
    
    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">Toplam Adet:</span>
        <span class="summary-value">${totalQuantity} adet</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Toplam Tutar:</span>
        <span class="summary-value-large">${formatCurrency(totalAmount)}</span>
      </div>
    </div>
    
    <div class="footer">
      <p>Bu belge elektronik ortamda oluşturulmuştur.</p>
      ${qrCodeDataUrl ? `
      <div style="margin-top: 16px;">
        <img src="${qrCodeDataUrl}" alt="QR Kod" style="width: 120px; height: 120px; margin: 0 auto; display: block;" />
        <p style="margin-top: 8px; font-size: 7pt;">İrsaliye detaylarını görmek için QR kodu taratın</p>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
    `;
  }

  function handlePrint() {
    const htmlContent = generateInvoiceHTML();
    
    // Gizli iframe oluştur
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    
    document.body.appendChild(iframe);
    
    // iframe'e içeriği yaz
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      
      // İçerik yüklendikten sonra yazdır
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          
          // Yazdırma tamamlandıktan sonra iframe'i kaldır
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 250);
      };
    }
    
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
              {qrCodeDataUrl && (
                <div className="mt-4">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Kod" 
                    className="w-32 h-32 mx-auto"
                  />
                  <p className="mt-2 text-xs text-gray-500">İrsaliye detaylarını görmek için QR kodu taratın</p>
                </div>
              )}
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
    </div>
  );
}
