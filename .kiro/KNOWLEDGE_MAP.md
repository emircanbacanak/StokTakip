# 🗺️ Proje Bilgi Haritası

> Projenin görsel yapısı, ilişkileri ve bilgi akışı

---

## 📊 Proje Hiyerarşisi

```
Stok & Sipariş Takip Sistemi
│
├─── 🎯 İş Mantığı Katmanı
│    ├─ Sipariş Yönetimi
│    ├─ Üretim Takibi
│    ├─ Alıcı Yönetimi
│    ├─ Stok Kontrolü
│    └─ Muhasebe
│
├─── 🏗️ Teknik Katman
│    ├─ Next.js 16 (Framework)
│    ├─ React 19 (UI)
│    ├─ Supabase (Backend)
│    ├─ TypeScript (Dil)
│    └─ Tailwind CSS (Stil)
│
└─── 📁 Dosya Yapısı
     ├─ app/ (Sayfalar)
     ├─ components/ (Bileşenler)
     ├─ lib/ (Yardımcılar)
     └─ supabase/ (Veritabanı)
```

---

## 🔄 Veri Akış Diyagramı

### Sipariş Oluşturma Akışı

```
Kullanıcı
   ↓
[new-order-dialog.tsx]
   ↓
Supabase Client
   ↓
┌─────────────────────┐
│  orders tablosu     │ ← Yeni sipariş kaydı
└─────────────────────┘
   ↓
┌─────────────────────┐
│  order_items        │ ← Sipariş kalemleri
└─────────────────────┘
   ↓
┌─────────────────────┐
│  colors tablosu     │ ← usage_count++
└─────────────────────┘
   ↓
Toast Bildirimi
   ↓
Liste Yenileme
```

### Üretim Güncelleme Akışı

```
Kullanıcı (+/- Buton)
   ↓
[production-client.tsx]
   ↓
Supabase Client
   ↓
┌─────────────────────┐
│  order_items        │ ← produced_quantity güncelle
└─────────────────────┘
   ↓
Trigger (Otomatik)
   ↓
┌─────────────────────┐
│  orders tablosu     │ ← status güncelle
└─────────────────────┘
   ↓
UI Güncelleme (İlerleme Çubuğu)
```

### Teslimat Akışı

```
Kullanıcı
   ↓
[new-delivery-dialog.tsx]
   ↓
┌─────────────────────┐
│  deliveries         │ ← Yeni teslimat
└─────────────────────┘
   ↓
┌─────────────────────┐
│  delivery_items     │ ← Teslimat kalemleri
└─────────────────────┘
   ↓
┌─────────────────────┐
│  order_items        │ ← delivered_quantity++
└─────────────────────┘
   ↓
[new-payment-dialog.tsx] (Opsiyonel)
   ↓
┌─────────────────────┐
│  payments           │ ← Ödeme kaydı
└─────────────────────┘
```

---

## 🗄️ Veritabanı İlişki Haritası

```
┌─────────────┐
│   buyers    │
│  (Alıcılar) │
└──────┬──────┘
       │ 1:N
       ↓
┌─────────────┐
│   orders    │
│ (Siparişler)│
└──────┬──────┘
       │ 1:N
       ├──────────────────┬──────────────────┐
       ↓                  ↓                  ↓
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ order_items │    │ deliveries  │    │  payments   │
│  (Kalemler) │    │(Teslimatlar)│    │  (Ödemeler) │
└──────┬──────┘    └──────┬──────┘    └─────────────┘
       │ N:M              │ 1:N
       │                  ↓
       │           ┌─────────────┐
       └──────────→│delivery_items│
                   │(Tes. Kalem.)│
                   └─────────────┘

┌─────────────┐    ┌─────────────┐
│   colors    │    │  products   │
│  (Renkler)  │    │  (Ürünler)  │
└─────────────┘    └─────────────┘
```

---

## 📁 Dosya Yapısı Haritası

### App Router (Sayfalar)

