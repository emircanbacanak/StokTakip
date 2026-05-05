# 💰 Ürün Maliyet Hesaplama ve Muhasebe Sistemi

## 📋 Genel Bakış

Bu sistem, 3D baskı ürünleriniz için kapsamlı maliyet hesaplama ve kar analizi yapmanızı sağlar. Filament, elektrik, fire ve yıpranma maliyetlerini hesaplayarak size önerilen satış fiyatları sunar.

## ✨ Özellikler

### 1. Ürün Maliyet Hesaplama
- **Gramaj Bazlı Hesaplama:** Her ürün için gramaj girin
- **4 Maliyet Parametresi:**
  - 🔥 Filament Fiyatı (TL/kg)
  - ⚡ Elektrik Maliyeti (TL/gram)
  - 📊 Fire Oranı (%)
  - 🔧 Yıpranma Maliyeti (TL/gram)
- **Otomatik Hesaplama:** Gramaj girdiğinizde maliyet otomatik hesaplanır
- **5 Kar Marjı:** %10, %20, %30, %40, %50 kar marjlı önerilen fiyatlar
- **Akıllı Yuvarlama:** Fiyatlar 0 veya 5'e yuvarlanır

### 2. Sipariş Maliyet Analizi
- **Gerçek Maliyet Hesaplama:** Tamamlanmış siparişler için gerçek maliyet
- **Kar/Zarar Analizi:** Gelir - Gider = Kar
- **Kar Marjı Hesaplama:** Yüzdelik kar marjınızı görün
- **Maliyet Dökümü:** Hangi kalemde ne kadar harcadığınızı görün
- **Önerilen Fiyatlandırma:** Hedef kar marjına göre fiyat önerisi

### 3. Dinamik Ayarlar Yönetimi
- **Merkezi Ayarlar:** Tüm parametreleri tek yerden yönetin
- **Aktif/Pasif Yapma:** İstemediğiniz parametreleri kapatın
- **Gerçek Zamanlı Güncelleme:** Ayar değişikliği tüm hesaplamaları günceller
- **Varsayılan Değerler:** Hızlı başlangıç için hazır ayarlar

## 🚀 Kurulum

### Adım 1: Veritabanı Migration'ı Çalıştırın

1. Supabase Dashboard'a gidin
2. SQL Editor'ü açın
3. `supabase/migration-cost-calculation.sql` dosyasının içeriğini kopyalayın
4. SQL Editor'e yapıştırın ve çalıştırın

**Oluşturulan Tablolar:**
- `cost_settings` - Maliyet ayarları
- `product_costs` - Ürün maliyet hesaplamaları
- `order_cost_analysis` - Sipariş maliyet analizleri
- `products.weight_grams` - Ürün gramaj alanı

### Adım 2: Ürün Gramajlarını Girin

1. **Ürünler** sayfasına gidin
2. Her ürün için **gramaj** bilgisini girin
3. Maliyet hesaplaması otomatik gösterilecek

### Adım 3: Maliyet Ayarlarını Yapılandırın

1. **Muhasebe** → **Maliyet Analizi** sekmesine gidin
2. **Ayarlar** butonuna tıklayın
3. Parametreleri ihtiyacınıza göre ayarlayın:
   - Filament fiyatınızı girin (TL/kg)
   - Elektrik maliyetinizi girin (TL/gram)
   - Fire oranınızı belirleyin (%)
   - Yıpranma maliyetini girin (TL/gram)
   - Kar marjlarını özelleştirin
4. **Kaydet** butonuna tıklayın

## 📖 Kullanım Kılavuzu

### Ürün Maliyeti Hesaplama

1. **Ürünler** sayfasına gidin
2. Yeni ürün ekleyin veya mevcut ürünü düzenleyin
3. **Gramaj** alanına ürünün gramajını girin (örn: 40)
4. Sağ tarafta **Maliyet Hesaplaması** otomatik gösterilir:
   - Ürün Gramı
   - Fire Dahil Gramı
   - Saf Filament Gideri
   - Elektrik Maliyeti
   - Fire Maliyeti
   - Yıpranma Maliyeti
   - **Toplam Maliyet**
   - **Önerilen Satış Fiyatları** (5 farklı kar marjı)

