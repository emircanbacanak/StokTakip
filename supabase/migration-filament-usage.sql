-- Filament usage tracking table - ORDER LEVEL
CREATE TABLE IF NOT EXISTS filament_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  filament_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_filament_usage_order_id ON filament_usage(order_id);

-- Enable RLS
ALTER TABLE filament_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" ON filament_usage
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON filament_usage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON filament_usage
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON filament_usage
  FOR DELETE USING (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_filament_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_filament_usage_updated_at
  BEFORE UPDATE ON filament_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_filament_usage_updated_at();

-- Add filament_kg column to orders table for quick reference
ALTER TABLE orders ADD COLUMN IF NOT EXISTS filament_kg DECIMAL(10, 2) DEFAULT 0;
