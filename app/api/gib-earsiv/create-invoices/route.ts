import { NextRequest, NextResponse } from "next/server";
import { GibEArsivClient, GibInvoiceData } from "@/lib/gib-earsiv-client";
import { cleanProductName } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, order } = body;

    if (!token || !order) {
      return NextResponse.json({ error: "Token ve Sipariş verisi gereklidir." }, { status: 400 });
    }

    const gibClient = new GibEArsivClient(token);

    // Fatura adres ve müşteri bilgilerini hazırla
    const invoiceAddress = order.invoice_address || order.shipment_address || {};
    const customerName = `${order.customer_first_name || ""} ${order.customer_last_name || ""}`.trim() ||
      `${invoiceAddress.firstName || ""} ${invoiceAddress.lastName || ""}`.trim() ||
      "Trendyol Müşterisi";

    const address = [
      invoiceAddress.address1,
      invoiceAddress.address2,
      invoiceAddress.neighborhood,
    ].filter(Boolean).join(", ") || "Teslimat Adresi";

    const district = invoiceAddress.district || "Merkez";
    const city = invoiceAddress.city || "İstanbul";
    const tcknVkn = order.tax_number || invoiceAddress.taxNumber || "11111111111";
    const taxOffice = invoiceAddress.taxOffice || "";

    // Ürün kalemlerini hazırla (KDV Hariç Fiyat ve %20 KDV)
    const VAT_RATE = 20;
    const items = (order.items || []).map((item: any) => {
      const priceWithVat = Number(item.price) || 0;
      const unitPriceWithoutVat = priceWithVat / 1.20;

      return {
        name: cleanProductName(item.product_name || "Ürün"),
        quantity: Number(item.quantity) || 1,
        unitPriceWithoutVat,
        vatRate: VAT_RATE,
      };
    });

    const invoiceData: GibInvoiceData = {
      orderId: order.id,
      orderNumber: order.order_number,
      date: new Date(),
      customerName,
      tcknVkn,
      taxOffice,
      address,
      district,
      city,
      items,
      notes: `Trendyol Sipariş No: ${order.order_number}`,
    };

    const result = await gibClient.createInvoiceDraft(invoiceData);

    return NextResponse.json({
      success: true,
      uuid: result.uuid,
      orderNumber: order.order_number,
    });
  } catch (error) {
    console.error("❌ GİB Fatura Oluşturma Hatası:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fatura oluşturulamadı" },
      { status: 400 }
    );
  }
}
