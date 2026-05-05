# 🚀 Yeni Oturum Başlangıç Rehberi

> Gelecek oturumlarda ne söyleyeceğinize dair hızlı rehber

---

## ⚡ Hızlı Başlangıç Komutları

### Genel Proje Çalışması İçin:

```
PROJECT_CONTEXT.md dosyasını oku
```

Bu tek komut yeterli! Sistem otomatik olarak:
- ✅ `steering/project-context.md` zaten yüklü olacak (otomatik)
- ✅ Proje yapısını anlayacak
- ✅ Veritabanı şemasını görecek
- ✅ Component'leri bilecek

---

## 🎯 Görev Bazlı Başlangıç Komutları

### 1. Yeni Özellik Eklemek İstiyorsanız:

```
PROJECT_CONTEXT.md ve COMPONENT_CATALOG.md dosyalarını oku. 
Yeni bir sipariş özelliği eklemek istiyorum.
```

### 2. Veritabanı Değişikliği Yapacaksanız:

```
PROJECT_CONTEXT.md ve DATABASE_GUIDE.md dosyalarını oku.
Veritabanına yeni bir tablo eklemek istiyorum.
```

### 3. Bug Fix Yapacaksanız:

```
QUICK_REFERENCE.md dosyasını oku.
Sipariş oluşturma sırasında hata alıyorum, düzeltmek istiyorum.
```

### 4. Component Arayacaksanız:

```
COMPONENT_CATALOG.md dosyasını oku.
Teslimat dialog'unu bulmak istiyorum.
```

### 5. Hızlı Bir Şey Yapmak İstiyorsanız:

```
QUICK_REFERENCE.md dosyasını oku.
[Ne yapmak istediğinizi yazın]
```

---

## 📋 Komut Şablonları

### Şablon 1: Genel Çalışma
```
PROJECT_CONTEXT.md dosyasını oku
```

### Şablon 2: Özellik Ekleme
```
PROJECT_CONTEXT.md ve COMPONENT_CATALOG.md dosyalarını oku.
[Özellik açıklaması]
```

### Şablon 3: Veritabanı İşlemi
```
PROJECT_CONTEXT.md ve DATABASE_GUIDE.md dosyalarını oku.
[Veritabanı değişikliği açıklaması]
```

### Şablon 4: Hızlı İşlem
```
QUICK_REFERENCE.md dosyasını oku.
[İşlem açıklaması]
```

---

## 💡 Örnekler

### Örnek 1: Yeni Dialog Eklemek

**Siz:**
```
PROJECT_CONTEXT.md ve COMPONENT_CATALOG.md dosyalarını oku.
Siparişlere not ekleme dialog'u eklemek istiyorum.
```

