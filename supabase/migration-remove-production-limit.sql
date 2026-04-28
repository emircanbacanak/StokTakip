-- produced_quantity üst sınır constraint'ini kaldır
-- Fazla üretim yapılabilmesi için gerekli

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS check_produced_lte_quantity;

-- Yeni constraint: sadece negatif olamaz
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_produced_quantity_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_produced_quantity_check 
  CHECK (produced_quantity >= 0);
