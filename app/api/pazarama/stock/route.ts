import { NextRequest, NextResponse } from "next/server";
import { updatePazaramaStocks, getPazaramaProducts } from "@/lib/pazarama-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, code, stockCount, groupCode, syncAllVariants } = body;

    let stockItems: { code: string; stockCount: number }[] = [];

    if (Array.isArray(items)) {
      stockItems = items;
    } else if (code) {
      stockItems = [{ code, stockCount: Number(stockCount) }];

      if (syncAllVariants && groupCode) {
        const allRes = await getPazaramaProducts({ size: 250 });
        const variants = allRes.listings.filter(
          (l) =>
            (l.groupCode || "").trim().toLowerCase() ===
            groupCode.trim().toLowerCase()
        );
        stockItems = variants.map((v) => ({
          code: v.code,
          stockCount: Number(stockCount),
        }));
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Stok bilgileri eksik." },
        { status: 400 }
      );
    }

    const result = await updatePazaramaStocks(stockItems);

    return NextResponse.json({
      success: true,
      data: result.data,
      message:
        stockItems.length > 1
          ? `${stockItems.length} adet varyantın stoğu güncellendi.`
          : result.message,
    });
  } catch (error: any) {
    console.error("Pazarama stock POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Stok güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
