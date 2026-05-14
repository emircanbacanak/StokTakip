-- =============================================
-- ÜRÜN BOYUT DESTEĞİ - Migration
-- Ürünlere farklı boyutlar (13cm, 15cm, 17cm vb.) ekleme
-- =============================================

-- Ürün boyutları tablosu
CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL, -- Örn: "13cm", "15cm", "17cm"
  weight_grams NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (weight_grams >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0, -- Sıralama için
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, size_name) -- Aynı ürün için aynı boyut adı tekrar edemez
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_sort_order ON product_sizes(product_id, sort_order);

ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on product_sizes" ON product_sizes FOR ALL USING (true) WITH CHECK (true);

-- Products tablosuna has_sizes flag'i ekle
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT false;

-- Order_items tablosuna size bilgisi ekle
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES product_sizes(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_name TEXT; -- Denormalize edilmiş, hızlı erişim için

CREATE INDEX IF NOT EXISTS idx_order_items_size_id ON order_items(size_id);

-- Mevcut products tablosundaki weight_grams'ı koru (boyutsuz ürünler için)
-- has_sizes = false olan ürünler için weight_grams kullanılacak
-- has_sizes = true olan ürünler için product_sizes tablosundaki weight_grams kullanılacak

COMMENT ON TABLE product_sizes IS 'Ürünlerin farklı boyutları ve her boyutun gramajı';
COMMENT ON COLUMN products.has_sizes IS 'Ürünün farklı boyutları var mı? (true ise product_sizes tablosuna bakılır)';
COMMENT ON COLUMN order_items.size_id IS 'Sipariş edilen ürünün boyutu (has_sizes=true olan ürünler için)';
COMMENT ON COLUMN order_items.size_name IS 'Boyut adı (denormalize, hızlı erişim için)';
