-- Feridun'un 467 adetlik teslimatını yeniden oluştur
-- Order ID: 4dfed966-9ec6-4523-9202-bdaec97e506e
-- Silinen Delivery ID: 8937c931-787d-46a0-9195-0fa72d7c32de

-- 1. Önce yeni delivery kaydı oluştur
INSERT INTO deliveries (id, order_id, delivery_date, notes, created_at)
VALUES (
  '8937c931-787d-46a0-9195-0fa72d7c32de', -- Eski ID'yi kullan
  '4dfed966-9ec6-4523-9202-bdaec97e506e', -- Feridun order_id
  '2026-05-09', -- Tarih (gerekirse değiştir)
  'Yeniden oluşturuldu - 467 adet teslimat',
  NOW()
);

-- 2. Delivery items ekle (delivered_quantity > 0 olanlar)
INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
VALUES
  -- Aura Vazo
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '6883018f-bb4c-4713-b182-f493698372c5', 5),   -- Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'e5e74557-211c-4b6b-8bea-c259b081c7bc', 12),  -- Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '256942d4-cbb3-4240-9a79-02bd2e48ae44', 12),  -- Kahverengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '145cc2ca-8d8a-418a-a504-04780b3d7fed', 8),   -- Mermer
  
  -- Lamina Mumluk
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '4410fdbc-f200-4df8-aa9f-020f0a48ec83', 14),  -- Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '7c03b1d8-f1b9-4d66-8b51-1317d87ba4cc', 12),  -- Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'f2d7c207-074f-4820-a112-18ad65520f31', 13),  -- Pembe
  
  -- Mira Mumluk
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '3904dce1-b292-4355-aa87-7c65397b6724', 12),  -- Altın
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '3f3ff8cf-0ca4-494c-93cf-43bc404cb77a', 12),  -- Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '44236803-0388-4589-a656-8e02d3ae6784', 13),  -- Kahverengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'f156f20c-d283-4a60-9437-06bf5ae17289', 12),  -- Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '4f6f23ea-cb29-4c3c-85a1-a4f4e6ff7f9f', 13),  -- Sedefli Mavi
  
  -- Petra Vazo
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '9ce66a28-9828-4a0d-b240-72fda1bee7b5', 5),   -- Antrasit
  
  -- Senfoni Vazo
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'f1b20572-deac-4fcf-9259-ec1fb083b77d', 15),  -- Bej
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '29ce5d41-7ce6-4301-81ac-ced175245ce5', 14),  -- Gümüş
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '231c4ec1-6064-4b23-aaea-4ffafc090b53', 13),  -- Siyah
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'b4ae58c5-21e6-40fd-b763-42f8b3bfcce8', 17),  -- Vişne Çürüğü
  
  -- Tavşan Mumluk
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '0077c5e4-990e-4996-81af-024bb1b9ded4', 12),  -- Altın
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'aed8b326-c953-40c6-a3e8-e234aa016fb0', 12),  -- Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'e98e5f75-0187-4861-9d1c-db1febf1dd6c', 12),  -- Bej
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '8355b341-abf0-49ff-bf30-341939a70889', 21),  -- Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '5a743f31-a46b-439a-ab22-67e8fe1425ef', 12),  -- Gri
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '9d766fdb-f5d3-4d02-bf2d-048ec4a5e54f', 12),  -- Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '4389e923-8c86-4aa0-891b-1a4126fa7208', 12),  -- Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'e8906d7f-8ecb-458a-8bf6-342c97d85084', 12),  -- Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '87d83d48-95ab-47e7-b016-eb6d05600eaf', 12),  -- Ten Rengi
  
  -- Vero Tutacak
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '15214f33-03c8-45be-82d6-209f00445330', 33);  -- Siyah

-- 3. Kontrol: Toplam adet
SELECT 
  COUNT(*) as kalem_sayisi,
  SUM(quantity) as toplam_adet
FROM delivery_items
WHERE delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de';

-- Beklenen: 27 kalem, 434 adet
-- NOT: 467 değil 434 adet çıkıyor. Eksik 33 adet var.
-- Eğer 467 olması gerekiyorsa, hangi ürünlerden eksik olduğunu belirtmelisin.