```
app/
│
├── dashboard/
│   ├── page.tsx ──────────────► Dashboard Ana Sayfa
│   │                             ├─ dashboard-stats.tsx
│   │                             ├─ color-chart.tsx
│   │                             └─ recent-orders.tsx
│   │
│   ├── orders/
│   │   ├── page.tsx ──────────► Sipariş Listesi
│   │   │                         └─ orders-client.tsx
│   │   └── [buyerId]/
│   │       └── page.tsx ──────► Alıcıya Özel Siparişler
│   │                             └─ buyer-orders-client.tsx
│   │
│   ├── production/
│   │   └── page.tsx ──────────► Üretim Takibi
│   │                             └─ production-client.tsx
│   │
│   ├── buyers/
│   │   └── page.tsx ──────────► Alıcı Yönetimi
│   │                             └─ buyers-client.tsx
│   │
│   ├── products/
│   │   └── page.tsx ──────────► Ürün/Stok Yönetimi
│   │                             ├─ products-client.tsx
│   │                             └─ stock-client.tsx
│   │
│   ├── accounting/
│   │   └── page.tsx ──────────► Muhasebe
│   │                             └─ accounting-client.tsx
│   │
│   └── colors/
│       └── page.tsx ──────────► Renk Yönetimi
│                                 └─ colors-client.tsx
│
├── invoice/
│   └── [orderId]/
│       └── page.tsx ──────────► Fatura Sayfası
│
└── setup/
    └── page.tsx ──────────────► İlk Kurulum
```

### Component Yapısı

```
components/
│
├── dashboard/
│   ├── dashboard-stats.tsx ───► İstatistik Kartları
│   ├── color-chart.tsx ───────► Renk Grafiği (Recharts)
│   └── recent-orders.tsx ─────► Son Siparişler
│
├── orders/
│   ├── orders-client.tsx ─────► Ana Sipariş Listesi
│   ├── buyer-orders-client.tsx ► Alıcıya Özel Liste
│   ├── new-order-dialog.tsx ──► Yeni Sipariş Oluştur
│   ├── edit-order-dialog.tsx ─► Sipariş Düzenle
│   ├── order-detail-dialog-v2.tsx ► Sipariş Detayları (GÜNCEL)
│   ├── add-colors-dialog.tsx ─► Renk Ekle/Güncelle
│   ├── new-delivery-dialog.tsx ► Teslimat Ekle
│   ├── new-payment-dialog.tsx ─► Ödeme Ekle
│   ├── invoice-dialog.tsx ────► Fatura Görüntüle
│   └── filament-input-dialog.tsx ► Filament Girişi
│
├── production/
│   └── production-client.tsx ─► Üretim Takibi (+/- Butonlar)
│
├── buyers/
│   └── buyers-client.tsx ─────► Alıcı Yönetimi
│
├── products/
│   ├── products-client.tsx ───► Ürün Listesi
│   ├── colors-client.tsx ─────► Renk İstatistikleri
│   ├── stock-client.tsx ──────► Stok Durumu
│   └── product-catalog-client.tsx ► Ürün Katalogu
│
├── accounting/
│   └── accounting-client.tsx ─► Muhasebe İşlemleri
│
└── ui/ (shadcn/ui)
    ├── button.tsx
    ├── dialog.tsx
    ├── input.tsx
    ├── select.tsx
    ├── table.tsx
    ├── card.tsx
    ├── badge.tsx
    ├── toast.tsx
    ├── progress.tsx
    └── ... (diğer UI bileşenleri)
```

### Lib Yapısı

```
lib/
│
├── supabase/
│   ├── client.ts ─────────────► Client-side Supabase
│   └── server.ts ─────────────► Server-side Supabase
│
├── types/
│   └── database.ts ───────────► Tüm Tip Tanımları
│                                 ├─ Database
│                                 ├─ Order, OrderInsert, OrderUpdate
│                                 ├─ OrderItem, OrderItemInsert
│                                 ├─ Buyer, BuyerInsert
│                                 ├─ Delivery, DeliveryInsert
│                                 ├─ Payment, PaymentInsert
│                                 └─ Color, Product
│
├── color-map.ts ──────────────► Renk Eşleştirme
└── utils.ts ──────────────────► Yardımcı Fonksiyonlar (cn)
```

---

## 🎯 Özellik Haritası

### Sipariş Yönetimi Özellikleri

