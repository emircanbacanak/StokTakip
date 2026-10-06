import { NextRequest, NextResponse } from "next/server";
import { idefixClient } from "@/lib/idefix-api-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const barcode = searchParams.get("barcode") || undefined;
    const state = searchParams.get("state") || undefined;
    const search = searchParams.get("search")?.toLowerCase().trim();

    const data = await idefixClient.getProducts({ page, limit, barcode, state });
    let filtered = data.products;

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(search) ||
          p.barcode?.toLowerCase().includes(search) ||
          p.productMainId?.toLowerCase().includes(search) ||
          p.vendorStockCode?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      products: filtered,
      totalCount: data.totalCount ?? filtered.length,
      pageCount: data.pageCount ?? 1,
      currentPage: data.currentPage ?? page,
    });
  } catch (error: any) {
    console.error("Idefix GET products error:", error.message);
    const isSecretIssue =
      error.message?.includes("VENDOR_SECRET_NOT_CORRECT") ||
      error.message?.includes("SECRET") ||
      error.message?.includes("401");
    return NextResponse.json({
      success: false,
      products: [],
      totalCount: 0,
      pageCount: 1,
      currentPage: 1,
      error: error.message || "Idefix ürünleri alınamadı.",
      requiresSecret: isSecretIssue,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { products } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir ürün gönderilmelidir." },
        { status: 400 }
      );
    }

    const result = await idefixClient.createProduct(products);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Idefix POST createProduct error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Idefix ürün oluşturma başarısız." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body; // [{ barcode, price, comparePrice, inventoryQuantity, deliveryDuration }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir stok/fiyat öğesi gönderilmelidir." },
        { status: 400 }
      );
    }

    const result = await idefixClient.updateInventory(items);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Idefix PUT inventory-upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Idefix stok & fiyat güncelleme başarısız." },
      { status: 500 }
    );
  }
}
