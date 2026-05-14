# 📏 Ürün Boyut Özelliği - Uygulama Özeti

## ✅ Yapılan Değişiklikler

### 1. Veritabanı Değişiklikleri

#### Yeni Migration Dosyası
- **Dosya:** `supabase/migration-add-product-sizes.sql`
- **Yeni Tablo:** `product_sizes` - Ürünlerin farklı boyutlarını ve her boyutun gramajını saklar
- **Products Tablosu:** `has_sizes` boolean kolonu eklendi
- **Order_items Tablosu:** `size_id` ve `size_name` kolonları eklendi

#### Veritabanı Yapısı
```sql
product_sizes:
  - id (UUID)
  - product_id (FK → products)
  - size_name (TEXT) - Örn: "13cm", "15cm", "17cm"
  - weight_grams (NUMERIC) - Her boyutun gramajı
  - sort_order (INTEGER) - Sıralama
  - created_at (TIMESTAMPTZ)

products:
  + has_sizes (BOOLEAN) - Ürünün farklı boyutları var mı?

order_items:
  + size_id (UUID, FK → product_sizes)
  + size_name (TEXT) - Denormalize edilmiş
```

### 2. TypeScript Tip Tanımları

**Dosya:** `lib/types/database.ts`

Eklenen tipler:
- `ProductSize` - Ürün boyutu tipi
- `ProductSizeInsert` - Boyut ekleme tipi
- `ProductSizeUpdate` - Boyut güncelleme tipi
- `Product.has_sizes` - Ürün boyut flag'i
- `OrderItem.size_id` ve `OrderItem.size_name` - Sipariş boyut bilgileri

### 3. Ürün Kataloğu Bileşeni

**Dosya:** `components/products/product-catalog-client.tsx`

#### Yeni Özellikler:
- ✅ **Boyut Checkbox'ı:** "Bu ürünün farklı boyutları var" seçeneği
- ✅ **Boyut Listesi:** Dinamik boyut ekleme/çıkarma
- ✅ **Boyut Girişi:** Her boyut için ad (örn: 13cm) ve gramaj girişi
- ✅ **Maliyet Önizlemesi:** Her boyut için ayrı maliyet hesaplama
- ✅ **Ürün Kartları:** Boyutlu ürünlerde "Farklı boyutlar mevcut" etiketi

#### Kullanım:
1. Ürün eklerken "Bu ürünün farklı boyutları var" checkbox'ını işaretle
2. "Boyut Ekle" butonuyla boyutları ekle
3. Her boyut için ad ve gramaj gir (örn: "13cm" - 40gr)
4. Kaydet

### 4. Sipariş Oluşturma Dialogu

**Dosya:** `components/orders/new-order-dialog.tsx`

#### Yeni Özellikler:
- ✅ **Otomatik Boyut Algılama:** Ürün seçildiğinde boyutlu olup olmadığını kontrol eder
- ✅ **Boyut Seçim Dropdown'ı:** Boyutlu ürünler için otomatik açılır
- ✅ **Boyut Bilgisi Gösterimi:** Sipariş özetinde boyut adı görünür
- ✅ **Validasyon:** Boyutlu ürünler için boyut seçimi zorunlu

#### Kullanım:
1. Yeni sipariş oluştururken ürün seç
2. Eğer ürün boyutlu ise "BOYUT SEÇİN" dropdown'ı otomatik görünür
3. Boyut seç (örn: "13cm (40 gr)")
4. Renk ve adet bilgilerini gir
5. Sipariş oluştur

### 5. Sipariş Düzenleme Dialogu

**Dosya:** `components/orders/edit-order-dialog.tsx`

#### Yeni Özellikler:
- ✅ **Mevcut Boyut Bilgisi:** Siparişteki boyut bilgisi korunur
- ✅ **Boyut Değiştirme:** Düzenleme sırasında boyut değiştirilebilir
- ✅ **Duplicate Kontrolü:** Aynı ürün/renk/boyut kombinasyonu engellenir

## 🚀 Kurulum Adımları

### 1. Veritabanı Migration'ını Çalıştır

Supabase Dashboard'a git ve SQL Editor'de şu dosyayı çalıştır:
```
supabase/migration-add-product-sizes.sql
```

**VEYA**

Supabase CLI kullanıyorsan:
```bash
supabase db push
```

### 2. Uygulamayı Yeniden Başlat

```bash
npm run dev
```

## 📋 Kullanım Senaryoları

### Senaryo 1: Boyutlu Ürün Ekleme

