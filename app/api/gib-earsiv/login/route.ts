import { NextRequest, NextResponse } from "next/server";

const GIB_LOGIN_URL = "https://earsivportal.efatura.gov.tr/earsiv-services/assos-login";
const GIB_REFERRER = "https://earsivportal.efatura.gov.tr/intragiris.html";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username || process.env.GIB_USERNAME || "12911762").trim();
    const password = (body.password || process.env.GIB_PASSWORD || "973973").trim();

    if (!username || !password) {
      return NextResponse.json({ error: "GİB Kullanıcı kodu ve şifre gereklidir." }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.append("assoscmd", "anologin");
    params.append("rtype", "json");
    params.append("userid", username);
    params.append("sifre", password);
    params.append("sifre2", password);
    params.append("parola", "1");

    console.log("🔐 GİB e-Arşiv Giriş yapılıyor:", username);

    const res = await fetch(GIB_LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referer": GIB_REFERRER,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `GİB Servisi Hatası: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    console.log("📥 GİB Giriş Yanıtı:", JSON.stringify(data));

    if (data.error && data.error !== "0") {
      const msg = data.messages?.[0]?.text || "GİB Giriş Başarısız. Bilgilerinizi kontrol edin.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const token = data.token || data.data?.token;
    if (!token) {
      const msg = data.messages?.[0]?.text || "GİB Giriş Başarısız. Token alınamadı.";
      return NextResponse.json({ error: msg, details: data }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      token,
      message: "GİB e-Arşiv Portalına başarıyla giriş yapıldı.",
      data,
    });
  } catch (error) {
    console.error("❌ GİB Login Hatası:", error);
    return NextResponse.json(
      { error: "GİB bağlantı hatası", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
