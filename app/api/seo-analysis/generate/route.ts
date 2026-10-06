import { NextRequest, NextResponse } from "next/server";
import { generateFullSeoProductPackage } from "@/lib/seo-ai-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      productTitleOrQuery,
      visionData,
      competitors = [],
      keywords = [],
      stats,
      brandName,
      customNotes = "",
      suggestions = [],
    } = body;

    if (!productTitleOrQuery) {
      return NextResponse.json(
        { error: "Ürün adı veya arama terimi gereklidir." },
        { status: 400 }
      );
    }

    console.log(`🤖 [API /api/seo-analysis/generate] SEO İçerik Paketi Üretiliyor: [${productTitleOrQuery}]`);

    const result = await generateFullSeoProductPackage({
      productTitleOrQuery,
      visionData,
      competitors,
      keywords,
      stats: stats || {
        totalAnalyzed: competitors.length,
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        medianPrice: 0,
        recommendedPrice: 0,
        avgRating: 4.5,
        totalReviews: 0,
        bestsellerCount: 0,
        topBrands: [],
        priceDistribution: [],
      },
      brandName,
      customNotes,
      suggestions,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("❌ [API /api/seo-analysis/generate] Hata:", error);
    return NextResponse.json(
      {
        error: error.message || "SEO içeriği üretilirken hata oluştu.",
      },
      { status: 500 }
    );
  }
}
