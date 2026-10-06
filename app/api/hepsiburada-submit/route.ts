import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const env = (process.env.HEPSIBURADA_ENV || "sit").toLowerCase();
const merchantId = process.env.HEPSIBURADA_MERCHANT_ID || "";
const secretKey = process.env.HEPSIBURADA_SECRET_KEY || "";
const userAgent = process.env.HEPSIBURADA_USER_AGENT || "ahenktasarim_dev";

const MPOP_URL =
  env === "prod"
    ? "https://mpop.hepsiburada.com/product/api"
    : "https://mpop-sit.hepsiburada.com/product/api";

const LISTING_URL =
  env === "prod"
    ? "https://listing-external.hepsiburada.com"
    : "https://listing-external-sit.hepsiburada.com";

function hepsiburadaHeaders(): HeadersInit {
  const credentials = Buffer.from(`${merchantId}:${secretKey}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    "User-Agent": userAgent,
    Accept: "application/json",
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (!merchantId || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Hepsiburada API anahtarları tanımlı değil (.env.local kontrol edin).",
        },
        { status: 400 }
      );
    }

    const {
      categoryId,
      productName,
      description,
      brand = "Ahenk Tasarım",
      images = [],
      variants = [],
      attributes = {},
    } = payload;

    const variantGroupId = `GRP-${Date.now()}`;

    // Hepsiburada Katalog Ürün Formatı Oluştur
    const items = variants.map((v: any, index: number) => {
      const sku = v.merchantSku || `HB-SKU-${Date.now()}-${index + 1}`;
      const barcode = v.barcode || `868${Date.now().toString().slice(-9)}${index}`;
      const price = Number(v.price || 249.9);
      const stock = Number(v.availableStock || 50);
      const desi = Number(v.desi || 2);
      const vatRate = Number(v.vatRate || 20);
      const itemImages = v.images && v.images.length > 0 ? v.images : images;
      const primaryImage =
        itemImages[0] || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800";

      const attrObj: Record<string, any> = {
        merchantSku: sku,
        VaryantGroupID: variantGroupId,
        Barcode: barcode,
        UrunAdi: v.title || productName || "3D Baskı Ürün",
        UrunAciklamasi: description || productName || "Kaliteli 3D Baskı Tasarım Ürünü",
        Marka: brand || "Ahenk Tasarım",
        GarantiSuresi: 24,
        tax_vat_rate: String(vatRate),
        kg: String(desi),
        price: String(price),
        stock: String(stock),
        Image1: primaryImage,
        ...(attributes || {}),
        ...(v.attributes || {}),
      };

      // Ek görseller Image2..Image10
      itemImages.slice(1, 10).forEach((img: string, i: number) => {
        attrObj[`Image${i + 2}`] = img;
      });

      return {
        categoryId: Number(categoryId) || 26012174,
        merchant: merchantId,
        attributes: attrObj,
      };
    });

    // 1. Katalog Import API Gönderimi (multipart/form-data)
    let trackingId: string | undefined;
    let submitSuccess = false;
    let apiMessage = "";

    try {
      const credentials = Buffer.from(`${merchantId}:${secretKey}`).toString("base64");
      const form = new FormData();
      const jsonBlob = new Blob([JSON.stringify(items)], { type: "application/json" });
      form.append("file", jsonBlob, "products.json");

      const importRes = await fetch(`${MPOP_URL}/products/import`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "User-Agent": userAgent,
          Accept: "application/json",
        },
        body: form,
      });

      const responseText = await importRes.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { text: responseText };
      }

      if (importRes.ok && (responseData?.success || responseData?.data?.trackingId)) {
        submitSuccess = true;
        trackingId = responseData?.data?.trackingId || responseData?.trackingId;
        apiMessage = `Hepsiburada ${env.toUpperCase()} ortamına başarıyla aktarıldı (Tracking ID: ${trackingId})`;
      } else {
        // Hata durumunda da detay verelim
        apiMessage = `Hepsiburada Yanıtı (${importRes.status}): ${responseData?.message || responseText.slice(0, 300)}`;
      }
    } catch (apiErr: any) {
      apiMessage = `API Bağlantı Hatası: ${apiErr.message}`;
    }

    // 2. Supabase DB Kaydı (Varsa hepsiburada_listings veya trendyol_listings fallback)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
          ""
      );

      // Deneme: varsa hepsiburada_listings tablosuna kaydet
      const dbRecords = items.map((it: any) => ({
        merchant_id: merchantId,
        merchant_sku: it.attributes.merchantItemCode,
        barcode: it.attributes.barcode,
        title: it.attributes.name,
        price: it.attributes.price,
        stock: it.attributes.stock,
        category_id: it.categoryId,
        tracking_id: trackingId || null,
        status: submitSuccess ? "IN_REVIEW" : "DRAFT",
        environment: env,
        created_at: new Date().toISOString(),
      }));

      // Güvenli kayıt: hata verirse ignore et
      try {
        await (supabase.from("hepsiburada_listings").insert(dbRecords) as any);
      } catch {
        // ignore
      }
    } catch {
      // ignore db errors
    }

    return NextResponse.json({
      success: submitSuccess,
      trackingId,
      message: apiMessage,
      environment: env,
      itemCount: items.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Beklenmeyen sunucu hatası",
      },
      { status: 500 }
    );
  }
}
