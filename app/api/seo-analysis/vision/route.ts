import { NextRequest, NextResponse } from "next/server";
import { analyzeProductImageVision } from "@/lib/seo-ai-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Analiz edilecek görsel (Base64) gereklidir." },
        { status: 400 }
      );
    }

    console.log("👁️ [API /api/seo-analysis/vision] Görsel AI Vision ile analiz ediliyor...");

    const visionResult = await analyzeProductImageVision(imageBase64, mimeType);

    return NextResponse.json({
      success: true,
      data: visionResult,
    });
  } catch (error: any) {
    console.error("❌ [API /api/seo-analysis/vision] Hata:", error);
    return NextResponse.json(
      {
        error: error.message || "Görsel analizi sırasında hata oluştu.",
      },
      { status: 500 }
    );
  }
}
