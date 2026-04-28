# ⚡ Hızlı Başlangıç - 5 Dakikada Kurulum

## 1️⃣ Veritabanını Güncelle (2 dakika)

### Adım 1: Supabase'e Git
1. [Supabase Dashboard](https://app.supabase.com) aç
2. Projenizi seçin
3. Sol menüden **SQL Editor** tıklayın

### Adım 2: SQL Script'i Çalıştır
1. "New query" butonuna tıklayın
2. `supabase/schema-v2.sql` dosyasının içeriğini kopyalayın
3. SQL Editor'e yapıştırın
4. **RUN** butonuna tıklayın
5. ✅ "Success. No rows returned" mesajını görmelisiniz

### Adım 3: Kontrol Et
```sql
-- Bu sorguyu çalıştırarak yeni tabloları kontrol edin
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('deliveries', 'delivery_items', 'payments');
```

Sonuç: 3 tablo görmelisiniz ✅

## 2️⃣ Uygulamayı Test Et (3 dakika)

### Adım 1: Uygulamayı Başlat
```bash
npm run dev
```

### Adım 2: Sipariş Oluştur
1. http://localhost:3000/dashboard/orders adresine git
2. "Yeni Sipariş" butonuna tıkla
3. Alıcı seç
4. Ürün ekle (örn: 10 adet Ananas Kupa - Sarı, 50 TL/adet)
5. "Sipariş Oluştur"

### Adım 3: Teslimat Yap
1. Oluşturduğun siparişe tıkla
2. "Teslimatlar" tab'ına git
3. "Yeni Teslimat" butonuna tıkla
4. 5 adet seç
5. "Teslimatı Kaydet"

### Adım 4: Ödeme Al
1. "Ödemeler" tab'ına git
2. "Ödeme Ekle" butonuna tıkla
3. 250 TL gir (5 adet × 50 TL)
4. Ödeme yöntemi seç
5. "Ödeme Al"

### Adım 5: Kontrol Et
- ✅ "Ürünler" tab'ında ilerleme çubuğu %50 olmalı
- ✅ Özet kartlarda: Toplam 500 TL, Ödenen 250 TL, Kalan 250 TL
- ✅ Uyarı yok (çünkü beklenen = alınan)

## 3️⃣ Fazla Ödeme Testi (1 dakika)

### Test: Fazla Ödeme Uyarısı
1. Aynı siparişte "Ödemeler" tab'ına git
2. "Ödeme Ekle" → 300 TL gir
3. ⚠️ Sarı uyarı görmelisiniz: "50 TL fazla ödeme alınacak"
4. İptal et veya devam et

## 4️⃣ Eksik Ödeme Testi (1 dakika)

### Test: Eksik Ödeme Uyarısı
1. Yeni bir sipariş oluştur (10 adet × 100 TL = 1000 TL)
2. Tüm ürünleri teslim et (10 adet)
3. Sadece 700 TL ödeme al
4. 🔴 Kırmızı uyarı görmelisiniz: "300 TL eksik ödeme var"

## ✅ Kurulum Tamamlandı!

Artık sistemi kullanmaya hazırsınız! 🎉

## 🎯 Sonraki Adımlar

### Öğren
- [UPGRADE-GUIDE.md](UPGRADE-GUIDE.md) - Detaylı kullanım kılavuzu
- [README-V2.md](README-V2.md) - Özellikler ve örnekler

### Keşfet
- Ara teslimat yapın
- Farklı ödeme yöntemleri deneyin
- Teslimat ve ödeme geçmişini inceleyin
- Alıcı bazlı sipariş sayfasını kullanın

### Özelleştir
- Ödeme yöntemlerini düzenleyin (`lib/types/database.ts`)
- Sipariş durumlarını özelleştirin
- Raporlar ekleyin

## 🆘 Sorun mu Yaşıyorsun?

### Veritabanı Hatası
```
Error: relation "deliveries" does not exist
```
**Çözüm**: schema-v2.sql dosyasını tekrar çalıştır

### Trigger Çalışmıyor
```sql
-- Trigger'ları kontrol et
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%order%';
```
**Beklenen**: 3 trigger görmelisiniz

### Frontend Hatası
```
Type error: Property 'delivered_quantity' does not exist
```
**Çözüm**: 
1. `npm run dev` komutunu yeniden başlat
2. Browser cache'i temizle (Ctrl+Shift+R)

### Daha Fazla Yardım
1. Browser console'u aç (F12)
2. Network tab'ını kontrol et
3. Supabase logs'u kontrol et

## 💡 Hızlı İpuçları

### Klavye Kısayolları
- `Esc` - Dialog'u kapat
- `Enter` - Form'u gönder

### Hızlı Butonlar
- **Tümü** - Kalan tüm ürünleri seç
- **Yarısı** - Yarı ödeme al
- **Kalan Tümü** - Kalan borcu öde

### Mobil Kullanım
- Swipe down - Dialog'u kapat
- Tap - Detay aç
- Long press - Menü aç

## 🎊 Başarılar!

Artık gelişmiş sipariş takip sisteminiz hazır!

**Sorular?** → UPGRADE-GUIDE.md'yi okuyun
**Sorunlar?** → Console'u kontrol edin
**Öneriler?** → Issue açın

---

**Kurulum Süresi**: ~5 dakika
**Zorluk**: Kolay
**Gereksinimler**: Supabase hesabı, Node.js

🚀 **İyi çalışmalar!**
