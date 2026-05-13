-- Feridun'un 467 adetlik teslimatına delivery_items ekle
-- Delivery ID: 8937c931-787d-46a0-9195-0fa72d7c32de

-- Önce mevcut delivery_items'ı temizle (varsa)
DELETE FROM delivery_items WHERE delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de';

-- Şimdi tüm ürünleri ekle
INSERT INTO delivery_items (delivery_id, order_item_id, quantity) VALUES
-- Senfoni Vazo (80 adet)
('8937c931-787d-46a0-9195-0fa72d7c32de', '17483677-0077-403e-9038-a9ab421238ea', 3),  -- Beyaz
('8937c931-787d-46a0-9195-0fa72d7c32de', 'e4d467f9-5ecd-475d-a469-8ad46630e295', 13), -- Siyah
('8937c931-787d-46a0-9195-0fa72d7c32de', '728644e0-9f8a-40b2-a521-08f6b72cc08b', 5),  -- Sedefli Mavi
('8937c931-787d-46a0-9195-0fa72d7c32de', '566043ab-a94f-4365-8d1e-bc24f84d560e', 3),  -- Haiki Yeşil
('8937c931-787d-46a0-9195-0fa72d7c32de', '6c1f4e9e-fb80-494f-a904-077f3128107f', 15), -- Bej
('8937c931-787d-46a0-9195-0fa72d7c32de', 'f0530e1b-83d8-4e80-867b-dce2e395a314', 9),  -- Kahverengi
('8937c931-787d-46a0-9195-0fa72d7c32de', '2b031c4b-7f41-4ce9-ae90-823dcdfdd778', 17), -- Vişne Çürüğü
('8937c931-787d-46a0-9195-0fa72d7c32de', 'f1b626eb-b43f-44df-9523-99093023cc8d', 14), -- Gümüş

-- Mira Mumluk (80 adet)
('8937c931-787d-46a0-9195-0fa72d7c32de', '24446ab9-2bdf-4436-a8ab-b44a787857d7', 12), -- Altın
('8937c931-787d-46a0-9195-0fa72d7c32de', 'a332cf49-fd18-4598-9b20-0c3ed38921cf', 13), -- Sedefli Mavi
('8937c931-787d-46a0-9195-0fa72d7c32de', 'b07ecaae-6d69-4139-8d1b-656f3fc943b6', 12), -- Antrasit
('8937c931-787d-46a0-9195-0fa72d7c32de', '889320c4-ada8-408c-96c6-49022301f9de', 12), -- Mermer
('8937c931-787d-46a0-9195-0fa72d7c32de', '339381c8-b1ce-46d8-8b65-25e31f1681f8', 13), -- Kahverengi
('8937c931-787d-46a0-9195-0fa72d7c32de', '4f155115-18b7-4894-9025-7fb92a2567e8', 7),  -- Gri
('8937c931-787d-46a0-9195-0fa72d7c32de', '2eaf5f20-bf61-4583-bec7-92cc0809b023', 9),  -- Haiki Yeşil
('8937c931-787d-46a0-9195-0fa72d7c32de', 'c5afe12b-0d6f-4ffe-9e84-a1e82f24220b', 2),  -- Gümüş

-- Lamina Mumluk (50 adet)
('8937c931-787d-46a0-9195-0fa72d7c32de', 'a6ffd07a-d017-457a-9ea3-336928468815', 12), -- Mermer
('8937c931-787d-46a0-9195-0fa72d7c32de', 'c765c234-9d08-40aa-986c-9ebadca98a66', 5),  -- Beyaz
('8937c931-787d-46a0-9195-0fa72d7c32de', 'ef3d01c9-3434-44d4-ab1a-93b27df9c319', 14), -- Antrasit
('8937c931-787d-46a0-9195-0fa72d7c32de', 'd2ddeb3e-b7bf-4c77-8a7f-93eaa85def39', 13), -- Pembe
('8937c931-787d-46a0-9195-0fa72d7c32de', '2e3170aa-2c5e-4b26-8845-ef9177a6471e', 2),  -- Sedefli Mavi
('8937c931-787d-46a0-9195-0fa72d7c32de', 'ba42c69f-f16e-46dc-8007-8bf88ad57e16', 1),  -- Kahverengi
('8937c931-787d-46a0-9195-0fa72d7c32de', '7057735e-5358-42be-80cc-45e61762c2a7', 3),  -- Siyah

