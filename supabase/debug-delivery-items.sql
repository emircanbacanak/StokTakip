-- Teslimat kalemlerini kontrol et
-- Bu sorguyu Supabase SQL Editor'de çalıştırın

SELECT 
  d.id as delivery_id,
  d.delivery_date,
  di.id as delivery_item_id,
  di.quantity as delivery_quantity,
  oi.product_name,
  oi.color,
  oi.quantity as order_quantity,
  oi.delivered_quantity
FROM deliveries d
JOIN delivery_items di ON di.delivery_id = d.id
JOIN order_items oi ON oi.id = di.order_item_id
ORDER BY d.delivery_date DESC
LIMIT 20;

-- Eğer quantity değerleri 0 ise, bu bir veri sorunu demektir
-- Eğer quantity değerleri normal ise, sorun frontend'de
