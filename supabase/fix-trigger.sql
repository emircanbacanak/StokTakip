-- =============================================
-- TRIGGER DÜZELTME SCRIPT
-- Mevcut trigger'ı sil ve yeniden oluştur
-- =============================================

-- Önce mevcut trigger'ları sil
DROP TRIGGER IF EXISTS trigger_update_delivered_quantity ON delivery_items CASCADE;
DROP FUNCTION IF EXISTS update_order_item_delivered_quantity() CASCADE;

-- Trigger fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION update_order_item_delivered_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Delivery item eklendiğinde veya güncellendiğinde
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE order_items
    SET delivered_quantity = (
      SELECT COALESCE(SUM(di.quantity), 0)
      FROM delivery_items di
      WHERE di.order_item_id = NEW.order_item_id
    )
    WHERE id = NEW.order_item_id;
  END IF;
  
  -- Delivery item silindiğinde
  IF (TG_OP = 'DELETE') THEN
    UPDATE order_items
    SET delivered_quantity = (
      SELECT COALESCE(SUM(di.quantity), 0)
      FROM delivery_items di
      WHERE di.order_item_id = OLD.order_item_id
    )
    WHERE id = OLD.order_item_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
CREATE TRIGGER trigger_update_delivered_quantity
AFTER INSERT OR UPDATE OR DELETE ON delivery_items
FOR EACH ROW EXECUTE FUNCTION update_order_item_delivered_quantity();

-- Başarı mesajı
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger başarıyla düzeltildi!';
  RAISE NOTICE '🔧 delivered_quantity artık otomatik güncelleniyor';
END $$;
