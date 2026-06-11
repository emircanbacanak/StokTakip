-- Eksik ürün kolonlarını düzelt
-- Supabase SQL Editor'da çalıştırın

-- description kolonunu nullable yap (null değer gönderildiğinde hata veriyor)
ALTER TABLE products
  ALTER COLUMN description DROP NOT NULL;

-- Eksik kategori kolonlarını ekle
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_pot           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_toy           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_decor         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_holder        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_gpu_support   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_bookmark      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_pencil_holder BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_plate_holder  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_organizer     BOOLEAN NOT NULL DEFAULT FALSE;
