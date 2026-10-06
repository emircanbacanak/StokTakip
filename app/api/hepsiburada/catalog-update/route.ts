import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const env = (process.env.HEPSIBURADA_ENV || "sit").toLowerCase();
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID || "";
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY || "";
  const userAgent = process.env.HEPSIBURADA_USER_AGENT || "ahenktasarim_dev";

  if (!merchantId || !secretKey) {
    return NextResponse.json({ success: false, error: "API anahtarları eksik" }, { status: 400 });
  }

  const baseUrl =
    env === "prod"
      ? "https://mpop.hepsiburada.com/product/api"
      : "https://mpop-sit.hepsiburada.com/product/api";

  const credentials = Buffer.from(`${merchantId}:${secretKey}`).toString("base64");

  try {
    const body = await req.json();
    const {
      merchantSku,
      barcode,
      title,
      description,
      brand = "Ahenk Tasarım",
      categoryId = 26012174,
      price = 299.9,
      stock = 50,
      desi = 2,
      vatRate = 20,
      images = [],
    } = body;

    if (!merchantSku) {
      return NextResponse.json({ success: false, error: "Merchant SKU zorunludur" }, { status: 400 });
    }

    const primaryImage =
      images[0] || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800";

    const attrObj: Record<string, any> = {
      merchantSku: merchantSku,
      VaryantGroupID: `GRP-${merchantSku}`,
      Barcode: barcode || `868${Date.now().toString().slice(-9)}0`,
      UrunAdi: title || "3D Baskı Tasarım Ürün",
      UrunAciklamasi: description || "Kaliteli 3D Baskı Tasarım Ürünü",
      Marka: brand || "Ahenk Tasarım",
      GarantiSuresi: 24,
      tax_vat_rate: String(vatRate),
      kg: String(desi),
      price: String(price),
      stock: String(stock),
      Image1: primaryImage,
    };

    // Ek görseller
    images.slice(1, 10).forEach((img: string, i: number) => {
      if (img && img.trim()) {
        attrObj[`Image${i + 2}`] = img.trim();
      }
    });

    const items = [
      {
        categoryId: Number(categoryId) || 26012174,
        merchant: merchantId,
        attributes: attrObj,
      },
    ];

    const form = new FormData();
    const jsonBlob = new Blob([JSON.stringify(items)], { type: "application/json" });
    form.append("file", jsonBlob, "products.json");

    const importRes = await fetch(`${baseUrl}/products/import`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      body: form,
    });

    const responseData = await importRes.json();
    const trackingId = responseData?.data?.trackingId || responseData?.trackingId;

    return NextResponse.json({
      success: importRes.ok && !!trackingId,
      trackingId,
      message: importRes.ok
        ? `Ürün bilgileri ve görseller güncellendi (Tracking ID: ${trackingId})`
        : responseData?.message || "Katalog güncelleme hatası",
      raw: responseData,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
