import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Trendyol Orders Sync API Route
 * 
 * Trendyol API'den siparişleri çeker ve veritabanına kaydeder.
 */

const TRENDYOL_BASE_URL = "https://api.trendyol.com/sapigw/suppliers";

interface TrendyolCredentials {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
}

function getCredentials(): TrendyolCredentials | null {
  const sellerId = process.env.TRENDYOL_SELLER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;

  if (!sellerId || !apiKey || !apiSecret) {
    return null;
  }

  return { sellerId, apiKey, apiSecret };
}

function getBasicAuthHeader(apiKey: string, apiSecret: string): string {
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return `Basic ${credentials}`;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials eksik");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const credentials = getCredentials();
    
    if (!credentials) {
      return NextResponse.json(
        { error: "Trendyol API credentials eksik" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { startDate, endDate, status } = body;

    // Varsayılan: Son 7 gün
    const defaultEndDate = Date.now();
    const defaultStartDate = defaultEndDate - (7 * 24 * 60 * 60 * 1000);

    const start = startDate || defaultStartDate;
    const end = endDate || defaultEndDate;

    console.log("🔄 Starting Trendyol orders sync...");
    console.log("📅 Date range:", new Date(start), "to", new Date(end));

    const supabase = getSupabaseClient();

    // Silme işlemi kaldırıldı — sync sadece günceller/ekler, silmez
    // (tarih aralığı dışındaki eski siparişleri tutuyoruz)
    console.log("📋 Sync will upsert orders without deleting existing ones");
    let totalFetched = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let errors = 0;
    let errorMessage = "";

    // Pagination
    let currentPage = 0;
    let hasMore = true;

    while (hasMore) {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        size: "200", // Max
        startDate: start.toString(),
        endDate: end.toString(),
      });

      // Status filter kaldırıldı - tüm siparişleri çek
      // if (status) queryParams.append("status", status);

      const apiUrl = `${TRENDYOL_BASE_URL}/${credentials.sellerId}/orders?${queryParams.toString()}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Authorization": getBasicAuthHeader(credentials.apiKey, credentials.apiSecret),
          "Content-Type": "application/json",
          "User-Agent": "TrendyolSupplierAPI/1.0",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        errors++;
        errorMessage = `Trendyol API Error: ${response.status} - ${errorText}`;
        console.error("❌", errorMessage);
        break;
      }

      const data = await response.json();
      const orders = data.content || [];
      totalFetched += orders.length;

      console.log(`📦 Page ${currentPage}: ${orders.length} orders (totalPages: ${data.totalPages}, totalElements: ${data.totalElements})`);

      // Her siparişi veritabanına kaydet
      for (const order of orders) {
        try {
          console.log(`📦 Processing order ${order.orderNumber} - Status: ${order.status}`);
          
          // Sipariş detayını çek (lines array'i için)
          let orderDetail = order;
          if (!order.lines || order.lines.length === 0) {
            console.log(`  🔍 Fetching details for order ${order.orderNumber}...`);
            const detailUrl = `${TRENDYOL_BASE_URL}/${credentials.sellerId}/orders/${order.orderNumber}`;
            
            try {
              const detailResponse = await fetch(detailUrl, {
                method: "GET",
                headers: {
                  "Authorization": getBasicAuthHeader(credentials.apiKey, credentials.apiSecret),
                  "Content-Type": "application/json",
                  "User-Agent": "TrendyolSupplierAPI/1.0",
                },
              });
              
              if (detailResponse.ok) {
                orderDetail = await detailResponse.json();
                console.log(`  ✅ Order detail fetched, lines:`, orderDetail.lines?.length || 0);
              } else {
                console.log(`  ⚠️ Could not fetch order detail: ${detailResponse.status}`);
              }
            } catch (detailError) {
              console.error(`  ❌ Error fetching order detail:`, detailError);
            }
          }
          
          // Sipariş var mı kontrol et
          const { data: existing } = await supabase
            .from("trendyol_orders")
            .select("id")
            .eq("order_number", orderDetail.orderNumber)
            .maybeSingle();

          // Delivered_at hesaplama: en doğru tarihi bul
          let deliveredAt = null;
          if (orderDetail.status === "Delivered") {
            // 1. packageHistories içinde Delivered statüsünün tarihini bul
            const deliveredHistory = orderDetail.packageHistories?.find(
              (h: any) => h.status === "Delivered"
            );
            
            if (deliveredHistory?.createdDate) {
              deliveredAt = new Date(deliveredHistory.createdDate).toISOString();
            } else if (orderDetail.deliveredDate) {
              // 2. deliveredDate field'ı (bazı API versiyonlarında farklı isim)
              deliveredAt = new Date(orderDetail.deliveredDate).toISOString();
            } else if (orderDetail.deliveredAt) {
              // 3. deliveredAt field'ı
              deliveredAt = new Date(orderDetail.deliveredAt).toISOString();
            } else if (orderDetail.lastModifiedDate) {
              // 4. Son güncelleme tarihi (Delivered'a geçiş tarihi olabilir)
              deliveredAt = new Date(orderDetail.lastModifiedDate).toISOString();
            } else {
              // 5. Son fallback: sipariş tarihinden 3 gün sonra (tahmini)
              const estimatedDelivery = new Date(orderDetail.orderDate);
              estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);
              deliveredAt = estimatedDelivery.toISOString();
              console.log(`  ⚠️ No delivery date found for order ${orderDetail.orderNumber}, using estimated date`);
            }
          }

          const orderData = {
            order_number: orderDetail.orderNumber,
            customer_id: orderDetail.customerId,
            customer_first_name: orderDetail.customerFirstName,
            customer_last_name: orderDetail.customerLastName,
            order_date: orderDetail.orderDate,
            status: orderDetail.status,
            total_price: orderDetail.totalPrice,
            total_discount: orderDetail.totalDiscount || 0,
            tax_number: orderDetail.taxNumber,
            invoice_address: orderDetail.invoiceAddress,
            shipment_address: orderDetail.shipmentAddress,
            cargo_tracking_number: orderDetail.cargoTrackingNumber,
            cargo_provider_name: orderDetail.cargoProviderName,
            delivery_type: orderDetail.deliveryType,
            delivered_at: deliveredAt,
            invoice_number: orderDetail.invoiceNumber || null,
            invoice_status: orderDetail.invoiceStatus || 'NotInvoiced', // Invoice status'u kaydet
            last_updated_at: new Date().toISOString(),
          };

          if (existing) {
            // Güncelle - invoice_number ve invoice_status'u API'den güncelle
            const { error: updateError } = await supabase
              .from("trendyol_orders")
              .update({
                customer_id: orderDetail.customerId,
                customer_first_name: orderDetail.customerFirstName,
                customer_last_name: orderDetail.customerLastName,
                order_date: orderDetail.orderDate,
                status: orderDetail.status,
                total_price: orderDetail.totalPrice,
                total_discount: orderDetail.totalDiscount || 0,
                tax_number: orderDetail.taxNumber,
                invoice_address: orderDetail.invoiceAddress,
                shipment_address: orderDetail.shipmentAddress,
                cargo_tracking_number: orderDetail.cargoTrackingNumber,
                cargo_provider_name: orderDetail.cargoProviderName,
                delivery_type: orderDetail.deliveryType,
                delivered_at: deliveredAt,
                invoice_number: orderDetail.invoiceNumber || null,
                invoice_status: orderDetail.invoiceStatus || 'NotInvoiced',
                last_updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);

            if (updateError) {
              console.error("❌ Update error:", updateError);
              errors++;
            } else {
              totalUpdated++;
              
              // Mevcut order items'ı sil ve yeniden ekle
              await supabase
                .from("trendyol_order_items")
                .delete()
                .eq("trendyol_order_id", existing.id);

              // Yeni items ekle
              const items = (orderDetail.lines || []).map((line: any) => ({
                trendyol_order_id: existing.id,
                order_line_id: line.orderLineId || `${existing.id}-${Math.random()}`,
                product_name: line.productName || "Ürün",
                product_code: line.productCode,
                merchant_sku: line.merchantSku,
                quantity: line.quantity || 1,
                price: line.price || 0,
                discount: line.discount || 0,
                vat_base_amount: line.vatBaseAmount,
                barcode: line.barcode,
                status: line.orderLineItemStatusName || orderDetail.status,
              }));

              if (items.length > 0) {
                console.log(`  ✅ Inserting ${items.length} items for order ${orderDetail.orderNumber}`);
                const { error: itemsError } = await supabase.from("trendyol_order_items").insert(items);
                if (itemsError) {
                  console.error("  ❌ Items insert error:", itemsError);
                }
              } else {
                console.log(`  ⚠️ No items found for order ${orderDetail.orderNumber}`);
              }
            }
          } else {
            // Yeni kayıt oluştur
            const { data: newOrder, error: insertError } = await supabase
              .from("trendyol_orders")
              .insert(orderData)
              .select("id")
              .single();

            if (insertError) {
              console.error("❌ Insert error:", insertError);
              errors++;
            } else {
              totalCreated++;

              // Order items ekle
              const items = (orderDetail.lines || []).map((line: any) => ({
                trendyol_order_id: newOrder.id,
                order_line_id: line.orderLineId || `${newOrder.id}-${Math.random()}`,
                product_name: line.productName || "Ürün",
                product_code: line.productCode,
                merchant_sku: line.merchantSku,
                quantity: line.quantity || 1,
                price: line.price || 0,
                discount: line.discount || 0,
                vat_base_amount: line.vatBaseAmount,
                barcode: line.barcode,
                status: line.orderLineItemStatusName || orderDetail.status,
              }));

              if (items.length > 0) {
                console.log(`  ✅ Inserting ${items.length} items for new order ${orderDetail.orderNumber}`);
                const { error: itemsError } = await supabase.from("trendyol_order_items").insert(items);
                if (itemsError) {
                  console.error("  ❌ Items insert error:", itemsError);
                }
              } else {
                console.log(`  ⚠️ No items found for new order ${orderDetail.orderNumber}`);
              }
            }
          }
        } catch (err) {
          console.error("❌ Error processing order:", order?.orderNumber, err);
          errors++;
        }
      }

      // Pagination kontrolü
      currentPage++;
      hasMore = orders.length > 0 && currentPage < (data.totalPages || 1) && currentPage < 50; // Max 50 sayfa güvenlik için
    }

    // Sync log kaydet
    await supabase.from("trendyol_sync_log").insert({
      sync_type: "orders",
      start_date: start,
      end_date: end,
      orders_fetched: totalFetched,
      orders_created: totalCreated,
      orders_updated: totalUpdated,
      errors,
      error_message: errorMessage || null,
    });

    console.log("✅ Sync completed!");
    console.log(`📊 Fetched: ${totalFetched}, Created: ${totalCreated}, Updated: ${totalUpdated}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      fetched: totalFetched,
      created: totalCreated,
      updated: totalUpdated,
      errors,
      errorMessage: errorMessage || null,
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Beklenmeyen bir hata oluştu",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