**Kiro:**
- PROJECT_CONTEXT.md okur (proje yapısını anlar)
- COMPONENT_CATALOG.md okur (benzer dialog'ları bulur)
- Sadece ilgili dialog'u okur (örnek: new-order-dialog.tsx)
- Yeni dialog'u oluşturur

**Token Kullanımı:** ~3,500 token (Eski yöntem: ~25,000 token)

---

### Örnek 2: Veritabanı Kolonu Eklemek

**Siz:**
```
PROJECT_CONTEXT.md ve DATABASE_GUIDE.md dosyalarını oku.
orders tablosuna "priority" kolonu eklemek istiyorum.
```

**Kiro:**
- PROJECT_CONTEXT.md okur (veritabanı şemasını görür)
- DATABASE_GUIDE.md okur (migration örneği bulur)
- Migration oluşturur
- database.ts günceller

**Token Kullanımı:** ~2,000 token (Eski yöntem: ~15,000 token)

---

### Örnek 3: Bug Fix

**Siz:**
```
QUICK_REFERENCE.md dosyasını oku.
Üretim miktarı güncellenirken hata alıyorum.
```

**Kiro:**
- QUICK_REFERENCE.md okur (bug fix workflow'unu görür)
- Sadece production-client.tsx okur
- Hatayı bulur ve düzeltir

**Token Kullanımı:** ~1,500 token (Eski yöntem: ~10,000 token)

---

## 🚫 YAPMAYIN

### ❌ Kötü Başlangıç:
```
Tüm projeyi oku ve analiz et
```
**Sonuç:** 20,000+ token israfı

### ❌ Kötü Başlangıç:
```
Tüm component'leri oku
```
**Sonuç:** 15,000+ token israfı

### ❌ Kötü Başlangıç:
```
Veritabanı dosyalarını oku
```
**Sonuç:** 10,000+ token israfı

---

## ✅ YAPIN

### ✅ İyi Başlangıç:
```
PROJECT_CONTEXT.md dosyasını oku
```
**Sonuç:** ~2,000 token (90% tasarruf)

### ✅ İyi Başlangıç:
```
QUICK_REFERENCE.md dosyasını oku
```
**Sonuç:** ~1,200 token (94% tasarruf)

### ✅ İyi Başlangıç:
```
PROJECT_CONTEXT.md ve COMPONENT_CATALOG.md dosyalarını oku
```
**Sonuç:** ~3,500 token (86% tasarruf)

---

## 🎯 Görev Türüne Göre Komutlar

| Görev | Komut | Token |
|-------|-------|-------|
| **Proje anlama** | `PROJECT_CONTEXT.md dosyasını oku` | ~2,000 |
| **Yeni özellik** | `PROJECT_CONTEXT.md ve COMPONENT_CATALOG.md dosyalarını oku` | ~3,500 |
| **Veritabanı** | `PROJECT_CONTEXT.md ve DATABASE_GUIDE.md dosyalarını oku` | ~3,800 |
| **Bug fix** | `QUICK_REFERENCE.md dosyasını oku` | ~1,200 |
| **Component arama** | `COMPONENT_CATALOG.md dosyasını oku` | ~1,500 |
| **Hızlı işlem** | `QUICK_REFERENCE.md dosyasını oku` | ~1,200 |

---

## 📝 Kopyala-Yapıştır Komutlar

### En Sık Kullanılanlar:

#### 1. Genel Çalışma (En Yaygın)
```
PROJECT_CONTEXT.md dosyasını oku
```

#### 2. Yeni Özellik Ekleme
```
PROJECT_CONTEXT.md ve COMPONENT_CATALOG.md dosyalarını oku. Yeni bir [özellik adı] eklemek istiyorum.
```

#### 3. Veritabanı Değişikliği
```
PROJECT_CONTEXT.md ve DATABASE_GUIDE.md dosyalarını oku. [Değişiklik açıklaması]
```

#### 4. Hızlı Bug Fix
```
QUICK_REFERENCE.md dosyasını oku. [Bug açıklaması]
```

---

## 🔄 Otomatik Yükleme

**Unutmayın:** `steering/project-context.md` her oturumda **otomatik olarak** yüklenir!

Bu dosya şunları içerir:
- ✅ Temel proje bilgileri
- ✅ Token optimizasyonu kuralları
- ✅ Dosya okuma stratejisi
- ✅ Sık kullanılan dosya yolları

**Yani:** Hiçbir şey söylemeden bile sistem temel bilgileri bilir!

---

## 💬 Konuşma Örnekleri

### Senaryo 1: Yeni Oturum, Genel Çalışma

**Siz:**
```
PROJECT_CONTEXT.md dosyasını oku
```

**Kiro:**
```
Anladım! Projenizi inceledim:
- Next.js 16 + Supabase + TypeScript
- Stok ve sipariş takip sistemi
- 7 ana tablo, 9 sipariş dialog'u
- PWA desteği var

Ne yapmak istersiniz?
```

---

### Senaryo 2: Yeni Özellik Eklemek

**Siz:**
```
PROJECT_CONTEXT.md ve COMPONENT_CATALOG.md dosyalarını oku.
Siparişlere öncelik (priority) özelliği eklemek istiyorum.
```

**Kiro:**
```
Anladım! Sipariş öncelik özelliği ekleyeceğiz:

1. Veritabanı: orders tablosuna priority kolonu
2. Tip: database.ts'ye priority tipi
3. UI: Sipariş dialog'larına priority seçici
4. Liste: Önceliğe göre sıralama

Başlayalım mı?
```

---

### Senaryo 3: Bug Fix

**Siz:**
```
QUICK_REFERENCE.md dosyasını oku.
Üretim miktarı güncellenirken bazen hata veriyor.
```

**Kiro:**
```
Anladım! Bug fix workflow'unu takip edeceğim:

1. production-client.tsx dosyasını okuyacağım
2. Hatayı bulacağım
3. Düzelteceğim
4. Test edeceğim

Başlayalım mı?
```

---

## 🎓 İleri Seviye İpuçları

### İpucu 1: Birden Fazla Dosya
```
PROJECT_CONTEXT.md, COMPONENT_CATALOG.md ve DATABASE_GUIDE.md dosyalarını oku.
Büyük bir özellik ekleyeceğim.
```

### İpucu 2: Spesifik Dosya İsteme
```
PROJECT_CONTEXT.md dosyasını oku.
Sonra components/orders/new-order-dialog.tsx dosyasını oku.
Bu dialog'a benzer bir dialog oluşturmak istiyorum.
```

### İpucu 3: Görsel Harita İsteme
```
VISUAL_MAP.md dosyasını oku.
Proje yapısını görsel olarak anlamak istiyorum.
```

---

## 📊 Token Tasarrufu Karşılaştırması

### Eski Yöntem (❌ Verimsiz):
```
"Tüm projeyi analiz et"
→ 20,000+ token
```

### Yeni Yöntem (✅ Optimize):
```
"PROJECT_CONTEXT.md dosyasını oku"
→ ~2,000 token
```

**Tasarruf:** 18,000 token (90%)

---

## 🎯 Özet: En İyi Başlangıç

### Tek Komut (Çoğu Durum İçin):

```
PROJECT_CONTEXT.md dosyasını oku
```

Bu komut:
- ✅ Proje yapısını anlar
- ✅ Veritabanı şemasını görür
- ✅ Component'leri bilir
- ✅ Sadece ~2,000 token kullanır

### Sonra Ne Yapacağınızı Söyleyin:

```
PROJECT_CONTEXT.md dosyasını oku.
[Ne yapmak istediğinizi buraya yazın]
```

---

## 📱 Mobil İçin Kısa Komutlar

### Kısa Versiyon 1:
```
PC oku
```
(PROJECT_CONTEXT.md kısaltması)

### Kısa Versiyon 2:
```
QR oku
```
(QUICK_REFERENCE.md kısaltması)

### Kısa Versiyon 3:
```
CC oku
```
(COMPONENT_CATALOG.md kısaltması)

**Not:** Tam dosya adını kullanmak daha net olur, ama kısaltmalar da çalışır.

---

## ✅ Checklist: Yeni Oturum

- [ ] Yeni oturum başlattım
- [ ] `PROJECT_CONTEXT.md dosyasını oku` yazdım
- [ ] Ne yapmak istediğimi açıkladım
- [ ] Kiro dosyaları okudu ve hazır!

---

## 🎉 Sonuç

**En basit başlangıç:**

```
PROJECT_CONTEXT.md dosyasını oku
```

**Bu kadar!** 🚀

Sistem otomatik olarak:
- Projenizi anlayacak
- Token tasarrufu yapacak
- Hızlı çalışacak

---

**Son Güncelleme:** 5 Mayıs 2026  
**Versiyon:** 1.0.0

**Mutlu Kodlamalar! 🎉**
