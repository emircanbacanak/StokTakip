import { NextRequest, NextResponse } from "next/server";
import {
  getPazaramaCategoryTree,
  getPazaramaCategoryAttributes,
  getPazaramaBrands,
  getPazaramaBatchResult,
  type PazaramaCategoryNode,
  type PazaramaBrand,
} from "@/lib/pazarama-api";
import { naturalSort } from "@/lib/utils";

// Önbellek
let cachedCategories: { data: PazaramaCategoryNode[]; timestamp: number } | null = null;
let cachedBrands: { data: PazaramaBrand[]; timestamp: number } | null = null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "categories" | "attributes" | "brands" | "batch"

    // 1. Kategori Ağacı
    if (type === "categories") {
      const now = Date.now();
      if (cachedCategories && now - cachedCategories.timestamp < 30 * 60 * 1000) {
        return NextResponse.json({ success: true, categories: cachedCategories.data });
      }

      const categories = await getPazaramaCategoryTree();
      cachedCategories = { data: categories, timestamp: now };
      return NextResponse.json({ success: true, categories });
    }

    // 2. Kategori Özellikleri
    if (type === "attributes") {
      const categoryId = searchParams.get("categoryId");
      if (!categoryId) {
        return NextResponse.json(
          { success: false, error: "categoryId parametresi zorunludur" },
          { status: 400 }
        );
      }

      const attributesData = await getPazaramaCategoryAttributes(categoryId);
      const rawAttrs = attributesData.attributes || [];
      const sortedAttrs = [...rawAttrs]
        .sort((a, b) => {
          if (a.isRequired && !b.isRequired) return -1;
          if (!a.isRequired && b.isRequired) return 1;
          return (a.displayName || a.name || "").localeCompare(b.displayName || b.name || "", "tr");
        })
        .map((attr) => ({
          ...attr,
          attributeValues: naturalSort(attr.attributeValues || [], (v: any) => v.value || v.name),
        }));

      return NextResponse.json({
        success: true,
        attributes: sortedAttrs,
      });
    }

    // 3. Markalar
    if (type === "brands") {
      const search = searchParams.get("search")?.toLowerCase().trim() || "";
      const page = parseInt(searchParams.get("page") || "1", 10);
      const size = parseInt(searchParams.get("size") || "250", 10);

      const now = Date.now();
      let allBrands = cachedBrands?.data;

      if (!allBrands || now - cachedBrands!.timestamp > 30 * 60 * 1000) {
        const result = await getPazaramaBrands(1, 1000);
        allBrands = naturalSort(result.brands, (b) => b.name);
        cachedBrands = { data: allBrands, timestamp: now };
      }

      let filtered = allBrands;
      if (search) {
        filtered = allBrands.filter((b) => b.name.toLowerCase().includes(search));
      }

      const startIndex = (page - 1) * size;
      const paginated = filtered.slice(startIndex, startIndex + size);

      return NextResponse.json({
        success: true,
        brands: paginated,
        total: filtered.length,
      });
    }

    // 4. Batch Sonucu
    if (type === "batch") {
      const batchRequestId = searchParams.get("batchRequestId");
      if (!batchRequestId) {
        return NextResponse.json(
          { success: false, error: "batchRequestId parametresi zorunludur" },
          { status: 400 }
        );
      }

      const batchData = await getPazaramaBatchResult(batchRequestId);
      return NextResponse.json({ success: true, batch: batchData });
    }

    return NextResponse.json(
      { success: false, error: "Geçersiz meta tipi (type parametresi bekleniyor)" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Pazarama meta GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Meta verisi alınamadı" },
      { status: 500 }
    );
  }
}
