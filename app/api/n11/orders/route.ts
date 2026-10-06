import { NextRequest, NextResponse } from "next/server";
import { n11Client } from "@/lib/n11-api-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const size = parseInt(searchParams.get("size") || "50", 10);
    const status = (searchParams.get("status") as any) || undefined;
    const orderNumber = searchParams.get("orderNumber") || undefined;

    const data = await n11Client.getShipmentPackages({
      page,
      size,
      status,
      orderNumber,
      orderByDirection: "DESC",
    });

    return NextResponse.json({
      success: true,
      orders: data.content,
      totalElements: data.totalElements,
      totalPages: data.totalPages,
      page: data.page,
      size: data.size,
    });
  } catch (error: any) {
    console.error("N11 GET orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "N11 siparişleri alınamadı." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { lines, status } = body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir sipariş satır ID'si (lineId) gereklidir." },
        { status: 400 }
      );
    }

    const res = await n11Client.updateOrder(lines, status || "Picking");
    return NextResponse.json({ success: true, result: res });
  } catch (error: any) {
    console.error("N11 PUT orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "N11 sipariş güncellenemedi." },
      { status: 500 }
    );
  }
}
