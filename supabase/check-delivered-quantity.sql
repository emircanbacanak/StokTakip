-- Sipariş kalemlerinin delivered_quantity değerlerini kontrol et
SELECT 
  oi.id,
  oi.product_name,
  oi.color,
  oi.quantity as siparis_miktari,
  oi.delivered_quantity as teslim_edilen,
  oi.produced_quantity as uretilen,
  o.id as order_id,
  b.name as musteri
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN buyers b ON b.id = o.buyer_id
WHERE o.id = (
  SELECT id FROM orders 
  WHERE buyer_id = (SELECT id FROM buyers WHERE name = 'Feridun')
  ORDER BY created_at DESC 
  LIMIT 1
)
ORDER BY oi.product_name, oi.color;

-- Teslimat kayıtlarını kontrol et
SELECT 
  d.id as teslimat_id,
  d.delivery_date,
  di.order_item_id,
  di.quantity as teslim_miktari,
  oi.product_name,
  oi.color
FROM deliveries d
JOIN delivery_items di ON di.delivery_id = d.id
JOIN order_items oi ON oi.id = di.order_item_id
WHERE d.order_id = (
  SELECT id FROM orders 
  WHERE buyer_id = (SELECT id FROM buyers WHERE name = 'Feridun')
  ORDER BY created_at DESC 
  LIMIT 1
)
ORDER BY d.delivery_date DESC;
