-- Add missing fields to purchase_invoice_line_items table
-- This script adds the item_id and uom fields that are missing from the original schema

-- Add item_id field (nullable, with foreign key reference to items table)
ALTER TABLE purchase_invoice_line_items
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id);

-- Add uom field (unit of measure)
ALTER TABLE purchase_invoice_line_items
ADD COLUMN IF NOT EXISTS uom VARCHAR(10) DEFAULT 'PCS';

-- Create index for item_id for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_line_items_item_id 
ON purchase_invoice_line_items(item_id);

-- Add comment for documentation
COMMENT ON COLUMN purchase_invoice_line_items.item_id IS 'Reference to the items master table';
COMMENT ON COLUMN purchase_invoice_line_items.uom IS 'Unit of measure (e.g., PCS, KG, L, etc.)';
