-- Fix Chart of Accounts Table Structure
-- This script adds missing columns and fixes constraints

-- =====================================================
-- 1. CHECK CURRENT STRUCTURE
-- =====================================================

SELECT '=== CHECKING CURRENT CHART OF ACCOUNTS STRUCTURE ===' as section;

-- Show current columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chart_of_accounts'
ORDER BY ordinal_position;

-- =====================================================
-- 2. ADD MISSING COLUMNS
-- =====================================================

SELECT '=== ADDING MISSING COLUMNS ===' as section;

-- Add normal_balance column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chart_of_accounts' 
        AND column_name = 'normal_balance'
    ) THEN
        ALTER TABLE chart_of_accounts ADD COLUMN normal_balance VARCHAR(10);
        RAISE NOTICE '✅ Added normal_balance column';
    ELSE
        RAISE NOTICE 'ℹ️ normal_balance column already exists';
    END IF;
END $$;

-- Add account_code column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chart_of_accounts' 
        AND column_name = 'account_code'
    ) THEN
        ALTER TABLE chart_of_accounts ADD COLUMN account_code VARCHAR(20);
        RAISE NOTICE '✅ Added account_code column';
    ELSE
        RAISE NOTICE 'ℹ️ account_code column already exists';
    END IF;
END $$;

-- Add parent_account_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chart_of_accounts' 
        AND column_name = 'parent_account_id'
    ) THEN
        ALTER TABLE chart_of_accounts ADD COLUMN parent_account_id UUID REFERENCES chart_of_accounts(id);
        RAISE NOTICE '✅ Added parent_account_id column';
    ELSE
        RAISE NOTICE 'ℹ️ parent_account_id column already exists';
    END IF;
END $$;

-- Add is_group column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chart_of_accounts' 
        AND column_name = 'is_group'
    ) THEN
        ALTER TABLE chart_of_accounts ADD COLUMN is_group BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added is_group column';
    ELSE
        RAISE NOTICE 'ℹ️ is_group column already exists';
    END IF;
END $$;

-- =====================================================
-- 3. UPDATE EXISTING ACCOUNTS WITH PROPER VALUES
-- =====================================================

SELECT '=== UPDATING EXISTING ACCOUNTS ===' as section;

-- Update normal_balance based on account type
UPDATE chart_of_accounts 
SET normal_balance = CASE 
    WHEN account_type = 'Asset' THEN 'DEBIT'
    WHEN account_type = 'Liability' THEN 'CREDIT'
    WHEN account_type = 'Equity' THEN 'CREDIT'
    WHEN account_type = 'Revenue' THEN 'CREDIT'
    WHEN account_type = 'Expense' THEN 'DEBIT'
    ELSE 'DEBIT'
END
WHERE normal_balance IS NULL;

-- Update is_group based on whether account has children
UPDATE chart_of_accounts 
SET is_group = TRUE
WHERE id IN (
    SELECT DISTINCT parent_account_id 
    FROM chart_of_accounts 
    WHERE parent_account_id IS NOT NULL
);

-- Update account_code if missing
UPDATE chart_of_accounts 
SET account_code = 'ACC-' || LPAD(id::text, 8, '0')
WHERE account_code IS NULL;

-- =====================================================
-- 4. CREATE DEFAULT ACCOUNTS IF MISSING
-- =====================================================

SELECT '=== CREATING DEFAULT ACCOUNTS ===' as section;

-- Create Inventory account if it doesn't exist
DO $$
DECLARE
    v_company_id UUID;
    v_inventory_account_id UUID;
BEGIN
    -- Get first company
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    IF v_company_id IS NOT NULL THEN
        -- Check if Inventory account exists
        SELECT id INTO v_inventory_account_id 
        FROM chart_of_accounts 
        WHERE company_id = v_company_id 
        AND LOWER(name) LIKE '%inventory%'
        LIMIT 1;
        
        IF v_inventory_account_id IS NULL THEN
            INSERT INTO chart_of_accounts (
                company_id, name, account_type, normal_balance, 
                account_code, is_group, created_at, updated_at
            ) VALUES (
                v_company_id, 'Inventory', 'Asset', 'DEBIT', 
                'INV-001', FALSE, NOW(), NOW()
            );
            RAISE NOTICE '✅ Created Inventory account';
        ELSE
            RAISE NOTICE 'ℹ️ Inventory account already exists';
        END IF;
    END IF;
END $$;

-- Create Accounts Payable account if it doesn't exist
DO $$
DECLARE
    v_company_id UUID;
    v_ap_account_id UUID;
BEGIN
    -- Get first company
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    IF v_company_id IS NOT NULL THEN
        -- Check if Accounts Payable account exists
        SELECT id INTO v_ap_account_id 
        FROM chart_of_accounts 
        WHERE company_id = v_company_id 
        AND LOWER(name) LIKE '%payable%'
        LIMIT 1;
        
        IF v_ap_account_id IS NULL THEN
            INSERT INTO chart_of_accounts (
                company_id, name, account_type, normal_balance, 
                account_code, is_group, created_at, updated_at
            ) VALUES (
                v_company_id, 'Accounts Payable', 'Liability', 'CREDIT', 
                'AP-001', FALSE, NOW(), NOW()
            );
            RAISE NOTICE '✅ Created Accounts Payable account';
        ELSE
            RAISE NOTICE 'ℹ️ Accounts Payable account already exists';
        END IF;
    END IF;
END $$;

-- =====================================================
-- 5. VERIFY FIX
-- =====================================================

SELECT '=== VERIFYING FIX ===' as section;

-- Check final structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chart_of_accounts'
ORDER BY ordinal_position;

-- Check account data
SELECT 
    name,
    account_type,
    normal_balance,
    account_code,
    is_group
FROM chart_of_accounts 
ORDER BY account_type, name;

-- Check for any NULL normal_balance values
SELECT COUNT(*) as null_normal_balance_count
FROM chart_of_accounts 
WHERE normal_balance IS NULL;

-- =====================================================
-- 6. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT '✅ Chart of accounts structure fixed!' as status;
SELECT 'Now run: COMPLETE_PURCHASE_INVOICE_SETUP.sql' as next_action;
SELECT 'This will recreate the functions and triggers' as explanation;
SELECT 'Then test marking a purchase invoice as RECEIVED' as final_step;
