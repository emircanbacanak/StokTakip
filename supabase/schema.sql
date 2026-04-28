-- =============================================
-- STOK & SİPARİŞ TAKİP - VERİTABANI ŞEMASI
-- Supabase SQL Editor'da çalıştırın
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

-- =============================================
-- STORAGE: Supabase Dashboard > Storage'dan
-- "product-images" adında PUBLIC bir bucket oluşturun
-- =============================================

-- Alıcılar tablosu
CREATE TABLE IF NOT EXISTS buyers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Siparişler tablosu
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_production', 'completed', 'delivered')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sipariş kalemleri tablosu
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  produced_quantity INTEGER NOT NULL DEFAULT 0 CHECK (produced_quantity >= 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_color ON order_items(color);

-- Row Level Security (RLS) - Tüm kullanıcılara izin ver (auth eklenince kısıtlanabilir)
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Geçici olarak herkese izin ver (auth eklenince güncelleyin)
CREATE POLICY "Allow all on buyers" ON buyers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- ÖRNEK VERİ (opsiyonel - test için)
-- =============================================

-- INSERT INTO buyers (name, phone, address) VALUES
--   ('Ahmet Yılmaz', '0532 111 22 33', 'İstanbul, Kadıköy'),
--   ('Fatma Kaya', '0545 444 55 66', 'Ankara, Çankaya'),
--   ('Mehmet Demir', NULL, NULL);
