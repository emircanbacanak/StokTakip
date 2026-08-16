-- Orders tablosuna delivered_at tarihi ekle
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Mevcut "delivered" statusundeki siparişler için delivered_at'i created_at olarak ayarla
UPDATE orders 
SET delivered_at = created_at 
WHERE status = 'delivered' AND delivered_at IS NULL;

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_delivered_at ON orders(status, delivered_at);
