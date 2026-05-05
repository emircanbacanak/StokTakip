# ⚡ Hızlı Referans Kılavuzu

> Gelecek AI oturumlarında hızlı başlamak için tek sayfalık referans

---

## 🎯 İlk Adım: Hangi Dosyayı Okuyacağım?

### Senaryo Bazlı Dosya Seçimi

| Ne Yapacaksın? | Oku | Okuma |
|----------------|-----|-------|
| **Projeyi anlamak** | `.kiro/PROJECT_CONTEXT.md` | ✅ |
| **Yeni özellik eklemek** | `PROJECT_CONTEXT.md` + ilgili component | ✅ |
| **Veritabanı işlemi** | `.kiro/DATABASE_GUIDE.md` | ✅ |
| **Component bulmak** | `.kiro/COMPONENT_CATALOG.md` | ✅ |
| **Sipariş sistemi değiştirmek** | `components/orders/` klasörü | ✅ |
| **UI component eklemek** | `components/ui/` + shadcn docs | ✅ |
| **Tip tanımı** | `lib/types/database.ts` | ✅ |
| **Tüm projeyi taramak** | ❌ YAPMA - Token israfı | ❌ |

---

## 📚 Dokümantasyon Hiyerarşisi

```
1. .kiro/PROJECT_CONTEXT.md       ← Buradan başla (proje özeti)
   ├── Teknoloji stack
   ├── Klasör yapısı
   ├── Veritabanı şeması
   └── Önemli kararlar

2. .kiro/COMPONENT_CATALOG.md     ← Component'leri bul
   ├── Tüm component listesi
   ├── Kullanım örnekleri
   └── Props ve özellikler

3. .kiro/DATABASE_GUIDE.md        ← Veritabanı işlemleri
   ├── Sık kullanılan query'ler
   ├── CRUD örnekleri
   └── Best practices

4. .kiro/QUICK_REFERENCE.md       ← Bu dosya (hızlı referans)
```

---

## 🚀 Sık Kullanılan Komutlar

```bash
# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Lint
npm run lint

# shadcn/ui component ekle
npx shadcn-ui@latest add [component-name]
```

---

## 🗂️ Kritik Dosya Yolları

### Veritabanı
- **Tip tanımları:** `lib/types/database.ts`
- **Client-side:** `lib/supabase/client.ts`
- **Server-side:** `lib/supabase/server.ts`
- **Şema:** `supabase/schema-v2.sql` (GÜNCEL)

### Component'ler
- **Siparişler:** `components/orders/`
- **Üretim:** `components/production/`
- **Dashboard:** `components/dashboard/`
- **UI:** `components/ui/`

### Sayfalar
- **Dashboard:** `app/dashboard/page.tsx`
- **Siparişler:** `app/dashboard/orders/page.tsx`
- **Üretim:** `app/dashboard/production/page.tsx`

---

## 🎨 Hızlı Code Snippet'ler

### Yeni Dialog Component
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function MyDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Başlık</DialogTitle>
        </DialogHeader>
        {/* İçerik */}
        <Button>Kaydet</Button>
      </DialogContent>
    </Dialog>
  )
}
```

### Supabase Query (Client)
```tsx
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const supabase = createClient()
const [data, setData] = useState([])

useEffect(() => {
  async function fetchData() {
    const { data } = await supabase.from('orders').select('*')
    setData(data || [])
  }
  fetchData()
}, [])
```

### Toast Bildirimi
```tsx
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

toast({
  title: "Başarılı",
  description: "İşlem tamamlandı"
})
```

---

## 🔍 Hızlı Arama Tablosu

| Aranan | Dosya | Satır/Bölüm |
|--------|-------|-------------|
| Sipariş oluşturma | `components/orders/new-order-dialog.tsx` | - |
| Üretim güncelleme | `components/production/production-client.tsx` | +/- butonlar |
| Alıcı ekleme | `components/buyers/buyers-client.tsx` | - |
| Fatura gösterme | `app/invoice/[orderId]/page.tsx` | - |
| Veritabanı tipleri | `lib/types/database.ts` | - |
| Renk eşleştirme | `lib/color-map.ts` | - |
| Supabase client | `lib/supabase/client.ts` | - |

---

## 📊 Veritabanı Hızlı Referans

### Tablolar
- `buyers` - Alıcılar
- `orders` - Siparişler
- `order_items` - Sipariş kalemleri
- `deliveries` - Teslimatlar
- `delivery_items` - Teslimat kalemleri
- `payments` - Ödemeler
- `colors` - Renkler
- `products` - Ürünler

### Sık Kullanılan Query'ler
```typescript
// Tüm siparişler (alıcı bilgisiyle)
supabase.from('orders').select('*, buyer:buyers(*)')

// Tek sipariş detayı
supabase.from('orders').select('*, buyer:buyers(*), items:order_items(*)').eq('id', id).single()

// Yeni sipariş
supabase.from('orders').insert({ buyer_id, total_amount, status: 'pending' })

