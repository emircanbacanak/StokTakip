import { NextRequest, NextResponse } from "next/server";
import { trendruumClient } from "@/lib/trendruum-api-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const status = searchParams.get("status") || undefined;

    const data = await trendruumClient.getOrders({ page, limit, status });
    return NextResponse.json({
      success: true,
      orders: data.data,
      total: data.total,
      current_page: data.current_page,
      last_page: data.last_page,
    });
  } catch (error: any) {
    console.error("Trendruum GET orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Trendruum siparişleri alınamadı." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { ogid, status } = body;

    if (!ogid || !status) {
      return NextResponse.json(
        { success: false, error: "ogid ve status alanları zorunludur." },
        { status: 400 }
      );
    }

    const result = await trendruumClient.updateOrderStatus(ogid, status);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Trendruum PUT order status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Sipariş durumu güncellenemedi." },
      { status: 500 }
    );
  }
}
