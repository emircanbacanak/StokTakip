# 🚀 Sipariş Takip Sistemi V2 - Yükseltme Rehberi

## 📋 Yeni Özellikler

### ✅ Ara Teslimat Sistemi
- Siparişleri kısmi olarak teslim edebilme
- Her teslimatı ürün/renk bazında takip
- Kalan ürünleri görüntüleme
- Teslimat geçmişi

### 💰 Gelişmiş Ödeme Takibi
- Tüm ödemeleri ayrı ayrı kaydetme
- Ödeme yöntemleri (Nakit, Banka Transferi, vb.)
- Ödeme geçmişi
- Fazla/eksik ödeme uyarıları
- Teslim edilen ürünlere göre beklenen ödeme hesaplama

### 📊 Akıllı Hesaplamalar
- Otomatik toplam tutar hesaplama
- Otomatik ödenen tutar hesaplama
- Teslim edilen ürün miktarı takibi
- Kalan borç/ürün hesaplama

### 🎯 Kullanıcı Deneyimi İyileştirmeleri
- Tab'lı arayüz (Ürünler, Teslimatlar, Ödemeler)
- Görsel uyarılar ve bildirimler
- Detaylı ilerleme çubukları
- Responsive tasarım

## 🔧 Kurulum Adımları

### 1. Veritabanı Güncellemesi

Supabase Dashboard'a gidin ve SQL Editor'de `supabase/schema-v2.sql` dosyasını çalıştırın:

```bash
# Dosya yolu: supabase/schema-v2.sql
```

Bu script:
- ✅ Yeni tabloları oluşturur (deliveries, delivery_items, payments)
- ✅ Mevcut verileri korur
- ✅ Otomatik hesaplama trigger'larını ekler
- ✅ Mevcut paid_amount değerlerini payments tablosuna aktarır

### 2. Yeni Tablolar

#### `deliveries` - Teslimatlar
- Her teslimat kaydı
- Teslimat tarihi
- Notlar

#### `delivery_items` - Teslimat Kalemleri
- Hangi üründen kaç adet teslim edildi
- order_items ile ilişkili

#### `payments` - Ödemeler
- Her ödeme kaydı
- Ödeme yöntemi
- Teslimat ile ilişkilendirme (opsiyonel)
- Notlar

### 3. Otomatik Hesaplamalar

Sistem artık şunları otomatik hesaplıyor:

1. **delivered_quantity**: Teslimat eklendiğinde otomatik güncellenir
2. **paid_amount**: Ödeme eklendiğinde otomatik güncellenir
3. **total_amount**: Sipariş kalemleri değiştiğinde otomatik güncellenir

## 📱 Kullanım

### Sipariş Detayı Açma
1. Orders sayfasında bir siparişe tıklayın
2. Yeni detay ekranı 3 tab ile açılır:
   - **Ürünler**: Sipariş kalemleri ve ilerleme
   - **Teslimatlar**: Teslimat geçmişi
   - **Ödemeler**: Ödeme geçmişi

### Ara Teslimat Yapma
1. Sipariş detayında "Teslimatlar" tab'ına gidin
2. "Yeni Teslimat" butonuna tıklayın
3. Teslim edilecek ürünleri ve miktarları seçin
4. İsteğe bağlı not ekleyin
5. "Teslimatı Kaydet" butonuna tıklayın

**Özellikler:**
- Her üründen istediğiniz kadar teslim edebilirsiniz
- Kalan miktar otomatik hesaplanır
- Teslimat değeri gösterilir
- "Tümü" butonu ile kalan tüm ürünleri seçebilirsiniz

### Ödeme Alma
1. Sipariş detayında "Ödemeler" tab'ına gidin
2. "Ödeme Ekle" butonuna tıklayın
3. Ödeme tutarını girin
4. Ödeme yöntemini seçin
5. İsteğe bağlı not ekleyin
6. "Ödeme Al" butonuna tıklayın

**Özellikler:**
- "Kalan Tümü" butonu ile kalan borcu otomatik doldurur
- "Yarısı" butonu ile yarı ödeme alabilirsiniz
- Fazla ödeme uyarısı gösterilir
- Ödeme yöntemleri: Nakit, Banka Transferi, Kredi Kartı, Çek, Diğer

### Ödeme Durumu Analizi

Sistem akıllıca ödeme durumunu analiz eder:

**Beklenen Ödeme Hesaplama:**
```
Beklenen Ödeme = (Teslim Edilen Miktar / Toplam Miktar) × Ürün Tutarı
```

