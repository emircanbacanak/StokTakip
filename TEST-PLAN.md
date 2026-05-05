# 🧪 Ürün Maliyet Hesaplama Sistemi - Test Planı

## 📋 Test Senaryoları

### 1. Veritabanı Migration Testi
**Amaç:** Migration'ın başarıyla çalıştığını doğrula

**Adımlar:**
1. Supabase SQL Editor'ü aç
2. `supabase/migration-cost-calculation.sql` dosyasını çalıştır
3. Tabloların oluşturulduğunu kontrol et:
   - `cost_settings` tablosu
   - `product_costs` tablosu
   - `order_cost_analysis` tablosu
   - `products.weight_grams` alanı

**Beklenen Sonuç:**
- ✅ Tüm tablolar başarıyla oluşturuldu
- ✅ İndeksler eklendi
- ✅ Trigger'lar aktif
- ✅ Fonksiyonlar çalışıyor

**Test Sorguları:**
```sql
-- Tabloları kontrol et
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cost_settings', 'product_costs', 'order_cost_analysis');

-- cost_settings varsayılan değerlerini kontrol et
SELECT * FROM cost_settings;

-- products tablosunda weight_grams alanını kontrol et
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'weight_grams';
```

---

### 2. Maliyet Ayarları Testi
**Amaç:** Maliyet ayarlarının doğru çalıştığını doğrula

**Test Verileri:**
- Filament Fiyatı: 650 TL/kg
- Elektrik: 0.1 TL/gram
- Fire: %10
- Yıpranma: 0.05 TL/gram

**Adımlar:**
1. Muhasebe sayfasına git
2. "Maliyet Analizi" sekmesine tıkla
3. "Ayarlar" butonuna tıkla
4. Tüm parametreleri kontrol et
5. Bir parametreyi değiştir (örn: Fire %15)
6. Kaydet
7. Ayarları tekrar aç ve değişikliği kontrol et

**Beklenen Sonuç:**
- ✅ Ayarlar dialog'u açılıyor
- ✅ Varsayılan değerler doğru
- ✅ Değişiklikler kaydediliyor
- ✅ Aktif/Pasif toggle'lar çalışıyor

---

### 3. Ürün Maliyet Hesaplama Testi
**Amaç:** Tek ürün için maliyet hesaplamasının doğru çalıştığını doğrula

**Test Verisi:**
- Ürün: Test Ürünü
- Gramaj: 40 gr
- Filament: 650 TL/kg
- Elektrik: 0.1 TL/gram
- Fire: %10
- Yıpranma: 0.05 TL/gram

**Manuel Hesaplama:**
```
Fire Dahil Gramaj = 40 × 1.10 = 44 gr

Saf Filament = (40 / 1000) × 650 = 26.00 TL
Elektrik = 44 × 0.1 = 4.40 TL
Fire = ((44 - 40) / 1000) × 650 = 2.60 TL
Yıpranma = 44 × 0.05 = 2.20 TL

Toplam Maliyet = 26.00 + 4.40 + 2.60 + 2.20 = 35.20 TL

%10 Kar = 35.20 × 1.10 = 38.72 → 40 TL (yuvarlanmış)
%20 Kar = 35.20 × 1.20 = 42.24 → 40 TL (yuvarlanmış)
%30 Kar = 35.20 × 1.30 = 45.76 → 45 TL (yuvarlanmış)
%40 Kar = 35.20 × 1.40 = 49.28 → 50 TL (yuvarlanmış)
%50 Kar = 35.20 × 1.50 = 52.80 → 55 TL (yuvarlanmış)
```

**Adımlar:**
1. Ürünler sayfasına git
2. Yeni ürün ekle veya mevcut ürünü düzenle
3. Gramaj: 40 gir
4. Maliyet hesaplamasını kontrol et

**Beklenen Sonuç:**
- ✅ Toplam Maliyet: 35.20 TL
- ✅ Fire Dahil Gramaj: 44 gr
- ✅ Önerilen fiyatlar doğru yuvarlanmış

---

### 4. Sipariş Maliyet Analizi Testi
**Amaç:** Sipariş bazlı maliyet analizinin doğru çalıştığını doğrula

**Test Senaryosu:**
- Alıcı: Feridun
- 7 farklı ürün
- Her üründen 10 adet
- Her ürün 12 renk
- Toplam: 7 × 10 × 12 = 840 adet

