# 🚀 Sipariş Takip Sistemi V2

## 🎯 Yeni Özellikler

### ✨ Ara Teslimat Sistemi
Artık siparişlerinizi kısmi olarak teslim edebilir, her teslimatı ayrı ayrı takip edebilirsiniz!

**Özellikler:**
- 📦 Ürün bazlı teslimat
- 🎨 Renk bazlı takip
- 📊 Kalan ürün gösterimi
- 📝 Teslimat notları
- 📅 Teslimat geçmişi

### 💰 Gelişmiş Ödeme Takibi
Her ödemeyi ayrı ayrı kaydedin, ödeme geçmişinizi görüntüleyin!

**Özellikler:**
- 💳 5 farklı ödeme yöntemi
- 📈 Ödeme geçmişi
- ⚠️ Fazla/eksik ödeme uyarıları
- 🧮 Otomatik hesaplamalar
- 📝 Ödeme notları

### 🤖 Akıllı Hesaplamalar
Sistem artık her şeyi otomatik hesaplıyor!

**Otomatik:**
- ✅ Teslim edilen miktar
- ✅ Ödenen tutar
- ✅ Kalan borç
- ✅ Beklenen ödeme
- ✅ Fazla/eksik ödeme analizi

## 🚀 Hızlı Başlangıç

### 1. Veritabanını Güncelle

Supabase Dashboard → SQL Editor'a git ve şu dosyayı çalıştır:

```bash
supabase/schema-v2.sql
```

### 2. Uygulamayı Başlat

```bash
npm run dev
```

### 3. Test Et

1. Bir sipariş oluştur
2. "Yeni Teslimat" butonuna tıkla
3. Ürünleri seç ve teslim et
4. "Ödeme Ekle" butonuna tıkla
5. Ödeme al

## 📱 Kullanım

### Sipariş Detayı

Sipariş kartına tıklayınca 3 tab'lı detay ekranı açılır:

#### 📦 Ürünler Tab'ı
- Sipariş kalemleri
- Üretim ilerlemesi
- Teslimat ilerlemesi
- Kalan ürünler

#### 🚚 Teslimatlar Tab'ı
- Teslimat geçmişi
- "Yeni Teslimat" butonu
- Teslimat detayları

#### 💳 Ödemeler Tab'ı
- Ödeme geçmişi
- "Ödeme Ekle" butonu
- Ödeme detayları

### Ara Teslimat Yapma

1. Sipariş detayında "Teslimatlar" tab'ına git
2. "Yeni Teslimat" butonuna tıkla
3. Her üründen kaç adet teslim edeceğini seç
4. Not ekle (opsiyonel)
5. "Teslimatı Kaydet"

**İpuçları:**
- `+` / `-` butonları ile miktar ayarla
- "Tümü" butonu ile kalan tüm ürünleri seç
- Teslimat değeri otomatik hesaplanır

### Ödeme Alma

1. Sipariş detayında "Ödemeler" tab'ına git
2. "Ödeme Ekle" butonuna tıkla
3. Tutarı gir
4. Ödeme yöntemini seç
5. Not ekle (opsiyonel)
6. "Ödeme Al"

**İpuçları:**
- "Kalan Tümü" butonu ile kalan borcu otomatik doldur
- "Yarısı" butonu ile yarı ödeme al
- Fazla ödeme uyarısına dikkat et

## ⚠️ Akıllı Uyarılar

### 🟡 Fazla Ödeme
Teslim edilen ürünlerden fazla ödeme aldığınızda:
```
Beklenen: 500 TL
Alınan: 700 TL
→ 200 TL fazla ödeme alındı
```

### 🔴 Eksik Ödeme
Teslim edilen ürünler için eksik ödeme varsa:
```
Beklenen: 1000 TL
Alınan: 700 TL
→ 300 TL eksik ödeme var
```

## 📊 Örnek Senaryo

### Senaryo: Kısmi Teslimat ve Ödeme

**Sipariş:**
- 20 adet Ananas Kupa - Sarı
- Birim fiyat: 50 TL
- Toplam: 1000 TL

**1. Hafta:**
- ✅ 10 adet üretildi
- 🚚 10 adet teslim edildi
- 💰 500 TL ödeme alındı
- ✅ Durum: Normal (beklenen = alınan)

