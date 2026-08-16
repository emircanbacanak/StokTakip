-- Trendyol siparişlerini saklamak için tablo
CREATE TABLE IF NOT EXISTS trendyol_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id BIGINT,
  customer_first_name TEXT,
  customer_last_name TEXT,
  order_date BIGINT NOT NULL, -- Unix timestamp
  status TEXT NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  total_discount NUMERIC(10, 2) DEFAULT 0,
  tax_number TEXT,
  invoice_address JSONB,
  shipment_address JSONB,
  cargo_tracking_number TEXT,
  cargo_provider_name TEXT,
  delivery_type TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trendyol sipariş kalemlerini saklamak için tablo
CREATE TABLE IF NOT EXISTS trendyol_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trendyol_order_id UUID REFERENCES trendyol_orders(id) ON DELETE CASCADE,
  order_line_id TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_code TEXT,
  merchant_sku TEXT,
  quantity INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0,
  vat_base_amount NUMERIC(10, 2),
  barcode TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trendyol_orders_order_number ON trendyol_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_trendyol_orders_status ON trendyol_orders(status);
CREATE INDEX IF NOT EXISTS idx_trendyol_orders_order_date ON trendyol_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_trendyol_orders_delivered_at ON trendyol_orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_trendyol_order_items_order_id ON trendyol_order_items(trendyol_order_id);
CREATE INDEX IF NOT EXISTS idx_trendyol_order_items_order_line_id ON trendyol_order_items(order_line_id);

-- Trendyol siparişlerini manuel siparişlerle ilişkilendirmek için tablo (opsiyonel)
CREATE TABLE IF NOT EXISTS trendyol_order_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trendyol_order_id UUID REFERENCES trendyol_orders(id) ON DELETE CASCADE,
  local_order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  mapped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trendyol_order_id, local_order_id)
);

-- Trendyol sync log tablosu
CREATE TABLE IF NOT EXISTS trendyol_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'orders', 'products', etc.
  start_date BIGINT,
  end_date BIGINT,
  orders_fetched INTEGER DEFAULT 0,
  orders_created INTEGER DEFAULT 0,
  orders_updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE trendyol_orders IS 'Trendyol''dan gelen siparişleri saklar';
COMMENT ON TABLE trendyol_order_items IS 'Trendyol sipariş kalemlerini saklar';
COMMENT ON TABLE trendyol_order_mapping IS 'Trendyol siparişlerini manuel siparişlerle ilişkilendirir';
COMMENT ON TABLE trendyol_sync_log IS 'Trendyol senkronizasyon loglarını tutar';
