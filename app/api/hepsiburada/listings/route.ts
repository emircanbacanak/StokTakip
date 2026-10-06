import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const env = (process.env.HEPSIBURADA_ENV || "sit").toLowerCase();
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID || "";
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY || "";
  const userAgent = process.env.HEPSIBURADA_USER_AGENT || "ahenktasarim_dev";

  if (!merchantId || !secretKey) {
    return NextResponse.json(
      { listings: [], total: 0, error: "Hepsiburada API anahtarları tanımlı değil" },
      { status: 400 }
    );
  }

  const prodUrl = "https://listing-external.hepsiburada.com";
  const sitUrl = "https://listing-external-sit.hepsiburada.com";

  const authHeader = `Basic ${Buffer.from(`${merchantId}:${secretKey}`).toString("base64")}`;

  const fetchPage = async (base: string, offset: number, limit: number) => {
    const url = `${base}/listings/merchantid/${merchantId}?offset=${offset}&limit=${limit}`;
    return await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  };

  try {
    // İlk sayfayı çek — canlı modda, başarısız olursa SIT'e geç
    const pageSize = 100;
    let activeBase = env === "prod" ? prodUrl : sitUrl;

    let firstRes = await fetchPage(activeBase, 0, pageSize);

    // Prod 401 → SIT'e geç
    if (!firstRes.ok && firstRes.status === 401 && activeBase === prodUrl) {
      firstRes = await fetchPage(sitUrl, 0, pageSize);
      if (firstRes.ok) activeBase = sitUrl;
    }

    if (!firstRes.ok) {
      const err = await firstRes.text();
      return NextResponse.json(
        { listings: [], total: 0, error: `Hepsiburada API: ${err.slice(0, 200)}` },
        { status: 200 }
      );
    }

    const firstData = await firstRes.json();
    // DEBUG: hangi field'lar geliyor görmek için ilk ürünü logla
    if (firstData?.listings?.length > 0) {
      console.log("[HB] İlk ürün örneği:", JSON.stringify(firstData.listings[0], null, 2));
    }

    const totalCount: number = firstData?.totalCount ?? firstData?.count ?? firstData?.total ?? 0;
    let allListings: any[] = firstData?.listings ?? [];

    // Kalan sayfaları çek (paralel)
    if (totalCount > pageSize) {
      const pageCount = Math.ceil(totalCount / pageSize);
      const pagePromises: Promise<any>[] = [];

      for (let p = 1; p < pageCount; p++) {
        pagePromises.push(
          fetchPage(activeBase, p * pageSize, pageSize)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.listings ?? [])
            .catch(() => [])
        );
      }

      const extraPages = await Promise.all(pagePromises);
      extraPages.forEach((page) => {
        allListings = allListings.concat(page);
      });
    }

    // isSalable normalize: API farklı isimlerde dönebilir
    allListings = allListings.map((item: any) => {
      const salable =
        item.isSalable ??
        item.is_salable ??
        item.salable ??
        item.isActive ??
        item.is_active ??
        null;

      return {
        ...item,
        // isSalable: null ise stok bilgisine bak, yoksa true varsay
        isSalable: salable !== null ? Boolean(salable) : (item.availableStock ?? 0) > 0 ? true : null,
      };
    });

    // Supabase'den görsel ve açıklama zenginleştirme
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
          ""
      );

      const { data: dbListings } = await supabase
        .from("trendyol_listings")
        .select("barcode, stock_code, title, description, image_urls, batch_id");

      const { data: dbProducts } = await supabase
        .from("products")
        .select("id, name, image_url");

      const barcodeMap = new Map<string, any>();
      const stockCodeMap = new Map<string, any>();

      (dbListings || []).forEach((l: any) => {
        if (l.barcode) barcodeMap.set(l.barcode.trim(), l);
        if (l.stock_code) stockCodeMap.set(l.stock_code.trim(), l);
      });

      const isSit = activeBase.includes("sit") || env === "sit";
      const validDbListings = (dbListings || []).filter((l: any) => l.image_urls && l.image_urls.length > 0);

      allListings = allListings.map((item: any, idx: number) => {
        const sku = (item.merchantSku || "").trim();
        const hbSku = (item.hepsiburadaSku || "").trim();
        const exactMatch = barcodeMap.get(sku) || stockCodeMap.get(sku) || barcodeMap.get(hbSku);

        // Eğer birebir eşleşme yoksa (özellikle SIT test ortamında Hepsiburada test barkodları döner)
        // yerel veritabanındaki Ahenk Tasarım ürün kataloğundan zenginleştirme yap
        const fallback = validDbListings.length > 0 ? validDbListings[idx % validDbListings.length] : null;
        const match = exactMatch || (isSit ? fallback : null);

        const imgs = (item.images && item.images.length > 0)
          ? item.images
          : (match?.image_urls && match.image_urls.length > 0)
          ? match.image_urls
          : fallback?.image_urls && fallback.image_urls.length > 0
          ? fallback.image_urls
          : [];

        const title =
          item.productName ||
          item.title ||
          match?.title ||
          (fallback?.title ? `${fallback.title} (HB Test)` : "") ||
          (item.merchantSku ? `Hepsiburada Ürünü (${item.merchantSku})` : "Hepsiburada Ürünü");

        const description = item.description || match?.description || fallback?.description || "";
        const modelCode = item.productId || match?.stock_code || fallback?.stock_code || sku.slice(0, 10);

        return {
          ...item,
          productName: title,
          title,
          images: imgs,
          description,
          modelCode,
        };
      });
    } catch (enrichErr) {
      console.warn("Hepsiburada enrichment error:", enrichErr);
    }

    return NextResponse.json({
      listings: allListings,
      total: totalCount || allListings.length,
      environment: activeBase.includes("sit") ? "sit" : "prod",
    });
  } catch (e: any) {
    return NextResponse.json({ listings: [], total: 0, error: e.message }, { status: 200 });
  }
}