// Üretim güncelle
supabase.from('order_items').update({ produced_quantity: qty }).eq('id', id)
```

---

## 🎯 Token Optimizasyonu Stratejisi

### ✅ YAP
1. **İlk olarak** `.kiro/PROJECT_CONTEXT.md` oku
2. **Sadece** değiştireceğin dosyaları oku
3. **Benzer örneklere** bak (mevcut component'lerden)
4. **Tip tanımları** için `database.ts` referans al

### ❌ YAPMA
1. Tüm component'leri bir anda okuma
2. Aynı dosyayı tekrar tekrar okuma
3. İhtiyaç olmadan migration dosyalarını okuma
4. Tüm projeyi tarama

### 📉 Token Tasarrufu Örnekleri

**Senaryo 1: Yeni Sipariş Özelliği**
- ❌ Kötü: Tüm projeyi oku (20,000 token)
- ✅ İyi: PROJECT_CONTEXT.md + new-order-dialog.tsx (2,000 token)
- **Tasarruf: 18,000 token (90%)**

**Senaryo 2: Veritabanı Değişikliği**
- ❌ Kötü: Tüm migration'ları + tüm component'leri oku (15,000 token)
- ✅ İyi: DATABASE_GUIDE.md + database.ts (1,500 token)
- **Tasarruf: 13,500 token (90%)**

**Senaryo 3: UI Component Güncelleme**
- ❌ Kötü: Tüm UI component'lerini oku (10,000 token)
- ✅ İyi: COMPONENT_CATALOG.md + ilgili component (1,000 token)
- **Tasarruf: 9,000 token (90%)**

---

## 🔧 Geliştirme Workflow'u

### Yeni Özellik Ekleme
1. **Spec oluştur** → `.kiro/specs/feature-name/`
2. **Veritabanı** → Gerekirse migration ekle
3. **Tipler** → `database.ts` güncelle
4. **Component** → İlgili klasörde oluştur
5. **Sayfa** → `app/dashboard/` altında route ekle
6. **Test** → Tarayıcıda test et

### Bug Fix
1. **Problemi anla** → İlgili component'i oku
2. **Veritabanı kontrol** → DATABASE_GUIDE.md'ye bak
3. **Düzelt** → Sadece ilgili dosyayı değiştir
4. **Test** → Tarayıcıda doğrula

### Refactoring
1. **Mevcut kodu oku** → Sadece ilgili dosyalar
2. **Plan yap** → Değişiklikleri listele
3. **Uygula** → Adım adım değiştir
4. **Test** → Her adımda test et

---

## 🎨 Stil Kuralları

### Tailwind Class'ları
```tsx
// Responsive
<div className="w-full md:w-1/2 lg:w-1/3">

// Dark mode
<div className="bg-white dark:bg-gray-800">

// Hover
<button className="hover:bg-blue-600">

// cn() helper ile birleştirme
<div className={cn("base-class", condition && "conditional-class")}>
```

### Component Adlandırma
- Dosya: `kebab-case.tsx`
- Component: `PascalCase`
- Client component: `*-client.tsx`

---

## 📝 Checklist: Yeni Özellik Eklerken

- [ ] `.kiro/PROJECT_CONTEXT.md` okudum
- [ ] Benzer mevcut özelliğe baktım
- [ ] Veritabanı değişikliği gerekiyor mu? → Migration ekle
- [ ] Tip tanımları güncellendi mi? → `database.ts`
- [ ] Component oluşturuldu mu? → İlgili klasörde
- [ ] Sayfa route'u eklendi mi? → `app/dashboard/`
- [ ] Error handling var mı? → Try-catch + toast
- [ ] Toast bildirimleri eklendi mi?
- [ ] Tarayıcıda test edildi mi?

---

## 🚨 Sık Yapılan Hatalar

### 1. Tüm Projeyi Okumak
**Problem:** 20,000+ token israfı  
**Çözüm:** Sadece ihtiyacın olan dosyaları oku

### 2. Aynı Dosyayı Tekrar Okumak
**Problem:** Gereksiz token kullanımı  
**Çözüm:** Bir kez oku, not al, referans kullan

### 3. Tip Tanımlarını Yeniden Yazmak
**Problem:** `database.ts` zaten var  
**Çözüm:** Mevcut tipleri import et

### 4. Migration'ları Karıştırmak
**Problem:** Eski migration'ları okumak  
**Çözüm:** `schema-v2.sql` GÜNCEL şema

### 5. Deprecated Component Kullanmak
**Problem:** `order-detail-dialog.tsx` eski  
**Çözüm:** `order-detail-dialog-v2.tsx` kullan

---

## 💡 Pro Tips

1. **Her zaman PROJECT_CONTEXT.md ile başla**
2. **Benzer örneklere bak** (mevcut component'lerden kopyala)
3. **Tip güvenliğini koru** (database.ts'den import et)
4. **Error handling unutma** (try-catch + toast)
5. **Responsive tasarım yap** (mobile-first)
6. **Dark mode desteği ekle** (dark: prefix)
7. **Accessibility düşün** (ARIA labels, keyboard navigation)

---

## 📞 Yardım Gerektiğinde

### "Nereden başlayacağımı bilmiyorum"
→ `.kiro/PROJECT_CONTEXT.md` oku

### "Hangi component'i kullanmalıyım?"
→ `.kiro/COMPONENT_CATALOG.md` oku

### "Veritabanı query'si nasıl yazılır?"
→ `.kiro/DATABASE_GUIDE.md` oku

### "Benzer bir örnek var mı?"
→ İlgili klasördeki mevcut component'lere bak

---

**Son Güncelleme:** 5 Mayıs 2026  
**Proje:** Stok & Sipariş Takip Sistemi  
**Versiyon:** 0.1.0
