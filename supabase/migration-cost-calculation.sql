-- =============================================
-- ÜRÜN MALİYET HESAPLAMA SİSTEMİ - VERİTABANI MİGRASYONU
-- Ürün gramajı, maliyet ayarları ve hesaplama sistemi
-- =============================================

-- =============================================
-- 1. PRODUCTS TABLOSUNA GRAMAJ ALANI EKLE
-- =============================================

-- Ürün gramajı alanı ekle (gram cinsinden)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS weight_grams NUMERIC(10, 2) DEFAULT 0 CHECK (weight_grams >= 0);

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_products_weight ON products(weight_grams);

COMMENT ON COLUMN products.weight_grams IS 'Ürünün gramaj bilgisi (gram cinsinden)';

-- =============================================
-- 2. MALİYET AYARLARI TABLOSU
-- =============================================

-- Maliyet hesaplama ayarları tablosu (tek satırlık global ayarlar)
CREATE TABLE IF NOT EXISTS cost_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Filament fiyatı (TL/kg)
  filament_price_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 650.00 CHECK (filament_price_per_kg >= 0),
  filament_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Elektrik maliyeti (TL/gram)
  electricity_cost_per_gram NUMERIC(10, 4) NOT NULL DEFAULT 0.1000 CHECK (electricity_cost_per_gram >= 0),
  electricity_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Fire oranı (yüzde)
  waste_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (waste_percentage >= 0 AND waste_percentage <= 100),
  waste_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Yıpranma maliyeti (TL/gram)
  depreciation_cost_per_gram NUMERIC(10, 4) NOT NULL DEFAULT 0.0500 CHECK (depreciation_cost_per_gram >= 0),
  depreciation_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Kar marjları (yüzde)
  profit_margin_1 NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (profit_margin_1 >= 0),
  profit_margin_2 NUMERIC(5, 2) NOT NULL DEFAULT 20.00 CHECK (profit_margin_2 >= 0),
  profit_margin_3 NUMERIC(5, 2) NOT NULL DEFAULT 30.00 CHECK (profit_margin_3 >= 0),
  profit_margin_4 NUMERIC(5, 2) NOT NULL DEFAULT 40.00 CHECK (profit_margin_4 >= 0),
  profit_margin_5 NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (profit_margin_5 >= 0),
  
  -- Fiyat yuvarlama (0 veya 5'e yuvarla)
  price_rounding_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- İlk ayarları ekle (varsayılan değerlerle)
INSERT INTO cost_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- RLS politikaları
ALTER TABLE cost_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on cost_settings" ON cost_settings;
CREATE POLICY "Allow all on cost_settings" ON cost_settings FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE cost_settings IS 'Ürün maliyet hesaplama için global ayarlar (tek satır)';

-- =============================================
-- 3. ÜRÜN MALİYET HESAPLAMALARI TABLOSU
-- =============================================

-- Ürün bazlı maliyet hesaplamaları (cache/snapshot)
CREATE TABLE IF NOT EXISTS product_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Ürün bilgileri (snapshot)
  product_name TEXT NOT NULL,
  weight_grams NUMERIC(10, 2) NOT NULL,
  
  -- Maliyet ayarları (snapshot - hesaplama anındaki değerler)
  filament_price_per_kg NUMERIC(10, 2) NOT NULL,
  electricity_cost_per_gram NUMERIC(10, 4) NOT NULL,
  waste_percentage NUMERIC(5, 2) NOT NULL,
  depreciation_cost_per_gram NUMERIC(10, 4) NOT NULL,
  
  -- Hesaplanan maliyetler (TL)
  raw_filament_cost NUMERIC(10, 4) NOT NULL, -- Saf filament gideri
  electricity_cost NUMERIC(10, 4) NOT NULL, -- Elektrik maliyeti
  waste_cost NUMERIC(10, 4) NOT NULL, -- Fire maliyeti
  depreciation_cost NUMERIC(10, 4) NOT NULL, -- Yıpranma maliyeti
  total_cost NUMERIC(10, 4) NOT NULL, -- Toplam maliyet
  
  -- Fire ile birlikte gramaj
  weight_with_waste_grams NUMERIC(10, 2) NOT NULL,
  
  -- Önerilen satış fiyatları (kar marjlı)
  suggested_price_10 NUMERIC(10, 2) NOT NULL, -- %10 kar
  suggested_price_20 NUMERIC(10, 2) NOT NULL, -- %20 kar
  suggested_price_30 NUMERIC(10, 2) NOT NULL, -- %30 kar
  suggested_price_40 NUMERIC(10, 2) NOT NULL, -- %40 kar
  suggested_price_50 NUMERIC(10, 2) NOT NULL, -- %50 kar
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_product_costs_product_id ON product_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_costs_active ON product_costs(is_active);
CREATE INDEX IF NOT EXISTS idx_product_costs_calculated_at ON product_costs(calculated_at DESC);

-- RLS politikaları
ALTER TABLE product_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on product_costs" ON product_costs;
CREATE POLICY "Allow all on product_costs" ON product_costs FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE product_costs IS 'Ürün bazlı maliyet hesaplamaları ve önerilen satış fiyatları';

-- =============================================
-- 4. SİPARİŞ MALİYET ANALİZİ TABLOSU
-- =============================================

-- Sipariş bazlı gerçek maliyet analizi
CREATE TABLE IF NOT EXISTS order_cost_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Sipariş bilgileri
  buyer_name TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  
  -- Toplam üretim miktarları
  total_items_count INTEGER NOT NULL, -- Toplam kalem sayısı
  total_quantity INTEGER NOT NULL, -- Toplam adet
  total_weight_grams NUMERIC(12, 2) NOT NULL, -- Toplam ham gramaj
  total_weight_with_waste_grams NUMERIC(12, 2) NOT NULL, -- Fire dahil gramaj
  
  -- Maliyet ayarları (snapshot)
  filament_price_per_kg NUMERIC(10, 2) NOT NULL,
  electricity_cost_per_gram NUMERIC(10, 4) NOT NULL,
  waste_percentage NUMERIC(5, 2) NOT NULL,
  depreciation_cost_per_gram NUMERIC(10, 4) NOT NULL,
  
  -- Toplam maliyetler (TL)
  total_filament_cost NUMERIC(12, 4) NOT NULL,
  total_electricity_cost NUMERIC(12, 4) NOT NULL,
  total_waste_cost NUMERIC(12, 4) NOT NULL,
  total_depreciation_cost NUMERIC(12, 4) NOT NULL,
  total_production_cost NUMERIC(12, 4) NOT NULL, -- Toplam üretim maliyeti
  
  -- Gelir analizi
  total_revenue NUMERIC(12, 2) NOT NULL, -- Toplam gelir (satış fiyatı)
  total_profit NUMERIC(12, 4) NOT NULL, -- Kar (gelir - maliyet)
  profit_margin_percentage NUMERIC(5, 2) NOT NULL, -- Kar marjı %
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_order_cost_analysis_order_id ON order_cost_analysis(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cost_analysis_date ON order_cost_analysis(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_cost_analysis_calculated_at ON order_cost_analysis(calculated_at DESC);

-- RLS politikaları
ALTER TABLE order_cost_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on order_cost_analysis" ON order_cost_analysis;
CREATE POLICY "Allow all on order_cost_analysis" ON order_cost_analysis FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE order_cost_analysis IS 'Sipariş bazlı gerçek maliyet ve kar analizi';

-- =============================================
-- 5. YARDIMCI FONKSİYONLAR
-- =============================================

-- Fiyat yuvarlama fonksiyonu (0 veya 5'e yuvarla)
CREATE OR REPLACE FUNCTION round_to_nearest_5(price NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  rounded_price NUMERIC;
BEGIN
  -- Önce en yakın tam sayıya yuvarla
  rounded_price := ROUND(price);
  
  -- Son basamağı kontrol et
  IF (rounded_price::INTEGER % 10) IN (1, 2) THEN
    rounded_price := FLOOR(rounded_price / 10) * 10;
  ELSIF (rounded_price::INTEGER % 10) IN (3, 4, 6, 7) THEN
    rounded_price := FLOOR(rounded_price / 10) * 10 + 5;
  ELSIF (rounded_price::INTEGER % 10) IN (8, 9) THEN
    rounded_price := CEIL(rounded_price / 10) * 10;
  END IF;
  
  RETURN rounded_price;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION round_to_nearest_5 IS 'Fiyatı 0 veya 5 ile biten en yakın sayıya yuvarlar';

-- Ürün maliyeti hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION calculate_product_cost(
  p_product_id UUID,
  p_weight_grams NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  raw_filament_cost NUMERIC,
  electricity_cost NUMERIC,
  waste_cost NUMERIC,
  depreciation_cost NUMERIC,
  total_cost NUMERIC,
  weight_with_waste_grams NUMERIC,
  suggested_price_10 NUMERIC,
  suggested_price_20 NUMERIC,
  suggested_price_30 NUMERIC,
  suggested_price_40 NUMERIC,
  suggested_price_50 NUMERIC
) AS $$
DECLARE
  v_weight NUMERIC;
  v_settings RECORD;
  v_weight_with_waste NUMERIC;
  v_raw_filament NUMERIC;
  v_electricity NUMERIC;
  v_waste NUMERIC;
  v_depreciation NUMERIC;
  v_total NUMERIC;
  v_price_10 NUMERIC;
  v_price_20 NUMERIC;
  v_price_30 NUMERIC;
  v_price_40 NUMERIC;
  v_price_50 NUMERIC;
BEGIN
  -- Ürün gramajını al
  IF p_weight_grams IS NULL THEN
    SELECT products.weight_grams INTO v_weight
    FROM products
    WHERE id = p_product_id;
  ELSE
    v_weight := p_weight_grams;
  END IF;
  
  -- Ayarları al
  SELECT * INTO v_settings
  FROM cost_settings
  LIMIT 1;
  
  -- Fire dahil gramaj hesapla
  IF v_settings.waste_enabled THEN
    v_weight_with_waste := v_weight * (1 + v_settings.waste_percentage / 100);
  ELSE
    v_weight_with_waste := v_weight;
  END IF;
  
  -- Saf filament maliyeti: fire dahil gramaj üzerinden (gerçekte bu kadar harcanıyor)
  IF v_settings.filament_enabled THEN
    v_raw_filament := (v_weight_with_waste / 1000) * v_settings.filament_price_per_kg;
  ELSE
    v_raw_filament := 0;
  END IF;
  
  -- Elektrik maliyeti: fire dahil gramaj üzerinden
  IF v_settings.electricity_enabled THEN
    v_electricity := v_weight_with_waste * v_settings.electricity_cost_per_gram;
  ELSE
    v_electricity := 0;
  END IF;
  
  -- Yıpranma maliyeti: fire dahil gramaj üzerinden
  IF v_settings.depreciation_enabled THEN
    v_depreciation := v_weight_with_waste * v_settings.depreciation_cost_per_gram;
  ELSE
    v_depreciation := 0;
  END IF;
  
  -- Toplam maliyet (fire ayrı kalem değil, filament içinde)
  v_total := v_raw_filament + v_electricity + v_depreciation;
  
  -- Önerilen satış fiyatları (kar marjlı)
  v_price_10 := v_total * (1 + v_settings.profit_margin_1 / 100);
  v_price_20 := v_total * (1 + v_settings.profit_margin_2 / 100);
  v_price_30 := v_total * (1 + v_settings.profit_margin_3 / 100);
  v_price_40 := v_total * (1 + v_settings.profit_margin_4 / 100);
  v_price_50 := v_total * (1 + v_settings.profit_margin_5 / 100);
  
  -- Fiyat yuvarlama
  IF v_settings.price_rounding_enabled THEN
    v_price_10 := round_to_nearest_5(v_price_10);
    v_price_20 := round_to_nearest_5(v_price_20);
    v_price_30 := round_to_nearest_5(v_price_30);
    v_price_40 := round_to_nearest_5(v_price_40);
    v_price_50 := round_to_nearest_5(v_price_50);
  END IF;
  
  -- Sonuçları döndür
  RETURN QUERY SELECT 
    v_raw_filament,
    v_electricity,
    v_waste,
    v_depreciation,
    v_total,
    v_weight_with_waste,
    v_price_10,
    v_price_20,
    v_price_30,
    v_price_40,
    v_price_50;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_product_cost IS 'Ürün maliyetini ve önerilen satış fiyatlarını hesaplar';

-- Sipariş maliyet analizi hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION calculate_order_cost_analysis(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_analysis_id UUID;
  v_order RECORD;
  v_settings RECORD;
  v_total_weight NUMERIC := 0;
  v_total_weight_with_waste NUMERIC := 0;
  v_total_filament NUMERIC := 0;
  v_total_electricity NUMERIC := 0;
  v_total_waste NUMERIC := 0;
  v_total_depreciation NUMERIC := 0;
  v_total_cost NUMERIC := 0;
  v_total_revenue NUMERIC := 0;
  v_item RECORD;
  v_product_weight NUMERIC;
  v_item_weight NUMERIC;
  v_item_weight_with_waste NUMERIC;
BEGIN
  -- Sipariş bilgilerini al
  SELECT 
    o.id,
    o.created_at,
    o.total_amount,
    b.name as buyer_name,
    COUNT(oi.id) as items_count,
    SUM(oi.quantity) as total_quantity
  INTO v_order
  FROM orders o
  JOIN buyers b ON b.id = o.buyer_id
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.id = p_order_id
  GROUP BY o.id, o.created_at, o.total_amount, b.name;
  
  -- Ayarları al
  SELECT * INTO v_settings FROM cost_settings LIMIT 1;
  
  -- Her sipariş kalemi için maliyet hesapla
  FOR v_item IN 
    SELECT 
      oi.id,
      oi.product_name,
      oi.quantity,
      p.weight_grams
    FROM order_items oi
    LEFT JOIN products p ON p.name = oi.product_name
    WHERE oi.order_id = p_order_id
  LOOP
    -- Ürün gramajını al (yoksa 0)
    v_product_weight := COALESCE(v_item.weight_grams, 0);
    
    -- Kalem toplam gramajı
    v_item_weight := v_product_weight * v_item.quantity;
    
    -- Fire dahil gramaj
    IF v_settings.waste_enabled THEN
      v_item_weight_with_waste := v_item_weight * (1 + v_settings.waste_percentage / 100);
    ELSE
      v_item_weight_with_waste := v_item_weight;
    END IF;
    
    -- Toplam gramajları güncelle
    v_total_weight := v_total_weight + v_item_weight;
    v_total_weight_with_waste := v_total_weight_with_waste + v_item_weight_with_waste;
    
    -- Filament maliyeti: fire dahil gramaj üzerinden (gerçekte bu kadar harcanıyor)
    IF v_settings.filament_enabled THEN
      v_total_filament := v_total_filament + ((v_item_weight_with_waste / 1000) * v_settings.filament_price_per_kg);
    END IF;
    
    -- Elektrik maliyeti: fire dahil gramaj üzerinden
    IF v_settings.electricity_enabled THEN
      v_total_electricity := v_total_electricity + (v_item_weight_with_waste * v_settings.electricity_cost_per_gram);
    END IF;
    
    -- Yıpranma maliyeti: fire dahil gramaj üzerinden
    IF v_settings.depreciation_enabled THEN
      v_total_depreciation := v_total_depreciation + (v_item_weight_with_waste * v_settings.depreciation_cost_per_gram);
    END IF;
  END LOOP;
  
  -- Toplam maliyet
  v_total_cost := v_total_filament + v_total_electricity + v_total_waste + v_total_depreciation;
  
  -- Toplam gelir
  v_total_revenue := v_order.total_amount;
  
  -- Analizi kaydet
  INSERT INTO order_cost_analysis (
    order_id,
    buyer_name,
    order_date,
    total_items_count,
    total_quantity,
    total_weight_grams,
    total_weight_with_waste_grams,
    filament_price_per_kg,
    electricity_cost_per_gram,
    waste_percentage,
    depreciation_cost_per_gram,
    total_filament_cost,
    total_electricity_cost,
    total_waste_cost,
    total_depreciation_cost,
    total_production_cost,
    total_revenue,
    total_profit,
    profit_margin_percentage
  ) VALUES (
    p_order_id,
    v_order.buyer_name,
    v_order.created_at,
    v_order.items_count,
    v_order.total_quantity,
    v_total_weight,
    v_total_weight_with_waste,
    v_settings.filament_price_per_kg,
    v_settings.electricity_cost_per_gram,
    v_settings.waste_percentage,
    v_settings.depreciation_cost_per_gram,
    v_total_filament,
    v_total_electricity,
    v_total_waste,
    v_total_depreciation,
    v_total_cost,
    v_total_revenue,
    v_total_revenue - v_total_cost,
    CASE WHEN v_total_revenue > 0 THEN ((v_total_revenue - v_total_cost) / v_total_revenue * 100) ELSE 0 END
  )
  RETURNING id INTO v_analysis_id;
  
  RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_order_cost_analysis IS 'Sipariş için maliyet analizi hesaplar ve kaydeder';

-- =============================================
-- 6. TRİGGERLAR
-- =============================================

-- Ürün gramajı değiştiğinde maliyet hesaplamalarını güncelle
CREATE OR REPLACE FUNCTION trigger_recalculate_product_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Eski hesaplamaları pasif yap
  UPDATE product_costs
  SET is_active = false
  WHERE product_id = NEW.id AND is_active = true;
  
  -- Yeni hesaplama yap (eğer gramaj > 0 ise)
  IF NEW.weight_grams > 0 THEN
    INSERT INTO product_costs (
      product_id,
      product_name,
      weight_grams,
      filament_price_per_kg,
      electricity_cost_per_gram,
      waste_percentage,
      depreciation_cost_per_gram,
      raw_filament_cost,
      electricity_cost,
      waste_cost,
      depreciation_cost,
      total_cost,
      weight_with_waste_grams,
      suggested_price_10,
      suggested_price_20,
      suggested_price_30,
      suggested_price_40,
      suggested_price_50
    )
    SELECT 
      NEW.id,
      NEW.name,
      NEW.weight_grams,
      cs.filament_price_per_kg,
      cs.electricity_cost_per_gram,
      cs.waste_percentage,
      cs.depreciation_cost_per_gram,
      calc.raw_filament_cost,
      calc.electricity_cost,
      calc.waste_cost,
      calc.depreciation_cost,
      calc.total_cost,
      calc.weight_with_waste_grams,
      calc.suggested_price_10,
      calc.suggested_price_20,
      calc.suggested_price_30,
      calc.suggested_price_40,
      calc.suggested_price_50
    FROM cost_settings cs,
    LATERAL calculate_product_cost(NEW.id, NEW.weight_grams) calc
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı iki ayrı trigger olarak oluştur (INSERT ve UPDATE için)
DROP TRIGGER IF EXISTS trigger_product_weight_insert ON products;
CREATE TRIGGER trigger_product_weight_insert
AFTER INSERT ON products
FOR EACH ROW
WHEN (NEW.weight_grams > 0)
EXECUTE FUNCTION trigger_recalculate_product_cost();

DROP TRIGGER IF EXISTS trigger_product_weight_update ON products;
CREATE TRIGGER trigger_product_weight_update
AFTER UPDATE OF weight_grams ON products
FOR EACH ROW
WHEN (NEW.weight_grams IS DISTINCT FROM OLD.weight_grams)
EXECUTE FUNCTION trigger_recalculate_product_cost();

COMMENT ON TRIGGER trigger_product_weight_insert ON products IS 'Yeni ürün eklendiğinde maliyet hesaplamalarını otomatik oluşturur';
COMMENT ON TRIGGER trigger_product_weight_update ON products IS 'Ürün gramajı değiştiğinde maliyet hesaplamalarını otomatik günceller';

-- =============================================
-- 7. BAŞLANGIÇ VERİLERİ
-- =============================================

-- NOT: Ürün gramajları kullanıcı tarafından manuel olarak girilmelidir.
-- Varsayılan değer 0'dır ve maliyet hesaplaması yapılmaz.
-- Her ürün için gerçek gramajı ölçüp girmeniz gerekmektedir.

-- Örnek: Bir ürünün gramajını güncellemek için:
-- UPDATE products SET weight_grams = 40 WHERE name = 'Ürün Adı';

-- =============================================
-- MİGRASYON TAMAMLANDI
-- =============================================

-- Başarı mesajı
DO $$
BEGIN
  RAISE NOTICE 'Ürün maliyet hesaplama sistemi başarıyla kuruldu!';
  RAISE NOTICE '1. cost_settings tablosu oluşturuldu (varsayılan ayarlarla)';
  RAISE NOTICE '2. products tablosuna weight_grams alanı eklendi';
  RAISE NOTICE '3. product_costs tablosu oluşturuldu';
  RAISE NOTICE '4. order_cost_analysis tablosu oluşturuldu';
  RAISE NOTICE '5. Maliyet hesaplama fonksiyonları eklendi';
  RAISE NOTICE '6. Otomatik güncelleme trigger''ları eklendi';
END $$;
