# 🗄️ Veritabanı İşlemleri Rehberi

> Supabase ile çalışırken sık kullanılan query'ler ve pattern'ler

---

## 🔌 Supabase Client Kullanımı

### Client-Side (Browser)
```typescript
import { createClient } from '@/lib/supabase/client'

// Component içinde
const supabase = createClient()
const { data, error } = await supabase.from('orders').select('*')
```

### Server-Side (Server Component)
```typescript
import { createClient } from '@/lib/supabase/server'

// Server Component içinde
const supabase = await createClient()
const { data, error } = await supabase.from('orders').select('*')
```

---

## 📊 Sık Kullanılan Query'ler

### 1. Siparişler (orders)

#### Tüm Siparişleri Getir (Alıcı Bilgisiyle)
```typescript
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    buyer:buyers(*)
  `)
  .order('created_at', { ascending: false })
```

#### Tek Sipariş Detayı (Tüm İlişkilerle)
```typescript
const { data: order } = await supabase
  .from('orders')
  .select(`
    *,
    buyer:buyers(*),
    items:order_items(*),
    deliveries:deliveries(
      *,
      items:delivery_items(
        *,
        order_item:order_items(*)
      )
    ),
    payments:payments(*)
  `)
  .eq('id', orderId)
  .single()
```

#### Alıcıya Göre Siparişler
```typescript
const { data: orders } = await supabase
  .from('orders')
  .select('*, buyer:buyers(*)')
  .eq('buyer_id', buyerId)
  .order('created_at', { ascending: false })
```

#### Duruma Göre Siparişler
```typescript
const { data: orders } = await supabase
  .from('orders')
  .select('*, buyer:buyers(*)')
  .eq('status', 'in_production')
```

#### Yeni Sipariş Oluştur
```typescript
// 1. Sipariş oluştur
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    buyer_id: buyerId,
    total_amount: totalAmount,
    paid_amount: 0,
    status: 'pending',
    notes: notes
  })
  .select()
  .single()

// 2. Sipariş kalemlerini ekle
const { error: itemsError } = await supabase
  .from('order_items')
  .insert(
    items.map(item => ({
      order_id: order.id,
      product_name: item.product_name,
      color: item.color,
      quantity: item.quantity,
      unit_price: item.unit_price,
      produced_quantity: 0,
      delivered_quantity: 0
    }))
  )
```

#### Sipariş Güncelle
```typescript
const { error } = await supabase
  .from('orders')
  .update({
    status: 'completed',
    updated_at: new Date().toISOString()
  })
  .eq('id', orderId)
```

#### Sipariş Sil (Cascade)
```typescript
// order_items otomatik silinir (ON DELETE CASCADE)
const { error } = await supabase
  .from('orders')
  .delete()
  .eq('id', orderId)
```

---

### 2. Sipariş Kalemleri (order_items)

#### Siparişin Kalemlerini Getir
```typescript
const { data: items } = await supabase
  .from('order_items')
  .select('*')
  .eq('order_id', orderId)
```

#### Üretim Miktarını Güncelle
```typescript
const { error } = await supabase
  .from('order_items')
  .update({
    produced_quantity: newQuantity
  })
  .eq('id', itemId)
```

#### Teslim Edilen Miktarı Güncelle
```typescript
const { error } = await supabase
  .from('order_items')
  .update({
    delivered_quantity: supabase.rpc('increment', { 
      row_id: itemId, 
      x: deliveredAmount 
    })
  })
  .eq('id', itemId)
```

#### Renk Bazlı Üretim Durumu
```typescript
const { data: items } = await supabase
  .from('order_items')
  .select('*, order:orders(buyer:buyers(name))')
  .eq('color', colorName)
  .order('created_at', { ascending: false })
```

---

### 3. Alıcılar (buyers)

#### Tüm Alıcıları Getir
```typescript
const { data: buyers } = await supabase
  .from('buyers')
  .select('*')
  .order('name')
```

#### Yeni Alıcı Ekle
```typescript
const { data: buyer, error } = await supabase
  .from('buyers')
  .insert({
    name: name,
    phone: phone,
    address: address
  })
  .select()
  .single()
