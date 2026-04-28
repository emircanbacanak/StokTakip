-- =============================================
-- STOK & SİPARİŞ TAKİP V2 - GELİŞMİŞ VERİTABANI ŞEMASI
-- Ara teslimat ve ödeme takibi için yeni mimari
-- =============================================

-- Ürün kataloğu tablosu
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);

-- Alıcılar tablosu
CREATE TABLE IF NOT EXISTS buyers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on buyers" ON buyers FOR ALL USING (true) WITH CHECK (true);

-- Siparişler tablosu
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_production', 'completed', 'delivered')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Sipariş kalemleri tablosu
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  produced_quantity INTEGER NOT NULL DEFAULT 0 CHECK (produced_quantity >= 0),
  delivered_quantity INTEGER NOT NULL DEFAULT 0 CHECK (delivered_quantity >= 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_delivered_lte_quantity CHECK (delivered_quantity <= quantity),
  CONSTRAINT check_produced_lte_quantity CHECK (produced_quantity <= quantity)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_color ON order_items(product_name, color);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- YENİ: TESLİMAT TAKİP SİSTEMİ
-- =============================================

-- Teslimatlar tablosu (ara teslimatlar dahil)
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
CREATE POLICY "Allow all on deliveries" ON deliveries FOR ALL USING (true) WITH CHECK (true);

-- Teslimat kalemleri (hangi ürünlerden kaç adet teslim edildi)
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
CREATE POLICY "Allow all on delivery_items" ON delivery_items FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- YENİ: ÖDEME TAKİP SİSTEMİ
-- =============================================

-- Ödemeler tablosu (tüm ödemeler ayrı ayrı kaydedilir)
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
CREATE POLICY "Allow all on payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- TRIGGER: Otomatik hesaplamalar
-- =============================================

-- Order items'daki delivered_quantity'yi otomatik güncelle
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivered_quantity
AFTER INSERT OR UPDATE OR DELETE ON delivery_items
FOR EACH ROW EXECUTE FUNCTION update_order_item_delivered_quantity();

-- Orders tablosundaki paid_amount'u otomatik güncelle
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_paid_amount
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION update_order_paid_amount();

-- Orders tablosundaki total_amount'u otomatik güncelle
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_total_amount
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_order_total_amount();

-- =============================================
-- YARDIMCI FONKSIYONLAR
-- =============================================

-- Sipariş özet bilgilerini getir
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
-- MİGRASYON: Mevcut verileri koru
-- =============================================

-- Eğer mevcut paid_amount değerleri varsa, bunları payments tablosuna aktar
DO $$
DECLARE
  ord RECORD;
BEGIN
  FOR ord IN SELECT id, paid_amount FROM orders WHERE paid_amount > 0
  LOOP
    INSERT INTO payments (order_id, amount, payment_date, notes)
    VALUES (ord.id, ord.paid_amount, NOW(), 'Mevcut veriden aktarıldı');
  END LOOP;
END $$;

