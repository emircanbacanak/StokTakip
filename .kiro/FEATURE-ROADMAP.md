# 🗺️ Özellik Yol Haritası ve TODO Listesi

> **Oluşturulma:** 6 Mayıs 2026  
> **Durum:** Planlama Aşaması  
> **Yaklaşım:** Tane tane, öncelik sırasına göre

---

## 📋 Genel Bakış

Bu dokümanda 12 yeni özellik için detaylı uygulama planı bulunmaktadır. Her özellik için:
- ✅ Gereksinimler
- 📁 Etkilenen dosyalar
- 🔧 Teknik adımlar
- ⏱️ Tahmini süre
- 🎯 Başarı kriterleri

---

## 🔴 YÜKSEK ÖNCELİK

### 1. Toplu Sipariş Durumu Güncelleme

**Amaç:** Üretim sayfasında birden fazla ürünü seçip tek tıkla durumlarını güncelleyebilme.

#### Gereksinimler
- [ ] Checkbox ile çoklu seçim
- [ ] "Seçilenleri Tamamla" butonu
- [ ] Toplu güncelleme API endpoint'i
- [ ] Optimistic UI update

#### Etkilenen Dosyalar
```
components/production/production-client.tsx (ana değişiklik)
app/api/production/bulk-update/route.ts (yeni)
```

#### Teknik Adımlar
1. **TanStack Table'a checkbox kolonu ekle**
   - Row selection state ekle
   - Header checkbox (tümünü seç)
   - Row checkbox'ları

2. **Toplu işlem UI'ı ekle**
   - Seçili ürün sayısını gösteren banner
   - "Tamamla", "İptal" butonları
   - Onay dialogu

3. **API endpoint oluştur**
   ```typescript
   // app/api/production/bulk-update/route.ts
   POST /api/production/bulk-update
   Body: { orderItemIds: string[], status: string }
   ```

4. **Supabase query'si**
   ```sql
   UPDATE order_items 
   SET produced_quantity = quantity 
   WHERE id = ANY($1)
   ```

5. **Toast bildirimleri**
   - "5 ürün tamamlandı olarak işaretlendi"

#### Tahmini Süre
⏱️ 2-3 saat

#### Başarı Kriterleri
- ✅ 10+ ürünü tek seferde güncelleyebilme
- ✅ Hata durumunda rollback
- ✅ Mobilde de çalışıyor

---

### 2. Alıcı Borç Hatırlatma

**Amaç:** Ödenmemiş siparişler için görsel uyarı sistemi.

#### Gereksinimler
- [ ] Borç hesaplama fonksiyonu
- [ ] Kırmızı badge gösterimi
- [ ] Gün bazlı filtreleme (7, 15, 30 gün)
- [ ] Dashboard'da özet widget

#### Etkilenen Dosyalar
```
components/buyers/buyers-client.tsx (badge ekleme)
components/dashboard/debt-alert-widget.tsx (yeni)
lib/debt-calculator.ts (yeni)
```

#### Teknik Adımlar
1. **Borç hesaplama fonksiyonu**
   ```typescript
   // lib/debt-calculator.ts
   export function calculateDebt(orders: Order[]) {
     return orders.reduce((total, order) => {
       const debt = order.total_amount - order.paid_amount
       const daysPassed = differenceInDays(new Date(), order.created_at)
       return { debt, daysPassed, isOverdue: daysPassed > 15 }
     }, [])
   }
   ```

2. **Alıcılar sayfasına badge ekle**
   ```tsx
   {debt > 0 && (
     <Badge variant={daysPassed > 15 ? "destructive" : "warning"}>
       {debt} TL - {daysPassed} gün
     </Badge>
   )}
   ```

3. **Dashboard widget'ı**
   - En yüksek borçlu 5 alıcı
   - Toplam borç tutarı
   - Ortalama ödeme süresi

4. **Filtreleme seçenekleri**
   - "Tüm borçlar"
   - "15+ gün gecikmiş"
   - "30+ gün gecikmiş"

#### Tahmini Süre
⏱️ 2 saat

