import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const env = (process.env.HEPSIBURADA_ENV || "sit").toLowerCase();
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID || "";
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY || "";
  const userAgent = process.env.HEPSIBURADA_USER_AGENT || "ahenktasarim_dev";

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase();
  const categoryId = searchParams.get("categoryId");

  const baseUrl =
    env === "prod"
      ? "https://mpop.hepsiburada.com/product/api"
      : "https://mpop-sit.hepsiburada.com/product/api";

  const authHeader = `Basic ${Buffer.from(`${merchantId}:${secretKey}`).toString("base64")}`;

  // 1. Kategori Özellikleri İsteği
  if (categoryId) {
    try {
      const url = `${baseUrl}/categories/${categoryId}/attributes`;
      const res = await fetch(url, {
        headers: {
          Authorization: authHeader,
          "User-Agent": userAgent,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        return NextResponse.json({ attributes: [] }, { status: res.status });
      }

      const data = await res.json();
      const base = data?.data?.baseAttributes || [];
      const cat = data?.data?.categoryAttributes || [];
      const allAttributes = [...base, ...cat];

      return NextResponse.json({
        attributes: allAttributes,
        baseAttributes: base,
        categoryAttributes: cat,
      });
    } catch (e: any) {
      return NextResponse.json({ error: e.message, attributes: [] }, { status: 500 });
    }
  }

  // 2. Kategori Arama / Listeleme İsteği
  try {
    const url = `${baseUrl}/categories/get-all-categories?leaf=true&status=ACTIVE`;
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader,
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ categories: [] }, { status: res.status });
    }

    const data = await res.json();
    let categories: any[] = data?.data ?? [];

    if (q) {
      categories = categories.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.displayName?.toLowerCase().includes(q) ||
          (c.paths && c.paths.some((p: string) => p.toLowerCase().includes(q)))
      );
    }

    return NextResponse.json({
      categories: categories.slice(0, 30),
      total: categories.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, categories: [] }, { status: 500 });
  }
}
