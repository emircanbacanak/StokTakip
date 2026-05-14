-- 1. Senfoni Vazo Gümüş veri tutarsızlığını düzelt
UPDATE order_items 
SET produced_quantity = 15 
WHERE id = '5a20ac78-f16a-4815-84dc-0fbd80369650';

-- 2. 09.05.2026 teslimatı için delivery_items kayıtlarını oluştur
-- Delivery ID: 8937c931-787d-46a0-9195-0fa72d7c32de

INSERT INTO delivery_items (delivery_id, order_item_id, quantity, produced_quantity_at_delivery)
VALUES
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'bdf5cb0c-2455-4623-93a8-7cd31f06201a', 5, 5),   -- Aura Vazo Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '1aa3d344-fd8b-4a77-9bb9-730087f20af7', 5, 5),   -- Aura Vazo Bej
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'cd08fa74-7841-41ba-b8cf-035adc32f37d', 6, 6),   -- Aura Vazo Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '986fd635-9430-496a-8463-7eed94eb79dc', 12, 12), -- Aura Vazo Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '740f355d-03cf-417a-8289-da18ce213020', 12, 12), -- Aura Vazo Kahverengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'f0736a39-993b-4daf-b989-6809c95c23cd', 8, 8),   -- Aura Vazo Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '653a416b-94dc-4cce-a8b6-e78292d04dd9', 2, 2),   -- Aura Vazo Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '0a26514d-335b-478c-9a85-c48313831a4d', 14, 14), -- Lamina Mumluk Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '5c3a86b2-48e8-46c6-aa87-6661effc0637', 5, 5),   -- Lamina Mumluk Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '9c5f5ba5-254f-49b4-867e-acf4a52a2f18', 1, 1),   -- Lamina Mumluk Kahverengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'e8abb273-7f19-4283-abe2-c0461968b19c', 12, 12), -- Lamina Mumluk Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '1461c858-4b2e-4a29-a1a8-e1d5dd2b90d5', 13, 13), -- Lamina Mumluk Pembe
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '1d1f5b25-6b30-471d-910e-b4140607a932', 2, 2),   -- Lamina Mumluk Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'eebdcb31-a6f5-4d62-a84e-ea7ffeb3bc44', 3, 3),   -- Lamina Mumluk Siyah
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'aa1b3050-de27-41a1-a3ac-aaeee27c7218', 12, 12), -- Mira Mumluk Altın
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '973b9dba-4847-4916-b644-fe314bfa212f', 12, 12), -- Mira Mumluk Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '02be7f89-9e4a-4eaf-85fe-1f4f5fbe2799', 7, 7),   -- Mira Mumluk Gri
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'ee7a03c9-d1cd-46db-af23-13c465f6721e', 2, 2),   -- Mira Mumluk Gümüş
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'e476a092-8f65-468b-84e7-0bf449cf6c7d', 9, 9),   -- Mira Mumluk Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '5f932588-4e6c-43f7-a3fe-c7722d7d7acf', 13, 13), -- Mira Mumluk Kahverengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '8a90fcc5-6c3f-4a8c-a5ba-368280e13e68', 12, 12), -- Mira Mumluk Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '28f27e37-b757-49ba-887a-0c38b37b65d2', 13, 13), -- Mira Mumluk Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '0b8a92bc-09a3-4b48-8af9-50455dc14714', 5, 5),   -- Petra Vazo Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '44e24ecf-4d97-4f2d-9a62-15e1cc438ff4', 6, 6),   -- Petra Vazo Bej
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '12093d62-06ec-44a9-97fd-fd0adb97a81f', 9, 9),   -- Petra Vazo Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '2af8d7ac-48fa-4df1-bb66-e8b7b5c5c917', 15, 15), -- Senfoni Vazo Bej
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '7c7a03e7-eb4b-4269-a466-57db6a4326d8', 3, 3),   -- Senfoni Vazo Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '5a20ac78-f16a-4815-84dc-0fbd80369650', 15, 15), -- Senfoni Vazo Gümüş (düzeltildi)
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '963fc894-d402-48e3-b0a2-312a5d3d8627', 3, 3),   -- Senfoni Vazo Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '71e00cc6-8172-4784-9eec-f624a4622941', 9, 9),   -- Senfoni Vazo Kahverengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'b78f5ad0-0931-4314-ab3a-04fefcfac1fb', 5, 5),   -- Senfoni Vazo Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'd0896ddc-0a18-4c0f-9320-430d25f827a6', 13, 13), -- Senfoni Vazo Siyah
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'df57ac9e-ba20-4b23-a3b2-ea2cdc31c28c', 17, 17), -- Senfoni Vazo Vişne Çürüğü
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'ee81531b-0442-4466-a0a5-a6e56bbfb167', 13, 13), -- Tavşan Mumluk Altın
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'b758b834-17b0-451c-91ca-1444901d70d6', 13, 13), -- Tavşan Mumluk Antrasit
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '66376b3e-6ca9-410c-98aa-4f4351861959', 13, 13), -- Tavşan Mumluk Bej
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'd92a5d09-bd76-426a-ad12-0e91f212db09', 27, 27), -- Tavşan Mumluk Beyaz
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '34843252-186f-4f74-9c93-3781d2ca6fe5', 2, 2),   -- Tavşan Mumluk Gri
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '90834187-3c63-4a93-96b5-32129913048b', 5, 5),   -- Tavşan Mumluk Haiki Yeşil
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '612e487b-bda6-4775-90a5-6360c6be4bf0', 13, 13), -- Tavşan Mumluk Mermer
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '667fc0c1-72e2-4c71-b5e2-200b42a9bfa2', 16, 16), -- Tavşan Mumluk Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'cb54a37d-ae95-42c0-a459-6268bda910f0', 15, 15), -- Tavşan Mumluk Ten Rengi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'cefb4aa4-3a01-4df8-a634-3f3ff2d1fc10', 18, 18), -- Vero Tutacak Kırmızı
  ('8937c931-787d-46a0-9195-0fa72d7c32de', 'ab5bee67-5676-45e0-965b-3ab2d9c11d25', 19, 19), -- Vero Tutacak Sedefli Mavi
  ('8937c931-787d-46a0-9195-0fa72d7c32de', '031a524f-e40b-4e98-9388-92764e368582', 33, 33); -- Vero Tutacak Siyah

-- Toplam: 467 adet ürün
