-- =============================================
-- FAZLA ÜRETİM İÇİN CONSTRAINT'LERİ KALDIR
-- =============================================

-- Eski constraint'leri kaldır
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS check_delivered_lte_quantity;

ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS check_produced_lte_quantity;

-- Sadece negatif değerleri engelleyen constraint'ler kalsın
-- (Bunlar zaten var: CHECK (produced_quantity >= 0) ve CHECK (delivered_quantity >= 0))

-- Açıklama:
-- Bu migration fazla üretim ve fazla teslimat yapılabilmesini sağlar.
-- Örnek: 100 adet sipariş, 120 adet üretim, 120 adet teslimat yapılabilir.
