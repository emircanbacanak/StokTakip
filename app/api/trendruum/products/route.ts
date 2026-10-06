import { NextRequest, NextResponse } from "next/server";
import { trendruumClient, type TrendruumProduct } from "@/lib/trendruum-api-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const barcode = searchParams.get("barcode") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search")?.toLowerCase().trim();

    const hasExplicitPage = searchParams.has("page");
    const data = await trendruumClient.getProducts({
      page: hasExplicitPage ? page : undefined,
      limit: 100,
      per_page: 100,
      barcode,
      status,
      fetchAll: !hasExplicitPage,
    });
    let filtered = data.data;

    // Supabase ile görsel/veri zenginleştirme (eksik resim veya açıklama varsa tamamla)
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
          ""
      );

      const { data: dbListings } = await supabase
        .from("trendyol_listings")
        .select("barcode, stock_code, title, description, image_urls");

      const barcodeMap = new Map<string, any>();
      const stockCodeMap = new Map<string, any>();
      (dbListings || []).forEach((l: any) => {
        if (l.barcode) barcodeMap.set(l.barcode.trim(), l);
        if (l.stock_code) stockCodeMap.set(l.stock_code.trim(), l);
      });

      filtered = filtered.map((p) => {
        const b = (p.barcode || "").trim();
        const sc = ((p as any).stock_code || "").trim();
        const match = barcodeMap.get(b) || stockCodeMap.get(sc) || barcodeMap.get(sc) || stockCodeMap.get(b);

        let imgs = p.images && p.images.length > 0 ? p.images : [];
        if (imgs.length === 0 && match?.image_urls && match.image_urls.length > 0) {
          imgs = match.image_urls;
        }

        return {
          ...p,
          images: imgs,
          description: p.description || match?.description || "",
        };
      });
    } catch (enrichErr) {
      console.warn("Trendruum Supabase enrichment warning:", enrichErr);
    }

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(search) ||
          p.barcode?.toLowerCase().includes(search) ||
          p.product_main_id?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      products: filtered,
      total: data.total,
      current_page: data.current_page,
      last_page: data.last_page,
    });
  } catch (error: any) {
    console.error("Trendruum GET products error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Trendruum ürünleri alınamadı." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await trendruumClient.createProduct(body);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Trendruum POST product error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Trendruum ürün ekleme başarısız." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { stockItems, priceItems } = body;

    const results: any = {};
    if (stockItems && Array.isArray(stockItems) && stockItems.length > 0) {
      results.stock = await trendruumClient.updateStock(stockItems);
    }
    if (priceItems && Array.isArray(priceItems) && priceItems.length > 0) {
      results.price = await trendruumClient.updatePrice(priceItems);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Trendruum PUT stock/price error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Trendruum stok & fiyat güncelleme başarısız." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body; // [{ barcode, status: "active" | "passive" }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir durum güncelleme öğesi gereklidir." },
        { status: 400 }
      );
    }

    const result = await trendruumClient.updateStatus(items);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Trendruum PATCH status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Trendruum durum güncelleme başarısız." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Ürün ID gereklidir." },
        { status: 400 }
      );
    }

    const result = await trendruumClient.deleteProduct(id);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Trendruum DELETE product error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Trendruum ürün silinemedi." },
      { status: 500 }
    );
  }
}