**Uyarılar:**
- 🟡 **Fazla Ödeme**: Teslim edilen ürünlerden fazla ödeme alındı
- 🔴 **Eksik Ödeme**: Teslim edilen ürünler için eksik ödeme var

### Sipariş Durumları

1. **Bekliyor** (pending): Yeni sipariş
2. **Üretimde** (in_production): Üretim başladı
3. **Tamamlandı** (completed): Üretim tamamlandı
4. **Teslim Edildi** (delivered): Tüm ürünler teslim edildi

## 🎨 Yeni Arayüz Özellikleri

### Özet Kartlar
- Toplam Tutar
- Ödenen Miktar
- Kalan Borç

### İlerleme Çubukları
- **Üretim İlerlemesi**: Kaç adet üretildi
- **Teslimat İlerlemesi**: Kaç adet teslim edildi

### Renkli Uyarılar
- Mavi: Bilgilendirme
- Sarı: Uyarı (fazla ödeme)
- Kırmızı: Hata (eksik ödeme)
- Yeşil: Başarılı

## 🔍 Veri Bütünlüğü

### Constraint'ler
- Teslim edilen miktar, sipariş miktarından fazla olamaz
- Üretilen miktar, sipariş miktarından fazla olamaz
- Ödeme tutarı pozitif olmalı
- Teslimat miktarı pozitif olmalı

### Cascade Delete
- Sipariş silindiğinde tüm teslimatlar ve ödemeler silinir
- Teslimat silindiğinde teslimat kalemleri silinir
- Order item silindiğinde ilgili teslimat kalemleri silinir

## 📊 Raporlama

### Sipariş Özeti Fonksiyonu
```sql
SELECT * FROM get_order_summary('order-uuid-here');
```

Dönen bilgiler:
- total_amount: Toplam tutar
- paid_amount: Ödenen tutar
- remaining_amount: Kalan borç
- total_items: Toplam ürün adedi
- delivered_items: Teslim edilen adet
- remaining_items: Kalan adet
- delivery_count: Teslimat sayısı
- payment_count: Ödeme sayısı

## 🐛 Hata Ayıklama

### Trigger'lar Çalışmıyor mu?
```sql
-- Trigger'ları kontrol et
SELECT * FROM pg_trigger WHERE tgname LIKE '%order%';

-- Manuel güncelleme
UPDATE orders SET updated_at = NOW() WHERE id = 'order-uuid';
```

### Tutarlar Yanlış mı?
```sql
-- Paid amount'u yeniden hesapla
UPDATE orders 
SET paid_amount = (
  SELECT COALESCE(SUM(amount), 0) 
  FROM payments 
  WHERE order_id = orders.id
);

-- Delivered quantity'yi yeniden hesapla
UPDATE order_items 
SET delivered_quantity = (
  SELECT COALESCE(SUM(di.quantity), 0)
  FROM delivery_items di
  WHERE di.order_item_id = order_items.id
);
```

## 🚨 Önemli Notlar

1. **Mevcut Veriler**: Eski paid_amount değerleri otomatik olarak payments tablosuna aktarılır
2. **Geriye Dönük Uyumluluk**: Eski order_detail_dialog.tsx dosyası korundu (order-detail-dialog.tsx)
3. **Performans**: Tüm tablolarda gerekli index'ler oluşturuldu
4. **Güvenlik**: RLS (Row Level Security) aktif, auth eklenince güncellenebilir

## 📈 Gelecek Özellikler

- [ ] PDF fatura oluşturma
- [ ] Excel export
- [ ] SMS/Email bildirimleri
- [ ] Stok entegrasyonu
- [ ] Çoklu para birimi desteği
- [ ] Gelişmiş raporlama
- [ ] Dashboard grafikleri

## 💡 İpuçları

1. **Hızlı Teslimat**: "Tümü" butonunu kullanarak tüm kalan ürünleri tek seferde teslim edin
2. **Kısmi Ödeme**: "Yarısı" butonu ile hızlıca yarı ödeme alın
3. **Notlar**: Her teslimat ve ödemeye not ekleyerek detaylı kayıt tutun
4. **Durum Takibi**: Sipariş durumunu güncel tutarak üretim sürecini takip edin

## 🆘 Destek

Sorun yaşarsanız:
1. Browser console'u kontrol edin (F12)
2. Supabase logs'u kontrol edin
3. Database constraint'leri kontrol edin
4. Trigger'ların çalıştığından emin olun

---

**Hazırlayan**: Full Stack Development Team
**Versiyon**: 2.0.0
**Tarih**: 2024