-- Tavşan Mumluk (117 adet)
('8937c931-787d-46a0-9195-0fa72d7c32de', '0ce3ac8c-cff6-4beb-b2f0-fb8e49b0f0d2', 27), -- Beyaz
('8937c931-787d-46a0-9195-0fa72d7c32de', '6be894e0-1c87-4f56-bfef-dcd1e121611c', 13), -- Mermer
('8937c931-787d-46a0-9195-0fa72d7c32de', '8ffc4a20-b9e9-48d9-92aa-0ef8bc4dbbc5', 16), -- Sedefli Mavi
('8937c931-787d-46a0-9195-0fa72d7c32de', '9c8ccedf-b8f7-46c8-bf79-3d4883c60e28', 13), -- Bej
('8937c931-787d-46a0-9195-0fa72d7c32de', '343667e7-f136-4c4f-8156-ba96e974cc38', 13), -- Antrasit
('8937c931-787d-46a0-9195-0fa72d7c32de', '25cbcbc0-ad7b-4771-9fde-6045639444c7', 15), -- Ten Rengi
('8937c931-787d-46a0-9195-0fa72d7c32de', '40655877-446b-4c9d-889b-b6ed46284d11', 13), -- Altın
('8937c931-787d-46a0-9195-0fa72d7c32de', '82eb5ff0-d697-4f47-8808-b8b8d48d975f', 2),  -- Gri
('8937c931-787d-46a0-9195-0fa72d7c32de', '46fce0e2-e04e-4f0b-a538-2632712edb8c', 5),  -- Haiki Yeşil

-- Aura Vazo (50 adet)
('8937c931-787d-46a0-9195-0fa72d7c32de', 'f39f21a3-4728-40a8-8fe4-963875273b5f', 6),  -- Beyaz
('8937c931-787d-46a0-9195-0fa72d7c32de', 'd2f0a47a-c281-4079-bdad-aa71c8432410', 5),  -- Antrasit
('8937c931-787d-46a0-9195-0fa72d7c32de', '720542bc-6a3b-45bf-a445-082db78cc2bc', 5),  -- Bej
('8937c931-787d-46a0-9195-0fa72d7c32de', 'd0742274-9878-4dc7-81ae-0ba9a283432a', 12), -- Kahverengi
('8937c931-787d-46a0-9195-0fa72d7c32de', '59a57c37-7efc-4f1d-a665-24596a30f6f3', 12), -- Haiki Yeşil
('8937c931-787d-46a0-9195-0fa72d7c32de', '71e9cbc3-e82b-4d4a-92b7-feaa53e40cf6', 8),  -- Mermer
('8937c931-787d-46a0-9195-0fa72d7c32de', '9b07e888-3832-4d8f-8469-f49d9f5ff168', 2),  -- Sedefli Mavi

-- Petra Vazo (20 adet)
('8937c931-787d-46a0-9195-0fa72d7c32de', 'cc9cc156-b159-4057-81a7-7be3fd495d7b', 9),  -- Beyaz
('8937c931-787d-46a0-9195-0fa72d7c32de', '5dc6da6a-d7c0-4287-af58-c418f8b44491', 5),  -- Antrasit
('8937c931-787d-46a0-9195-0fa72d7c32de', '654f67f4-3fc9-4cee-b983-39ef47574e37', 6),  -- Bej

-- Vero Tutacak (70 adet)
('8937c931-787d-46a0-9195-0fa72d7c32de', '507afa14-7ca1-4ed4-9ada-00d121f0ab1d', 19), -- Sedefli Mavi
('8937c931-787d-46a0-9195-0fa72d7c32de', '856983c5-5c3c-427e-99ac-c04f2d8095fe', 18), -- Kırmızı
('8937c931-787d-46a0-9195-0fa72d7c32de', '6c269bb4-2a21-48aa-8856-11f5188c3145', 33); -- Siyah

-- Kontrol: Toplam adet
SELECT 
  COUNT(*) as kalem_sayisi,
  SUM(quantity) as toplam_adet
FROM delivery_items
WHERE delivery_id = '8937c931-787d-46a0-9195-0fa72d7c32de';

-- Beklenen: 45 kalem, 467 adet
