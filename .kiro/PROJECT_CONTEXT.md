# 📦 Stok & Sipariş Takip Sistemi - Proje Bağlamı

> **Son Güncelleme:** 5 Mayıs 2026  
> **Amaç:** Bu dosya, gelecek AI oturumlarında token kullanımını optimize etmek için proje yapısını, mimariyi ve önemli kararları dokümante eder.

---

## 🎯 Proje Özeti

**Ne:** Mobil uyumlu, PWA destekli stok ve sipariş yönetim uygulaması  
**Kim İçin:** Küçük/orta ölçekli üretim yapan işletmeler  
**Temel İşlev:** Sipariş takibi, üretim yönetimi, alıcı yönetimi, stok kontrolü

---

## 🏗️ Teknoloji Stack'i

| Kategori | Teknoloji | Versiyon | Kullanım Amacı |
|----------|-----------|----------|----------------|
| **Framework** | Next.js | 16.2.4 | React tabanlı full-stack framework |
| **UI Kütüphanesi** | React | 19.0.0 | Kullanıcı arayüzü |
| **Veritabanı** | Supabase | 2.47.10 | PostgreSQL + Auth + Storage |
| **Stil** | Tailwind CSS | 3.4.1 | Utility-first CSS |
| **Komponent** | shadcn/ui + Radix UI | - | Erişilebilir UI bileşenleri |
| **Grafik** | Recharts | 2.15.0 | Dashboard grafikleri |
| **Tablo** | TanStack Table | 8.21.3 | Veri tabloları |
| **Dil** | TypeScript | 5.x | Tip güvenliği |

---

## 📁 Proje Yapısı (Kritik Dosyalar)

```
stok-siparis-takip/
├── app/                          # Next.js App Router
│   ├── dashboard/               # Ana uygulama sayfaları
│   │   ├── page.tsx            # Dashboard ana sayfa
│   │   ├── orders/             # Sipariş yönetimi
│   │   ├── production/         # Üretim takibi
│   │   ├── buyers/             # Alıcı yönetimi
│   │   ├── products/           # Ürün/stok yönetimi
│   │   ├── accounting/         # Muhasebe
│   │   └── colors/             # Renk yönetimi
│   ├── invoice/[orderId]/      # Fatura sayfası
│   ├── setup/                  # İlk kurulum
│   └── layout.tsx              # Root layout
│
├── components/                  # React bileşenleri
│   ├── dashboard/              # Dashboard bileşenleri
│   ├── orders/                 # Sipariş bileşenleri (9 dialog)
│   ├── production/             # Üretim bileşenleri
│   ├── buyers/                 # Alıcı bileşenleri
│   ├── products/               # Ürün bileşenleri
│   ├── ui/                     # shadcn/ui bileşenleri
│   └── layout/                 # Layout bileşenleri
│
├── lib/                        # Yardımcı fonksiyonlar
│   ├── supabase/
│   │   ├── client.ts          # Client-side Supabase
│   │   └── server.ts          # Server-side Supabase
│   ├── types/
│   │   └── database.ts        # Supabase tip tanımları
│   ├── color-map.ts           # Renk eşleştirme
│   └── utils.ts               # Genel yardımcılar
│
├── supabase/                   # Veritabanı migration'ları
│   ├── schema-v2.sql          # Ana şema (GÜNCEL)
│   └── migration-*.sql        # Çeşitli migration'lar
│
└── .kiro/                      # Kiro AI yapılandırması
    └── specs/                  # Özellik spesifikasyonları
        └── product-cost-calculation/
```

---

## 🗄️ Veritabanı Şeması

### Tablolar ve İlişkiler

```
buyers (Alıcılar)
├── id: uuid (PK)
├── name: text
├── phone: text
├── address: text
└── created_at: timestamp

orders (Siparişler)
├── id: uuid (PK)
├── buyer_id: uuid (FK → buyers)
├── total_amount: numeric
├── paid_amount: numeric
├── status: enum (pending, in_production, completed, delivered)
├── notes: text
├── created_at: timestamp
└── updated_at: timestamp

order_items (Sipariş Kalemleri)
├── id: uuid (PK)
├── order_id: uuid (FK → orders)
├── product_name: text
├── color: text
├── quantity: integer
├── produced_quantity: integer
├── delivered_quantity: integer
├── unit_price: numeric
└── created_at: timestamp

deliveries (Teslimatlar)
├── id: uuid (PK)
├── order_id: uuid (FK → orders)
├── delivery_date: date
├── notes: text
└── created_at: timestamp

delivery_items (Teslimat Kalemleri)
├── id: uuid (PK)
├── delivery_id: uuid (FK → deliveries)
├── order_item_id: uuid (FK → order_items)
├── quantity: integer
└── created_at: timestamp

payments (Ödemeler)
├── id: uuid (PK)
├── order_id: uuid (FK → orders)
├── delivery_id: uuid (FK → deliveries, nullable)
├── amount: numeric
├── payment_date: date
├── payment_method: text
├── notes: text
└── created_at: timestamp

colors (Renkler)
├── id: uuid (PK)
├── name: text
├── usage_count: integer
└── created_at: timestamp

products (Ürünler)
├── id: uuid (PK)
├── name: text
├── description: text
├── image_url: text
└── created_at: timestamp
```

