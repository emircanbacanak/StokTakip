-- Feridun siparişi için detaylı kontrol
SELECT 
  oi.product_name,
  oi.color,
  oi.quantity as siparis,
  oi.produced_quantity as uretilen,
  oi.delivered_quantity as teslim_edilen,
  (oi.produced_quantity - oi.delivered_quantity) as kalan_uretilmis,
  CASE 
    WHEN oi.produced_quantity > oi.quantity THEN (oi.produced_quantity - oi.quantity)
    ELSE 0
  END as fazla_uretim
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN buyers b ON o.buyer_id = b.id
WHERE b.name = 'Feridun'
ORDER BY oi.product_name, oi.color;

-- Özet
SELECT 
  SUM(oi.quantity) as toplam_siparis,
  SUM(oi.produced_quantity) as toplam_uretilen,
  SUM(oi.delivered_quantity) as toplam_teslim_edilen,
  SUM(oi.produced_quantity - oi.delivered_quantity) as su_ana_kadar_yapilanlar,
  SUM(CASE WHEN oi.produced_quantity > oi.quantity THEN (oi.produced_quantity - oi.quantity) ELSE 0 END) as toplam_fazla_uretim
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN buyers b ON o.buyer_id = b.id
WHERE b.name = 'Feridun';

-- Teslimatdan sonraki hesaplama için
SELECT 
  d.delivery_date,
  COUNT(di.id) as item_count,
  SUM(di.quantity) as total_delivered
FROM deliveries d
LEFT JOIN delivery_items di ON d.id = di.delivery_id
JOIN orders o ON d.order_id = o.id
JOIN buyers b ON o.buyer_id = b.id
WHERE b.name = 'Feridun'
GROUP BY d.id, d.delivery_date
ORDER BY d.delivery_date DESC;
