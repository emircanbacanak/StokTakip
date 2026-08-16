-- Trendyol siparişlerine fatura kesildi mi takibi
ALTER TABLE trendyol_orders 
ADD COLUMN IF NOT EXISTS invoiced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_notes TEXT;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_trendyol_orders_invoiced ON trendyol_orders(invoiced);

COMMENT ON COLUMN trendyol_orders.invoiced IS 'Fatura kesildi mi?';
COMMENT ON COLUMN trendyol_orders.invoiced_at IS 'Fatura kesilme tarihi';
COMMENT ON COLUMN trendyol_orders.invoice_notes IS 'Fatura notları';
