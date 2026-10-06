import { NextRequest, NextResponse } from "next/server";
import { updatePazaramaPrices, getPazaramaProducts } from "@/lib/pazarama-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, code, listPrice, salePrice, groupCode, syncAllVariants } = body;

    let priceItems: { code: string; listPrice: number; salePrice: number }[] = [];

    if (Array.isArray(items)) {
      priceItems = items;
    } else if (code) {
      priceItems = [{ code, listPrice: Number(listPrice), salePrice: Number(salePrice) }];

      if (syncAllVariants && groupCode) {
        const allRes = await getPazaramaProducts({ size: 250 });
        const variants = allRes.listings.filter(
          (l) =>
            (l.groupCode || "").trim().toLowerCase() ===
            groupCode.trim().toLowerCase()
        );
        priceItems = variants.map((v) => ({
          code: v.code,
          listPrice: Number(listPrice),
          salePrice: Number(salePrice),
        }));
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Fiyat bilgileri eksik." },
        { status: 400 }
      );
    }

    const result = await updatePazaramaPrices(priceItems);

    return NextResponse.json({
      success: true,
      data: result.data,
      message:
        priceItems.length > 1
          ? `${priceItems.length} adet varyantın fiyatı güncellendi.`
          : result.message,
    });
  } catch (error: any) {
    console.error("Pazarama price POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fiyat güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
