-- Create Account Mapping System
-- This script sets up flexible account mapping for transactions

-- =====================================================
-- 1. CREATE ACCOUNT MAPPING TABLE
-- =====================================================

SELECT '=== CREATING ACCOUNT MAPPING TABLE ===' as section;

-- Create account_mappings table
CREATE TABLE IF NOT EXISTS account_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    mapping_type VARCHAR(50) NOT NULL,
    mapping_name VARCHAR(100) NOT NULL,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, mapping_type, mapping_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_mappings_company ON account_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_type ON account_mappings(mapping_type);
CREATE INDEX IF NOT EXISTS idx_account_mappings_active ON account_mappings(is_active);

-- Grant permissions
GRANT ALL ON account_mappings TO authenticated;

SELECT '✅ Account mapping table created' as result;

-- =====================================================
-- 2. INSERT DEFAULT MAPPINGS
-- =====================================================

SELECT '=== INSERTING DEFAULT MAPPINGS ===' as section;

-- Insert default mappings for the first company
DO $$
DECLARE
    v_company_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_cash_account_id UUID;
    v_sales_account_id UUID;
    v_cogs_account_id UUID;
BEGIN
    -- Get first company
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE '❌ No companies found - skipping default mappings';
        RETURN;
    END IF;
    
    RAISE NOTICE '🔍 Setting up mappings for company: %', v_company_id;
    
    -- Find potential inventory account (first Asset account)
    SELECT id INTO v_inventory_account_id 
    FROM chart_of_accounts 
    WHERE company_id = v_company_id AND account_type = 'ASSET'
    ORDER BY account_code
    LIMIT 1;
    
    -- Find potential payable account (first Liability account)
    SELECT id INTO v_payable_account_id 
    FROM chart_of_accounts 
    WHERE company_id = v_company_id AND account_type = 'LIABILITY'
    ORDER BY account_code
    LIMIT 1;
    
    -- Find potential cash account (Asset account with cash-like name)
    SELECT id INTO v_cash_account_id 
    FROM chart_of_accounts 
    WHERE company_id = v_company_id 
    AND account_type = 'ASSET'
    AND (LOWER(account_name) LIKE '%cash%' OR LOWER(account_name) LIKE '%bank%')
    ORDER BY account_code
    LIMIT 1;
    
    -- Find potential sales account (first Revenue account)
    SELECT id INTO v_sales_account_id 
    FROM chart_of_accounts 
    WHERE company_id = v_company_id AND account_type = 'REVENUE'
    ORDER BY account_code
    LIMIT 1;
    
    -- Find potential COGS account (first Expense account)
    SELECT id INTO v_cogs_account_id 
    FROM chart_of_accounts 
    WHERE company_id = v_company_id AND account_type = 'EXPENSE'
    ORDER BY account_code
    LIMIT 1;
    
    -- Insert purchase invoice mappings
    IF v_inventory_account_id IS NOT NULL THEN
        INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
        VALUES (v_company_id, 'purchase_invoice', 'inventory_account', v_inventory_account_id, 'Account for inventory increases')
        ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        RAISE NOTICE '✅ Added inventory mapping: %', v_inventory_account_id;
    ELSE
        RAISE NOTICE '⚠️ No Asset account found for inventory mapping';
    END IF;
    
    IF v_payable_account_id IS NOT NULL THEN
        INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
        VALUES (v_company_id, 'purchase_invoice', 'payable_account', v_payable_account_id, 'Account for accounts payable')
        ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        RAISE NOTICE '✅ Added payable mapping: %', v_payable_account_id;
    ELSE
        RAISE NOTICE '⚠️ No Liability account found for payable mapping';
    END IF;
    
    -- Insert sales invoice mappings
    IF v_sales_account_id IS NOT NULL THEN
        INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
        VALUES (v_company_id, 'sales_invoice', 'sales_account', v_sales_account_id, 'Account for sales revenue')
        ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        RAISE NOTICE '✅ Added sales mapping: %', v_sales_account_id;
    ELSE
        RAISE NOTICE '⚠️ No Revenue account found for sales mapping';
    END IF;
    
    IF v_cogs_account_id IS NOT NULL THEN
        INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
        VALUES (v_company_id, 'sales_invoice', 'cogs_account', v_cogs_account_id, 'Account for cost of goods sold')
        ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        RAISE NOTICE '✅ Added COGS mapping: %', v_cogs_account_id;
    ELSE
        RAISE NOTICE '⚠️ No Expense account found for COGS mapping';
    END IF;
    
    IF v_cash_account_id IS NOT NULL THEN
        INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
        VALUES (v_company_id, 'sales_invoice', 'cash_account', v_cash_account_id, 'Account for cash receipts')
        ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        RAISE NOTICE '✅ Added cash mapping: %', v_cash_account_id;
    ELSE
        RAISE NOTICE '⚠️ No cash-like account found for cash mapping';
    END IF;
    
    RAISE NOTICE '✅ Default mappings created for company %', v_company_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating default mappings: %', SQLERRM;
END $$;

-- =====================================================
-- 3. SHOW CURRENT MAPPINGS
-- =====================================================

SELECT '=== SHOWING CURRENT MAPPINGS ===' as section;

-- Show all mappings for the first company
SELECT 
    am.mapping_type,
    am.mapping_name,
    am.description,
    ca.account_name,
    ca.account_code,
    ca.account_type,
    ca.normal_balance,
    am.is_active
FROM account_mappings am
JOIN chart_of_accounts ca ON am.account_id = ca.id
JOIN companies c ON am.company_id = c.id
ORDER BY am.mapping_type, am.mapping_name;

-- =====================================================
-- 4. CREATE MAPPING FUNCTIONS
-- =====================================================

SELECT '=== CREATING MAPPING FUNCTIONS ===' as section;

-- Function to get account ID from mapping
CREATE OR REPLACE FUNCTION get_account_from_mapping(
    p_company_id UUID,
    p_mapping_type VARCHAR(50),
    p_mapping_name VARCHAR(100)
) RETURNS UUID AS $$
DECLARE
    v_account_id UUID;
BEGIN
    SELECT account_id INTO v_account_id
    FROM account_mappings
    WHERE company_id = p_company_id
    AND mapping_type = p_mapping_type
    AND mapping_name = p_mapping_name
    AND is_active = TRUE;
    
    RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get account name from mapping
CREATE OR REPLACE FUNCTION get_account_name_from_mapping(
    p_company_id UUID,
    p_mapping_type VARCHAR(50),
    p_mapping_name VARCHAR(100)
) RETURNS VARCHAR(100) AS $$
DECLARE
    v_account_name VARCHAR(100);
BEGIN
    SELECT ca.account_name INTO v_account_name
    FROM account_mappings am
    JOIN chart_of_accounts ca ON am.account_id = ca.id
    WHERE am.company_id = p_company_id
    AND am.mapping_type = p_mapping_type
    AND am.mapping_name = p_mapping_name
    AND am.is_active = TRUE;
    
    RETURN v_account_name;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Mapping functions created' as result;

-- =====================================================
-- 5. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT '✅ Account mapping system created!' as status;
SELECT 'Review the mappings above and update them if needed' as instruction;
SELECT 'Then run: UPDATE_JOURNAL_FUNCTIONS_WITH_MAPPING.sql' as next_action;
SELECT 'This will update the journal functions to use the mapping system' as explanation;
