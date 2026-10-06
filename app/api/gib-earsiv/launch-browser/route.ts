import { NextRequest, NextResponse } from "next/server";
import { runGibBrowserAutomation } from "@/lib/gib-browser-automation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password, orders, skipCreation } = body;

    // Arka planda veya canlı tarayıcıyı başlat
    const result = await runGibBrowserAutomation({
      username: username || process.env.GIB_USERNAME || "",
      password: password || process.env.GIB_PASSWORD || "",
      orders: orders || [],
      skipCreation: Boolean(skipCreation || (!orders || orders.length === 0)),
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
