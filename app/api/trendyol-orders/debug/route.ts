import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials eksik");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // Toplam sipariş sayısı
    const { count: totalCount } = await supabase
      .from("trendyol_orders")
      .select("*", { count: "exact", head: true });

    // Delivered siparişler
    const { count: deliveredCount } = await supabase
      .from("trendyol_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "Delivered");

    // NotInvoiced siparişler
    const { count: notInvoicedCount } = await supabase
      .from("trendyol_orders")
      .select("*", { count: "exact", head: true })
      .eq("invoice_status", "NotInvoiced");

    // Delivered + NotInvoiced
    const { count: deliveredNotInvoicedCount } = await supabase
      .from("trendyol_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "Delivered")
      .eq("invoice_status", "NotInvoiced");

    // Delivered + (NotInvoiced OR NULL)
    const { count: deliveredWithoutInvoiceCount } = await supabase
      .from("trendyol_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "Delivered")
      .or("invoice_status.eq.NotInvoiced,invoice_status.is.null");

    // Son 15 Delivered sipariş
    const { data: recentDelivered } = await supabase
      .from("trendyol_orders")
      .select("order_number, status, invoice_status, order_date, delivered_at")
      .eq("status", "Delivered")
      .order("order_date", { ascending: false })
      .limit(15);

    return NextResponse.json({
      summary: {
        total: totalCount,
        delivered: deliveredCount,
        notInvoiced: notInvoicedCount,
        deliveredNotInvoiced: deliveredNotInvoicedCount,
        deliveredWithoutInvoice: deliveredWithoutInvoiceCount,
      },
      recentDelivered: recentDelivered || [],
    });
  } catch (error) {
    console.error("❌ Debug error:", error);
    return NextResponse.json(
      {
        error: "Debug hatası",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
