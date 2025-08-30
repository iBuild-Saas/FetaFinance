-- Update Existing Tables with Missing Columns
-- This script adds missing columns to existing tables

-- =====================================================
-- 1. UPDATE journal_entries TABLE
-- =====================================================

SELECT '=== UPDATING journal_entries TABLE ===' as section;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add reference_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'reference_type') THEN
        ALTER TABLE journal_entries ADD COLUMN reference_type VARCHAR(50);
        RAISE NOTICE 'Added reference_type column to journal_entries';
    ELSE
        RAISE NOTICE 'reference_type column already exists in journal_entries';
    END IF;
    
    -- Add reference_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'reference_id') THEN
        ALTER TABLE journal_entries ADD COLUMN reference_id UUID;
        RAISE NOTICE 'Added reference_id column to journal_entries';
    ELSE
        RAISE NOTICE 'reference_id column already exists in journal_entries';
    END IF;
    
    -- Add reference_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'reference_number') THEN
        ALTER TABLE journal_entries ADD COLUMN reference_number VARCHAR(100);
        RAISE NOTICE 'Added reference_number column to journal_entries';
    ELSE
        RAISE NOTICE 'reference_number column already exists in journal_entries';
    END IF;
    
    -- Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'status') THEN
        ALTER TABLE journal_entries ADD COLUMN status VARCHAR(20) DEFAULT 'POSTED';
        RAISE NOTICE 'Added status column to journal_entries';
    ELSE
        RAISE NOTICE 'status column already exists in journal_entries';
    END IF;
    
    -- Add updated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'updated_at') THEN
        ALTER TABLE journal_entries ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to journal_entries';
    ELSE
        RAISE NOTICE 'updated_at column already exists in journal_entries';
    END IF;
END $$;

-- =====================================================
-- 2. UPDATE stock_movements TABLE (if exists)
-- =====================================================

SELECT '=== UPDATING stock_movements TABLE ===' as section;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'reference_type') THEN
            ALTER TABLE stock_movements ADD COLUMN reference_type VARCHAR(50);
            RAISE NOTICE 'Added reference_type column to stock_movements';
        ELSE
            RAISE NOTICE 'reference_type column already exists in stock_movements';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'reference_id') THEN
            ALTER TABLE stock_movements ADD COLUMN reference_id UUID;
            RAISE NOTICE 'Added reference_id column to stock_movements';
        ELSE
            RAISE NOTICE 'reference_id column already exists in stock_movements';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'reference_number') THEN
            ALTER TABLE stock_movements ADD COLUMN reference_number VARCHAR(100);
            RAISE NOTICE 'Added reference_number column to stock_movements';
        ELSE
            RAISE NOTICE 'reference_number column already exists in stock_movements';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'notes') THEN
            ALTER TABLE stock_movements ADD COLUMN notes TEXT;
            RAISE NOTICE 'Added notes column to stock_movements';
        ELSE
            RAISE NOTICE 'notes column already exists in stock_movements';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'movement_date') THEN
            ALTER TABLE stock_movements ADD COLUMN movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added movement_date column to stock_movements';
        ELSE
            RAISE NOTICE 'movement_date column already exists in stock_movements';
        END IF;
    ELSE
        RAISE NOTICE 'stock_movements table does not exist - will be created by main setup script';
    END IF;
END $$;

-- =====================================================
-- 3. UPDATE stock_items TABLE (if exists)
-- =====================================================

SELECT '=== UPDATING stock_items TABLE ===' as section;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'reserved_quantity') THEN
            ALTER TABLE stock_items ADD COLUMN reserved_quantity DECIMAL(10,3) DEFAULT 0;
            RAISE NOTICE 'Added reserved_quantity column to stock_items';
        ELSE
            RAISE NOTICE 'reserved_quantity column already exists in stock_items';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'available_quantity') THEN
            ALTER TABLE stock_items ADD COLUMN available_quantity DECIMAL(10,3) DEFAULT 0;
            RAISE NOTICE 'Added available_quantity column to stock_items';
        ELSE
            RAISE NOTICE 'available_quantity column already exists in stock_items';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'average_cost') THEN
            ALTER TABLE stock_items ADD COLUMN average_cost DECIMAL(15,2) DEFAULT 0;
            RAISE NOTICE 'Added average_cost column to stock_items';
        ELSE
            RAISE NOTICE 'average_cost column already exists in stock_items';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'updated_at') THEN
            ALTER TABLE stock_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column to stock_items';
        ELSE
            RAISE NOTICE 'updated_at column already exists in stock_items';
        END IF;
    ELSE
        RAISE NOTICE 'stock_items table does not exist - will be created by main setup script';
    END IF;
END $$;

-- =====================================================
-- 4. VERIFY UPDATES
-- =====================================================

SELECT '=== VERIFYING TABLE STRUCTURES ===' as section;

-- Show journal_entries structure
SELECT '--- journal_entries columns ---' as subsection;
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE WHEN column_default IS NULL THEN 'none' ELSE column_default END as default_value
FROM information_schema.columns 
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Show stock_movements structure (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        RAISE NOTICE '--- stock_movements table structure updated ---';
    ELSE
        RAISE NOTICE '--- stock_movements table will be created by main setup script ---';
    END IF;
END $$;

-- Show stock_items structure (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items') THEN
        RAISE NOTICE '--- stock_items table structure updated ---';
    ELSE
        RAISE NOTICE '--- stock_items table will be created by main setup script ---';
    END IF;
END $$;

-- =====================================================
-- 5. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT '✅ Tables updated successfully!' as status;
SELECT 'Now run: COMPLETE_PURCHASE_INVOICE_SETUP.sql' as next_action;
SELECT 'This will create any missing tables and set up the automation system' as explanation;