```
Sipariş Yönetimi
│
├── Oluşturma
│   ├─ Alıcı seçimi
│   ├─ Ürün/renk/adet girişi
│   ├─ Fiyat hesaplama
│   └─ Notlar
│
├── Görüntüleme
│   ├─ Liste görünümü
│   ├─ Detay görünümü
│   ├─ Alıcıya göre filtreleme
│   └─ Durum filtreleme
│
├── Güncelleme
│   ├─ Sipariş bilgileri
│   ├─ Durum değiştirme
│   ├─ Renk ekleme/çıkarma
│   └─ Notlar
│
├── Teslimat
│   ├─ Teslimat oluşturma
│   ├─ Kalem seçimi
│   ├─ Miktar girişi
│   └─ Teslimat geçmişi
│
├── Ödeme
│   ├─ Ödeme ekleme
│   ├─ Ödeme yöntemi
│   ├─ Kısmi ödeme
│   └─ Ödeme geçmişi
│
└── Fatura
    ├─ Fatura görüntüleme
    ├─ QR kod
    └─ Yazdırma
```

### Üretim Takibi Özellikleri

```
Üretim Takibi
│
├── Miktar Güncelleme
│   ├─ +/- Butonlar
│   ├─ Manuel giriş
│   └─ Toplu güncelleme
│
├── İlerleme Görüntüleme
│   ├─ İlerleme çubuğu
│   ├─ Yüzde hesaplama
│   └─ Renk kodlama
│
├── Filtreleme
│   ├─ Renk bazlı
│   ├─ Ürün bazlı
│   └─ Durum bazlı
│
└── Raporlama
    ├─ Üretim istatistikleri
    └─ Tamamlanma oranı
```

---

## 🔗 Component İlişki Haritası

### Sipariş Dialog'ları Arası İlişki

```
orders-client.tsx (Ana Liste)
   │
   ├──► new-order-dialog.tsx
   │      └─ Yeni sipariş oluştur
   │
   ├──► order-detail-dialog-v2.tsx
   │      ├─ Sipariş detayları göster
   │      ├──► edit-order-dialog.tsx
   │      │      └─ Sipariş düzenle
   │      ├──► add-colors-dialog.tsx
   │      │      └─ Renk ekle/güncelle
   │      ├──► new-delivery-dialog.tsx
   │      │      └─ Teslimat ekle
   │      ├──► new-payment-dialog.tsx
   │      │      └─ Ödeme ekle
   │      └──► invoice-dialog.tsx
   │             └─ Fatura göster
   │
   └──► Silme işlemi (useConfirm)
```

### Dashboard Component İlişkileri

```
app/dashboard/page.tsx
   │
   ├──► dashboard-stats.tsx
   │      ├─ Toplam sipariş
   │      ├─ Aktif sipariş
   │      ├─ Toplam alıcı
   │      └─ Toplam ciro
   │
   ├──► color-chart.tsx
   │      └─ Renk dağılım grafiği (Recharts)
   │
   └──► recent-orders.tsx
          └─ Son 5 sipariş
```

---

## 🎨 UI Component Hiyerarşisi

```
Layout (app/layout.tsx)
   │
   ├─ ThemeProvider
   │    └─ Dark/Light mode
   │
   ├─ Dashboard Layout (app/dashboard/layout.tsx)
   │    ├─ Sidebar/Navigation
   │    └─ Main Content
   │
   └─ Toaster
        └─ Toast bildirimleri

Dialog Yapısı:
   Dialog (Radix UI)
      ├─ DialogTrigger (Buton)
      ├─ DialogContent
      │    ├─ DialogHeader
      │    │    └─ DialogTitle
      │    ├─ DialogBody (Form)
      │    └─ DialogFooter (Butonlar)
      └─ DialogClose
```

---

## 📊 Veri Tipi Haritası

### Tip Hiyerarşisi

