import { NextRequest, NextResponse } from "next/server";

/**
 * Trendyol Orders API Route
 * 
 * Trendyol API'den siparişleri çeker.
 * CORS sorununu önlemek için server-side çalışır.
 * 
 * Environment Variables:
 * - TRENDYOL_SELLER_ID: Satıcı ID
 * - TRENDYOL_API_KEY: API Key
 * - TRENDYOL_API_SECRET: API Secret
 */

const TRENDYOL_BASE_URL = "https://api.trendyol.com/sapigw/suppliers";

interface TrendyolCredentials {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
}

function getCredentials(): TrendyolCredentials | null {
  const sellerId = process.env.TRENDYOL_SELLER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;

  if (!sellerId || !apiKey || !apiSecret) {
    return null;
  }

  return { sellerId, apiKey, apiSecret };
}

function getBasicAuthHeader(apiKey: string, apiSecret: string): string {
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return `Basic ${credentials}`;
}

export async function GET(request: NextRequest) {
  try {
    const credentials = getCredentials();
    
    if (!credentials) {
      return NextResponse.json(
        { error: "Trendyol API credentials eksik. Lütfen .env.local dosyasını kontrol edin." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "50";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const orderNumber = searchParams.get("orderNumber");

    // Trendyol API endpoint
    const queryParams = new URLSearchParams({
      page,
      size,
    });

    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);
    if (status) queryParams.append("status", status);
    if (orderNumber) queryParams.append("orderNumber", orderNumber);

    const headers = {
      Authorization: getBasicAuthHeader(credentials.apiKey, credentials.apiSecret),
      "Content-Type": "application/json",
      "User-Agent": `${credentials.sellerId} - SelfIntegration`,
    };

    const v2Url = `https://apigw.trendyol.com/integration/order/sellers/${credentials.sellerId}/orders?${queryParams.toString()}`;
    const legacyUrl = `https://api.trendyol.com/sapigw/suppliers/${credentials.sellerId}/orders?${queryParams.toString()}`;

    console.log("🔍 Fetching Trendyol orders:", v2Url);

    let response = await fetch(v2Url, { method: "GET", headers });
    if (!response.ok) {
      console.log(`⚠️ v2 ${response.status}, legacy fallback deneniyor...`);
      response = await fetch(legacyUrl, { method: "GET", headers });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Trendyol API Error:", response.status, errorText);
      
      return NextResponse.json(
        { 
          error: `Trendyol API hatası: ${response.status}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("✅ Trendyol orders fetched:", data.totalElements || 0, "orders");

    return NextResponse.json(data);

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Beklenmeyen bir hata oluştu",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