#### Başarı Kriterleri
- ✅ Borç tutarı doğru hesaplanıyor
- ✅ Renk kodlaması anlaşılır
- ✅ Dashboard'da öne çıkıyor

---

### 3. Sipariş Şablonu

**Amaç:** Sık tekrar eden siparişler için şablon sistemi.

#### Gereksinimler
- [ ] Şablon kaydetme dialogu
- [ ] Şablon listesi
- [ ] Şablondan sipariş oluşturma
- [ ] Şablon düzenleme/silme

#### Etkilenen Dosyalar
```
supabase/migration-order-templates.sql (yeni)
components/orders/order-template-dialog.tsx (yeni)
components/orders/template-list-dialog.tsx (yeni)
components/orders/new-order-dialog.tsx (güncelleme)
```

#### Teknik Adımlar
1. **Veritabanı şeması**
   ```sql
   CREATE TABLE order_templates (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL,
     buyer_id uuid REFERENCES buyers(id),
     notes text,
     created_at timestamp DEFAULT now()
   );

   CREATE TABLE order_template_items (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     template_id uuid REFERENCES order_templates(id) ON DELETE CASCADE,
     product_name text NOT NULL,
     color text,
     quantity integer NOT NULL,
     unit_price numeric
   );
   ```

2. **Şablon kaydetme dialogu**
   - Mevcut siparişten şablon oluştur
   - Şablon adı gir
   - Alıcı ile ilişkilendir

3. **Şablon listesi**
   - Alıcıya göre filtreleme
   - Şablon önizleme
   - "Bu şablondan sipariş oluştur" butonu

4. **Yeni sipariş dialoguna entegrasyon**
   - "Şablondan Oluştur" butonu
   - Şablon seçimi
   - Otomatik form doldurma

5. **Tip tanımları**
   ```typescript
   // lib/types/database.ts
   export type OrderTemplate = {
     id: string
     name: string
     buyer_id: string
     notes: string | null
     created_at: string
   }
   ```

#### Tahmini Süre
⏱️ 3-4 saat

#### Başarı Kriterleri
- ✅ Şablon 10 saniyede sipariş oluşturuyor
- ✅ Şablon düzenlenebiliyor
- ✅ Alıcı değiştiğinde şablonlar filtreleniyor

---

### 4. Excel/PDF Dışa Aktarma

**Amaç:** Muhasebe verilerini Excel veya PDF olarak indirme.

#### Gereksinimler
- [ ] Excel export (xlsx)
- [ ] PDF export (fatura formatı)
- [ ] Tarih aralığı seçimi
- [ ] Alıcı bazlı filtreleme

#### Etkilenen Dosyalar
```
package.json (yeni bağımlılıklar)
components/accounting/export-dialog.tsx (yeni)
lib/export-utils.ts (yeni)
```

#### Teknik Adımlar
1. **Bağımlılıklar ekle**
   ```bash
   npm install xlsx jspdf jspdf-autotable
   npm install --save-dev @types/xlsx
   ```

2. **Excel export fonksiyonu**
   ```typescript
   // lib/export-utils.ts
   import * as XLSX from 'xlsx'

   export function exportToExcel(data: any[], filename: string) {
     const ws = XLSX.utils.json_to_sheet(data)
     const wb = XLSX.utils.book_new()
     XLSX.utils.book_append_sheet(wb, ws, "Muhasebe")
     XLSX.writeFile(wb, `${filename}.xlsx`)
   }
   ```

3. **PDF export fonksiyonu**
   ```typescript
   import jsPDF from 'jspdf'
   import autoTable from 'jspdf-autotable'

   export function exportToPDF(data: any[], filename: string) {
     const doc = new jsPDF()
     autoTable(doc, {
       head: [['Sipariş', 'Alıcı', 'Tutar', 'Ödenen', 'Kalan']],
       body: data.map(row => [row.id, row.buyer, row.total, row.paid, row.remaining])
     })
     doc.save(`${filename}.pdf`)
   }
   ```

4. **Export dialogu**
   - Format seçimi (Excel/PDF)
   - Tarih aralığı picker
   - Alıcı filtresi
   - "İndir" butonu

