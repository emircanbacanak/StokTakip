---
inclusion: auto
---

# 🎯 Proje Bağlamı - Otomatik Yükleme

Bu steering file, her oturumda otomatik olarak yüklenir ve token kullanımını optimize eder.

## ⚡ ÖNCE BU KURALLARI UYGULA

### Token Optimizasyonu Kuralları (ZORUNLU)

**ASLA YAPMA:**
- ❌ Tüm projeyi tarama
- ❌ Tüm component'leri okuma
- ❌ Aynı dosyayı tekrar okuma
- ❌ Gereksiz migration dosyalarını okuma

**HER ZAMAN YAP:**
1. ✅ **İLK ADIM:** `.kiro/PROJECT_CONTEXT.md` oku (proje özeti burada)
2. ✅ **İKİNCİ ADIM:** İhtiyaca göre katalog dosyasını oku:
   - Component arıyorsan → `.kiro/COMPONENT_CATALOG.md`
   - Veritabanı işlemi yapacaksan → `.kiro/DATABASE_GUIDE.md`
   - Hızlı başlangıç için → `.kiro/QUICK_REFERENCE.md`
3. ✅ **SON ADIM:** Sadece değiştireceğin spesifik dosyayı oku

## Bağlam Stratejisi

**ÖNCE KONTROL ET:**
1. `.kiro/PROJECT_CONTEXT.md` dosyasını oku - Proje yapısı, mimari, veritabanı şeması burada
2. Sadece ihtiyacın olan spesifik dosyaları oku
3. Tüm projeyi taramak yerine hedefli sorgular yap

## Proje Özeti (Hızlı Referans)

**Teknoloji:** Next.js 16 + Supabase + TypeScript + Tailwind CSS  
**Amaç:** Stok ve sipariş takip sistemi  
**Veritabanı:** PostgreSQL (Supabase)

### Ana Tablolar
- `buyers` - Alıcılar
- `orders` - Siparişler
- `order_items` - Sipariş kalemleri
- `deliveries` - Teslimatlar
- `payments` - Ödemeler
- `colors` - Renkler
- `products` - Ürünler

### Klasör Yapısı
- `app/dashboard/` - Sayfa route'ları
- `components/` - React bileşenleri
- `lib/supabase/` - Veritabanı client'ları
- `lib/types/database.ts` - Tip tanımları

## Dosya Okuma Kuralları

### ❌ YAPMA
- Tüm component'leri bir anda okuma
- Aynı dosyayı tekrar tekrar okuma
- İhtiyaç olmadan migration dosyalarını okuma

### ✅ YAP
- Önce `.kiro/PROJECT_CONTEXT.md` oku
- Sadece değiştireceğin dosyaları oku
- Tip tanımları için `database.ts` referans al
- Benzer component'ler için mevcut örneklere bak

## Sık Kullanılan Dosyalar

### Veritabanı İşlemleri
- `lib/supabase/client.ts` - Client-side
- `lib/supabase/server.ts` - Server-side
- `lib/types/database.ts` - Tüm tipler

### UI Bileşenleri
- `components/ui/` - shadcn/ui bileşenleri
- `components/orders/` - Sipariş bileşenleri
- `components/dashboard/` - Dashboard bileşenleri

### Sayfalar
- `app/dashboard/orders/page.tsx` - Sipariş listesi
- `app/dashboard/production/page.tsx` - Üretim takibi
- `app/dashboard/buyers/page.tsx` - Alıcı yönetimi

## Yeni Özellik Geliştirme Akışı

1. **Spec Oluştur** - `.kiro/specs/` klasöründe
2. **Veritabanı** - Gerekirse migration ekle
3. **Tipler** - `database.ts` güncelle
4. **Component** - İlgili klasörde oluştur
5. **Sayfa** - `app/dashboard/` altında route ekle
6. **Test** - Tarayıcıda test et

## Token Tasarrufu İpuçları

### Senaryo 1: Yeni Sipariş Özelliği Ekle
```
1. PROJECT_CONTEXT.md oku (1 dosya)
2. components/orders/new-order-dialog.tsx oku (referans için)
3. Yeni component oluştur
```
**Token Tasarrufu:** ~15,000 token (tüm projeyi okumak yerine)

### Senaryo 2: Veritabanı Şeması Değişikliği
```
1. PROJECT_CONTEXT.md oku (şema burada)
2. database.ts oku (tipler için)
3. Migration yaz
```
**Token Tasarrufu:** ~10,000 token

### Senaryo 3: UI Bileşeni Güncelle
```
1. PROJECT_CONTEXT.md oku (bileşen sistemi)
2. Sadece ilgili component'i oku
3. Güncelle
```
**Token Tasarrufu:** ~8,000 token

## Önemli Notlar

- **Supabase şeması:** `supabase/schema-v2.sql` (GÜNCEL)
- **Tip tanımları:** `lib/types/database.ts` (tek kaynak)
- **Stil sistemi:** Tailwind utility class'ları
- **Form yönetimi:** React state (controlled components)

## Hızlı Komutlar

```bash
# Geliştirme
npm run dev

# Build
npm run build

# Lint
npm run lint
```

---

**Bu dosya otomatik yüklenir.** Detaylı bilgi için `.kiro/PROJECT_CONTEXT.md` dosyasını oku.
