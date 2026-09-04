import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Tüm trendyol_orders kayıtlarının invoice_status'unu NotInvoiced yapar.
 * Sadece bir kez çalıştırılacak migration endpoint'i.
 */
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error, data } = await supabase
    .from("trendyol_orders")
    .update({ invoice_status: "NotInvoiced", invoice_number: null })
    .neq("invoice_status", "ManuallyInvoiced") // manuel işaretlenenlere dokunma
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: data?.length || 0 });
}
