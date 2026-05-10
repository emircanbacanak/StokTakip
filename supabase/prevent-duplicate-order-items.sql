-- ============================================
-- DUPLICATE ORDER_ITEMS ÖNLEME
-- ============================================
-- Aynı sipariş içinde aynı ürün/renk için
-- birden fazla kayıt oluşmasını engelle
-- ============================================

-- UNIQUE constraint ekle
ALTER TABLE order_items
ADD CONSTRAINT unique_order_product_color 
UNIQUE (order_id, product_name, color);

-- Bu constraint sayede:
-- - Aynı sipariş içinde aynı ürün/renk için 2. kayıt eklenemez
-- - Eğer eklenmeye çalışılırsa hata verir
-- - Duplicate'ler otomatik olarak engellenir

-- ============================================
-- DELIVERED_QUANTITY KONTROLÜ
-- ============================================
-- delivered_quantity asla quantity'den fazla olamaz

ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS check_delivered_lte_quantity;

ALTER TABLE order_items
ADD CONSTRAINT check_delivered_lte_quantity 
CHECK (delivered_quantity <= quantity);

-- ============================================
-- TRIGGER: DELIVERED_QUANTITY GÜVENLİK KONTROLÜ
-- ============================================
-- Trigger'ı güncelle: Sadece ilgili order_id'ye ait kayıtları güncelle

DROP TRIGGER IF EXISTS trigger_update_delivered_quantity ON delivery_items;
DROP FUNCTION IF EXISTS update_order_item_delivered_quantity();

CREATE OR REPLACE FUNCTION update_order_item_delivered_quantity()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
BEGIN
  -- Delivery item eklendiğinde veya güncellendiğinde
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- İlgili order_id'yi al
    SELECT order_id INTO v_order_id
    FROM order_items
    WHERE id = NEW.order_item_id;
    
    -- Sadece bu order_id'ye ait order_item'ı güncelle
    UPDATE order_items
    SET delivered_quantity = (
      SELECT COALESCE(SUM(di.quantity), 0)
      FROM delivery_items di
      WHERE di.order_item_id = NEW.order_item_id
    )
    WHERE id = NEW.order_item_id
      AND order_id = v_order_id;  -- Ekstra güvenlik
  END IF;
  
  -- Delivery item silindiğinde
  IF (TG_OP = 'DELETE') THEN
    -- İlgili order_id'yi al
    SELECT order_id INTO v_order_id
    FROM order_items
    WHERE id = OLD.order_item_id;
    
    -- Sadece bu order_id'ye ait order_item'ı güncelle
    UPDATE order_items
    SET delivered_quantity = (
      SELECT COALESCE(SUM(di.quantity), 0)
      FROM delivery_items di
      WHERE di.order_item_id = OLD.order_item_id
    )
    WHERE id = OLD.order_item_id
      AND order_id = v_order_id;  -- Ekstra güvenlik
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivered_quantity
AFTER INSERT OR UPDATE OR DELETE ON delivery_items
FOR EACH ROW EXECUTE FUNCTION update_order_item_delivered_quantity();

-- ============================================
-- KONTROL FONKSİYONU
-- ============================================
-- Yanlış delivered_quantity değerlerini tespit et

CREATE OR REPLACE FUNCTION check_invalid_delivered_quantities()
RETURNS TABLE (
  order_id UUID,
  order_item_id UUID,
  product_name TEXT,
  color TEXT,
  quantity INTEGER,
  delivered_quantity INTEGER,
  actual_delivered INTEGER,
  problem TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oi.order_id,
    oi.id as order_item_id,
    oi.product_name,
    oi.color,
    oi.quantity,
    oi.delivered_quantity,
    COALESCE((
      SELECT SUM(di.quantity)
      FROM delivery_items di
      WHERE di.order_item_id = oi.id
    ), 0)::INTEGER as actual_delivered,
    CASE 
      WHEN oi.delivered_quantity > oi.quantity THEN 'Teslim edilen sipariş miktarından fazla'
      WHEN oi.delivered_quantity != COALESCE((
        SELECT SUM(di.quantity)
        FROM delivery_items di
        WHERE di.order_item_id = oi.id
      ), 0) THEN 'Delivered_quantity ile gerçek teslimat uyuşmuyor'
      ELSE 'Bilinmeyen sorun'
    END as problem
  FROM order_items oi
  WHERE 
    oi.delivered_quantity > oi.quantity
    OR oi.delivered_quantity != COALESCE((
      SELECT SUM(di.quantity)
      FROM delivery_items di
      WHERE di.order_item_id = oi.id
    ), 0);
END;
$$ LANGUAGE plpgsql;

-- Kullanım:
-- SELECT * FROM check_invalid_delivered_quantities();

-- Test:
-- Şu sorgu hata vermeli (duplicate):
-- INSERT INTO order_items (order_id, product_name, color, quantity, unit_price)
-- VALUES ('existing-order-id', 'Aura Vazo', 'Bej', 12, 100);