### Sipariş Maliyet Analizi

1. **Muhasebe** → **Maliyet Analizi** sekmesine gidin
2. **Sipariş Seç** dropdown'ından analiz etmek istediğiniz siparişi seçin
3. **Hedef Kar Marjı** girin (örn: 30%)
4. **Maliyet Hesapla** butonuna tıklayın
5. Sonuçları inceleyin:
   - **Toplam Üretim:** Kaç adet üretildi
   - **Toplam Filament:** Kaç kg filament kullanıldı
   - **Toplam Maliyet:** Gerçek üretim maliyeti
   - **Kar/Zarar:** Gelir - Maliyet
   - **Maliyet Dökümü:** Hangi kalemde ne kadar harcandı
   - **Önerilen Fiyatlandırma:** Hedef kar marjına göre fiyat

### Maliyet Ayarlarını Güncelleme

1. **Muhasebe** → **Maliyet Analizi** → **Ayarlar**
2. İstediğiniz parametreyi değiştirin
3. Parametreyi aktif/pasif yapmak için checkbox'ı kullanın
4. **Kaydet** butonuna tıklayın
5. Tüm ürün maliyetleri otomatik güncellenir

## 💡 İpuçları ve En İyi Uygulamalar

### 1. Doğru Gramaj Girişi
- Ürünlerinizi tartın ve gerçek gramajı girin
- Destek yapıları dahil edin
- Ortalama değer kullanın (her baskı farklı olabilir)

### 2. Gerçekçi Maliyet Parametreleri
- **Filament:** Satın alma fiyatınızı kullanın
- **Elektrik:** Yazıcınızın güç tüketimini hesaplayın
- **Fire:** Başarısız baskıları ve artık malzemeyi hesaba katın
- **Yıpranma:** Nozzle, yatak, bakım maliyetlerini dağıtın

### 3. Fire Oranı Belirleme
```
Fire Oranı = (Başarısız Baskılar + Artık Malzeme) / Toplam Üretim × 100
```
Örnek: 100 baskıdan 10'u başarısız → %10 fire

### 4. Kar Marjı Stratejisi
- **%10-20:** Rekabetçi fiyatlandırma
- **%30-40:** Standart kar marjı
- **%50+:** Premium ürünler

### 5. Düzenli Güncelleme
- Filament fiyatları değiştiğinde ayarları güncelleyin
- Elektrik tarifesi değiştiğinde yeni maliyeti girin
- Üretim verimliliği arttıkça fire oranını düşürün

## 📊 Örnek Hesaplama

### Senaryo
- **Ürün:** Telefon Tutucu
- **Gramaj:** 40 gr
- **Filament:** 650 TL/kg
- **Elektrik:** 0.1 TL/gram
- **Fire:** %10
- **Yıpranma:** 0.05 TL/gram

### Hesaplama
```
Fire Dahil Gramaj = 40 × 1.10 = 44 gr

Saf Filament = (40 / 1000) × 650 = 26.00 TL
Elektrik = 44 × 0.1 = 4.40 TL
Fire = ((44 - 40) / 1000) × 650 = 2.60 TL
Yıpranma = 44 × 0.05 = 2.20 TL

Toplam Maliyet = 26.00 + 4.40 + 2.60 + 2.20 = 35.20 TL

Önerilen Fiyatlar:
- %10 kar: 35.20 × 1.10 = 38.72 → 40 TL
- %20 kar: 35.20 × 1.20 = 42.24 → 40 TL
- %30 kar: 35.20 × 1.30 = 45.76 → 45 TL
- %40 kar: 35.20 × 1.40 = 49.28 → 50 TL
- %50 kar: 35.20 × 1.50 = 52.80 → 55 TL
```

## 🔧 Sorun Giderme

### Problem: Maliyet hesaplanmıyor
**Çözüm:**
1. Ürün gramajının girildiğinden emin olun
2. Maliyet ayarlarının yapılandırıldığını kontrol edin
3. En az bir parametrenin aktif olduğundan emin olun

