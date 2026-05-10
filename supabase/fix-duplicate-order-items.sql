-- ============================================
-- DUPLICATE ORDER_ITEMS TEMİZLEME
-- ============================================
-- Sorun: Aynı sipariş içinde aynı ürün/renk için 2 kayıt var
-- Çözüm: Birini sil, diğerini güncelle
-- ============================================

-- 1. Önce hangi kayıtların silineceğini görelim (DRY RUN)
SELECT 
  'SİLİNECEK' as islem,
  id,
  order_id,
  product_name,
  color,
  quantity,
  produced_quantity,
  delivered_quantity
FROM order_items
WHERE id = 'c4258fa7-d788-4f53-aed3-eb7e5ee19328';

-- 2. Önce delivery_items'daki referansları güncelle
-- c4258fa7 kullanan delivery_items kayıtlarını 6d42d617'ye yönlendir
UPDATE delivery_items
SET order_item_id = '6d42d617-4b1d-4bfd-9fe7-294adb631f13'
WHERE order_item_id = 'c4258fa7-d788-4f53-aed3-eb7e5ee19328';

-- 3. Duplicate kaydı sil
DELETE FROM order_items
WHERE id = 'c4258fa7-d788-4f53-aed3-eb7e5ee19328';

-- 4. Kalan kaydın delivered_quantity'sini yeniden hesapla (trigger otomatik yapacak)
-- Ama manuel de yapabiliriz:
UPDATE order_items
SET delivered_quantity = (
  SELECT COALESCE(SUM(di.quantity), 0)
  FROM delivery_items di
  WHERE di.order_item_id = '6d42d617-4b1d-4bfd-9fe7-294adb631f13'
)
WHERE id = '6d42d617-4b1d-4bfd-9fe7-294adb631f13';

-- ============================================
-- KONTROL
-- ============================================

-- Duplicate kalmadı mı kontrol et
SELECT 
  order_id,
  product_name,
  color,
  COUNT(*) as kayit_sayisi
FROM order_items
WHERE order_id = 'd4fed966-9ec6-4523-9a82-bdaec97e566e'
  AND product_name = 'Aura Vazo'
  AND color = 'Bej'
GROUP BY order_id, product_name, color;

-- Sonuç: kayit_sayisi = 1 olmalı

-- Tüm siparişlerde duplicate var mı kontrol et
SELECT 
  order_id,
  product_name,
  color,
  COUNT(*) as kayit_sayisi,
  STRING_AGG(id::text, ', ') as item_ids
FROM order_items
GROUP BY order_id, product_name, color
HAVING COUNT(*) > 1
ORDER BY kayit_sayisi DESC;

-- Sonuç: Boş olmalı (duplicate kalmamalı)
