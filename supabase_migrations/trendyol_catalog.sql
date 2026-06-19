-- ============================================================
-- Trendyol Ürün Kataloğu Migration
-- Tablolar: categories, product_templates, trendyol_listings
-- ============================================================

-- ─── 1. KATEGORİLER ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  trendyol_cat_id  bigint,          -- Trendyol kategori ID
  vat_rate         numeric(5,2) NOT NULL DEFAULT 10,  -- % KDV oranı
  commission_rate  numeric(5,2) NOT NULL DEFAULT 15,  -- % Trendyol komisyonu
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. ÜRÜN ŞABLONLARı (tekrar kullanılabilir meta-bilgi) ───
CREATE TABLE IF NOT EXISTS product_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid REFERENCES products(id) ON DELETE SET NULL,
  category_id      uuid REFERENCES categories(id) ON DELETE SET NULL,
  vat_rate         numeric(5,2) NOT NULL DEFAULT 10,
  desi             numeric(6,2),        -- kargo desisi
  cargo_company    text,                -- tercih edilen kargo firması
  warranty_months  int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. TRENDYOL LİSTELEMELERİ (asıl iş tablosu) ────────────
CREATE TABLE IF NOT EXISTS trendyol_listings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ürün Kimliği
  product_id         uuid REFERENCES products(id) ON DELETE SET NULL,
  category_id        uuid REFERENCES categories(id) ON DELETE SET NULL,
  template_id        uuid REFERENCES product_templates(id) ON DELETE SET NULL,

  -- Trendyol Alanları
  title              text NOT NULL,
  description        text NOT NULL,        -- sistem daima "Toptan sipariş vermeyin." önekini ekler
  barcode            text UNIQUE NOT NULL, -- otonom üretilir, çakışmaz
  stock_code         text UNIQUE NOT NULL, -- satıcı stok kodu (SKU)
  brand_name         text NOT NULL DEFAULT 'Yok',

  -- Fiyat & Stok
  list_price         numeric(10,2) NOT NULL,   -- liste (piyasa) fiyatı
  sale_price         numeric(10,2) NOT NULL,   -- satış fiyatı
  vat_rate           numeric(5,2) NOT NULL DEFAULT 10,
  quantity           int NOT NULL DEFAULT 1,

  -- Görsel URL'leri (Trendyol max 8 görsel)
  image_urls         text[] NOT NULL DEFAULT '{}',

  -- Kargo
  cargo_company      text,
  desi               numeric(6,2),
  warranty_months    int NOT NULL DEFAULT 0,

  -- Trendyol Durumu
  trendyol_status    text NOT NULL DEFAULT 'draft'
                       CHECK (trendyol_status IN ('draft','pending','approved','rejected','passive')),
  trendyol_product_id text,              -- Trendyol'un atadığı ID (onaydan sonra gelir)
  rejection_reason   text,

  -- Toplu Yükleme İzleme
  batch_id           text,               -- ExcelUpload batch kimliği
  submitted_at       timestamptz,
  approved_at        timestamptz,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. İNDEKSLER ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trendyol_listings_status   ON trendyol_listings(trendyol_status);
CREATE INDEX IF NOT EXISTS idx_trendyol_listings_product  ON trendyol_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_trendyol_listings_barcode  ON trendyol_listings(barcode);
CREATE INDEX IF NOT EXISTS idx_trendyol_listings_batch    ON trendyol_listings(batch_id);
CREATE INDEX IF NOT EXISTS idx_product_templates_product  ON product_templates(product_id);

-- ─── 5. UPDATED_AT TETİKLEYİCİLER ────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trendyol_listings_updated_at ON trendyol_listings;
CREATE TRIGGER trg_trendyol_listings_updated_at
  BEFORE UPDATE ON trendyol_listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_product_templates_updated_at ON product_templates;
CREATE TRIGGER trg_product_templates_updated_at
  BEFORE UPDATE ON product_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 6. AÇIKLAMA ZORUNLU KURAL TETİKLEYİCİSİ ─────────────────
-- "Toptan sipariş vermeyin." ibaresi her zaman başa eklenir.
CREATE OR REPLACE FUNCTION enforce_description_prefix()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prefix text := 'Toptan sipariş vermeyin. ';
BEGIN
  -- Boşluk/satır başı dahil prefix olmayan her durumda ekle
  IF NEW.description IS NULL OR NEW.description = '' THEN
    NEW.description := prefix;
  ELSIF position(prefix IN NEW.description) <> 1 THEN
    -- Kullanıcı silmiş veya hiç eklememiş → başa ekle
    NEW.description := prefix || NEW.description;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_description_prefix ON trendyol_listings;
CREATE TRIGGER trg_enforce_description_prefix
  BEFORE INSERT OR UPDATE ON trendyol_listings
  FOR EACH ROW EXECUTE FUNCTION enforce_description_prefix();

-- ─── 7. ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trendyol_listings  ENABLE ROW LEVEL SECURITY;

-- Geniş erişim (tek kullanıcı / küçük ekip için) — gerekirse kısıtla
CREATE POLICY "allow_all_categories"        ON categories        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_product_templates" ON product_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_trendyol_listings" ON trendyol_listings FOR ALL USING (true) WITH CHECK (true);

-- ─── 8. ÖRNEK KATEGORİLER ─────────────────────────────────────
INSERT INTO categories (name, vat_rate, commission_rate) VALUES
  ('Ev Dekorasyon',     10, 15),
  ('Mutfak Gereçleri',  10, 15),
  ('Ofis & Kırtasiye',  10, 15),
  ('Oyuncak & Hobi',    20, 18),
  ('Kişisel Bakım',     10, 15),
  ('Anahtarlık',        20, 15)
ON CONFLICT DO NOTHING;
