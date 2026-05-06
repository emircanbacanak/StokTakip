-- =============================================
-- TESLİMAT KALEMLERİNİ DÜZELT
-- 
-- Sorun: delivery_items tablosu boş ama order_items.delivered_quantity
-- değerleri dolu. Bu script mevcut delivered_quantity değerlerinden
-- delivery_items kayıtları oluşturur.
--
-- ÖNCE ÇALIŞTIR: migration-remove-constraints.sql
-- SONRA ÇALIŞTIR: Bu dosya
-- =============================================

-- 1. Önce kısıtları kaldır (fazla üretim/teslimat için)
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS check_delivered_lte_quantity;

ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS check_produced_lte_quantity;

-- 2. delivery_items boş olan ama delivered_quantity > 0 olan siparişleri bul ve düzelt
DO $$
DECLARE
  delivery_rec RECORD;
  item_rec RECORD;
  new_delivery_id UUID;
  fixed_count INTEGER := 0;
BEGIN
  -- delivery_items'ı olmayan teslimatları bul
  FOR delivery_rec IN 
    SELECT d.id, d.order_id, d.delivery_date, d.notes
    FROM deliveries d
    WHERE NOT EXISTS (
      SELECT 1 FROM delivery_items di WHERE di.delivery_id = d.id
    )
  LOOP
    -- Bu teslimatın siparişindeki delivered_quantity > 0 olan kalemleri bul
    FOR item_rec IN
      SELECT oi.id, oi.delivered_quantity, oi.product_name, oi.color
      FROM order_items oi
      WHERE oi.order_id = delivery_rec.order_id
        AND oi.delivered_quantity > 0
    LOOP
      -- delivery_items kaydı oluştur
      INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
      VALUES (delivery_rec.id, item_rec.id, item_rec.delivered_quantity)
      ON CONFLICT DO NOTHING;
      
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Eklendi: Teslimat % → Ürün % (%) - % adet', 
        delivery_rec.id, item_rec.product_name, item_rec.color, item_rec.delivered_quantity;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Toplam % delivery_items kaydı oluşturuldu', fixed_count;
END $$;

-- 3. Sonucu kontrol et
SELECT 
  d.id as teslimat_id,
  d.delivery_date,
  COUNT(di.id) as kalem_sayisi,
  SUM(di.quantity) as toplam_adet,
  b.name as musteri
FROM deliveries d
LEFT JOIN delivery_items di ON di.delivery_id = d.id
JOIN orders o ON o.id = d.order_id
JOIN buyers b ON b.id = o.buyer_id
GROUP BY d.id, d.delivery_date, b.name
ORDER BY d.delivery_date DESC;

-- 4. Başarı mesajı
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Düzeltme tamamlandı!';
  RAISE NOTICE '🔄 Uygulamayı yenileyin - Teslimat geçmişi artık doğru görünmeli';
END $$;