**Test Verileri:**
| Ürün | Gramaj | Adet | Birim Fiyat |
|------|--------|------|-------------|
| Ürün 1 | 40 gr | 120 | 50 TL |
| Ürün 2 | 35 gr | 120 | 45 TL |
| Ürün 3 | 50 gr | 120 | 60 TL |
| Ürün 4 | 30 gr | 120 | 40 TL |
| Ürün 5 | 45 gr | 120 | 55 TL |
| Ürün 6 | 38 gr | 120 | 48 TL |
| Ürün 7 | 42 gr | 120 | 52 TL |

**Manuel Hesaplama:**
```
Toplam Ham Gramaj = (40+35+50+30+45+38+42) × 120 = 33,600 gr = 33.6 kg
Fire Dahil Gramaj = 33.6 × 1.10 = 36.96 kg

Filament = 33.6 × 650 = 21,840 TL
Elektrik = 36,960 × 0.1 = 3,696 TL
Fire = 3.36 × 650 = 2,184 TL
Yıpranma = 36,960 × 0.05 = 1,848 TL

Toplam Maliyet = 21,840 + 3,696 + 2,184 + 1,848 = 29,568 TL

Toplam Gelir = (50+45+60+40+55+48+52) × 120 = 42,000 TL
Kar = 42,000 - 29,568 = 12,432 TL
Kar Marjı = (12,432 / 42,000) × 100 = 29.6%
```

**Adımlar:**
1. Test siparişini oluştur
2. Muhasebe → Maliyet Analizi
3. Siparişi seç
4. "Maliyet Hesapla" butonuna tıkla
5. Sonuçları kontrol et

**Beklenen Sonuç:**
- ✅ Toplam Maliyet: ~29,568 TL
- ✅ Toplam Gelir: 42,000 TL
- ✅ Kar: ~12,432 TL
- ✅ Kar Marjı: ~29.6%

---

### 5. Fiyat Yuvarlama Testi
**Amaç:** Fiyat yuvarlamanın doğru çalıştığını doğrula

**Test Verileri:**
| Hesaplanan Fiyat | Beklenen Yuvarlanmış |
|------------------|----------------------|
| 38.2 TL | 40 TL |
| 42.7 TL | 45 TL |
| 47.1 TL | 45 TL |
| 51.8 TL | 50 TL |
| 56.3 TL | 55 TL |
| 63.9 TL | 65 TL |

**Adımlar:**
1. Farklı gramajlı ürünler oluştur
2. Önerilen fiyatları kontrol et
3. Yuvarlama kuralını doğrula:
   - 1,2 → 0
   - 3,4,6,7 → 5
   - 8,9 → 10

**Beklenen Sonuç:**
- ✅ Tüm fiyatlar 0 veya 5 ile bitiyor

---

### 6. Parametreleri Kapatma Testi
**Amaç:** Parametrelerin aktif/pasif yapılmasının hesaplamalara etkisini doğrula

**Test Senaryosu 1: Sadece Filament**
- Filament: Aktif
- Elektrik: Pasif
- Fire: Pasif
- Yıpranma: Pasif

**Beklenen:** Sadece filament maliyeti hesaplanmalı

**Test Senaryosu 2: Fire Kapalı**
- Filament: Aktif
- Elektrik: Aktif
- Fire: Pasif
- Yıpranma: Aktif

**Beklenen:** Fire dahil gramaj = Ham gramaj

**Adımlar:**
1. Ayarları aç
2. Parametreleri kapat
3. Kaydet
4. Ürün maliyetini kontrol et
5. Sadece aktif parametreler hesaplanmalı

**Beklenen Sonuç:**
- ✅ Pasif parametreler 0 TL gösteriyor
- ✅ Toplam maliyet sadece aktif parametreleri içeriyor

---

### 7. Min/Max Değer Testi
**Amaç:** Sınır değerlerin doğru çalıştığını doğrula

**Test Verileri:**
| Parametre | Min | Max | Test Değeri |
|-----------|-----|-----|-------------|
| Filament | 0 | ∞ | -10 (hata), 0 (ok), 10000 (ok) |
| Elektrik | 0 | ∞ | -1 (hata), 0 (ok), 100 (ok) |
| Fire | 0 | 100 | -5 (hata), 0 (ok), 100 (ok), 150 (hata) |
| Yıpranma | 0 | ∞ | -0.1 (hata), 0 (ok), 10 (ok) |
| Gramaj | 0 | ∞ | -5 (hata), 0 (ok), 10000 (ok) |

**Adımlar:**
1. Ayarları aç
2. Negatif değer gir → Hata almalı
3. Sınır değerleri test et
4. Fire için 100'den büyük değer → Hata almalı