**2. Hafta:**
- ✅ 10 adet daha üretildi
- 🚚 5 adet teslim edildi
- 💰 300 TL ödeme alındı
- ⚠️ Durum: Eksik ödeme (beklenen 250 TL, alınan 300 TL → 50 TL fazla)

**3. Hafta:**
- 🚚 Son 5 adet teslim edildi
- 💰 200 TL ödeme alındı
- ✅ Durum: Tamamlandı (toplam 1000 TL)

## 🎨 Ekran Görüntüleri

### Sipariş Listesi
```
┌─────────────────────────────────────┐
│ 🔵 Feridun                          │
│ 2 sipariş · 500 TL borç            │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🍍 Ananas Kupa                  │ │
│ │ Teslim Edildi                   │ │
│ │ 27.04.2026 · 1 ürün             │ │
│ │ 0,00 TL                         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Sipariş Detayı
```
┌─────────────────────────────────────┐
│ Feridun                             │
│ 27.04.2026                          │
│                                     │
│ ┌─────┬─────┬─────┐                │
│ │1000 │ 500 │ 500 │                │
│ │Toplam│Ödenen│Kalan│              │
│ └─────┴─────┴─────┘                │
│                                     │
│ ⚠️ Eksik Ödeme                      │
│ Beklenen: 750 TL                    │
│ 250 TL eksik ödeme var              │
│                                     │
│ [Ürünler] [Teslimatlar] [Ödemeler] │
│                                     │
│ 📦 Ananas Kupa - Sarı               │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░ 75% Teslimat       │
│ 15/20 adet teslim edildi            │
└─────────────────────────────────────┘
```

## 🔧 Teknik Detaylar

### Yeni Tablolar
- `deliveries` - Teslimat kayıtları
- `delivery_items` - Teslimat detayları
- `payments` - Ödeme kayıtları

### Otomatik Trigger'lar
- Teslimat eklenince → `delivered_quantity` güncellenir
- Ödeme eklenince → `paid_amount` güncellenir
- Order item değişince → `total_amount` güncellenir

### Type Safety
- ✅ Full TypeScript support
- ✅ Strict type checking
- ✅ No any types
- ✅ Database types synced

## 📚 Dokümantasyon

- **UPGRADE-GUIDE.md** - Detaylı kurulum ve kullanım kılavuzu
- **IMPLEMENTATION-SUMMARY.md** - Teknik implementasyon detayları
- **supabase/schema-v2.sql** - Veritabanı şeması

## 🐛 Sorun Giderme

### Trigger'lar çalışmıyor
```sql
-- Trigger'ları kontrol et
SELECT * FROM pg_trigger WHERE tgname LIKE '%order%';
```

### Tutarlar yanlış
```sql
-- Paid amount'u yeniden hesapla
UPDATE orders 
SET paid_amount = (
  SELECT COALESCE(SUM(amount), 0) 
  FROM payments 
  WHERE order_id = orders.id
);
```

### Daha fazla yardım
1. Browser console'u kontrol et (F12)
2. Supabase logs'u kontrol et
3. UPGRADE-GUIDE.md'yi oku

## 🎉 Özellikler

### ✅ Tamamlandı
- [x] Ara teslimat sistemi
- [x] Gelişmiş ödeme takibi
- [x] Otomatik hesaplamalar
- [x] Akıllı uyarılar
- [x] Modern UI/UX
- [x] Responsive tasarım
- [x] Type safety
- [x] Hata yönetimi

### 🔜 Gelecek
- [ ] PDF fatura
- [ ] Excel export
- [ ] SMS bildirimleri
- [ ] Stok entegrasyonu
- [ ] Dashboard grafikleri

## 💡 İpuçları

1. **Hızlı Teslimat**: "Tümü" butonunu kullan
2. **Kısmi Ödeme**: "Yarısı" butonu ile hızlıca yarı ödeme al
3. **Notlar**: Her işleme not ekleyerek detaylı kayıt tut
4. **Durum Takibi**: Sipariş durumunu güncel tut

## 🤝 Katkıda Bulunma

Bu sistem sürekli geliştirilmektedir. Önerileriniz için:
- Issue açın
- Pull request gönderin
- Feedback verin

## 📄 Lisans

MIT License

---

**Versiyon**: 2.0.0
**Son Güncelleme**: 2024
**Geliştirici**: Full Stack Development Team

🎯 **Hedef**: Üretim ve sipariş süreçlerinizi kolaylaştırmak!