5. **Muhasebe sayfasına entegrasyon**
   - "Dışa Aktar" butonu (sağ üst)
   - İndirme progress göstergesi

#### Tahmini Süre
⏱️ 2-3 saat

#### Başarı Kriterleri
- ✅ Excel dosyası doğru formatlanmış
- ✅ PDF Türkçe karakter destekli
- ✅ 1000+ satır sorunsuz export ediliyor

---

## 🟡 ORTA ÖNCELİK

### 5. Ürün Bazlı Kar Analizi

**Amaç:** Her ürün için maliyet vs satış fiyatı karşılaştırması.

#### Gereksinimler
- [ ] Ürün bazlı kar hesaplama
- [ ] Görselleştirme (bar chart)
- [ ] "Önerilen fiyat" hesaplama
- [ ] Kar marjı yüzdesi

#### Etkilenen Dosyalar
```
components/accounting/profit-analysis-tab.tsx (yeni)
lib/profit-calculator.ts (yeni)
```

#### Teknik Adımlar
1. **Kar hesaplama fonksiyonu**
   ```typescript
   // lib/profit-calculator.ts
   export function calculateProfit(product: Product, orders: Order[]) {
     const totalCost = product.material_cost + product.labor_cost
     const avgSellingPrice = orders.reduce((sum, o) => sum + o.unit_price, 0) / orders.length
     const profitMargin = ((avgSellingPrice - totalCost) / avgSellingPrice) * 100
     const suggestedPrice = totalCost * 1.3 // %30 kar marjı
     
     return { totalCost, avgSellingPrice, profitMargin, suggestedPrice }
   }
   ```

2. **Analiz tab'ı**
   - Ürün listesi (TanStack Table)
   - Maliyet, satış fiyatı, kar kolonları
   - Renk kodlaması (kırmızı: zarar, yeşil: kar)

3. **Recharts grafiği**
   ```tsx
   <BarChart data={profitData}>
     <Bar dataKey="cost" fill="#ef4444" name="Maliyet" />
     <Bar dataKey="price" fill="#22c55e" name="Satış" />
   </BarChart>
   ```

4. **Önerilen fiyat göstergesi**
   - "Bu ürünü X TL'ye satmalısınız" mesajı
   - Kar marjı slider'ı (%20, %30, %40)

#### Tahmini Süre
⏱️ 3 saat

#### Başarı Kriterleri
- ✅ Kar marjı doğru hesaplanıyor
- ✅ Grafik anlaşılır
- ✅ Önerilen fiyat mantıklı

---

### 6. Aylık Gelir Grafiği

**Amaç:** Son 12 ayın gelir/gider trendini gösterme.

#### Gereksinimler
- [ ] Aylık gelir hesaplama
- [ ] Çizgi grafiği (Recharts)
- [ ] Yıl bazlı karşılaştırma
- [ ] Mevsimsel trend analizi

#### Etkilenen Dosyalar
```
components/dashboard/monthly-revenue-chart.tsx (yeni)
app/dashboard/page.tsx (widget ekleme)
```

#### Teknik Adımlar
1. **Aylık veri toplama**
   ```typescript
   const monthlyData = await supabase
     .from('orders')
     .select('created_at, total_amount, paid_amount')
     .gte('created_at', subMonths(new Date(), 12))
   
   const grouped = groupBy(monthlyData, order => 
     format(new Date(order.created_at), 'yyyy-MM')
   )
   ```

2. **Recharts line chart**
   ```tsx
   <LineChart data={monthlyData}>
     <Line type="monotone" dataKey="revenue" stroke="#3b82f6" />
     <Line type="monotone" dataKey="expenses" stroke="#ef4444" />
     <XAxis dataKey="month" />
     <YAxis />
     <Tooltip />
     <Legend />
   </LineChart>
   ```

3. **Trend analizi**
   - Ortalama aylık gelir
   - En iyi/en kötü ay
   - Büyüme yüzdesi

4. **Dashboard'a yerleştirme**
   - Stats kartlarının altına
   - Tam genişlik widget