```
Database (Ana Tip)
   │
   ├─ Tables
   │    ├─ buyers
   │    │    ├─ Row (Buyer)
   │    │    ├─ Insert (BuyerInsert)
   │    │    └─ Update (BuyerUpdate)
   │    │
   │    ├─ orders
   │    │    ├─ Row (Order)
   │    │    ├─ Insert (OrderInsert)
   │    │    └─ Update (OrderUpdate)
   │    │
   │    ├─ order_items
   │    │    ├─ Row (OrderItem)
   │    │    ├─ Insert (OrderItemInsert)
   │    │    └─ Update (OrderItemUpdate)
   │    │
   │    ├─ deliveries
   │    ├─ delivery_items
   │    ├─ payments
   │    ├─ colors
   │    └─ products
   │
   ├─ Views (Yok)
   │
   ├─ Functions
   │    └─ get_order_summary
   │
   └─ Enums (Yok)

Genişletilmiş Tipler:
   ├─ OrderWithDetails (Order + Buyer + Items + Deliveries + Payments)
   ├─ DeliveryWithItems (Delivery + Items)
   └─ OrderSummary (Özet bilgiler)
```

---

## 🔄 State Yönetimi Haritası

### Client Component State Akışı

```
Component Mount
   ↓
useState (Initial State)
   ↓
useEffect (Data Fetch)
   ↓
Supabase Query
   ↓
setState (Update State)
   ↓
UI Render
   ↓
User Interaction
   ↓
Event Handler
   ↓
Supabase Mutation
   ↓
Toast Notification
   ↓
setState (Refresh)
   ↓
UI Re-render
```

### Form State Yönetimi

```
Form Component
   ↓
useState (Form Fields)
   ↓
Input onChange
   ↓
setState (Update Field)
   ↓
Form Submit
   ↓
Validation
   ↓
Supabase Insert/Update
   ↓
Success/Error Handling
   ↓
Toast + Dialog Close
   ↓
Parent Refresh
```

---

## 🎯 Token Optimizasyonu Haritası

### Dokümantasyon Hiyerarşisi

```
.kiro/
   │
   ├─ steering/
   │    └─ project-context.md ──► Otomatik Yükleme (Her Oturum)
   │                               └─ ~500 token
   │
   ├─ PROJECT_CONTEXT.md ──────► Ana Referans (İlk Okuma)
   │                               ├─ Proje özeti
   │                               ├─ Teknoloji stack
   │                               ├─ Veritabanı şeması
   │                               └─ ~2,000 token
   │
   ├─ COMPONENT_CATALOG.md ────► Component Referansı
   │                               ├─ Tüm component listesi
   │                               ├─ Kullanım örnekleri
   │                               └─ ~1,500 token
   │
   ├─ DATABASE_GUIDE.md ────────► Veritabanı Rehberi
   │                               ├─ Query örnekleri
   │                               ├─ CRUD işlemleri
   │                               └─ ~1,800 token
   │
   ├─ QUICK_REFERENCE.md ───────► Hızlı Başlangıç
   │                               ├─ Senaryo bazlı rehber
   │                               ├─ Code snippet'ler
   │                               └─ ~1,200 token
   │
   └─ README.md ────────────────► Sistem Açıklaması
                                   └─ ~1,000 token
```

### Okuma Stratejisi Akışı

```
Yeni Oturum Başladı
   ↓
[Otomatik] steering/project-context.md yüklendi
   ↓
Görev Belirlendi
   ↓
   ├─ Proje Anlama? ──────► PROJECT_CONTEXT.md oku
   │
   ├─ Component İşlemi? ──► COMPONENT_CATALOG.md oku
   │                         └─ İlgili component'i bul
   │                            └─ Sadece o dosyayı oku
   │
   ├─ Veritabanı İşlemi? ─► DATABASE_GUIDE.md oku
   │                         └─ Query örneği bul
   │                            └─ Sadece database.ts oku
   │
   └─ Hızlı Başlangıç? ───► QUICK_REFERENCE.md oku
                             └─ Senaryo bul
                                └─ İlgili dosyayı oku
```

---

## 🚀 Geliştirme Workflow Haritası

### Yeni Özellik Ekleme