**Beklenen Sonuç:**
- ✅ Negatif değerler kabul edilmiyor
- ✅ Fire %100'ü geçemiyor
- ✅ Sınır değerlerde hesaplama doğru

---

### 8. Performans Testi
**Amaç:** Büyük veri setlerinde performansı test et

**Test Senaryosu:**
- 100 ürün
- 50 sipariş
- Her siparişte 10 kalem

**Adımlar:**
1. Test verilerini oluştur
2. Maliyet analizi sayfasını aç
3. Yükleme süresini ölç
4. Sipariş seç ve hesapla
5. Hesaplama süresini ölç

**Beklenen Sonuç:**
- ✅ Sayfa yükleme < 2 saniye
- ✅ Maliyet hesaplama < 1 saniye
- ✅ UI donmuyor

---

### 9. Realtime Güncelleme Testi
**Amaç:** Ayar değişikliklerinin ürün maliyetlerini otomatik güncellemesini test et

**Adımlar:**
1. Bir ürün oluştur (40 gr)
2. Maliyet hesaplamasını not et
3. Ayarları aç
4. Filament fiyatını değiştir (650 → 700 TL)
5. Kaydet
6. Ürün sayfasına dön
7. Maliyet hesaplamasını kontrol et

**Beklenen Sonuç:**
- ✅ Maliyet otomatik güncellendi
- ✅ Yeni filament fiyatı kullanılıyor

---

### 10. Hata Durumları Testi
**Amaç:** Hata durumlarının doğru yönetildiğini doğrula

**Test Senaryoları:**
1. **Gramajı olmayan ürün:** Sipariş analizi yapılırken uyarı göstermeli
2. **Boş sipariş:** Hesaplama yapılmamalı
3. **Negatif değerler:** Kabul edilmemeli
4. **Veritabanı hatası:** Kullanıcıya anlaşılır hata mesajı

**Beklenen Sonuç:**
- ✅ Tüm hatalar yakalanıyor
- ✅ Kullanıcı dostu hata mesajları
- ✅ Uygulama çökmüyor

---

## 🎯 Başarı Kriterleri

### Fonksiyonel Gereksinimler
- [x] Ürün gramajı girişi
- [x] Maliyet hesaplama (4 parametre)
- [x] Önerilen satış fiyatları (5 kar marjı)
- [x] Fiyat yuvarlama (0 ve 5)
- [x] Sipariş maliyet analizi
- [x] Ayarlar yönetimi
- [x] Parametreleri aktif/pasif yapma

### Performans Gereksinimleri
- [ ] Sayfa yükleme < 2 saniye
- [ ] Maliyet hesaplama < 1 saniye
- [ ] 100+ ürün desteği
- [ ] 50+ sipariş desteği

### Kullanılabilirlik Gereksinimleri
- [x] Sezgisel UI
- [x] Mobil uyumlu
- [x] Türkçe dil desteği
- [x] Anlaşılır hata mesajları

### Güvenilirlik Gereksinimleri
- [ ] %100 test coverage
- [ ] Hata yakalama
- [ ] Veri tutarlılığı
- [ ] Otomatik güncelleme

---

## 📊 Test Raporu Şablonu

```markdown
## Test Raporu - [Tarih]

### Test Edilen Özellikler
- [ ] Veritabanı Migration
- [ ] Maliyet Ayarları
- [ ] Ürün Maliyet Hesaplama
- [ ] Sipariş Maliyet Analizi
- [ ] Fiyat Yuvarlama
- [ ] Parametreleri Kapatma
- [ ] Min/Max Değerler
- [ ] Performans
- [ ] Realtime Güncelleme
- [ ] Hata Durumları

### Bulunan Hatalar
1. [Hata Açıklaması]
   - **Önem:** Kritik/Yüksek/Orta/Düşük
   - **Adımlar:** ...
   - **Beklenen:** ...
   - **Gerçekleşen:** ...

### Genel Değerlendirme
- **Başarı Oranı:** X%
- **Kritik Hatalar:** X
- **Performans:** İyi/Orta/Kötü
- **Kullanılabilirlik:** İyi/Orta/Kötü

### Öneriler
1. ...
2. ...
```

---

## 🚀 Sonraki Adımlar

1. ✅ Migration'ı çalıştır
2. ✅ Temel testleri yap
3. ⏳ Hataları düzelt
4. ⏳ Performans optimizasyonu
5. ⏳ Kullanıcı testleri
6. ⏳ Production'a deploy
