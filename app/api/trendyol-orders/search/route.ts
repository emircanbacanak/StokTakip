import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials eksik");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("orderNumber");

    if (!orderNumber) {
      return NextResponse.json(
        { error: "orderNumber parametresi gerekli" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("trendyol_orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        found: false, 
        message: `Sipariş ${orderNumber} veritabanında bulunamadı` 
      });
    }

    return NextResponse.json({ found: true, order: data });
  } catch (error) {
    console.error("❌ Search error:", error);
    return NextResponse.json(
      {
        error: "Arama hatası",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
