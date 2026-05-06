-- =============================================
-- product_costs trigger düzeltmesi
-- waste_cost NOT NULL hatası için
-- =============================================

-- 1. Eski trigger'ları kaldır
DROP TRIGGER IF EXISTS trigger_product_weight_insert ON products;
DROP TRIGGER IF EXISTS trigger_product_weight_update ON products;
DROP TRIGGER IF EXISTS trigger_product_weight_change ON products;

-- 2. product_costs tablosu varsa waste_cost kolonuna DEFAULT 0 ekle
ALTER TABLE IF EXISTS product_costs 
  ALTER COLUMN waste_cost SET DEFAULT 0;

-- 3. Trigger fonksiyonunu güncelle (waste_cost = 0 olarak)
CREATE OR REPLACE FUNCTION trigger_recalculate_product_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
  v_weight_with_waste NUMERIC;
  v_raw_filament NUMERIC;
  v_electricity NUMERIC;
  v_depreciation NUMERIC;
  v_total NUMERIC;
  v_price_10 NUMERIC;
  v_price_20 NUMERIC;
  v_price_30 NUMERIC;
  v_price_40 NUMERIC;
  v_price_50 NUMERIC;
BEGIN
  -- Eski hesaplamaları pasif yap
  UPDATE product_costs
  SET is_active = false
  WHERE product_id = NEW.id AND is_active = true;

  -- Gramaj 0 ise hesaplama yapma
  IF NEW.weight_grams IS NULL OR NEW.weight_grams <= 0 THEN
    RETURN NEW;
  END IF;

  -- Ayarları al
  SELECT * INTO v_settings FROM cost_settings LIMIT 1;
  
  -- Ayar yoksa çık
  IF v_settings IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fire dahil gramaj
  IF v_settings.waste_enabled THEN
    v_weight_with_waste := NEW.weight_grams * (1 + v_settings.waste_percentage / 100);
  ELSE
    v_weight_with_waste := NEW.weight_grams;
  END IF;

  -- Filament maliyeti (fire dahil gramaj üzerinden)
  IF v_settings.filament_enabled THEN
    v_raw_filament := (v_weight_with_waste / 1000) * v_settings.filament_price_per_kg;
  ELSE
    v_raw_filament := 0;
  END IF;

  -- Elektrik maliyeti
  IF v_settings.electricity_enabled THEN
    v_electricity := v_weight_with_waste * v_settings.electricity_cost_per_gram;
  ELSE
    v_electricity := 0;
  END IF;

  -- Yıpranma maliyeti
  IF v_settings.depreciation_enabled THEN
    v_depreciation := v_weight_with_waste * v_settings.depreciation_cost_per_gram;
  ELSE
    v_depreciation := 0;
  END IF;

  -- Toplam maliyet
  v_total := v_raw_filament + v_electricity + v_depreciation;

  -- Önerilen fiyatlar
  v_price_10 := v_total * (1 + v_settings.profit_margin_1 / 100);
  v_price_20 := v_total * (1 + v_settings.profit_margin_2 / 100);
  v_price_30 := v_total * (1 + v_settings.profit_margin_3 / 100);
  v_price_40 := v_total * (1 + v_settings.profit_margin_4 / 100);
  v_price_50 := v_total * (1 + v_settings.profit_margin_5 / 100);

  -- Yeni hesaplama kaydet
  INSERT INTO product_costs (
    product_id, product_name, weight_grams,
    filament_price_per_kg, electricity_cost_per_gram,
    waste_percentage, depreciation_cost_per_gram,
    raw_filament_cost, electricity_cost,
    waste_cost, depreciation_cost, total_cost,
    weight_with_waste_grams,
    suggested_price_10, suggested_price_20, suggested_price_30,
    suggested_price_40, suggested_price_50,
    is_active
  ) VALUES (
    NEW.id, NEW.name, NEW.weight_grams,
    v_settings.filament_price_per_kg, v_settings.electricity_cost_per_gram,
    v_settings.waste_percentage, v_settings.depreciation_cost_per_gram,
    v_raw_filament, v_electricity,
    0, v_depreciation, v_total,
    v_weight_with_waste,
    v_price_10, v_price_20, v_price_30,
    v_price_40, v_price_50,
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger'ları yeniden oluştur
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

DO $$
BEGIN
  RAISE NOTICE 'Trigger düzeltildi! Artık gramaj güncellemesi çalışacak.';
END $$;
