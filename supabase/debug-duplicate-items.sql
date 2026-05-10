-- Duplicate order_items kontrolü
-- Aynı order_id, product_name, color kombinasyonu için birden fazla kayıt var mı?

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

-- Eğer sonuç boşsa, duplicate yok demektir
-- Eğer sonuç varsa, hangi siparişlerde duplicate olduğunu gösterir
