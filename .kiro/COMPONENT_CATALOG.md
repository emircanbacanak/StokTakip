# 🧩 Component Kataloğu

> Hızlı referans için tüm component'lerin listesi ve kullanım amaçları

---

## 📄 Sayfa Component'leri (app/)

### Dashboard Sayfaları

| Dosya | Route | Amaç | Önemli Özellikler |
|-------|-------|------|-------------------|
| `app/dashboard/page.tsx` | `/dashboard` | Ana dashboard | İstatistikler, grafikler, son siparişler |
| `app/dashboard/orders/page.tsx` | `/dashboard/orders` | Sipariş listesi | Tüm siparişler, filtreleme, arama |
| `app/dashboard/orders/[buyerId]/page.tsx` | `/dashboard/orders/[buyerId]` | Alıcıya özel siparişler | Tek alıcının tüm siparişleri |
| `app/dashboard/production/page.tsx` | `/dashboard/production` | Üretim takibi | +/- butonlar, ilerleme çubukları |
| `app/dashboard/buyers/page.tsx` | `/dashboard/buyers` | Alıcı yönetimi | Alıcı listesi, ekleme, silme |
| `app/dashboard/products/page.tsx` | `/dashboard/products` | Ürün yönetimi | Ürün/renk stok durumu |
| `app/dashboard/accounting/page.tsx` | `/dashboard/accounting` | Muhasebe | Ödeme takibi, borç/alacak |
| `app/dashboard/colors/page.tsx` | `/dashboard/colors` | Renk yönetimi | Renk kullanım istatistikleri |

### Diğer Sayfalar

| Dosya | Route | Amaç |
|-------|-------|------|
| `app/page.tsx` | `/` | Ana sayfa (redirect to dashboard) |
| `app/setup/page.tsx` | `/setup` | İlk kurulum sayfası |
| `app/invoice/[orderId]/page.tsx` | `/invoice/[orderId]` | Fatura görüntüleme |

---

## 🎨 UI Component'leri (components/)

### Dashboard Component'leri (components/dashboard/)

| Component | Kullanım | Props | Veri Kaynağı |
|-----------|----------|-------|--------------|
| `dashboard-stats.tsx` | İstatistik kartları | - | Supabase (orders, buyers) |
| `color-chart.tsx` | Renk dağılım grafiği | - | Supabase (colors) |
| `recent-orders.tsx` | Son siparişler listesi | - | Supabase (orders + buyers) |

### Sipariş Component'leri (components/orders/)

| Component | Amaç | Tetikleyici | Supabase İşlemi |
|-----------|------|-------------|-----------------|
| `orders-client.tsx` | Sipariş listesi ana component | - | SELECT orders + buyers |
| `buyer-orders-client.tsx` | Alıcıya özel sipariş listesi | - | SELECT orders WHERE buyer_id |
| `new-order-dialog.tsx` | Yeni sipariş oluşturma | "Yeni Sipariş" butonu | INSERT orders + order_items |
| `edit-order-dialog.tsx` | Sipariş düzenleme | "Düzenle" butonu | UPDATE orders |
| `order-detail-dialog-v2.tsx` | Sipariş detayları (GÜNCEL) | Sipariş satırına tıklama | SELECT order + items + deliveries |
| `order-detail-dialog.tsx` | Eski sipariş detayları (DEPRECATED) | - | - |
| `add-colors-dialog.tsx` | Sipariş renklerini güncelleme | "Renk Ekle" butonu | UPDATE order_items |
| `new-delivery-dialog.tsx` | Teslimat ekleme | "Teslimat Ekle" butonu | INSERT deliveries + delivery_items |
| `new-payment-dialog.tsx` | Ödeme ekleme | "Ödeme Ekle" butonu | INSERT payments |
| `invoice-dialog.tsx` | Fatura görüntüleme | "Fatura" butonu | SELECT order + items |
| `filament-input-dialog.tsx` | Filament girişi | "Filament" butonu | UPDATE order_items |

**Önemli Not:** `order-detail-dialog-v2.tsx` kullanılıyor, v1 deprecated.

### Üretim Component'leri (components/production/)

| Component | Amaç | Özellikler |
|-----------|------|-----------|
| `production-client.tsx` | Üretim takibi ana component | +/- butonlar, ilerleme çubukları, renk filtreleme |

### Alıcı Component'leri (components/buyers/)

| Component | Amaç | İşlemler |
|-----------|------|----------|
| `buyers-client.tsx` | Alıcı listesi ve yönetimi | Ekleme, silme, düzenleme |

### Ürün Component'leri (components/products/)

| Component | Amaç | Özellikler |
|-----------|------|-----------|
| `products-client.tsx` | Ürün listesi | Ürün ekleme, silme |
| `colors-client.tsx` | Renk yönetimi | Renk kullanım istatistikleri |
| `stock-client.tsx` | Stok durumu | Ürün/renk bazlı stok |
| `product-catalog-client.tsx` | Ürün kataloğu | Ürün görüntüleme |

### Muhasebe Component'leri (components/accounting/)

| Component | Amaç | Özellikler |
|-----------|------|-----------|
| `accounting-client.tsx` | Muhasebe ana component | Ödeme takibi, borç/alacak hesaplama |

---

