-- Renkler tablosu
CREATE TABLE IF NOT EXISTS colors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on colors" ON colors;
CREATE POLICY "Allow all on colors" ON colors FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_colors_name ON colors(name);

-- Varsayılan renkler
INSERT INTO colors (name) VALUES
  ('Siyah'),('Beyaz'),('Kırmızı'),('Mavi'),('Yeşil'),
  ('Sarı'),('Turuncu'),('Mor'),('Pembe'),('Gri'),
  ('Kahverengi'),('Lacivert'),('Bordo'),('Bej')
ON CONFLICT (name) DO NOTHING;
