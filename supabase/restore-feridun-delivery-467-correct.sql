-- Feridun'un 467 adetlik teslimatını DOĞRU bilgilerle yeniden oluştur
-- Order ID: 4dfed966-9ec6-4523-9202-bdaec97e506e

-- ADIM 0: Önce tüm delivered_quantity değerlerini sıfırla
UPDATE order_items
SET delivered_quantity = 0
WHERE order_id = '4dfed966-9ec6-4523-9202-bdaec97e506e';

-- ADIM 1: Mevcut yanlış delivery kaydını sil (varsa)
DELETE FROM delivery_items WHERE delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de';
DELETE FROM deliveries WHERE id = '8937c931-787d-46a0-9195-0fa72d7c32de';

-- ADIM 2: Yeni delivery kaydı oluştur
INSERT INTO deliveries (id, order_id, delivery_date, notes, created_at)
VALUES (
  '8937c931-787d-46a0-9195-0fa72d7c32de',
  '4dfed966-9ec6-4523-9202-bdaec97e506e',
  '2026-05-09',
  'Yeniden oluşturuldu - 467 adet teslimat (doğru liste)',
  NOW()
);

-- ADIM 3: Önce order_item_id'leri bul ve delivery_items ekle
-- Senfoni Vazo (80 adet)
INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
SELECT '8937c931-787d-46a0-9195-0fa72d7c32de', id, 
  CASE 
    WHEN color = 'Beyaz' THEN 3
    WHEN color = 'Siyah' THEN 13
    WHEN color = 'Sedefli Mavi' THEN 5
    WHEN color = 'Haiki Yeşil' THEN 3
    WHEN color = 'Bej' THEN 15
    WHEN color = 'Kahverengi' THEN 9
    WHEN color = 'Vişne Çürüğü' THEN 17
    WHEN color = 'Gümüş' THEN 14
    WHEN color = 'Antrasit' THEN 1
  END as quantity
FROM order_items
WHERE order_id = '4dfed966-9ec6-4523-9202-bdaec97e506e'
  AND product_name = 'Senfoni Vazo'
  AND color IN ('Beyaz', 'Siyah', 'Sedefli Mavi', 'Haiki Yeşil', 'Bej', 'Kahverengi', 'Vişne Çürüğü', 'Gümüş', 'Antrasit');

-- Mira Mumluk (80 adet)
INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
SELECT '8937c931-787d-46a0-9195-0fa72d7c32de', id,
  CASE 
    WHEN color = 'Altın' THEN 12
    WHEN color = 'Sedefli Mavi' THEN 13
    WHEN color = 'Antrasit' THEN 12
    WHEN color = 'Mermer' THEN 12
    WHEN color = 'Kahverengi' THEN 13
    WHEN color = 'Gri' THEN 7
    WHEN color = 'Haiki Yeşil' THEN 9
    WHEN color = 'Gümüş' THEN 2
  END as quantity
FROM order_items
WHERE order_id = '4dfed966-9ec6-4523-9202-bdaec97e506e'
  AND product_name = 'Mira Mumluk'
  AND color IN ('Altın', 'Sedefli Mavi', 'Antrasit', 'Mermer', 'Kahverengi', 'Gri', 'Haiki Yeşil', 'Gümüş');

-- Lamina Mumluk (50 adet)
INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
SELECT '8937c931-787d-46a0-9195-0fa72d7c32de', id,
  CASE 
    WHEN color = 'Mermer' THEN 12
    WHEN color = 'Beyaz' THEN 5
    WHEN color = 'Antrasit' THEN 14
    WHEN color = 'Pembe' THEN 13
    WHEN color = 'Sedefli Mavi' THEN 2
    WHEN color = 'Kahverengi' THEN 1
    WHEN color = 'Siyah' THEN 3
  END as quantity
FROM order_items
WHERE order_id = '4dfed966-9ec6-4523-9202-bdaec97e506e'
  AND product_name = 'Lamina Mumluk'
  AND color IN ('Mermer', 'Beyaz', 'Antrasit', 'Pembe', 'Sedefli Mavi', 'Kahverengi', 'Siyah');

-- Tavşan Mumluk (117 adet)
INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
SELECT '8937c931-787d-46a0-9195-0fa72d7c32de', id,
  CASE 
    WHEN color = 'Beyaz' THEN 27
    WHEN color = 'Mermer' THEN 13
    WHEN color = 'Sedefli Mavi' THEN 16
    WHEN color = 'Bej' THEN 13
    WHEN color = 'Antrasit' THEN 13
    WHEN color = 'Ten Rengi' THEN 15
    WHEN color = 'Altın' THEN 13
    WHEN color = 'Gri' THEN 2
    WHEN color = 'Haiki Yeşil' THEN 5
  END as quantity
FROM order_items
WHERE order_id = '4dfed966-9ec6-4523-9202-bdaec97e506e'
  AND product_name = 'Tavşan Mumluk'
  AND color IN ('Beyaz', 'Mermer', 'Sedefli Mavi', 'Bej', 'Antrasit', 'Ten Rengi', 'Altın', 'Gri', 'Haiki Yeşil');

-- Aura Vazo (50 adet)
INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
SELECT '8937c931-787d-46a0-9195-0fa72d7c32de', id,
  CASE 
    WHEN color = 'Beyaz' THEN 6
    WHEN color = 'Antrasit' THEN 5
    WHEN color = 'Bej' THEN 5
    WHEN color = 'Kahverengi' THEN 12
    WHEN color = 'Haiki Yeşil' THEN 12
    WHEN color = 'Mermer' THEN 8
    WHEN color = 'Sedefli Mavi' THEN 2
  END as quantity
FROM order_items
WHERE order_id = '4dfed966-9ec6-4523-9202-bdaec97e506e'
  AND product_name = 'Aura Vazo'
  AND color IN ('Beyaz', 'Antrasit', 'Bej', 'Kahverengi', 'Haiki Yeşil', 'Mermer', 'Sedefli Mavi');

-- Petra Vazo (20 adet)
INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
SELECT '8937c931-787d-46a0-9195-0fa72d7c32de', id,
  CASE 
    WHEN color = 'Beyaz' THEN 9
    WHEN color = 'Antrasit' THEN 5
    WHEN color = 'Bej' THEN 6
  END as quantity
FROM order_items
WHERE order_id = '4dfed966-9ec6-4523-9202-bdaec97e506e'
  AND product_name = 'Petra Vazo'
  AND color IN ('Beyaz', 'Antrasit', 'Bej');

-- Vero Tutacak (70 adet)
INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
SELECT '8937c931-787d-46a0-9195-0fa72d7c32de', id,
  CASE 
    WHEN color = 'Sedefli Mavi' THEN 19
    WHEN color = 'Kırmızı' THEN 18
    WHEN color = 'Siyah' THEN 33
  END as quantity
FROM order_items
WHERE order_id = '4dfed966-9ec6-4523-9202-bdaec97e506e'
  AND product_name = 'Vero Tutacak'
  AND color IN ('Sedefli Mavi', 'Kırmızı', 'Siyah');

-- ADIM 4: Kontrol - Toplam adet ve kalem sayısı
SELECT 
  COUNT(*) as kalem_sayisi,
  SUM(quantity) as toplam_adet
FROM delivery_items
WHERE delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de';

-- Beklenen: 467 adet

-- ADIM 5: Ürün bazında kontrol
SELECT 
  oi.product_name,
  oi.color,
  di.quantity as teslim_edilen
FROM delivery_items di
JOIN order_items oi ON oi.id = di.order_item_id
WHERE di.delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de'
ORDER BY oi.product_name, oi.color;