1. **Dashboard → Products** sayfasına git
2. **"Ürün Ekle"** butonuna tıkla
3. Ürün bilgilerini gir (ad, açıklama, resim)
4. **"Bu ürünün farklı boyutları var"** checkbox'ını işaretle
5. Boyutları ekle:
   - Boyut 1: "13cm" - 35gr
   - Boyut 2: "15cm" - 45gr
   - Boyut 3: "17cm" - 55gr
6. **"Kaydet"** butonuna tıkla

### Senaryo 2: Boyutlu Ürün ile Sipariş Oluşturma

1. **Dashboard → Orders** sayfasına git
2. **"Yeni Sipariş"** butonuna tıkla
3. Alıcı seç
4. Ürün ekle → Boyutlu ürünü seç (örn: "Aura Vazo")
5. **Boyut dropdown'ı otomatik görünür** → Boyut seç (örn: "15cm (45 gr)")
6. Renk ve adet bilgilerini gir
7. Fiyat belirle
8. **"Sipariş Oluştur"** butonuna tıkla

### Senaryo 3: Mevcut Siparişi Düzenleme

1. **Dashboard → Orders** sayfasında siparişe tıkla
2. **"Düzenle"** butonuna tıkla
3. Boyutlu ürünlerin boyutlarını değiştirebilirsin
4. **"Güncelle"** butonuna tıkla

## 🔄 Mevcut Veriler

- **Boyutsuz ürünler:** Hiçbir değişiklik gerekmez, eskisi gibi çalışır
- **Mevcut siparişler:** `size_id` ve `size_name` NULL olarak kalır (sorun yok)
- **Yeni siparişler:** Boyutlu ürünler için boyut bilgisi kaydedilir

## 📊 Maliyet Hesaplama

### Boyutsuz Ürünler
- `products.weight_grams` kullanılır
- Mevcut sistem aynen çalışır

### Boyutlu Ürünler
- Her boyut için `product_sizes.weight_grams` kullanılır
- Sipariş oluştururken seçilen boyutun gramajı baz alınır
- Accounting ve Trendyol panellerinde `order_items.size_id` üzerinden gramaj bulunur

## ⚠️ Önemli Notlar

1. **Boyut Zorunluluğu:** Boyutlu ürünler için sipariş oluştururken boyut seçimi zorunludur
2. **Duplicate Kontrolü:** Aynı ürün/renk/boyut kombinasyonu sipariş içinde tekrar edemez
3. **Gramaj Önceliği:**
   - `has_sizes = false` → `products.weight_grams` kullanılır
   - `has_sizes = true` → `product_sizes.weight_grams` kullanılır
4. **Denormalizasyon:** `order_items.size_name` performans için denormalize edilmiştir

## 🎯 Sonraki Adımlar (Opsiyonel)

### 1. Accounting Paneli Güncellemesi
- `order_items.size_id` üzerinden `product_sizes.weight_grams` çek
- Maliyet hesaplamalarında boyut bazlı gramaj kullan

### 2. Trendyol Paneli Güncellemesi
- Boyut bilgisini göster
- Boyut bazlı maliyet hesaplama

### 3. Production Paneli
- Boyut bilgisini üretim takibinde göster

### 4. Invoice (Fatura)
- Faturada boyut bilgisini göster

## 🐛 Sorun Giderme

### Migration Hatası
```sql
-- Eğer tablolar zaten varsa, önce sil:
DROP TABLE IF EXISTS product_sizes CASCADE;
-- Sonra migration'ı tekrar çalıştır
```

### Tip Hataları
```bash
# TypeScript cache'i temizle
rm -rf .next
npm run dev
```

### Boyut Seçimi Görünmüyor
- Ürünün `has_sizes` flag'inin `true` olduğundan emin ol
- Ürünün en az bir boyutu olduğundan emin ol
- Tarayıcı console'unda hata var mı kontrol et

## 📝 Test Checklist

- [ ] Boyutsuz ürün ekleyebiliyor musun?
- [ ] Boyutlu ürün ekleyebiliyor musun?
- [ ] Boyutlu ürün için sipariş oluşturabiliyor musun?
- [ ] Boyut seçmeden sipariş oluşturmaya çalışınca hata veriyor mu?
- [ ] Mevcut siparişleri düzenleyebiliyor musun?
- [ ] Boyut bilgisi sipariş özetinde görünüyor mu?
- [ ] Maliyet önizlemesi boyutlu ürünler için çalışıyor mu?

## 🎉 Tamamlandı!

Artık ürünlerinize farklı boyutlar ekleyebilir ve siparişlerde boyut seçebilirsiniz!

**Sorular için:** Bu dosyayı referans olarak kullanabilirsiniz.
