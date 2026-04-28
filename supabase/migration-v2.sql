-- =============================================
-- STOK & SİPARİŞ TAKİP V2 - MİGRASYON SCRIPT
-- Sadece yeni tabloları ve özellikleri ekler
-- Mevcut verileri korur
-- =============================================

-- =============================================
-- 1. MEVCUT TABLOLARA YENİ ALANLAR EKLE
-- =============================================

-- order_items tablosuna delivered_quantity ekle (eğer yoksa)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'delivered_quantity'
  ) THEN
    ALTER TABLE order_items 
    ADD COLUMN delivered_quantity INTEGER NOT NULL DEFAULT 0 CHECK (delivered_quantity >= 0);
    
    ALTER TABLE order_items 
    ADD CONSTRAINT check_delivered_lte_quantity CHECK (delivered_quantity <= quantity);
  END IF;
END $$;

-- orders tablosuna updated_at ekle (eğer yoksa)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE orders 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- =============================================
-- 2. YENİ TABLOLAR OLUŞTUR
-- =============================================

-- Teslimatlar tablosu
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date DESC);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on deliveries" ON deliveries;
CREATE POLICY "Allow all on deliveries" ON deliveries FOR ALL USING (true) WITH CHECK (true);

-- Teslimat kalemleri
CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_order_item_id ON delivery_items(order_item_id);

ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on delivery_items" ON delivery_items;
CREATE POLICY "Allow all on delivery_items" ON delivery_items FOR ALL USING (true) WITH CHECK (true);

-- Ödemeler tablosu
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_delivery_id ON payments(delivery_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on payments" ON payments;
CREATE POLICY "Allow all on payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 3. TRIGGER'LARI OLUŞTUR
-- =============================================

-- Trigger: delivered_quantity otomatik güncelleme
DROP TRIGGER IF EXISTS trigger_update_delivered_quantity ON delivery_items;
DROP FUNCTION IF EXISTS update_order_item_delivered_quantity();

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

CREATE TRIGGER trigger_update_delivered_quantity
AFTER INSERT OR UPDATE OR DELETE ON delivery_items
FOR EACH ROW EXECUTE FUNCTION update_order_item_delivered_quantity();

-- Trigger: paid_amount otomatik güncelleme
DROP TRIGGER IF EXISTS trigger_update_paid_amount ON payments;
DROP FUNCTION IF EXISTS update_order_paid_amount();

CREATE OR REPLACE FUNCTION update_order_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Payment eklendiğinde veya güncellendiğinde
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE orders
    SET paid_amount = (
      SELECT COALESCE(SUM(p.amount), 0)
      FROM payments p
      WHERE p.order_id = NEW.order_id
    ),
    updated_at = NOW()
    WHERE id = NEW.order_id;
  END IF;
  
  -- Payment silindiğinde
  IF (TG_OP = 'DELETE') THEN
    UPDATE orders
    SET paid_amount = (
      SELECT COALESCE(SUM(p.amount), 0)
      FROM payments p
      WHERE p.order_id = OLD.order_id
    ),
    updated_at = NOW()
    WHERE id = OLD.order_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_paid_amount
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION update_order_paid_amount();

-- Trigger: total_amount otomatik güncelleme
DROP TRIGGER IF EXISTS trigger_update_total_amount ON order_items;
DROP FUNCTION IF EXISTS update_order_total_amount();

CREATE OR REPLACE FUNCTION update_order_total_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE orders
    SET total_amount = (
      SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
      FROM order_items oi
      WHERE oi.order_id = NEW.order_id
    ),
    updated_at = NOW()
    WHERE id = NEW.order_id;
  END IF;
  
  IF (TG_OP = 'DELETE') THEN
    UPDATE orders
    SET total_amount = (
      SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
      FROM order_items oi
      WHERE oi.order_id = OLD.order_id
    ),
    updated_at = NOW()
    WHERE id = OLD.order_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_total_amount
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_order_total_amount();

-- =============================================
-- 4. YARDIMCI FONKSİYONLAR
-- =============================================

-- Sipariş özet bilgilerini getir
DROP FUNCTION IF EXISTS get_order_summary(UUID);

CREATE OR REPLACE FUNCTION get_order_summary(order_uuid UUID)
RETURNS TABLE (
  total_amount NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  total_items INTEGER,
  delivered_items INTEGER,
  remaining_items INTEGER,
  delivery_count INTEGER,
  payment_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.total_amount,
    o.paid_amount,
    o.total_amount - o.paid_amount AS remaining_amount,
    COALESCE(SUM(oi.quantity), 0)::INTEGER AS total_items,
    COALESCE(SUM(oi.delivered_quantity), 0)::INTEGER AS delivered_items,
    COALESCE(SUM(oi.quantity - oi.delivered_quantity), 0)::INTEGER AS remaining_items,
    (SELECT COUNT(*) FROM deliveries WHERE order_id = order_uuid)::INTEGER AS delivery_count,
    (SELECT COUNT(*) FROM payments WHERE order_id = order_uuid)::INTEGER AS payment_count
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.id = order_uuid
  GROUP BY o.id, o.total_amount, o.paid_amount;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. MEVCUT VERİLERİ MİGRE ET
-- =============================================

-- Eğer mevcut paid_amount değerleri varsa, bunları payments tablosuna aktar
DO $$
DECLARE
  ord RECORD;
  payment_exists BOOLEAN;
BEGIN
  FOR ord IN SELECT id, paid_amount FROM orders WHERE paid_amount > 0
  LOOP
    -- Bu sipariş için zaten payment var mı kontrol et
    SELECT EXISTS(SELECT 1 FROM payments WHERE order_id = ord.id) INTO payment_exists;
    
    -- Yoksa ekle
    IF NOT payment_exists THEN
      INSERT INTO payments (order_id, amount, payment_date, notes)
      VALUES (ord.id, ord.paid_amount, NOW(), 'Mevcut veriden aktarıldı');
    END IF;
  END LOOP;
END $$;

-- =============================================
-- 6. BAŞARILI MESAJI
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration başarıyla tamamlandı!';
  RAISE NOTICE '📊 Yeni tablolar: deliveries, delivery_items, payments';
  RAISE NOTICE '🔧 Trigger''lar aktif';
  RAISE NOTICE '📝 Mevcut veriler korundu';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Artık ara teslimat ve ödeme takibi yapabilirsiniz!';
END $$;
