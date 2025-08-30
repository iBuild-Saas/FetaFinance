-- Quick test to check if delivery_status field exists and add it if missing

-- 1. Check if delivery_status column exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales_invoices' 
AND column_name = 'delivery_status';

-- 2. If not exists, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_invoices' 
        AND column_name = 'delivery_status'
    ) THEN
        ALTER TABLE sales_invoices 
        ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'PENDING';
        
        ALTER TABLE sales_invoices 
        ADD CONSTRAINT sales_invoices_delivery_status_check 
        CHECK (delivery_status IN ('PENDING', 'DELIVERED'));
        
        RAISE NOTICE 'Added delivery_status column to sales_invoices';
    ELSE
        RAISE NOTICE 'delivery_status column already exists';
    END IF;
END $$;

-- 3. Update existing invoices to have PENDING delivery status
UPDATE sales_invoices 
SET delivery_status = 'PENDING' 
WHERE delivery_status IS NULL;

-- 4. Check current sales invoices with their delivery status
SELECT 
    invoice_number,
    status,
    delivery_status,
    created_at
FROM sales_invoices 
ORDER BY created_at DESC 
LIMIT 5;
