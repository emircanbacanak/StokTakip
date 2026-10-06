import { NextRequest, NextResponse } from "next/server";
import { idefixClient } from "@/lib/idefix-api-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const state = searchParams.get("state") || undefined;
    const orderNumber = searchParams.get("orderNumber") || undefined;

    const data = await idefixClient.getOrders({ page, limit, state, orderNumber });
    return NextResponse.json({
      success: true,
      orders: data.items,
      totalCount: data.totalCount,
      pageCount: data.pageCount,
      currentPage: data.currentPage,
    });
  } catch (error: any) {
    console.error("Idefix GET orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Idefix siparişleri alınamadı." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { shipmentId, status } = body;

    if (!shipmentId || !status) {
      return NextResponse.json(
        { success: false, error: "shipmentId ve status zorunludur." },
        { status: 400 }
      );
    }

    const result = await idefixClient.updateShipmentStatus({ shipmentId, status });
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Idefix PUT shipment status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Idefix sipariş durumu güncellenemedi." },
      { status: 500 }
    );
  }
}