```

#### Alıcı Güncelle
```typescript
const { error } = await supabase
  .from('buyers')
  .update({
    name: name,
    phone: phone,
    address: address
  })
  .eq('id', buyerId)
```

#### Alıcı Sil
```typescript
// Önce siparişleri kontrol et
const { data: orders } = await supabase
  .from('orders')
  .select('id')
  .eq('buyer_id', buyerId)

if (orders && orders.length > 0) {
  // Alıcının siparişleri var, silinmemeli
  throw new Error('Bu alıcının siparişleri var')
}

const { error } = await supabase
  .from('buyers')
  .delete()
  .eq('id', buyerId)
```

---

### 4. Teslimatlar (deliveries)

#### Yeni Teslimat Oluştur
```typescript
// 1. Teslimat oluştur
const { data: delivery, error: deliveryError } = await supabase
  .from('deliveries')
  .insert({
    order_id: orderId,
    delivery_date: deliveryDate,
    notes: notes
  })
  .select()
  .single()

// 2. Teslimat kalemlerini ekle
const { error: itemsError } = await supabase
  .from('delivery_items')
  .insert(
    items.map(item => ({
      delivery_id: delivery.id,
      order_item_id: item.order_item_id,
      quantity: item.quantity
    }))
  )

// 3. order_items.delivered_quantity güncelle
for (const item of items) {
  await supabase.rpc('increment_delivered_quantity', {
    item_id: item.order_item_id,
    amount: item.quantity
  })
}
```

#### Siparişin Teslimatlarını Getir
```typescript
const { data: deliveries } = await supabase
  .from('deliveries')
  .select(`
    *,
    items:delivery_items(
      *,
      order_item:order_items(*)
    )
  `)
  .eq('order_id', orderId)
  .order('delivery_date', { ascending: false })
```

---

### 5. Ödemeler (payments)

#### Yeni Ödeme Ekle
```typescript
const { data: payment, error } = await supabase
  .from('payments')
  .insert({
    order_id: orderId,
    delivery_id: deliveryId, // opsiyonel
    amount: amount,
    payment_date: paymentDate,
    payment_method: paymentMethod,
    notes: notes
  })
  .select()
  .single()

// Sipariş paid_amount güncelle
await supabase.rpc('increment_paid_amount', {
  order_id: orderId,
  amount: amount
})
```

#### Siparişin Ödemelerini Getir
```typescript
const { data: payments } = await supabase
  .from('payments')
  .select('*')
  .eq('order_id', orderId)
  .order('payment_date', { ascending: false })
```

#### Toplam Ödeme Hesapla
```typescript
const { data: payments } = await supabase
  .from('payments')
  .select('amount')
  .eq('order_id', orderId)

const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
```

---

### 6. Renkler (colors)

#### Tüm Renkleri Getir (Kullanım Sayısıyla)
```typescript
const { data: colors } = await supabase
  .from('colors')
  .select('*')
  .order('usage_count', { ascending: false })
```

#### Renk Kullanım Sayısını Artır
```typescript
const { error } = await supabase.rpc('increment_color_usage', {
  color_name: colorName
})
```

---

### 7. Ürünler (products)

#### Tüm Ürünleri Getir
```typescript
const { data: products } = await supabase
  .from('products')
  .select('*')
  .order('name')
```

#### Yeni Ürün Ekle
```typescript
const { data: product, error } = await supabase
  .from('products')
  .insert({
    name: name,
    description: description,
    image_url: imageUrl
  })
  .select()
  .single()
```

---

## 📈 Aggregate Query'ler

### Dashboard İstatistikleri
```typescript
// Toplam sipariş sayısı
const { count: totalOrders } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })

// Aktif sipariş sayısı
const { count: activeOrders } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .in('status', ['pending', 'in_production'])

// Toplam alıcı sayısı
const { count: totalBuyers } = await supabase
  .from('buyers')
  .select('*', { count: 'exact', head: true })

// Toplam ciro
const { data: orders } = await supabase
  .from('orders')
  .select('total_amount')

const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0
```

### Renk Dağılımı (Dashboard Grafiği)
```typescript
const { data: items } = await supabase
  .from('order_items')
  .select('color, quantity')

// Renklere göre grupla
const colorMap = items?.reduce((acc, item) => {
  acc[item.color] = (acc[item.color] || 0) + item.quantity
  return acc
}, {} as Record<string, number>)

