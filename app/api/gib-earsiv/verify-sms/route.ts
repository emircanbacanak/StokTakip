import { NextRequest, NextResponse } from "next/server";
import { GibEArsivClient } from "@/lib/gib-earsiv-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, smsCode } = body;

    if (!token || !smsCode) {
      return NextResponse.json({ error: "Token ve SMS kodu gereklidir." }, { status: 400 });
    }

    const gibClient = new GibEArsivClient(token);
    await gibClient.verifySmsCode(smsCode);

    return NextResponse.json({
      success: true,
      message: "SMS kodu doğrulandı.",
    });
  } catch (error) {
    console.error("❌ GİB SMS Verify Hatası:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SMS Doğrulama başarısız" },
      { status: 400 }
    );
  }
}