## 🎯 shadcn/ui Component'leri (components/ui/)

### Form Component'leri

| Component | Kullanım | Örnek |
|-----------|----------|-------|
| `input.tsx` | Metin girişi | `<Input type="text" />` |
| `select.tsx` | Dropdown seçici | `<Select><SelectItem /></Select>` |
| `textarea.tsx` | Çok satırlı metin | `<Textarea />` |
| `label.tsx` | Form etiketi | `<Label htmlFor="name">İsim</Label>` |

### Dialog/Modal Component'leri

| Component | Kullanım | Özellikler |
|-----------|----------|-----------|
| `dialog.tsx` | Modal/dialog | `<Dialog><DialogContent /></Dialog>` |
| `confirm-dialog.tsx` | Onay dialogu | `useConfirm` hook ile kullanılır |

### Veri Gösterimi

| Component | Kullanım | Özellikler |
|-----------|----------|-----------|
| `table.tsx` | Veri tablosu | `<Table><TableRow><TableCell /></Table>` |
| `card.tsx` | Kart container | `<Card><CardHeader><CardContent /></Card>` |
| `badge.tsx` | Durum badge'i | `<Badge variant="success">Tamamlandı</Badge>` |
| `color-badge.tsx` | Renk badge'i (özel) | `<ColorBadge color="Kırmızı" />` |
| `progress.tsx` | İlerleme çubuğu | `<Progress value={75} />` |

### Etkileşim Component'leri

| Component | Kullanım | Özellikler |
|-----------|----------|-----------|
| `button.tsx` | Buton | `<Button variant="default">Kaydet</Button>` |
| `toast.tsx` | Bildirim | `toast({ title: "Başarılı" })` |
| `toaster.tsx` | Toast container | Layout'ta kullanılır |
| `separator.tsx` | Ayırıcı çizgi | `<Separator />` |

---

## 🔧 Yardımcı Component'ler

| Component | Amaç | Kullanım Yeri |
|-----------|------|---------------|
| `setup-banner.tsx` | İlk kurulum banner'ı | Layout'ta gösterilir |
| `theme-provider.tsx` | Dark/light mode | Root layout'ta wrap eder |

---

## 🪝 Custom Hooks (hooks/)

| Hook | Amaç | Kullanım |
|------|------|----------|
| `use-toast.ts` | Toast bildirimleri | `const { toast } = useToast()` |
| `use-confirm.tsx` | Onay dialogu | `const confirm = useConfirm()` |

---

## 📊 Component Kullanım Örnekleri

### Yeni Dialog Oluşturma

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function MyDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Başlık</DialogTitle>
        </DialogHeader>
        <Input placeholder="Bir şey gir" />
        <Button>Kaydet</Button>
      </DialogContent>
    </Dialog>
  )
}
```

### Toast Bildirimi

```tsx
import { useToast } from '@/hooks/use-toast'

export function MyComponent() {
  const { toast } = useToast()
  
  const handleClick = () => {
    toast({
      title: "Başarılı",
      description: "İşlem tamamlandı",
    })
  }
  
  return <Button onClick={handleClick}>Tıkla</Button>
}
```

### Onay Dialogu

```tsx
import { useConfirm } from '@/hooks/use-confirm'

export function MyComponent() {
  const confirm = useConfirm()
  
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Emin misiniz?",
      description: "Bu işlem geri alınamaz",
    })
    
    if (confirmed) {
      // Silme işlemi
    }
  }
  
  return <Button onClick={handleDelete}>Sil</Button>
}
```

---

## 🎨 Component Stil Kuralları

### Tailwind Class'ları
- Responsive: `sm:`, `md:`, `lg:` prefix'leri
- Dark mode: `dark:` prefix'i
- Hover: `hover:` prefix'i

### cn() Helper
```tsx
import { cn } from '@/lib/utils'

<div className={cn(
  "base-class",
  condition && "conditional-class",
  "another-class"
)} />
```

---

## 📝 Component Ekleme Checklist

### Yeni UI Component Eklerken
- [ ] `components/ui/` klasöründe oluştur
- [ ] shadcn/ui'dan ekle: `npx shadcn-ui@latest add [component]`
- [ ] Tailwind class'larını kullan
- [ ] TypeScript prop tipleri tanımla

### Yeni Feature Component Eklerken
- [ ] İlgili klasörde oluştur (`orders/`, `production/`, vb.)
- [ ] Supabase client import et
- [ ] Tip tanımlarını `database.ts`'den al
- [ ] Toast bildirimleri ekle
- [ ] Error handling yap

---

## 🔍 Hızlı Arama

### "Sipariş ekleme nasıl yapılıyor?"
→ `components/orders/new-order-dialog.tsx`

### "Üretim güncelleme nasıl çalışıyor?"
→ `components/production/production-client.tsx`

### "Fatura nasıl gösteriliyor?"
→ `components/orders/invoice-dialog.tsx` veya `app/invoice/[orderId]/page.tsx`

### "Yeni UI component nasıl eklenir?"
→ `npx shadcn-ui@latest add [component]` veya `components/ui/` klasörü

### "Toast bildirimi nasıl gösterilir?"
→ `hooks/use-toast.ts` kullan

---

**Not:** Bu katalog projeniz geliştikçe güncellenmelidir.
