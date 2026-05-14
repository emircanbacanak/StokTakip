-- Feridun siparişindeki güncel order_item ID'lerini al
SELECT 
  oi.id as order_item_id,
  oi.product_name,
  oi.color,
  oi.delivered_quantity as teslim_edilen_adet
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN buyers b ON o.buyer_id = b.id
WHERE b.name = 'Feridun'
  AND oi.delivered_quantity > 0
ORDER BY oi.product_name, oi.color;
