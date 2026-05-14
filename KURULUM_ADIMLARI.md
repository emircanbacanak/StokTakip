# 🚀 Boyut Özelliği Kurulum Adımları

## ⚡ Hızlı Başlangıç

### 1. Veritabanı Migration'ını Çalıştır

**Supabase Dashboard** üzerinden:

1. Supabase projenize giriş yapın: https://supabase.com/dashboard
2. Sol menüden **SQL Editor** seçin
3. **New Query** butonuna tıklayın
4. `supabase/migration-add-product-sizes.sql` dosyasının içeriğini kopyalayıp yapıştırın
5. **Run** butonuna tıklayın
6. ✅ "Success. No rows returned" mesajını görmelisiniz

### 2. Uygulamayı Test Edin

```bash
# Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcıda açın: http://localhost:3000

## 📝 Test Senaryoları

### Test 1: Boyutlu Ürün Ekle

1. **Dashboard → Products** sayfasına git
2. **"Ürün Ekle"** butonuna tıkla
3. Ürün bilgilerini gir:
   - Ad: "Test Vazo"
   - Açıklama: "Test amaçlı vazo"
4. ✅ **"Bu ürünün farklı boyutları var"** checkbox'ını işaretle
5. Boyutları ekle:
   - **Boyut Ekle** butonuna tıkla
   - Boyut 1: "13cm" - 35
   - **Boyut Ekle** butonuna tıkla
   - Boyut 2: "15cm" - 45
   - **Boyut Ekle** butonuna tıkla
   - Boyut 3: "17cm" - 55
6. **"Kaydet"** butonuna tıkla
7. ✅ Ürün kartında "Farklı boyutlar mevcut" etiketini görmelisin

### Test 2: Boyutlu Ürün ile Sipariş Oluştur

1. **Dashboard → Orders** sayfasına git
2. **"Yeni Sipariş"** butonuna tıkla
3. Alıcı seç (yoksa önce alıcı ekle)
4. **Ürün Ekle** bölümünde:
   - Ürün: "Test Vazo" seç
   - ✅ **"BOYUT SEÇİN"** dropdown'ı otomatik görünmeli
   - Boyut: "15cm (45 gr)" seç
   - Renk: Bir renk seç
   - Adet: 5
   - Birim Fiyat: 100
5. **"Sipariş Oluştur"** butonuna tıkla
6. ✅ Sipariş listesinde yeni siparişi görmelisin

### Test 3: Siparişi Düzenle

1. Az önce oluşturduğun siparişe tıkla
2. **"Düzenle"** butonuna tıkla
3. Boyutu değiştir: "17cm (55 gr)"
4. **"Güncelle"** butonuna tıkla
5. ✅ Sipariş detayında yeni boyutu görmelisin

### Test 4: Boyutsuz Ürün (Eski Sistem)

1. **Dashboard → Products** sayfasına git
2. **"Ürün Ekle"** butonuna tıkla
3. Ürün bilgilerini gir:
   - Ad: "Normal Ürün"
   - Gramaj: 40
4. ❌ **"Bu ürünün farklı boyutları var"** checkbox'ını işaretleme
5. **"Kaydet"** butonuna tıkla
6. ✅ Ürün kartında "40 gr" etiketini görmelisin
7. Bu ürünle sipariş oluştururken boyut seçimi görünmemeli

## ✅ Başarı Kriterleri

Tüm testler başarılı olduysa:

- ✅ Boyutlu ürün ekleyebildin
- ✅ Boyutlu ürün ile sipariş oluşturabildin
- ✅ Boyut seçimi zorunlu çalışıyor
- ✅ Sipariş düzenlemede boyut değiştirebildin
- ✅ Boyutsuz ürünler eskisi gibi çalışıyor
- ✅ Maliyet önizlemesi boyutlu ürünler için çalışıyor

## 🐛 Sorun mu Yaşıyorsun?

### Migration Hatası

**Hata:** "relation already exists"

**Çözüm:**
```sql
-- Supabase SQL Editor'de çalıştır:
DROP TABLE IF EXISTS product_sizes CASCADE;
-- Sonra migration'ı tekrar çalıştır
```

### Boyut Seçimi Görünmüyor

**Kontrol Et:**
1. Ürünün `has_sizes` checkbox'ı işaretli mi?
2. Ürünün en az bir boyutu var mı?
3. Tarayıcı console'unda hata var mı? (F12 → Console)

**Çözüm:**
- Ürünü düzenle ve boyutları tekrar ekle
- Sayfayı yenile (Ctrl+F5)

### TypeScript Hataları

**Çözüm:**
```bash
# .next klasörünü sil ve yeniden başlat
rmdir /s /q .next
npm run dev
```

### Veritabanı Bağlantı Hatası

**Kontrol Et:**
1. `.env.local` dosyası var mı?
2. Supabase URL ve Key doğru mu?

**Çözüm:**
```env
# .env.local dosyasını kontrol et
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📚 Daha Fazla Bilgi

- **Detaylı Dokümantasyon:** `BOYUT_OZELLIGI_UYGULAMA.md`
- **Proje Yapısı:** `.kiro/PROJECT_CONTEXT.md`
- **Migration Dosyası:** `supabase/migration-add-product-sizes.sql`

## 🎉 Tebrikler!

Boyut özelliği başarıyla kuruldu! Artık ürünlerinize farklı boyutlar ekleyebilir ve siparişlerde boyut seçebilirsiniz.

**Sorularınız için:** Yukarıdaki dokümantasyon dosyalarını kontrol edin.
