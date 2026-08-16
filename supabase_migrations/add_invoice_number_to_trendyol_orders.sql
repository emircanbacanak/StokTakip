-- Trendyol siparişlerine invoice_number kolonu ekle
ALTER TABLE trendyol_orders 
ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_trendyol_orders_invoice_number ON trendyol_orders(invoice_number);

COMMENT ON COLUMN trendyol_orders.invoice_number IS 'Kesilen fatura numarası (varsa)';