#### Tahmini Süre
⏱️ 2 saat

#### Başarı Kriterleri
- ✅ 12 ay verisi doğru gösteriliyor
- ✅ Grafik responsive
- ✅ Tooltip bilgilendirici

---

### 7. Alıcı Notları

**Amaç:** Her alıcıya özel not alanı ekleme.

#### Gereksinimler
- [ ] Veritabanına notes kolonu
- [ ] Not ekleme/düzenleme dialogu
- [ ] Alıcı listesinde not önizleme
- [ ] Not arama

#### Etkilenen Dosyalar
```
supabase/migration-buyer-notes.sql (yeni)
components/buyers/buyer-notes-dialog.tsx (yeni)
components/buyers/buyers-client.tsx (güncelleme)
```

#### Teknik Adımlar
1. **Veritabanı migration**
   ```sql
   ALTER TABLE buyers ADD COLUMN notes text;
   ALTER TABLE buyers ADD COLUMN last_note_updated timestamp;
   ```

2. **Not dialogu**
   - Textarea (max 500 karakter)
   - Kaydet/İptal butonları
   - Son güncelleme tarihi

3. **Alıcı listesine entegrasyon**
   - Not ikonu (varsa dolu, yoksa boş)
   - Hover'da not önizleme (ilk 50 karakter)
   - Tıklayınca dialog açılır

4. **Arama fonksiyonu**
   - Not içeriğinde arama
   - "Nakit ödüyor" yazanları bul

#### Tahmini Süre
⏱️ 1.5 saat

#### Başarı Kriterleri
- ✅ Not kaydediliyor
- ✅ Arama çalışıyor
- ✅ Mobilde de kullanılabilir

---

### 8. Barkod/QR ile Ürün Arama

**Amaç:** Mobil kamera ile barkod okuyarak ürün bulma.

#### Gereksinimler
- [ ] Kamera erişimi
- [ ] Barkod okuma kütüphanesi
- [ ] Ürün eşleştirme
- [ ] Fallback (manuel giriş)

#### Etkilenen Dosyalar
```
package.json (yeni bağımlılık)
components/production/barcode-scanner.tsx (yeni)
components/production/production-client.tsx (entegrasyon)
```

#### Teknik Adımlar
1. **Bağımlılık ekle**
   ```bash
   npm install react-qr-barcode-scanner
   ```

2. **Scanner component**
   ```tsx
   import { Scanner } from 'react-qr-barcode-scanner'

   export function BarcodeScanner({ onScan }) {
     return (
       <Scanner
         onScan={(result) => onScan(result.text)}
         onError={(error) => console.error(error)}
       />
     )
   }
   ```

3. **Ürün eşleştirme**
   - Barkod → product_name mapping
   - Veritabanında barcode kolonu ekle
   - Eşleşme yoksa manuel giriş

4. **Üretim sayfasına entegrasyon**
   - "Barkod Tara" butonu
   - Modal ile kamera açılır
   - Okuma başarılı → ürün filtrelenir

5. **PWA kamera izinleri**
   - manifest.json'a kamera izni ekle
   - HTTPS gereksinimi

#### Tahmini Süre
⏱️ 3-4 saat

#### Başarı Kriterleri
- ✅ Mobilde kamera açılıyor
- ✅ Barkod doğru okunuyor
- ✅ Ürün hızlıca bulunuyor

---

## 🟢 DÜŞÜK ÖNCELİK

### 9. Bildirim Sistemi

**Amaç:** Sipariş durumu değişikliklerinde push notification.

#### Gereksinimler
- [ ] Push notification izni
- [ ] Service worker
- [ ] Bildirim tetikleyicileri
- [ ] Bildirim ayarları

#### Etkilenen Dosyalar
```
public/sw.js (yeni)
lib/notification-service.ts (yeni)
components/settings/notification-settings.tsx (yeni)
```

#### Teknik Adımlar
1. **Service worker oluştur**
   ```javascript
   // public/sw.js
   self.addEventListener('push', (event) => {
     const data = event.data.json()
     self.registration.showNotification(data.title, {
       body: data.body,
       icon: '/icon-192.png'
     })
   })
   ```

