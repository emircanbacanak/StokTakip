import { NextRequest, NextResponse } from "next/server";
import { scrapeTrendyolMarket } from "@/lib/trendyol-market-scraper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { query, sort = "BEST_SELLER", limit = 30 } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Arama yapılacak ürün adı veya anahtar kelime gereklidir." },
        { status: 400 }
      );
    }

    console.log(`🌐 [API /api/seo-analysis/scrape] İstek alındı: ${query} (Sıralama: ${sort})`);

    const result = await scrapeTrendyolMarket(query.trim(), sort, limit);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("❌ [API /api/seo-analysis/scrape] Hata:", error);
    return NextResponse.json(
      {
        error: error.message || "Trendyol pazar verileri taranırken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
