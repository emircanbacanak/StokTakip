import { NextRequest, NextResponse } from "next/server";
import { trendruumClient } from "@/lib/trendruum-api-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'categories' | 'brands'
    const search = searchParams.get("search") || undefined;

    if (type === "brands") {
      const brands = await trendruumClient.getBrands(search);
      return NextResponse.json({ success: true, brands });
    }

    const categories = await trendruumClient.getCategories();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error("Trendruum GET categories/brands error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Veriler alınamadı." },
      { status: 500 }
    );
  }
}
