-- Add missing fields to invoice_line_items table
-- This script adds item_id and uom fields that are expected by the application

-- Add item_id field to link to items table (optional, for future item tracking)
ALTER TABLE invoice_line_items 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id);

-- Add UOM (Unit of Measure) field
ALTER TABLE invoice_line_items 
ADD COLUMN IF NOT EXISTS uom VARCHAR(10) DEFAULT 'PCS';

-- Create index for better performance on item_id lookups
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_item_id ON invoice_line_items(item_id);

-- Update existing records to have default UOM
UPDATE invoice_line_items 
SET uom = 'PCS' 
WHERE uom IS NULL;

-- Add comment to document the schema changes
COMMENT ON COLUMN invoice_line_items.item_id IS 'Optional reference to items master table for tracking purposes';
COMMENT ON COLUMN invoice_line_items.uom IS 'Unit of measure for the line item (PCS, KG, etc.)';
