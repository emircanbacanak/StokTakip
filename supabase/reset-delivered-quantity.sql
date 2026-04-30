-- Feridun siparişindeki tüm ürünlerin delivered_quantity'sini sıfırla
UPDATE order_items
SET delivered_quantity = 0
WHERE order_id = (
  SELECT id FROM orders 
  WHERE buyer_id = (SELECT id FROM buyers WHERE name = 'Feridun')
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Sonucu kontrol et
SELECT 
  oi.product_name,
  oi.color,
  oi.quantity as siparis,
  oi.delivered_quantity as teslim_edilen,
  oi.produced_quantity as uretilen
FROM order_items oi
WHERE oi.order_id = (
  SELECT id FROM orders 
  WHERE buyer_id = (SELECT id FROM buyers WHERE name = 'Feridun')
  ORDER BY created_at DESC 
  LIMIT 1
)
ORDER BY oi.product_name, oi.color;

-- Başarı mesajı
DO $$
BEGIN
  RAISE NOTICE '✅ delivered_quantity değerleri sıfırlandı!';
  RAISE NOTICE '🔄 Sayfayı yenileyin';
END $$;
