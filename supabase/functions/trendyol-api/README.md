# trendyol-api Edge Function

## Gerekli Environment Variables (Supabase Secret)

Supabase Dashboard → Settings → Edge Functions → Secrets bölümüne ekleyin:

```
TRENDYOL_SELLER_ID         # Trendyol Satıcı ID
TRENDYOL_API_KEY           # Trendyol API Key
TRENDYOL_API_SECRET        # Trendyol API Secret
TRENDYOL_DEFAULT_CATEGORY_ID  # Varsayılan kategori ID (örn: 411)
TRENDYOL_BRAND_ID          # Trendyol Marka ID
TRENDYOL_CARGO_COMPANY_ID  # Kargo şirketi ID (TEX/PTT = 10)
SUPABASE_SERVICE_ROLE_KEY  # Otomatik mevcut
SUPABASE_URL               # Otomatik mevcut
```

**Not:** `TRENDYOL_SELLER_ID` boşsa, fonksiyon **simülasyon modunda** çalışır —
gerçek API isteği atmaz ama Supabase DB'ye `approved` olarak kaydeder.
Geliştirme ortamında bu mod idealdir.

## Deploy

```bash
supabase functions deploy trendyol-api
```

## Otomatik Özellikler

- **Otonom Barkod:** `TY` + timestamp(base36) + random(4) — kullanıcıdan barkod istenmez
- **Retry:** Barkod çakışması (400) → yeni barkod üret, max 5 deneme
- **Açıklama Öneki:** `"Toptan sipariş vermeyin. "` — veritabanı trigger'ı + Edge Function + Frontend üç katmanda da uygulanır
