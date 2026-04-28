-- colors tablosuna kullanım sayacı ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'colors' AND column_name = 'usage_count'
  ) THEN
    ALTER TABLE colors ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_colors_usage ON colors(usage_count DESC);