2. **Bildirim servisi**
   ```typescript
   // lib/notification-service.ts
   export async function requestNotificationPermission() {
     const permission = await Notification.requestPermission()
     return permission === 'granted'
   }

   export function sendNotification(title: string, body: string) {
     if (Notification.permission === 'granted') {
       new Notification(title, { body, icon: '/icon-192.png' })
     }
   }
   ```

3. **Tetikleyiciler**
   - Sipariş durumu değişti
   - Ödeme alındı
   - Teslimat eklendi
   - Borç hatırlatması

4. **Ayarlar sayfası**
   - Bildirim açık/kapalı
   - Hangi olaylar için bildirim
   - Sessiz saatler

#### Tahmini Süre
⏱️ 4-5 saat

#### Başarı Kriterleri
- ✅ Bildirim izni alınıyor
- ✅ Bildirimler zamanında geliyor
- ✅ Ayarlar çalışıyor

---

### 10. Çoklu Para Birimi

**Amaç:** USD/EUR bazlı sipariş girişi ve otomatik TL dönüşümü.

#### Gereksinimler
- [ ] Döviz kuru API entegrasyonu
- [ ] Para birimi seçici
- [ ] Otomatik dönüşüm
- [ ] Geçmiş kurlar

#### Etkilenen Dosyalar
```
lib/currency-service.ts (yeni)
components/orders/new-order-dialog.tsx (güncelleme)
supabase/migration-currency.sql (yeni)
```

#### Teknik Adımlar
1. **Döviz kuru API**
   ```typescript
   // lib/currency-service.ts
   export async function getExchangeRates() {
     const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY')
     return response.json()
   }
   ```

2. **Veritabanı şeması**
   ```sql
   ALTER TABLE orders ADD COLUMN currency text DEFAULT 'TRY';
   ALTER TABLE orders ADD COLUMN exchange_rate numeric;
   ALTER TABLE orders ADD COLUMN original_amount numeric;
   ```

3. **Para birimi seçici**
   ```tsx
   <Select value={currency} onValueChange={setCurrency}>
     <SelectItem value="TRY">₺ TRY</SelectItem>
     <SelectItem value="USD">$ USD</SelectItem>
     <SelectItem value="EUR">€ EUR</SelectItem>
   </Select>
   ```

4. **Otomatik dönüşüm**
   - Tutar girildiğinde TL karşılığı göster
   - Kayıt sırasında kur bilgisi sakla
   - Raporlarda hem orijinal hem TL göster

#### Tahmini Süre
⏱️ 3 saat

#### Başarı Kriterleri
- ✅ Kur güncel çekiliyor
- ✅ Dönüşüm doğru
- ✅ Geçmiş siparişler etkilenmiyor

---

### 11. Üretim Takvimi

**Amaç:** Teslim tarihlerini takvim görünümünde gösterme.

#### Gereksinimler
- [ ] Takvim component'i
- [ ] Teslim tarihi ekleme
- [ ] Renk kodlaması (yaklaşan/gecikmiş)
- [ ] Günlük/haftalık/aylık görünüm

#### Etkilenen Dosyalar
```
package.json (yeni bağımlılık)
components/production/production-calendar.tsx (yeni)
app/dashboard/production/page.tsx (tab ekleme)
```

#### Teknik Adımlar
1. **Bağımlılık ekle**
   ```bash
   npm install react-big-calendar date-fns
   ```

2. **Takvim component'i**
   ```tsx
   import { Calendar, dateFnsLocalizer } from 'react-big-calendar'

   const localizer = dateFnsLocalizer({
     format, parse, startOfWeek, getDay, locales: { 'tr': tr }
   })

   <Calendar
     localizer={localizer}
     events={deliveryEvents}
     startAccessor="start"
     endAccessor="end"
   />
   ```

3. **Event mapping**
   ```typescript
   const events = orders.map(order => ({
     title: `${order.buyer_name} - ${order.product_name}`,
     start: new Date(order.delivery_date),
     end: new Date(order.delivery_date),
     resource: order
   }))
   ```

