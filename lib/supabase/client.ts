import { createBrowserClient } from "@supabase/ssr";

// Untyped client - tip hatalarını önlemek için
// Tüm sorgular runtime'da doğru çalışır
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !url.startsWith("https://") || !key || key.includes("BURAYA")) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return createBrowserClient(url, key);
}
