import { NextRequest, NextResponse } from "next/server";
import { updatePazaramaProductStatuses, getPazaramaProducts } from "@/lib/pazarama-api";
import { extractModelInfo } from "../products/route";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, code, productStatus, groupCode, syncAllVariants } = body;

    let statusItems: { code: string; productStatus: 1 | 10 }[] = [];

    if (Array.isArray(items) && items.length > 0) {
      statusItems = items.map((it: any) => ({
        code: String(it.code).trim(),
        productStatus: it.productStatus === 1 || it.productStatus === 10 ? it.productStatus : 1,
      }));
    } else if (code) {
      const status: 1 | 10 = productStatus === 1 || productStatus === 10 ? productStatus : 1;
      statusItems = [{ code: String(code).trim(), productStatus: status }];

      if (syncAllVariants && groupCode) {
        try {
          const allRes = await getPazaramaProducts({ size: 250 });
          const variants = allRes.listings.filter((l) => {
            const mInfo = extractModelInfo(l);
            return (
              (l.groupCode || "").trim().toLowerCase() === groupCode.trim().toLowerCase() ||
              (mInfo.groupCode || "").trim().toLowerCase() === groupCode.trim().toLowerCase() ||
              (mInfo.modelTitle || "").trim().toLowerCase() === groupCode.trim().toLowerCase()
            );
          });
          if (variants.length > 0) {
            statusItems = variants.map((v) => ({
              code: v.code,
              productStatus: status,
            }));
          }
        } catch {
          // Fallback to single item if search fails
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Durum bilgisi eksik." },
        { status: 400 }
      );
    }

    if (statusItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Durumu güncellenecek ürün bulunamadı." },
        { status: 400 }
      );
    }

    const result = await updatePazaramaProductStatuses(statusItems);

    return NextResponse.json({
      success: true,
      message:
        statusItems.length > 1
          ? `${statusItems.length} adet varyantın durumu güncellendi.`
          : result.message,
    });
  } catch (error: any) {
    console.error("Pazarama status POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Durum güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