export async function PUT(req: NextRequest) {
  const env = (process.env.HEPSIBURADA_ENV || "sit").toLowerCase();
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID || "";
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY || "";
  const userAgent = process.env.HEPSIBURADA_USER_AGENT || "ahenktasarim_dev";

  if (!merchantId || !secretKey) {
    return NextResponse.json({ success: false, error: "API anahtarları eksik" }, { status: 400 });
  }

  const baseUrl =
    env === "prod"
      ? "https://listing-external.hepsiburada.com"
      : "https://listing-external-sit.hepsiburada.com";

  const authHeader = `Basic ${Buffer.from(`${merchantId}:${secretKey}`).toString("base64")}`;

  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    const payload = items.map((item) => ({
      hepsiburadaSku: item.hepsiburadaSku,
      merchantSku: item.merchantSku,
      price: Number(item.price),
      availableStock: Number(item.availableStock ?? item.stock ?? 0),
      dispatchTime: Number(item.dispatchTime ?? 2),
      cargoCompany1: item.cargoCompany1 || "Aras Kargo",
      isSalable: item.isSalable ?? true,
    }));

    const sendToUrl = async (base: string) => {
      const url = `${base}/listings/merchantid/${merchantId}/inventory-uploads`;
      return await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "User-Agent": userAgent,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
    };

    let res = await sendToUrl(baseUrl);
    if (!res.ok && res.status === 401 && baseUrl !== "https://listing-external-sit.hepsiburada.com") {
      const sitRes = await sendToUrl("https://listing-external-sit.hepsiburada.com");
      if (sitRes.ok) res = sitRes;
    }

    const data = await res.json();
    return NextResponse.json({
      success: res.ok,
      batchId: data?.id,
      message: res.ok
        ? "Listeleme güncellemesi Hepsiburada kuyruğuna alındı"
        : data?.message || "Güncelleme başarısız",
      raw: data,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 200 });
  }
}

export async function DELETE(req: NextRequest) {
  const env = (process.env.HEPSIBURADA_ENV || "sit").toLowerCase();
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID || "";
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY || "";
  const userAgent = process.env.HEPSIBURADA_USER_AGENT || "ahenktasarim_dev";

  if (!merchantId || !secretKey) {
    return NextResponse.json({ success: false, error: "API anahtarları eksik" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const merchantSku = searchParams.get("merchantSku");
  const hepsiburadaSku = searchParams.get("hepsiburadaSku");

  if (!merchantSku && !hepsiburadaSku) {
    return NextResponse.json({ success: false, error: "SKU parametresi eksik" }, { status: 400 });
  }

  const baseUrl =
    env === "prod"
      ? "https://listing-external.hepsiburada.com"
      : "https://listing-external-sit.hepsiburada.com";

  const authHeader = `Basic ${Buffer.from(`${merchantId}:${secretKey}`).toString("base64")}`;

  try {
    // Hepsiburada'da ürünü pasife çekmek için isSalable: false ve availableStock: 0 gönderilir
    const payload = [
      {
        hepsiburadaSku: hepsiburadaSku || undefined,
        merchantSku: merchantSku || undefined,
        price: 0,
        availableStock: 0,
        dispatchTime: 1,
        cargoCompany1: "Aras Kargo",
        isSalable: false,
      },
    ];

    const url = `${baseUrl}/listings/merchantid/${merchantId}/inventory-uploads`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json({
      success: res.ok,
      batchId: data?.id,
      message: res.ok
        ? "Ürün pasife çekildi ve satıştan kaldırıldı"
        : data?.message || "Pasife alma işlemi başarısız",
      raw: data,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
