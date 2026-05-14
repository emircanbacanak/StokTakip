-- Senfoni Vazo Gümüş veri tutarsızlığını düzelt
-- Üretilen miktarı teslim edilen kadar yap (15)
UPDATE order_items 
SET produced_quantity = 15 
WHERE id = '5a20ac78-f16a-4815-84dc-0fbd80369650';

-- 09.05.2026 teslimatı için delivery_items kayıtlarını oluştur
-- Önce delivery ID'sini bulalım
SELECT id, delivery_date FROM deliveries 
WHERE delivery_date = '2026-05-09' 
ORDER BY created_at DESC 
LIMIT 1;
