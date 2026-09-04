import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cleanProductName } from "@/lib/utils";

const TRENDYOL_APIGW = "https://apigw.trendyol.com/integration/order/sellers";
const TRENDYOL_LEGACY = "https://api.trendyol.com/sapigw/suppliers";
const MAX_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // Trendyol max 2 hafta pencere

function getCredentials() {
  const sellerId = process.env.TRENDYOL_SELLER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;
  if (!sellerId || !apiKey || !apiSecret) return null;
  return { sellerId, apiKey, apiSecret };
}

function auth(apiKey: string, apiSecret: string) {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function fetchWindow(creds: NonNullable<ReturnType<typeof getCredentials>>, winStart: number, winEnd: number) {
  const allOrders: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      page: page.toString(),
      size: "200",
      startDate: winStart.toString(),
      endDate: winEnd.toString(),
      orderByField: "PackageLastModifiedDate",
      orderByDirection: "DESC",
    });

    const headers = {
      Authorization: auth(creds.apiKey, creds.apiSecret),
      "Content-Type": "application/json",
      "User-Agent": `${creds.sellerId} - SelfIntegration`,
    };

    // 1. Standart getShipmentPackages v2 endpoint'ini dene
    let res = await fetch(`${TRENDYOL_APIGW}/${creds.sellerId}/orders?${params}`, { headers });
    if (!res.ok) {
      console.log(`⚠️ apigw /orders (${res.status}), v2/orders deneniyor...`);
      res = await fetch(`${TRENDYOL_APIGW}/${creds.sellerId}/v2/orders?${params}`, { headers });
    }
    if (!res.ok) {
      console.log(`⚠️ apigw /v2/orders (${res.status}), legacy endpoint deneniyor...`);
      res = await fetch(`${TRENDYOL_LEGACY}/${creds.sellerId}/orders?${params}`, { headers });
    }
    if (!res.ok) {
      console.error(`❌ Trendyol API hatası: ${res.status}`);
      break;
    }

    const data = await res.json();
    const content: any[] = data.content || [];
    allOrders.push(...content);
    console.log(`  📄 Sayfa ${page}: ${content.length} sipariş paketi alındı (Toplam: ${data.totalElements || allOrders.length})`);

    page++;
    hasMore = content.length > 0 && page < (data.totalPages || 1) && page < 50;
  }

  return allOrders;
}