const chartData = Object.entries(colorMap).map(([color, quantity]) => ({
  color,
  quantity
}))
```

---

## 🔍 Filtreleme ve Arama

### Metin Arama (ILIKE)
```typescript
const { data: buyers } = await supabase
  .from('buyers')
  .select('*')
  .ilike('name', `%${searchTerm}%`)
```

### Tarih Aralığı
```typescript
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
```

### Çoklu Filtre
```typescript
const { data: orders } = await supabase
  .from('orders')
  .select('*, buyer:buyers(*)')
  .eq('status', 'in_production')
  .gte('total_amount', 1000)
  .order('created_at', { ascending: false })
```

---

## 🚨 Error Handling

### Standart Pattern
```typescript
const { data, error } = await supabase
  .from('orders')
  .select('*')

if (error) {
  console.error('Supabase error:', error)
  toast({
    title: "Hata",
    description: error.message,
    variant: "destructive"
  })
  return
}

// data kullan
```

### Try-Catch Pattern
```typescript
try {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()
  
  if (error) throw error
  
  toast({
    title: "Başarılı",
    description: "Sipariş oluşturuldu"
  })
} catch (error) {
  console.error('Error:', error)
  toast({
    title: "Hata",
    description: "Sipariş oluşturulamadı",
    variant: "destructive"
  })
}
```

---

## 🔄 Realtime Subscription (Gelecek)

```typescript
// Şu anda kullanılmıyor, ama eklenebilir
const channel = supabase
  .channel('orders-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'orders'
    },
    (payload) => {
      console.log('Change received!', payload)
      // State güncelle
    }
  )
  .subscribe()

// Cleanup
return () => {
  supabase.removeChannel(channel)
}
```

---

## 💡 Best Practices

### 1. Tip Güvenliği
```typescript
import type { Order, OrderWithDetails } from '@/lib/types/database'

const { data } = await supabase
  .from('orders')
  .select('*')
  .returns<Order[]>()
```

### 2. Select Optimizasyonu
```typescript
// ❌ Kötü - Tüm kolonları getir
const { data } = await supabase.from('orders').select('*')

// ✅ İyi - Sadece gerekli kolonları getir
const { data } = await supabase
  .from('orders')
  .select('id, buyer_id, total_amount, status')
```

### 3. Pagination
```typescript
const pageSize = 20
const { data, error } = await supabase
  .from('orders')
  .select('*')
  .range(page * pageSize, (page + 1) * pageSize - 1)
```

### 4. Transaction Pattern
```typescript
// Supabase otomatik transaction yapmıyor
// Manuel rollback gerekebilir
try {
  // 1. İşlem
  const { data: order } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()
  
  // 2. İşlem
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsData)
  
  if (itemsError) {
    // Rollback: order'ı sil
    await supabase.from('orders').delete().eq('id', order.id)
    throw itemsError
  }
} catch (error) {
  // Error handling
}
```

---

## 🔧 Özel RPC Fonksiyonları

### get_order_summary
```typescript
const { data: summary } = await supabase
  .rpc('get_order_summary', { order_uuid: orderId })
  .single()

// Returns:
// {
//   total_amount: number
//   paid_amount: number
//   remaining_amount: number
//   total_items: number
//   delivered_items: number
//   remaining_items: number
//   delivery_count: number
//   payment_count: number
// }
```

---

## 📝 Migration Ekleme

### Yeni Migration Oluşturma
1. `supabase/` klasöründe yeni dosya: `migration-feature-name.sql`
2. SQL kodunu yaz
3. Supabase SQL Editor'de çalıştır
4. `database.ts` tiplerini güncelle

### Örnek Migration
```sql
-- supabase/migration-add-discount.sql

-- orders tablosuna discount kolonu ekle
ALTER TABLE orders
ADD COLUMN discount NUMERIC DEFAULT 0;

-- Mevcut kayıtları güncelle
UPDATE orders SET discount = 0 WHERE discount IS NULL;
```

---

**Not:** Bu rehber projenizin mevcut veritabanı yapısına göre hazırlanmıştır. Yeni tablolar veya kolonlar eklendiğinde güncellenmelidir.
