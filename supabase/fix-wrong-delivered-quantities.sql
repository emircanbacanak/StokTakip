-- ============================================
-- YANLIŞ DELIVERED_QUANTITY DEĞERLERİNİ DÜZELT
-- ============================================
-- Sorun: Teslimat kaydı olmayan siparişlerde
--        delivered_quantity > 0 görünüyor
-- Çözüm: Delivered_quantity'leri sıfırla
-- ============================================

-- 1. Önce hangi kayıtların düzeltileceğini görelim
SELECT 
  'DÜZELTİLECEK' as islem,
  oi.id,
  oi.product_name,
  oi.color,
  oi.quantity,
  oi.produced_quantity,
  oi.delivered_quantity as eski_deger,
  0 as yeni_deger
FROM order_items oi
WHERE oi.order_id = 'ff36d4c3-32da-4abd-aedb-f76d3f5a36e6'
  AND oi.delivered_quantity > 0;

-- 2. Delivered_quantity'leri sıfırla
UPDATE order_items
SET delivered_quantity = 0
WHERE order_id = 'ff36d4c3-32da-4abd-aedb-f76d3f5a36e6'
  AND delivered_quantity > 0;

-- ============================================
-- KONTROL
-- ============================================

-- Düzeltildi mi kontrol et
SELECT 
  oi.id,
  oi.product_name,
  oi.color,
  oi.quantity,
  oi.produced_quantity,
  oi.delivered_quantity
FROM order_items oi
WHERE oi.order_id = 'ff36d4c3-32da-4abd-aedb-f76d3f5a36e6'
ORDER BY oi.product_name, oi.color;

-- Sonuç: Tüm delivered_quantity değerleri 0 olmalı

-- ============================================
-- TÜM SİPARİŞLERDE KONTROL
-- ============================================
-- Teslimat kaydı olmayan ama delivered_quantity > 0 olan
-- başka siparişler var mı?

SELECT 
  o.id as order_id,
  o.created_at,
  b.name as buyer_name,
  oi.product_name,
  oi.color,
  oi.delivered_quantity
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN buyers b ON o.buyer_id = b.id
WHERE oi.delivered_quantity > 0
  AND NOT EXISTS (
    SELECT 1 
    FROM delivery_items di 
    WHERE di.order_item_id = oi.id
  )
ORDER BY o.created_at DESC;

-- Sonuç: Boş olmalı (başka yanlış kayıt kalmamalı)