```
1. Planlama
   ├─ .kiro/specs/ klasöründe spec oluştur
   ├─ requirements.md
   ├─ design.md
   └─ tasks.md

2. Veritabanı
   ├─ supabase/ klasöründe migration oluştur
   ├─ SQL yaz ve test et
   └─ database.ts tiplerini güncelle

3. Component
   ├─ components/ klasöründe component oluştur
   ├─ Benzer component'ten örnek al
   ├─ Supabase query'leri ekle
   └─ UI bileşenlerini kullan

4. Sayfa
   ├─ app/dashboard/ altında route ekle
   ├─ Component'i import et
   └─ Layout'a ekle

5. Test
   ├─ npm run dev
   ├─ Tarayıcıda test et
   └─ Error handling kontrol et
```

### Bug Fix Workflow

```
1. Problemi Anla
   ├─ QUICK_REFERENCE.md oku
   ├─ İlgili component'i bul
   └─ Sadece o dosyayı oku

2. Çözümü Bul
   ├─ DATABASE_GUIDE.md kontrol et
   ├─ Benzer örneklere bak
   └─ Çözüm planla

3. Düzelt
   ├─ Sadece ilgili dosyayı değiştir
   ├─ Error handling ekle
   └─ Toast bildirimi ekle

4. Test
   ├─ Tarayıcıda doğrula
   ├─ Edge case'leri test et
   └─ Dokümantasyonu güncelle
```

---

## 📈 Performans Optimizasyonu Haritası

### Token Kullanımı Karşılaştırması

```
Geleneksel Yaklaşım:
   Tüm Projeyi Tara (20,000 token)
      ↓
   Tüm Component'leri Oku (15,000 token)
      ↓
   Veritabanı Dosyalarını Oku (10,000 token)
      ↓
   TOPLAM: ~45,000 token

Optimize Yaklaşım:
   Otomatik Yükleme (500 token)
      ↓
   PROJECT_CONTEXT.md (2,000 token)
      ↓
   İlgili Katalog (1,500 token)
      ↓
   Spesifik Dosya (500 token)
      ↓
   TOPLAM: ~4,500 token

TASARRUF: 40,500 token (90%)
```

---

## 🎓 Öğrenme Yolu Haritası

### Yeni Geliştirici İçin

```
1. Başlangıç
   └─ .kiro/README.md oku
      └─ Sistem nasıl çalışır?

2. Proje Anlama
   └─ .kiro/PROJECT_CONTEXT.md oku
      ├─ Teknoloji stack
      ├─ Klasör yapısı
      └─ Veritabanı şeması

3. Component Keşfi
   └─ .kiro/COMPONENT_CATALOG.md oku
      └─ Hangi component ne yapar?

4. Veritabanı Öğrenme
   └─ .kiro/DATABASE_GUIDE.md oku
      └─ Query örnekleri

5. Pratik Yapma
   └─ .kiro/QUICK_REFERENCE.md oku
      └─ Senaryo bazlı örnekler
```

---

## 🔍 Hızlı Arama İndeksi

### Dosya Konumları

| Aranan | Konum | Kategori |
|--------|-------|----------|
| Sipariş oluşturma | `components/orders/new-order-dialog.tsx` | Component |
| Üretim güncelleme | `components/production/production-client.tsx` | Component |
| Veritabanı tipleri | `lib/types/database.ts` | Tip |
| Supabase client | `lib/supabase/client.ts` | Lib |
| Dashboard istatistikleri | `components/dashboard/dashboard-stats.tsx` | Component |
| Fatura sayfası | `app/invoice/[orderId]/page.tsx` | Sayfa |
| Renk eşleştirme | `lib/color-map.ts` | Lib |
| UI buton | `components/ui/button.tsx` | UI |

### Özellik Konumları

| Özellik | Ana Dosya | İlgili Dosyalar |
|---------|-----------|-----------------|
| Sipariş yönetimi | `orders-client.tsx` | 9 dialog component |
| Üretim takibi | `production-client.tsx` | `order_items` tablosu |
| Alıcı yönetimi | `buyers-client.tsx` | `buyers` tablosu |
| Dashboard | `dashboard/page.tsx` | 3 dashboard component |
| Muhasebe | `accounting-client.tsx` | `payments` tablosu |

---

**Son Güncelleme:** 5 Mayıs 2026  
**Versiyon:** 1.0.0  
**Durum:** ✅ Aktif