### Problem: Sipariş analizi yapılamıyor
**Çözüm:**
1. Siparişteki tüm ürünlerin gramajının girildiğinden emin olun
2. Sipariş kalemlerinin olduğunu kontrol edin
3. Maliyet ayarlarının yapılandırıldığını kontrol edin

### Problem: Fiyatlar çok yüksek/düşük
**Çözüm:**
1. Maliyet parametrelerini gözden geçirin
2. Gramaj doğru girilmiş mi kontrol edin
3. Kar marjlarını ayarlayın
4. Fiyat yuvarlamayı kapatmayı deneyin

### Problem: Ayarlar kaydedilmiyor
**Çözüm:**
1. İnternet bağlantınızı kontrol edin
2. Supabase bağlantısını kontrol edin
3. Tarayıcı console'unda hata var mı bakın
4. Sayfayı yenileyin ve tekrar deneyin

## 📈 Gelişmiş Özellikler

### Parametreleri Kapatma
İstemediğiniz maliyet kalemlerini hesaplamadan çıkarabilirsiniz:
- Fire hesaplamak istemiyorsanız → Fire checkbox'ını kaldırın
- Sadece filament maliyeti görmek istiyorsanız → Diğer parametreleri kapatın

### Özel Kar Marjları
Varsayılan %10, %20, %30, %40, %50 yerine kendi kar marjlarınızı belirleyebilirsiniz:
1. Ayarlar → Kar Marjları
2. İstediğiniz yüzdeleri girin (örn: %15, %25, %35, %45, %55)
3. Kaydedin

### Fiyat Yuvarlama
Fiyatları 0 veya 5'e yuvarlamak istemiyorsanız:
1. Ayarlar → Fiyat Yuvarlama
2. Checkbox'ı kaldırın
3. Kaydedin

## 🎯 Sık Sorulan Sorular

**S: Gramaj nasıl ölçülür?**
C: Ürünü tartın, destek yapılarını dahil edin. Ortalama değer kullanın.

**S: Fire oranı ne olmalı?**
C: Başlangıç için %10 kullanın. Deneyim kazandıkça ayarlayın.

**S: Elektrik maliyeti nasıl hesaplanır?**
C: Yazıcı gücü (W) × Baskı süresi (saat) × Elektrik fiyatı (TL/kWh) / Ürün gramajı

**S: Yıpranma maliyeti nedir?**
C: Nozzle, yatak, bakım maliyetlerinin ürünlere dağıtılmış hali.

**S: Kar marjı ne olmalı?**
C: Sektöre ve ürüne göre değişir. Genelde %30-40 standart kabul edilir.

**S: Fiyatlar neden yuvarlanıyor?**
C: Müşteriler için daha anlaşılır fiyatlar oluşturmak için. İstemezseniz kapatabilirsiniz.

## 📞 Destek

Sorun yaşıyorsanız veya öneriniz varsa:
1. `TEST-PLAN.md` dosyasındaki test senaryolarını çalıştırın
2. Hata mesajlarını not edin
3. Tarayıcı console'unu kontrol edin
4. Supabase loglarını inceleyin

## 🚀 Sonraki Adımlar

1. ✅ Migration'ı çalıştırın
2. ✅ Ürün gramajlarını girin
3. ✅ Maliyet ayarlarını yapılandırın
4. ✅ İlk ürün maliyetini hesaplayın
5. ✅ İlk sipariş analizini yapın
6. ✅ Gerçek verilerle karşılaştırın
7. ✅ Ayarları optimize edin

## 📝 Notlar

- Tüm fiyatlar TL cinsindendir
- Gramaj gram (gr) cinsindendir
- Filament fiyatı kilogram (kg) başınadır
- Yüzdeler ondalık olarak girilir (örn: 10.5)
- Hesaplamalar gerçek zamanlıdır
- Ayar değişiklikleri tüm ürünleri etkiler

---

**Başarılar! 🎉**

Bu sistem sayesinde ürünlerinizin gerçek maliyetini bilecek ve karlı fiyatlandırma yapabileceksiniz.
