-- Add filament_kg column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS filament_kg DECIMAL(10, 2) DEFAULT 0;

-- Update existing filament_usage table to remove order_item_id if exists
ALTER TABLE filament_usage DROP COLUMN IF EXISTS order_item_id;
