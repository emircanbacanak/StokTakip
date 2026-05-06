-- =============================================
-- SADECE weight_grams KOLONU EKLE
-- Tam migration çalıştırmak istemeyenler için minimal script
-- =============================================

-- 1. products tablosuna weight_grams ekle
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS weight_grams NUMERIC(10, 2) DEFAULT 0 CHECK (weight_grams >= 0);

-- 2. cost_settings tablosu (maliyet ayarları)
CREATE TABLE IF NOT EXISTS cost_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filament_price_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 650.00,
  filament_enabled BOOLEAN NOT NULL DEFAULT true,
  electricity_cost_per_gram NUMERIC(10, 4) NOT NULL DEFAULT 0.1000,
  electricity_enabled BOOLEAN NOT NULL DEFAULT true,
  waste_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  waste_enabled BOOLEAN NOT NULL DEFAULT true,
  depreciation_cost_per_gram NUMERIC(10, 4) NOT NULL DEFAULT 0.0500,
  depreciation_enabled BOOLEAN NOT NULL DEFAULT true,
  profit_margin_1 NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  profit_margin_2 NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  profit_margin_3 NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
  profit_margin_4 NUMERIC(5, 2) NOT NULL DEFAULT 40.00,
  profit_margin_5 NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  price_rounding_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- 3. Varsayılan ayar satırı ekle
INSERT INTO cost_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 4. RLS
ALTER TABLE cost_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on cost_settings" ON cost_settings;
CREATE POLICY "Allow all on cost_settings" ON cost_settings FOR ALL USING (true) WITH CHECK (true);

-- 5. order_cost_analysis tablosu
CREATE TABLE IF NOT EXISTS order_cost_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  total_items_count INTEGER NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_weight_grams NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_weight_with_waste_grams NUMERIC(12, 2) NOT NULL DEFAULT 0,
  filament_price_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  electricity_cost_per_gram NUMERIC(10, 4) NOT NULL DEFAULT 0,
  waste_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  depreciation_cost_per_gram NUMERIC(10, 4) NOT NULL DEFAULT 0,
  total_filament_cost NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_electricity_cost NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_waste_cost NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_depreciation_cost NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_production_cost NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(12, 4) NOT NULL DEFAULT 0,
  profit_margin_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE order_cost_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on order_cost_analysis" ON order_cost_analysis;
CREATE POLICY "Allow all on order_cost_analysis" ON order_cost_analysis FOR ALL USING (true) WITH CHECK (true);

-- Tamamlandı
DO $$
BEGIN
  RAISE NOTICE 'weight_grams kolonu ve maliyet tabloları başarıyla eklendi!';
END $$;