export async function POST(request: NextRequest) {
  try {
    const creds = getCredentials();
    if (!creds) {
      return NextResponse.json({ error: "Trendyol credentials eksik" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const days = body.days ? Number(body.days) : null;
    const defaultEnd = Date.now();
    const defaultStart = days 
      ? defaultEnd - days * 24 * 60 * 60 * 1000 
      : defaultEnd - 30 * 24 * 60 * 60 * 1000;

    const start: number = body.startDate || defaultStart;
    const end: number = body.endDate || defaultEnd;

    console.log(`\n🔄 Sync Başladı: ${new Date(start).toISOString()} → ${new Date(end).toISOString()}`);

    const supabase = getSupabase();

    // ── 1. ADIM: TÜM MEVCUT VERİLERİ VERİ TABANINDAN TEMİZLE ─────────────────
    console.log("🗑️ Tüm eski sipariş ve fatura veritabanı kayıtları siliniyor...");
    
    // Cascading delete veya doğrudan tüm satırları sil
    const { error: deleteItemsErr } = await supabase
      .from("trendyol_order_items")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteItemsErr) {
      console.warn("⚠️ Order items silinirken uyarı:", deleteItemsErr.message);
    }

    const { error: deleteOrdersErr } = await supabase
      .from("trendyol_orders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteOrdersErr) {
      console.warn("⚠️ Orders silinirken uyarı:", deleteOrdersErr.message);
    }

    console.log("✅ Veri tabanı tamamen temizlendi.");
    // ─────────────────────────────────────────────────────────────────────────

    // ── 2. ADIM: Trendyol API'den yeni verileri çek ───────────────────────────
    const windows: { start: number; end: number }[] = [];
    let winEnd = end;
    while (winEnd > start) {
      const winStart = Math.max(winEnd - MAX_WINDOW_MS, start);
      windows.unshift({ start: winStart, end: winEnd });
      winEnd = winStart;
    }

    const seenOrderNumbers = new Set<string>();
    const uniqueOrders: any[] = [];

    for (const win of windows) {
      console.log(`\n🪟 Pencere: ${new Date(win.start).toISOString()} → ${new Date(win.end).toISOString()}`);
      const orders = await fetchWindow(creds, win.start, win.end);
      for (const ord of orders) {
        if (!seenOrderNumbers.has(ord.orderNumber)) {
          seenOrderNumbers.add(ord.orderNumber);
          uniqueOrders.push(ord);
        }
      }
    }

    console.log(`📥 Toplam ${uniqueOrders.length} tekil sipariş çekildi. Veritabanına kaydediliyor...`);

    let totalCreated = 0;
    let errors = 0;
    let deliveredCount = 0;
    let notInvoicedCount = 0;

    for (const order of uniqueOrders) {
      try {
        let detail = order;
        // Satır kalemleri (lines) boşsa detay sorgusu yap
        if (!order.lines?.length) {
          try {
            const headers = {
              Authorization: auth(creds.apiKey, creds.apiSecret),
              "Content-Type": "application/json",
              "User-Agent": `${creds.sellerId} - SelfIntegration`,
            };
            const dr = await fetch(
              `${TRENDYOL_APIGW}/${creds.sellerId}/orders?orderNumber=${order.orderNumber}`,
              { headers }
            );
            if (dr.ok) {
              const dd = await dr.json();
              if (dd.content?.length) detail = dd.content[0];
            }
          } catch {}
        }

        const rawStatus = detail.shipmentPackageStatus || detail.status || "Created";
        const isDelivered = rawStatus === "Delivered";
        const isInvoiced = rawStatus === "Invoiced" || detail.invoiceStatus === "Invoiced";

        if (isDelivered) deliveredCount++;
        if (!isInvoiced) notInvoicedCount++;

        // Teslimat tarihi belirleme
        let deliveredAt: string | null = null;
        if (isDelivered) {
          const h = (detail.packageHistories || []).find((x: any) => x.status === "Delivered");
          if (h?.createdDate) {
            deliveredAt = new Date(h.createdDate).toISOString();
          } else if (detail.lastModifiedDate) {
            deliveredAt = new Date(detail.lastModifiedDate).toISOString();
          } else if (detail.orderDate) {
            const est = new Date(detail.orderDate);
            est.setDate(est.getDate() + 3);
            deliveredAt = est.toISOString();
          }
        }

        const { data: newOrder, error: ie } = await supabase
          .from("trendyol_orders")
          .insert({
            order_number: String(detail.orderNumber),
            customer_id: detail.customerId || null,
            customer_first_name: detail.customerFirstName || "",
            customer_last_name: detail.customerLastName || "",
            order_date: detail.orderDate || Date.now(),
            status: rawStatus,
            total_price: detail.packageTotalPrice ?? detail.totalPrice ?? 0,
            total_discount: detail.packageTotalDiscount ?? detail.totalDiscount ?? 0,
            tax_number: detail.taxNumber || detail.invoiceAddress?.taxNumber || null,
            invoice_address: detail.invoiceAddress || null,
            shipment_address: detail.shipmentAddress || null,
            cargo_tracking_number: detail.cargoTrackingNumber ? String(detail.cargoTrackingNumber) : null,
            cargo_provider_name: detail.cargoProviderName || null,
            delivery_type: detail.deliveryType || null,
            delivered_at: deliveredAt,
            invoice_number: null,
            invoice_status: isInvoiced ? "Invoiced" : "NotInvoiced",
            invoiced: isInvoiced,
            synced_at: new Date().toISOString(),
            last_updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (ie) {
          errors++;
          console.error("❌ Order Insert Error:", detail.orderNumber, ie.message);
        } else if (newOrder) {
          totalCreated++;
          const lines = detail.lines || [];
          if (lines.length > 0) {
            const items = lines.map((line: any, idx: number) => ({
              trendyol_order_id: newOrder.id,
              order_line_id: String(line.lineId || line.orderLineId || `${newOrder.id}-${idx}-${Date.now()}`),
              product_name: cleanProductName(line.productName || "Ürün"),
              product_code: line.stockCode || line.productCode || null,
              merchant_sku: line.stockCode || line.merchantSku || null,
              quantity: Number(line.quantity) || 1,
              price: Number(line.lineUnitPrice || line.price) || 0,
              discount: Number(line.lineTotalDiscount || line.discount) || 0,
              vat_base_amount: line.vatBaseAmount ? Number(line.vatBaseAmount) : null,
              barcode: line.barcode ? String(line.barcode) : null,
              status: line.orderLineItemStatusName || rawStatus,
            }));

            const { error: itemErr } = await supabase.from("trendyol_order_items").insert(items);
            if (itemErr) {
              console.error("❌ Item Insert Error:", itemErr.message);
            }
          }
        }
      } catch (err) {
        errors++;
        console.error("❌ Sipariş işleme hatası:", order?.orderNumber, err);
      }
    }

    await supabase.from("trendyol_sync_log").insert({
      sync_type: "orders",
      start_date: start,
      end_date: end,
      orders_fetched: uniqueOrders.length,
      orders_created: totalCreated,
      orders_updated: 0,
      errors,
      error_message: null,
    });

    console.log(`\n🎉 Senkronizasyon Tamamlandı:`);
    console.log(`- Toplam Çekilen: ${uniqueOrders.length}`);
    console.log(`- DB'ye Kaydedilen: ${totalCreated}`);
    console.log(`- Teslim Edilmiş: ${deliveredCount}`);
    console.log(`- Faturası Bekleyen: ${notInvoicedCount}`);
    console.log(`- Hata: ${errors}`);

    return NextResponse.json({
      success: errors === 0,
      fetched: uniqueOrders.length,
      created: totalCreated,
      delivered: deliveredCount,
      notInvoiced: notInvoicedCount,
      errors,
    });
  } catch (error) {
    console.error("❌ Sync route exception:", error);
    return NextResponse.json(
      { error: "Beklenmeyen hata", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
