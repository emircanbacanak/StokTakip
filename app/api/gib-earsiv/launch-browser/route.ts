import { NextRequest, NextResponse } from "next/server";
import { runGibBrowserAutomation } from "@/lib/gib-browser-automation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password, orders } = body;

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: "İşlenecek sipariş bulunamadı" }, { status: 400 });
    }

    // Arka planda veya canlı tarayıcıyı başlat
    const result = await runGibBrowserAutomation({
      username: username || "12911762",
      password: password || "973973",
      orders,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Canlı Tarayıcı Başlatma Hatası:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tarayıcı başlatılamadı" },
      { status: 500 }
    );
  }
}