### Önemli İlişkiler
- Bir alıcının birden fazla siparişi olabilir (1:N)
- Bir siparişin birden fazla kalemi olabilir (1:N)
- Bir sipariş birden fazla teslimat alabilir (1:N)
- Bir teslimat birden fazla ödeme alabilir (1:N)

---

## 🎨 UI Bileşen Sistemi

### shadcn/ui Bileşenleri (components/ui/)
- `button.tsx` - Buton bileşeni
- `dialog.tsx` - Modal/dialog
- `input.tsx` - Form input
- `select.tsx` - Dropdown seçici
- `table.tsx` - Veri tablosu
- `card.tsx` - Kart container
- `badge.tsx` - Durum badge'leri
- `toast.tsx` - Bildirimler
- `progress.tsx` - İlerleme çubuğu
- `color-badge.tsx` - Özel renk badge'i

### Özel Bileşenler
- `confirm-dialog.tsx` - Onay dialogu (useConfirm hook ile)
- `setup-banner.tsx` - İlk kurulum banner'ı
- `theme-provider.tsx` - Dark/light mode

---

## 🔑 Önemli Özellikler

### 1. Sipariş Yönetimi (components/orders/)
- **new-order-dialog.tsx** - Yeni sipariş oluşturma
- **edit-order-dialog.tsx** - Sipariş düzenleme
- **order-detail-dialog-v2.tsx** - Sipariş detayları (GÜNCEL)
- **add-colors-dialog.tsx** - Sipariş renklerini güncelleme
- **new-delivery-dialog.tsx** - Teslimat ekleme
- **new-payment-dialog.tsx** - Ödeme ekleme
- **invoice-dialog.tsx** - Fatura görüntüleme
- **filament-input-dialog.tsx** - Filament girişi

### 2. Üretim Takibi
- +/- butonlarla üretim miktarı güncelleme
- İlerleme çubuğu ile görselleştirme
- Renk bazlı filtreleme

### 3. Dashboard
- **dashboard-stats.tsx** - İstatistik kartları
- **color-chart.tsx** - Renk dağılım grafiği (Recharts)
- **recent-orders.tsx** - Son siparişler listesi

### 4. PWA Desteği
- `public/manifest.json` - PWA manifest
- `public/icon-192.png` - Uygulama ikonu
- Mobil cihazlara yüklenebilir

---

## 🔐 Supabase Entegrasyonu

### Client-side (lib/supabase/client.ts)
```typescript
// Browser'da çalışan Supabase client
import { createBrowserClient } from '@supabase/ssr'
```

### Server-side (lib/supabase/server.ts)
```typescript
// Server Component'lerde çalışan Supabase client
import { createServerClient } from '@supabase/ssr'
```

### Kullanım Örneği
```typescript
// Client Component
const supabase = createClient()
const { data } = await supabase.from('orders').select('*')

// Server Component
const supabase = await createServerClient()
const { data } = await supabase.from('orders').select('*')
```

---

## 📊 Veri Akışı Örnekleri

### Yeni Sipariş Oluşturma
1. Kullanıcı `new-order-dialog.tsx` açar
2. Alıcı seçer, ürün/renk/adet girer
3. Form submit → Supabase'e POST
4. `orders` tablosuna yeni kayıt
5. `order_items` tablosuna kalemler eklenir
6. `colors` tablosunda `usage_count` güncellenir
7. Toast bildirimi gösterilir
8. Liste yenilenir

### Üretim Güncelleme
1. Kullanıcı `production-client.tsx` sayfasında +/- butonuna basar
2. `order_items.produced_quantity` güncellenir
3. İlerleme çubuğu otomatik güncellenir
4. Sipariş durumu otomatik değişir (trigger)

### Teslimat Ekleme
1. `new-delivery-dialog.tsx` açılır
2. Teslimat tarihi ve kalemler seçilir
3. `deliveries` tablosuna kayıt
4. `delivery_items` tablosuna kalemler
5. `order_items.delivered_quantity` güncellenir
6. Ödeme eklenebilir (opsiyonel)

