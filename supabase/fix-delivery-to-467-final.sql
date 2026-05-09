-- ============================================
-- TESLİMAT DÜZELTME: 467 ADET (İLK TESLİMAT)
-- ============================================
-- Teslimat ID: 8937c931-787d-46a0-9195-0fa72d7c32de
-- Teslimat Tarihi: 30.04.2026
--
-- TOPLAM: 467 ADET
-- Tavşan Mumluk: 117 adet (9 renk)
-- Mira Mumluk: 80 adet (8 renk)
-- Aura Vazo: 50 adet (8 renk - Bej 5 adet dahil)
-- Petra Vazo: 20 adet (3 renk)
-- Vero Tutacak: 70 adet (3 renk)
-- Lamina Mumluk: 50 adet (7 renk)
-- Senfoni Vazo: 80 adet (8 renk)
-- ============================================

-- 1. Mevcut delivery_items kayıtlarını sil
DELETE FROM delivery_items 
WHERE delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de';

-- 2. İlk teslimat için doğru miktarları ekle (467 adet)
INSERT INTO delivery_items (delivery_id, order_item_id, quantity)
VALUES
  -- Tavşan Mumluk (117 adet - 9 renk)
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'f5aacbc0-97ce-4eab-8cc6-f57866e50fd2', 12), -- Altın
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '48285fdd-506d-4120-bb8b-3ea2d644d7f5', 12), -- Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '3a640c44-992e-43c9-b926-f567e945c6f7', 12), -- Bej
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '5b41a029-0e80-42ce-9499-1beefbb9203b', 21), -- Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'f038ca00-f60f-4b4e-9982-ebd71cf9f3d5', 12), -- Gri
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '8a1a9b0e-5efb-482b-9b19-a0a2e0008dee', 12), -- Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '88b945b3-2c6b-4099-b736-3b4677951ab2', 12), -- Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '69a14079-8932-44e6-ac02-5c3e1a6a30df', 12), -- Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'a20d66ca-663b-4c15-aad5-9202a91e0b7e', 12), -- Ten Rengi
  
  -- Mira Mumluk (80 adet - 8 renk)
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '9ae714b7-7636-45c6-a4d2-9da3f243d4a6', 12), -- Altın
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'd28550a0-221c-4335-b0ba-96c1e79429b5', 12), -- Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '2321427d-f341-4a06-a13c-a053e1a41c6f', 7),  -- Gri
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '533cb232-cede-4549-a4b4-574023cf2940', 2),  -- Gümüş
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '0ed6c20d-fa5b-4d69-821d-de9e8d1cb703', 9),  -- Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '95064121-3464-413d-b56e-323579f28bcf', 13), -- Kahverengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '56debb3c-1d97-4f8a-bbef-44e5b1f90d25', 12), -- Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '36acbbc4-c164-4ba2-becf-0c5a24880801', 13), -- Sedefli Mavi
  
  -- Aura Vazo (50 adet - 8 renk, Bej 5 adet dahil)
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'e80b0035-b4ae-47ec-8123-23d274e49a68', 5),  -- Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '6d42d617-4b1d-4bfd-9fe7-294adb631f13', 5),  -- Bej (bu ID kullanılacak)
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '38afe525-30ec-4ea2-8bb3-eefade75bfb3', 6),  -- Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '84980ce9-e29d-4c2a-8a9a-2a2a3a543ec8', 12), -- Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'b92a7fb6-1b82-4b51-b829-2ded1cf7731c', 12), -- Kahverengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '600a9f14-0cc7-489b-a06e-0b203851033f', 8),  -- Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'd6b326b6-a1ac-418b-a0b3-79951ec93dae', 2),  -- Sedefli Mavi
  
  -- Petra Vazo (20 adet - 3 renk)
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '25068a6b-2670-4278-9496-e5d88b5b286f', 5),  -- Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '40ecf0d3-073d-4e40-b458-04efb158399d', 6),  -- Bej
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '3b73d2b0-46e6-4924-8c9a-3eed4b126b36', 9),  -- Beyaz
  
  -- Vero Tutacak (70 adet - 3 renk)
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'f7f9b8fe-6ca8-4316-91d5-5cf45b9b4a24', 18), -- Kırmızı
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'b5c88b04-5a6f-4d82-908b-a9051a715466', 19), -- Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '851575d7-7f9d-4ddc-8459-82cd840123c0', 33), -- Siyah
  
  -- Lamina Mumluk (50 adet - 7 renk)
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '8f036f76-5cf0-4b9b-b774-3221370aabd1', 5),  -- Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '8e254ae0-defc-4492-8e66-664f0e69fb70', 3),  -- Siyah
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'e6d6c703-6aa7-411b-a50d-a5567d40bb71', 13), -- Pembe
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'a72c22d1-4e92-48cf-8b9f-4e884a0da5b6', 14), -- Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '14d5cb30-137a-4be0-adab-a7f29ed0b1cf', 12), -- Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '1e81ddbb-264d-480e-8d1f-bed84247cc58', 2),  -- Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '4823a751-c00f-4f8a-a944-96f8dbb72fc4', 1),  -- Kahverengi
  
  -- Senfoni Vazo (80 adet - 8 renk)
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'd62c6421-6359-43e9-8a72-00f58d005629', 10), -- Kahverengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '24f8077b-d84a-4eb2-ab1d-a15b12e24ad7', 3),  -- Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '0c210ba7-539c-4805-9423-5735bb62ff17', 3),  -- Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '99afb5f2-8ac4-4a05-b0df-fb9db82c6ee9', 17), -- Vişne Çürüğü
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '2dd1c764-a3af-4122-8933-37bdad9c8fec', 14), -- Gümüş
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '2012889b-95a1-4243-b13b-35c8f3d74f77', 13), -- Siyah
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'a74348c7-f71a-4be5-b0c1-c7dc886e781d', 15), -- Bej
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '5698e7af-518d-4f10-a936-77fc750d8bed', 5);  -- Sedefli Mavi

