-- Yeni eklenen ürünlerin produced_quantity değerlerini güncelle
-- NOT: Aşağıdaki değerleri kendi ürünlerinize göre düzenleyin

-- Örnek: Eğer "Aura Vazo - Kırmızı" ürününü 15 adet ürettiyseniz:
-- UPDATE order_items 
-- SET produced_quantity = 15 
-- WHERE product_name = 'Aura Vazo' 
--   AND color = 'Kırmızı' 
--   AND order_id = (SELECT id FROM orders WHERE buyer_id = (SELECT id FROM buyers WHERE name = 'Feridun'));

-- Feridun siparişindeki tüm ürünleri listele (produced_quantity = 0 olanlar)
SELECT 
  oi.id,
  oi.product_name,
  oi.color,
  oi.quantity as siparis_adedi,
  oi.produced_quantity as uretilen,
  oi.delivered_quantity as teslim_edilen
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN buyers b ON o.buyer_id = b.id
WHERE b.name = 'Feridun'
  AND oi.produced_quantity = 0
ORDER BY oi.product_name, oi.color;

-- Yukarıdaki listeden ID'leri alıp aşağıdaki gibi güncelleyin:
-- UPDATE order_items SET produced_quantity = 15 WHERE id = 'BURAYA_ID_GELECEK';