---

## 🎯 Önemli Kararlar ve Kurallar

### 1. Dosya Adlandırma
- Tüm component dosyaları kebab-case: `new-order-dialog.tsx`
- Client component'ler `-client.tsx` ile biter
- Server component'ler varsayılan

### 2. Veri Çekme Stratejisi
- Server Component'lerde direkt Supabase query
- Client Component'lerde `useEffect` + state
- Realtime subscription kullanılmıyor (şimdilik)

### 3. Form Yönetimi
- Controlled component'ler (React state)
- Form validation manuel (şimdilik)
- Toast ile kullanıcı bildirimi

### 4. Stil Yaklaşımı
- Tailwind utility class'ları
- `cn()` helper ile class birleştirme
- Responsive: mobile-first

### 5. Tip Güvenliği
- Tüm Supabase tipleri `database.ts`'de
- Tip kısayolları export edilmiş
- `OrderWithDetails` gibi genişletilmiş tipler

---

## 🚀 Geliştirme Komutları

```bash
# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Production sunucusu
npm start

# Linting
npm run lint
```

---

## 📝 Aktif Spec'ler

### product-cost-calculation
- **Durum:** Tasarım aşamasında
- **Dosyalar:** requirements.md, design.md, tasks.md
- **Amaç:** Ürün maliyet hesaplama sistemi

---

## 🔍 Hızlı Referans

### Yeni Özellik Eklerken
1. İlgili sayfa klasörüne git (`app/dashboard/...`)
2. Gerekirse yeni component oluştur (`components/...`)
3. Supabase query'leri ekle
4. Tip tanımlarını güncelle (`database.ts`)
5. Migration gerekiyorsa `supabase/` klasörüne ekle

### Veritabanı Değişikliği
1. `supabase/` klasöründe yeni migration dosyası oluştur
2. SQL'i yaz ve test et
3. `database.ts` tiplerini güncelle
4. İlgili component'leri güncelle

### UI Bileşeni Ekleme
1. shadcn/ui'dan ekle: `npx shadcn-ui@latest add [component]`
2. Veya `components/ui/` klasöründe özel bileşen oluştur
3. Tailwind class'larını kullan

---

## 🎨 Renk Sistemi

### Durum Renkleri
- **Pending (Bekliyor):** Yellow - `bg-yellow-100 text-yellow-800`
- **In Production (Üretimde):** Blue - `bg-blue-100 text-blue-800`
- **Completed (Tamamlandı):** Green - `bg-green-100 text-green-800`
- **Delivered (Teslim Edildi):** Gray - `bg-gray-100 text-gray-800`

### Ürün Renkleri
`lib/color-map.ts` dosyasında tanımlı renk eşleştirmeleri var.

---

## 🐛 Bilinen Sorunlar ve Çözümler

### Problem: Supabase bağlantı hatası
**Çözüm:** `.env.local` dosyasını kontrol et, değişkenlerin doğru olduğundan emin ol

### Problem: Build hatası
**Çözüm:** `npm install` çalıştır, `node_modules` ve `.next` klasörlerini sil

### Problem: Tip hataları
**Çözüm:** `database.ts` dosyasını Supabase'den yeniden generate et

---

## 📚 Ek Dokümantasyon

- **README.md** - Kurulum ve temel bilgiler
- **QUICK-START.md** - Hızlı başlangıç rehberi
- **IMPLEMENTATION-SUMMARY.md** - Uygulama özeti
- **UPGRADE-GUIDE.md** - Versiyon yükseltme rehberi

---

## 💡 Token Optimizasyonu İpuçları

### Gelecek Oturumlarda
1. **Bu dosyayı oku** - Proje yapısını anlamak için
2. **Sadece ilgili dosyaları oku** - Tüm projeyi okuma
3. **Tip tanımlarını referans al** - `database.ts`'yi tekrar okuma
4. **Spec dosyalarını kontrol et** - `.kiro/specs/` klasöründe

### Sık Kullanılan Sorgular
- "Sipariş sistemi nasıl çalışıyor?" → Bu dosyayı oku
- "Veritabanı şeması nedir?" → Bu dosyanın "Veritabanı Şeması" bölümü
- "Hangi bileşenler var?" → Bu dosyanın "UI Bileşen Sistemi" bölümü
- "Yeni özellik nasıl eklenir?" → Bu dosyanın "Hızlı Referans" bölümü

---

**Not:** Bu dosya projeniz geliştikçe güncellenmelidir. Her büyük değişiklikten sonra bu dosyayı gözden geçirin.
