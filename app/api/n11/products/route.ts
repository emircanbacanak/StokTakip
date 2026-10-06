import { NextRequest, NextResponse } from "next/server";
import { n11Client, type N11ProductItem } from "@/lib/n11-api-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const size = parseInt(searchParams.get("size") || "50", 10);
    const stockCode = searchParams.get("stockCode") || undefined;
    const saleStatus = searchParams.get("saleStatus") || undefined;
    const productStatus = searchParams.get("productStatus") || undefined;
    const search = searchParams.get("search")?.toLowerCase().trim();

    const data = await n11Client.getProducts({
      page,
      size,
      stockCode,
      saleStatus,
      productStatus,
    });

    let filtered = data.content;
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(search) ||
          p.stockCode?.toLowerCase().includes(search) ||
          p.productMainId?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      products: filtered,
      totalElements: data.totalElements,
      totalPages: data.totalPages,
      page: data.number,
      size: data.size,
    });
  } catch (error: any) {
    console.error("N11 GET products error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "N11 ürünleri alınamadı." },
      { status: 500 }
    );
  }
}

/**
 * Yeni ürün ekleme (POST /api/n11/products)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { skus } = body;

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir SKU gönderilmelidir." },
        { status: 400 }
      );
    }

    const task = await n11Client.createProduct(skus);
    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("N11 POST createProduct error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "N11 ürün yükleme başarısız." },
      { status: 500 }
    );
  }
}

/**
 * Fiyat ve Stok Güncelleme (PUT /api/n11/products)
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body; // [{ stockCode, salePrice, listPrice, quantity }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir güncelleme öğesi gönderilmelidir." },
        { status: 400 }
      );
    }

    const task = await n11Client.updatePriceAndStock(items);
    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("N11 PUT updatePriceAndStock error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "N11 fiyat & stok güncelleme başarısız." },
      { status: 500 }
    );
  }
}

/**
 * Ürün Durumu Güncelleme (Active / Suspended) (PATCH /api/n11/products)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { stockCode, status, shipmentTemplate, preparingDay } = body;

    if (!stockCode) {
      return NextResponse.json(
        { success: false, error: "stockCode zorunludur." },
        { status: 400 }
      );
    }

    const task = await n11Client.updateProduct([
      {
        stockCode,
        status,
        shipmentTemplate,
        preparingDay,
      },
    ]);

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("N11 PATCH updateProduct error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "N11 ürün durumu güncellenemedi." },
      { status: 500 }
    );
  }
}
