import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const env = (process.env.HEPSIBURADA_ENV || "sit").toLowerCase();
  const merchantId = process.env.HEPSIBURADA_MERCHANT_ID || "";
  const secretKey = process.env.HEPSIBURADA_SECRET_KEY || "";
  const userAgent = process.env.HEPSIBURADA_USER_AGENT || "ahenktasarim_dev";

  if (!merchantId || !secretKey) {
    return NextResponse.json(
      { success: false, error: "Hepsiburada API anahtarları tanımlı değil" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const trackingId = searchParams.get("id");

  if (!trackingId) {
    return NextResponse.json(
      { success: false, error: "Tracking ID parametresi eksik" },
      { status: 400 }
    );
  }

  const baseUrl =
    env === "prod"
      ? "https://mpop.hepsiburada.com/product/api"
      : "https://mpop-sit.hepsiburada.com/product/api";

  const authHeader = `Basic ${Buffer.from(`${merchantId}:${secretKey}`).toString("base64")}`;

  try {
    const url = `${baseUrl}/products/status/${trackingId}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json({
      success: res.ok,
      trackingId,
      status: res.status,
      data: data?.data ?? [],
      raw: data,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
