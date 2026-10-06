import { NextRequest, NextResponse } from "next/server";
import { n11Client } from "@/lib/n11-api-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    if (categoryId) {
      const data = await n11Client.getCategoryAttributes(Number(categoryId));
      return NextResponse.json({ success: true, ...data });
    }

    const data = await n11Client.getCategories();
    return NextResponse.json({ success: true, categories: data.categories });
  } catch (error: any) {
    console.error("N11 GET categories error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "N11 kategorileri alınamadı." },
      { status: 500 }
    );
  }
}