-- ============================================
-- KONTROL SORULARI
-- ============================================

-- Teslimat toplamı (467 olmalı)
SELECT 
  'Teslimat Toplamı' as aciklama,
  COUNT(*) as kayit_sayisi, 
  SUM(quantity) as toplam_adet 
FROM delivery_items 
WHERE delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de';

-- Ürün bazında özet
SELECT 
  oi.product_name,
  COUNT(*) as renk_sayisi,
  SUM(di.quantity) as toplam_adet,
  SUM(di.quantity * oi.unit_price) as toplam_tutar
FROM delivery_items di
JOIN order_items oi ON di.order_item_id = oi.id
WHERE di.delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de'
GROUP BY oi.product_name
ORDER BY oi.product_name;

-- Teslimatdan sonra üretilmiş ürünler (238 civarı olmalı)
SELECT 
  'Teslimatdan Sonra Üretilmiş' as aciklama,
  SUM(oi.produced_quantity - COALESCE(oi.delivered_quantity, 0)) as adet
FROM order_items oi
WHERE oi.order_id = (
  SELECT order_id FROM deliveries WHERE id = '8937c931-787d-46a0-9195-0fa72d7c32de'
);

-- Detaylı liste (opsiyonel)
SELECT 
  oi.product_name,
  oi.color,
  di.quantity as teslim_edilen,
  oi.unit_price,
  (di.quantity * oi.unit_price) as tutar
FROM delivery_items di
JOIN order_items oi ON di.order_item_id = oi.id
WHERE di.delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de'
ORDER BY oi.product_name, oi.color;

-- ============================================
-- KONTROL SORULARI
-- ============================================

-- Teslimat toplamı (467 olmalı)
SELECT 
  'Teslimat Toplamı' as aciklama,
  COUNT(*) as kayit_sayisi, 
  SUM(quantity) as toplam_adet 
FROM delivery_items 
WHERE delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de';

-- Ürün bazında detay
SELECT 
  oi.product_name,
  oi.color,
  di.quantity as teslim_edilen,
  oi.unit_price,
  (di.quantity * oi.unit_price) as tutar
FROM delivery_items di
JOIN order_items oi ON di.order_item_id = oi.id
WHERE di.delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de'
ORDER BY oi.product_name, oi.color;

-- Ürün bazında özet (toplam kontrolü için)
SELECT 
  oi.product_name,
  COUNT(*) as renk_sayisi,
  SUM(di.quantity) as toplam_adet,
  SUM(di.quantity * oi.unit_price) as toplam_tutar
FROM delivery_items di
JOIN order_items oi ON di.order_item_id = oi.id
WHERE di.delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de'
GROUP BY oi.product_name
ORDER BY oi.product_name;

-- Teslimatdan sonra üretilmiş ürünler (238 civarı olmalı)
SELECT 
  'Teslimatdan Sonra Üretilmiş' as aciklama,
  SUM(oi.produced_quantity - COALESCE(oi.delivered_quantity, 0)) as adet
FROM order_items oi
WHERE oi.order_id = (
  SELECT order_id FROM deliveries WHERE id = '8937c931-787d-46a0-9195-0fa72d7c32de'
);