4. **Renk kodlaması**
   - Yeşil: Zamanında
   - Sarı: 3 gün kaldı
   - Kırmızı: Gecikmiş

5. **Teslim tarihi ekleme**
   - Sipariş dialoguna "Teslim Tarihi" alanı
   - Veritabanına delivery_date kolonu

#### Tahmini Süre
⏱️ 4 saat

#### Başarı Kriterleri
- ✅ Takvim responsive
- ✅ Tıklayınca sipariş detayı açılıyor
- ✅ Türkçe tarih formatı

---

### 12. Stok Uyarısı

**Amaç:** Filament stoğu takibi ve düşük stok uyarısı.

#### Gereksinimler
- [ ] Stok tablosu
- [ ] Stok giriş/çıkış kayıtları
- [ ] Minimum stok seviyesi
- [ ] Uyarı sistemi

#### Etkilenen Dosyalar
```
supabase/migration-stock.sql (yeni)
components/products/stock-alert-widget.tsx (yeni)
app/dashboard/products/page.tsx (tab ekleme)
```

#### Teknik Adımlar
1. **Veritabanı şeması**
   ```sql
   CREATE TABLE stock_items (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL,
     type text NOT NULL, -- 'filament', 'material', etc.
     quantity numeric NOT NULL,
     unit text NOT NULL, -- 'kg', 'adet', etc.
     min_quantity numeric NOT NULL,
     created_at timestamp DEFAULT now()
   );

   CREATE TABLE stock_movements (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     stock_item_id uuid REFERENCES stock_items(id),
     type text NOT NULL, -- 'in', 'out'
     quantity numeric NOT NULL,
     notes text,
     created_at timestamp DEFAULT now()
   );
   ```

2. **Stok yönetimi sayfası**
   - Stok listesi (TanStack Table)
   - Giriş/çıkış butonları
   - Geçmiş hareketler

3. **Uyarı widget'ı**
   ```tsx
   {stockItems.filter(item => item.quantity < item.min_quantity).map(item => (
     <Alert variant="destructive">
       <AlertTitle>{item.name}</AlertTitle>
       <AlertDescription>
         Stok: {item.quantity} {item.unit} (Min: {item.min_quantity})
       </AlertDescription>
     </Alert>
   ))}
   ```

4. **Dashboard entegrasyonu**
   - "Düşük Stok" kartı
   - Kritik stoklar listesi

5. **Otomatik stok düşme**
   - Üretim yapıldığında filament stoğu düşer
   - Trigger ile otomatik

#### Tahmini Süre
⏱️ 4-5 saat

#### Başarı Kriterleri
- ✅ Stok doğru takip ediliyor
- ✅ Uyarılar zamanında geliyor
- ✅ Geçmiş hareketler görülebiliyor

---

## 📊 Uygulama Sırası Önerisi

### Sprint 1 (1 hafta)
1. ✅ Toplu Sipariş Durumu Güncelleme
2. ✅ Alıcı Borç Hatırlatma
3. ✅ Alıcı Notları

### Sprint 2 (1 hafta)
4. ✅ Sipariş Şablonu
5. ✅ Excel/PDF Dışa Aktarma
6. ✅ Aylık Gelir Grafiği

### Sprint 3 (1 hafta)
7. ✅ Ürün Bazlı Kar Analizi
8. ✅ Barkod/QR ile Ürün Arama

### Sprint 4 (1 hafta)
9. ✅ Üretim Takvimi
10. ✅ Çoklu Para Birimi

### Sprint 5 (1 hafta)
11. ✅ Bildirim Sistemi
12. ✅ Stok Uyarısı

---

## 🎯 Nasıl Kullanılır?

### Bir özellik başlatmak için:
```
"1. özelliği başlat" veya "Toplu sipariş güncellemeyi yap"
```

### İlerlemeyi takip etmek için:
Her özelliğin checkbox'larını işaretleyeceğim.

### Soru sormak için:
```
"3. özellik için şablon yapısı nasıl olmalı?"
```

---

**Hazır mısın?** Hangi özellikle başlamak istersin? 🚀
