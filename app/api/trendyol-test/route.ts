import { NextResponse } from "next/server";

/**
 * Trendyol API Test Endpoint
 * Credentials ve bağlantıyı test eder
 */

const TRENDYOL_BASE_URL = "https://api.trendyol.com/sapigw/suppliers";

export async function GET() {
  try {
    const sellerId = process.env.TRENDYOL_SELLER_ID;
    const apiKey = process.env.TRENDYOL_API_KEY;
    const apiSecret = process.env.TRENDYOL_API_SECRET;

    console.log("🔍 Testing Trendyol API...");
    console.log("Seller ID:", sellerId);
    console.log("API Key:", apiKey ? "✓ Set" : "✗ Missing");
    console.log("API Secret:", apiSecret ? "✓ Set" : "✗ Missing");

    if (!sellerId || !apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        error: "Credentials eksik",
        details: {
          sellerId: !!sellerId,
          apiKey: !!apiKey,
          apiSecret: !!apiSecret,
        }
      }, { status: 500 });
    }

    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const authHeader = `Basic ${credentials}`;

    // Test request - son 7 günün siparişleri
    const endDate = Date.now();
    const startDate = endDate - (7 * 24 * 60 * 60 * 1000);

    const apiUrl = `${TRENDYOL_BASE_URL}/${sellerId}/orders?page=0&size=10&startDate=${startDate}&endDate=${endDate}`;

    console.log("📡 API URL:", apiUrl);
    console.log("🔑 Auth Header:", authHeader.substring(0, 20) + "...");

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        "User-Agent": "TrendyolSupplierAPI/1.0",
      },
    });

    console.log("📥 Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", errorText);
      
      return NextResponse.json({
        success: false,
        status: response.status,
        error: errorText,
        apiUrl,
      }, { status: response.status });
    }

    const data = await response.json();
    console.log("✅ Success! Orders count:", data.totalElements);

    return NextResponse.json({
      success: true,
      message: "Trendyol API bağlantısı başarılı!",
      ordersCount: data.totalElements || 0,
      page: data.page,
      totalPages: data.totalPages,
      sampleOrder: data.content?.[0] || null,
      fullResponse: data, // Tam API yanıtını göster
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json({
      success: false,
      error: "Beklenmeyen hata",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
