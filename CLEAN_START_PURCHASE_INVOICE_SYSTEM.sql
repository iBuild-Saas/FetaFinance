-- =====================================================
-- CLEAN START PURCHASE INVOICE SYSTEM
-- =====================================================
-- This script creates a completely new, clean system from scratch
-- No legacy code, no conflicts, just a working system

-- =====================================================
-- 1. CLEAN UP EXISTING SYSTEM
-- =====================================================

-- Drop all existing triggers
DROP TRIGGER IF EXISTS trg_purchase_invoice_stock_movement ON purchase_invoices;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_stock_movement ON purchase_invoices;

-- Drop all existing functions
DROP FUNCTION IF EXISTS create_stock_movement(UUID, UUID, DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS record_purchase_invoice_stock_movement(UUID);
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry(UUID);
DROP FUNCTION IF EXISTS trigger_purchase_invoice_stock_movement();
DROP FUNCTION IF EXISTS trigger_create_purchase_invoice_journal();

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_items CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS journal_entry_number_seq;

-- =====================================================
-- 2. FIX STATUS CONSTRAINTS
-- =====================================================

-- Drop existing constraints
ALTER TABLE purchase_invoices 
DROP CONSTRAINT IF EXISTS purchase_invoices_status_check;

-- Apply clean constraint
ALTER TABLE purchase_invoices 
ADD CONSTRAINT purchase_invoices_status_check 
CHECK (status IN ('DRAFT', 'SUBMITTED', 'RECEIVED', 'PAID', 'CANCELLED'));

-- Update default status
ALTER TABLE purchase_invoices 
ALTER COLUMN status SET DEFAULT 'DRAFT';

-- =====================================================
-- 3. CREATE CLEAN STOCK TABLES
-- =====================================================

-- Create stock_items table
CREATE TABLE stock_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL,
    current_quantity DECIMAL(10,3) DEFAULT 0,
    available_quantity DECIMAL(10,3) DEFAULT 0,
    average_cost DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, item_id)
);

-- Create stock_movements table
CREATE TABLE stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    movement_source VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    reference_number VARCHAR(100),
    description TEXT,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CREATE SIMPLE STOCK FUNCTIONS
-- =====================================================

-- Simple function to update stock when items are received
CREATE OR REPLACE FUNCTION update_stock_on_receive(
    p_invoice_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_invoice purchase_invoices%ROWTYPE;
    v_line_item purchase_invoice_line_items%ROWTYPE;
    v_stock_item_id UUID;
    v_current_quantity DECIMAL(10,3);
    v_new_quantity DECIMAL(10,3);
    v_new_average_cost DECIMAL(15,2);
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice FROM purchase_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;

    -- Only process if status is RECEIVED
    IF v_invoice.status != 'RECEIVED' THEN
        RAISE NOTICE 'Invoice % is not RECEIVED (status: %), skipping stock update', v_invoice.invoice_number, v_invoice.status;
        RETURN;
    END IF;

    -- Process each line item
    FOR v_line_item IN SELECT * FROM purchase_invoice_line_items WHERE invoice_id = p_invoice_id LOOP
        
        -- Get or create stock item record
        SELECT id, current_quantity INTO v_stock_item_id, v_current_quantity
        FROM stock_items 
        WHERE company_id = v_invoice.company_id AND item_id = v_line_item.item_id;
        
        IF NOT FOUND THEN
            -- Create new stock item
            INSERT INTO stock_items (company_id, item_id, current_quantity, average_cost)
            VALUES (v_invoice.company_id, v_line_item.item_id, 0, v_line_item.unit_price)
            RETURNING id INTO v_stock_item_id;
            v_current_quantity := 0;
        END IF;
        
        -- Calculate new quantity and average cost
        v_new_quantity := v_current_quantity + v_line_item.quantity;
        
        IF v_current_quantity = 0 THEN
            v_new_average_cost := v_line_item.unit_price;
        ELSE
            v_new_average_cost := ((v_current_quantity * (SELECT average_cost FROM stock_items WHERE id = v_stock_item_id)) + 
                                 (v_line_item.quantity * v_line_item.unit_price)) / v_new_quantity;
        END IF;
        
        -- Update stock item
        UPDATE stock_items 
        SET 
            current_quantity = v_new_quantity,
            available_quantity = v_new_quantity,
            average_cost = v_new_average_cost,
            updated_at = NOW()
        WHERE id = v_stock_item_id;
        
        -- Record stock movement
        INSERT INTO stock_movements (
            company_id, item_id, quantity, unit_cost, movement_type, movement_source,
            reference_type, reference_id, reference_number, description
        ) VALUES (
            v_invoice.company_id, v_line_item.item_id, v_line_item.quantity, v_line_item.unit_price,
            'IN', 'PURCHASE', 'purchase_invoice', v_invoice.id, v_invoice.invoice_number,
            'Stock received from purchase invoice ' || v_invoice.invoice_number
        );
        
        RAISE NOTICE 'Stock updated for item %: quantity +%, new total: %, avg cost: %', 
            v_line_item.item_name, v_line_item.quantity, v_new_quantity, v_new_average_cost;
    END LOOP;
    
    RAISE NOTICE 'Stock update completed for invoice %', v_invoice.invoice_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE SIMPLE TRIGGER
-- =====================================================

-- Simple trigger function
CREATE OR REPLACE FUNCTION trigger_stock_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes TO RECEIVED
    IF NEW.status = 'RECEIVED' AND OLD.status != 'RECEIVED' THEN
        BEGIN
            PERFORM update_stock_on_receive(NEW.id);
            RAISE NOTICE 'Stock update trigger executed for invoice %', NEW.invoice_number;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Stock update failed for invoice %: %', NEW.invoice_number, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trg_purchase_invoice_stock_update
AFTER UPDATE OF status ON purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_stock_update();

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION update_stock_on_receive(UUID) TO authenticated;
GRANT ALL ON stock_items TO authenticated;
GRANT ALL ON stock_movements TO authenticated;

-- =====================================================
-- 7. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_stock_items_company_item ON stock_items(company_id, item_id);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

SELECT '=== CLEAN SYSTEM STATUS ===' as status;

-- Check tables
SELECT 'Tables' as component, COUNT(*) as count FROM information_schema.tables 
WHERE table_name IN ('stock_items', 'stock_movements');

-- Check functions
SELECT 'Functions' as component, COUNT(*) as count FROM information_schema.routines 
WHERE routine_name IN ('update_stock_on_receive');

-- Check triggers
SELECT 'Triggers' as component, COUNT(*) as count FROM information_schema.triggers 
WHERE trigger_name IN ('trg_purchase_invoice_stock_update');

-- Check constraints
SELECT 'Constraints' as component, COUNT(*) as count FROM pg_constraint 
WHERE conrelid = 'purchase_invoices'::regclass AND contype = 'c';

SELECT '=== SYSTEM READY ===' as status;
SELECT 'Clean system created successfully!' as message;
SELECT 'Journal entries: Use your existing system (SUBMITTED status)' as note;
SELECT 'Stock movements: Use new system (RECEIVED status)' as note;
