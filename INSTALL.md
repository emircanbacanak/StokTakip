# ⚡ Kurulum - 2 Dakika

## 🎯 Tek Adım Kurulum

### 1. Supabase SQL Editor'ı Aç

1. [Supabase Dashboard](https://app.supabase.com) → Projenizi seçin
2. Sol menüden **SQL Editor** tıklayın
3. **New query** butonuna tıklayın

### 2. Migration Script'i Çalıştır

**Önemli**: `schema-v2.sql` DEĞİL, `migration-v2.sql` dosyasını kullanın!

```bash
# Bu dosyayı kopyalayın:
supabase/migration-v2.sql
```

1. Dosyanın tüm içeriğini kopyalayın
2. SQL Editor'e yapıştırın
3. **RUN** butonuna tıklayın (veya Ctrl+Enter)

### 3. Başarı Mesajını Kontrol Edin

Şu mesajları görmelisiniz:

```
✅ Migration başarıyla tamamlandı!
📊 Yeni tablolar: deliveries, delivery_items, payments
🔧 Trigger'lar aktif
📝 Mevcut veriler korundu

🚀 Artık ara teslimat ve ödeme takibi yapabilirsiniz!
```

## ✅ Kurulum Tamamlandı!

Artık sistemi kullanabilirsiniz:

1. Uygulamayı yenileyin (F5)
2. Bir siparişe tıklayın
3. "Yeni Teslimat" ve "Ödeme Ekle" butonları aktif olmalı
4. Kırmızı uyarı mesajı kaybolmalı

## 🧪 Hızlı Test

### Test 1: Teslimat Ekle
1. Sipariş detayına git
2. "Teslimatlar" tab'ı → "Yeni Teslimat"
3. Ürün seç → "Teslimatı Kaydet"
4. ✅ Başarılı!

### Test 2: Ödeme Ekle
1. "Ödemeler" tab'ı → "Ödeme Ekle"
2. Tutar gir → "Ödeme Al"
3. ✅ Başarılı!

## 🐛 Sorun mu Yaşıyorsun?

### Hata: "policy already exists"
**Çözüm**: Normal, script bunu handle ediyor. Devam et.

### Hata: "relation does not exist"
**Çözüm**: `migration-v2.sql` dosyasını kullandığından emin ol (schema-v2.sql değil!)

### Tablolar oluşmadı mı?
```sql
-- Kontrol et:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('deliveries', 'delivery_items', 'payments');
```

Sonuç: 3 tablo görmelisin

### Trigger'lar çalışmıyor mu?
```sql
-- Kontrol et:
SELECT tgname FROM pg_trigger 
WHERE tgname LIKE '%order%';
```

Sonuç: 3 trigger görmelisin

## 📚 Sonraki Adımlar

- [QUICK-START.md](QUICK-START.md) - Kullanım kılavuzu
- [README-V2.md](README-V2.md) - Özellikler
- [UPGRADE-GUIDE.md](UPGRADE-GUIDE.md) - Detaylı dokümantasyon

## 💡 Önemli Notlar

1. **Mevcut Veriler**: Tüm siparişler ve ödemeler korunur
2. **Geriye Dönük Uyumluluk**: Eski özellikler çalışmaya devam eder
3. **Güvenli**: Hiçbir veri silinmez veya değiştirilmez

---

**Kurulum Süresi**: ~2 dakika
**Zorluk**: Çok Kolay
**Risk**: Yok (mevcut veriler korunur)

🎉 **Başarılar!**
