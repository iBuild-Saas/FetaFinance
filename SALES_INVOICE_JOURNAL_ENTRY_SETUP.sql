-- =====================================================
-- SALES INVOICE JOURNAL ENTRY SETUP
-- =====================================================
-- This script sets up the sales invoice journal entry system
-- with the same logic as the purchase invoice system

-- =====================================================
-- 1. CREATE REQUIRED TABLES
-- =====================================================

-- Create account_mappings table if it doesn't exist
CREATE TABLE IF NOT EXISTS account_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    mapping_type VARCHAR(50) NOT NULL,
    mapping_name VARCHAR(100) NOT NULL,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, mapping_type, mapping_name)
);

-- Create indexes for account_mappings
CREATE INDEX IF NOT EXISTS idx_account_mappings_company ON account_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_type ON account_mappings(mapping_type);
CREATE INDEX IF NOT EXISTS idx_account_mappings_active ON account_mappings(is_active);

-- Grant permissions on account_mappings
GRANT ALL ON account_mappings TO authenticated;

-- =====================================================
-- 2. ADD REQUIRED FIELDS TO COMPANIES TABLE
-- =====================================================

-- Add default account fields to companies table if they don't exist
DO $$
BEGIN
    -- Add default_sales_revenue_account_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'default_sales_revenue_account_id'
    ) THEN
        ALTER TABLE companies ADD COLUMN default_sales_revenue_account_id UUID REFERENCES chart_of_accounts(id);
        RAISE NOTICE 'Added default_sales_revenue_account_id to companies table';
    END IF;
    
    -- Add accounts_receivable_account_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'accounts_receivable_account_id'
    ) THEN
        ALTER TABLE companies ADD COLUMN accounts_receivable_account_id UUID REFERENCES chart_of_accounts(id);
        RAISE NOTICE 'Added accounts_receivable_account_id to companies table';
    END IF;
    
    -- Add sales_tax_payable_account_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'sales_tax_payable_account_id'
    ) THEN
        ALTER TABLE companies ADD COLUMN sales_tax_payable_account_id UUID REFERENCES chart_of_accounts(id);
        RAISE NOTICE 'Added sales_tax_payable_account_id to companies table';
    END IF;
    
    -- Add default_inventory_account_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'default_inventory_account_id'
    ) THEN
        ALTER TABLE companies ADD COLUMN default_inventory_account_id UUID REFERENCES chart_of_accounts(id);
        RAISE NOTICE 'Added default_inventory_account_id to companies table';
    END IF;
    
    -- Add accounts_payable_account_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'accounts_payable_account_id'
    ) THEN
        ALTER TABLE companies ADD COLUMN accounts_payable_account_id UUID REFERENCES chart_of_accounts(id);
        RAISE NOTICE 'Added accounts_payable_account_id to companies table';
    END IF;
END $$;

-- =====================================================
-- 3. CREATE/UPDATE SALES INVOICE JOURNAL ENTRY FUNCTION
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_sales_invoice_journal_entry() CASCADE;

-- Create the sales invoice journal entry function
CREATE OR REPLACE FUNCTION create_sales_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_revenue_account_id UUID;
    v_receivable_account_id UUID;
    v_sales_tax_payable_account_id UUID;
    v_subtotal DECIMAL;
    v_tax_amount DECIMAL;
    v_total_amount DECIMAL;
    v_entry_number VARCHAR(50);
    v_description TEXT;
    v_company_id UUID;
    v_line_number INTEGER := 1;
    v_customer_name TEXT;
BEGIN
    -- Only process when status is SUBMITTED
    IF NEW.status != 'SUBMITTED' THEN
        RETURN NEW;
    END IF;
    
    -- Skip if amount is zero or negative
    IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
        RAISE NOTICE 'Skipping journal entry for sales invoice % because total amount is not positive', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    -- Get invoice details
    v_company_id := NEW.company_id;
    v_subtotal := COALESCE(NEW.subtotal, 0);
    v_tax_amount := COALESCE(NEW.tax_amount, 0);
    v_total_amount := NEW.total_amount;
    
    -- Get customer name for description
    SELECT name INTO v_customer_name
    FROM customers 
    WHERE id = NEW.customer_id;
    
    -- First try to get accounts from company defaults
    SELECT
        default_sales_revenue_account_id,
        accounts_receivable_account_id,
        sales_tax_payable_account_id
    INTO
        v_revenue_account_id,
        v_receivable_account_id,
        v_sales_tax_payable_account_id
    FROM companies
    WHERE id = v_company_id;
    
    -- If company defaults don't exist, try account mappings
    IF v_revenue_account_id IS NULL THEN
        SELECT account_id INTO v_revenue_account_id
        FROM account_mappings
        WHERE company_id = v_company_id
        AND mapping_type = 'SALES_INVOICE'
        AND mapping_name = 'sales_account'
        AND is_active = true;
    END IF;
    
    IF v_receivable_account_id IS NULL THEN
        SELECT account_id INTO v_receivable_account_id
        FROM account_mappings
        WHERE company_id = v_company_id
        AND mapping_type = 'SALES_INVOICE'
        AND mapping_name = 'receivable_account'
        AND is_active = true;
    END IF;
    
    IF v_sales_tax_payable_account_id IS NULL AND v_tax_amount > 0 THEN
        SELECT account_id INTO v_sales_tax_payable_account_id
        FROM account_mappings
        WHERE company_id = v_company_id
        AND mapping_type = 'SALES_INVOICE'
        AND mapping_name = 'tax_payable_account'
        AND is_active = true;
    END IF;
    
    -- Check if we have the required accounts
    IF v_revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No sales revenue account configured for company %. Please set up Account Mappings or Company Defaults.', v_company_id;
    END IF;
    
    IF v_receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No accounts receivable account configured for company %. Please set up Account Mappings or Company Defaults.', v_company_id;
    END IF;
    
    IF v_tax_amount > 0 AND v_sales_tax_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'Sales tax exists (%.2f) but no sales tax payable account configured for company %. Please set up Account Mappings or Company Defaults.', v_tax_amount, v_company_id;
    END IF;
    
    -- Generate entry number and description
    v_entry_number := 'SI-' || NEW.invoice_number;
    v_description := 'Sales Invoice ' || NEW.invoice_number;
    IF v_customer_name IS NOT NULL THEN
        v_description := v_description || ' - ' || v_customer_name;
    END IF;
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        v_description := v_description || ' - ' || NEW.notes;
    END IF;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_company_id, v_entry_number, NEW.invoice_date,
        'sales_invoice:' || NEW.id, v_description, 'POSTED',
        v_total_amount, v_total_amount, true, true,
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- 1. DEBIT: Accounts Receivable (total amount)
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_receivable_account_id, v_line_number,
        v_total_amount, 0, 'Accounts Receivable - ' || v_description, NOW(), NOW()
    );
    v_line_number := v_line_number + 1;
    
    -- 2. CREDIT: Sales Revenue Account (subtotal)
    IF v_subtotal > 0 THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_revenue_account_id, v_line_number,
            0, v_subtotal, 'Sales Revenue - ' || v_description, NOW(), NOW()
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- 3. CREDIT: Sales Tax Payable Account (if tax exists)
    IF v_tax_amount > 0 AND v_sales_tax_payable_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_sales_tax_payable_account_id, v_line_number,
            0, v_tax_amount, 'Sales Tax Payable - ' || v_description, NOW(), NOW()
        );
    END IF;
    
    RAISE NOTICE 'Created sales invoice journal entry % for invoice % with total amount %.2f', v_entry_number, NEW.invoice_number, v_total_amount;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating sales invoice journal entry for invoice %: %', NEW.invoice_number, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE/UPDATE PURCHASE INVOICE JOURNAL ENTRY FUNCTION
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry() CASCADE;

-- Create the purchase invoice journal entry function
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_description TEXT;
    v_amount DECIMAL;
    v_entry_number VARCHAR(50);
    v_company_id UUID;
    v_supplier_name TEXT;
BEGIN
    -- Only process when status is SUBMITTED
    IF NEW.status != 'SUBMITTED' THEN
        RETURN NEW;
    END IF;
    
    -- Skip if amount is zero or negative
    IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
        RAISE NOTICE 'Skipping journal entry for purchase invoice % because total amount is not positive', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    v_amount := NEW.total_amount;
    v_company_id := NEW.company_id;
    
    -- Get supplier name for description
    SELECT name INTO v_supplier_name
    FROM suppliers 
    WHERE id = NEW.supplier_id;
    
    -- First try to get accounts from company defaults
    SELECT 
        default_inventory_account_id,
        accounts_payable_account_id
    INTO 
        v_inventory_account_id,
        v_payable_account_id
    FROM companies 
    WHERE id = v_company_id;
    
    -- If company defaults don't exist, try account mappings
    IF v_inventory_account_id IS NULL THEN
        SELECT account_id INTO v_inventory_account_id
        FROM account_mappings
        WHERE company_id = v_company_id
        AND mapping_type = 'PURCHASE_INVOICE'
        AND mapping_name = 'inventory_account'
        AND is_active = true;
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        SELECT account_id INTO v_payable_account_id
        FROM account_mappings
        WHERE company_id = v_company_id
        AND mapping_type = 'PURCHASE_INVOICE'
        AND mapping_name = 'payable_account'
        AND is_active = true;
    END IF;
    
    -- Verify we have both accounts
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'No inventory/expense account configured for company %. Please set up Account Mappings or Company Defaults.', v_company_id;
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'No accounts payable account configured for company %. Please set up Account Mappings or Company Defaults.', v_company_id;
    END IF;
    
    -- Generate entry number using the table's function or format
    v_entry_number := 'PI-' || NEW.invoice_number;
    v_description := 'Purchase Invoice ' || NEW.invoice_number;
    IF v_supplier_name IS NOT NULL THEN
        v_description := v_description || ' - ' || v_supplier_name;
    END IF;
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        v_description := v_description || ' - ' || NEW.notes;
    END IF;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_company_id, v_entry_number, NEW.invoice_date, 
        'purchase_invoice:' || NEW.id, v_description, 'POSTED',
        v_amount, v_amount, true, true,
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- DEBIT: Inventory/Expense Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_inventory_account_id, 1,
        v_amount, 0, 'Inventory/Expense - ' || v_description, NOW(), NOW()
    );
    
    -- CREDIT: Accounts Payable Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id, 2,
        0, v_amount, 'Accounts Payable - ' || v_description, NOW(), NOW()
    );
    
    RAISE NOTICE 'Created purchase invoice journal entry % for invoice % with total amount %.2f', v_entry_number, NEW.invoice_number, v_amount;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating purchase invoice journal entry for invoice %: %', NEW.invoice_number, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;

-- Create sales invoice trigger - fires when status changes to SUBMITTED
CREATE TRIGGER trigger_sales_invoice_journal
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_sales_invoice_journal_entry();

-- Create purchase invoice trigger - fires when status changes to SUBMITTED
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER UPDATE ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

-- =====================================================
-- 6. SETUP DEFAULT ACCOUNT MAPPINGS
-- =====================================================

-- Insert default account mappings for existing companies
DO $$
DECLARE
    v_company_id UUID;
    v_revenue_account_id UUID;
    v_receivable_account_id UUID;
    v_tax_payable_account_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
BEGIN
    -- Process each company
    FOR v_company_id IN SELECT id FROM companies LOOP
        
        -- Find potential accounts for this company
        -- Sales Revenue (Revenue account)
        SELECT id INTO v_revenue_account_id
        FROM chart_of_accounts 
        WHERE company_id = v_company_id 
        AND account_type = 'REVENUE'
        ORDER BY account_code
        LIMIT 1;
        
        -- Accounts Receivable (Asset account)
        SELECT id INTO v_receivable_account_id
        FROM chart_of_accounts 
        WHERE company_id = v_company_id 
        AND account_type = 'ASSET'
        AND (LOWER(account_name) LIKE '%receivable%' OR LOWER(account_name) LIKE '%debtor%')
        ORDER BY account_code
        LIMIT 1;
        
        -- Sales Tax Payable (Liability account)
        SELECT id INTO v_tax_payable_account_id
        FROM chart_of_accounts 
        WHERE company_id = v_company_id 
        AND account_type = 'LIABILITY'
        AND (LOWER(account_name) LIKE '%tax%' OR LOWER(account_name) LIKE '%vat%')
        ORDER BY account_code
        LIMIT 1;
        
        -- Inventory/Expense (Asset or Expense account)
        SELECT id INTO v_inventory_account_id
        FROM chart_of_accounts 
        WHERE company_id = v_company_id 
        AND (account_type = 'ASSET' OR account_type = 'EXPENSE')
        AND (LOWER(account_name) LIKE '%inventory%' OR LOWER(account_name) LIKE '%cost%' OR LOWER(account_name) LIKE '%expense%')
        ORDER BY account_code
        LIMIT 1;
        
        -- Accounts Payable (Liability account)
        SELECT id INTO v_payable_account_id
        FROM chart_of_accounts 
        WHERE company_id = v_company_id 
        AND account_type = 'LIABILITY'
        AND (LOWER(account_name) LIKE '%payable%' OR LOWER(account_name) LIKE '%creditor%')
        ORDER BY account_code
        LIMIT 1;
        
        -- Update company defaults
        UPDATE companies SET
            default_sales_revenue_account_id = v_revenue_account_id,
            accounts_receivable_account_id = v_receivable_account_id,
            sales_tax_payable_account_id = v_tax_payable_account_id,
            default_inventory_account_id = v_inventory_account_id,
            accounts_payable_account_id = v_payable_account_id
        WHERE id = v_company_id;
        
        -- Insert account mappings if they don't exist
        -- Sales Invoice mappings
        IF v_revenue_account_id IS NOT NULL THEN
            INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
            VALUES (v_company_id, 'SALES_INVOICE', 'sales_account', v_revenue_account_id, 'Default sales revenue account')
            ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        END IF;
        
        IF v_receivable_account_id IS NOT NULL THEN
            INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
            VALUES (v_company_id, 'SALES_INVOICE', 'receivable_account', v_receivable_account_id, 'Default accounts receivable account')
            ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        END IF;
        
        IF v_tax_payable_account_id IS NOT NULL THEN
            INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
            VALUES (v_company_id, 'SALES_INVOICE', 'tax_payable_account', v_tax_payable_account_id, 'Default sales tax payable account')
            ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        END IF;
        
        -- Purchase Invoice mappings
        IF v_inventory_account_id IS NOT NULL THEN
            INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
            VALUES (v_company_id, 'PURCHASE_INVOICE', 'inventory_account', v_inventory_account_id, 'Default inventory/expense account')
            ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        END IF;
        
        IF v_payable_account_id IS NOT NULL THEN
            INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
            VALUES (v_company_id, 'PURCHASE_INVOICE', 'payable_account', v_payable_account_id, 'Default accounts payable account')
            ON CONFLICT (company_id, mapping_type, mapping_name) DO NOTHING;
        END IF;
        
        RAISE NOTICE 'Set up account mappings for company %', v_company_id;
        
    END LOOP;
END $$;

-- =====================================================
-- 7. VERIFICATION AND TESTING
-- =====================================================

-- Show current setup status
SELECT '=== SALES INVOICE JOURNAL ENTRY SETUP COMPLETE ===' as status;

-- Check if functions exist
SELECT 'Functions exist:' as info,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_sales_invoice_journal_entry') as sales_function_exists,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_purchase_invoice_journal_entry') as purchase_function_exists;

-- Check if triggers exist
SELECT 'Triggers exist:' as info,
    COUNT(*) FILTER (WHERE trigger_name = 'trigger_sales_invoice_journal') as sales_trigger_count,
    COUNT(*) FILTER (WHERE trigger_name = 'trigger_purchase_invoice_journal') as purchase_trigger_count
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_sales_invoice_journal', 'trigger_purchase_invoice_journal');

-- Show account mappings for the first company
SELECT 'Account Mappings:' as info,
    am.mapping_type,
    am.mapping_name,
    ca.account_name,
    ca.account_code,
    ca.account_type
FROM account_mappings am
JOIN chart_of_accounts ca ON am.account_id = ca.id
JOIN companies c ON am.company_id = c.id
ORDER BY am.mapping_type, am.mapping_name
LIMIT 10;

-- Show company default accounts
SELECT 'Company Default Accounts:' as info,
    c.name as company_name,
    COALESCE(rev.account_name, 'NOT SET') as sales_revenue_account,
    COALESCE(rec.account_name, 'NOT SET') as receivable_account,
    COALESCE(tax.account_name, 'NOT SET') as tax_payable_account,
    COALESCE(inv.account_name, 'NOT SET') as inventory_account,
    COALESCE(pay.account_name, 'NOT SET') as payable_account
FROM companies c
LEFT JOIN chart_of_accounts rev ON c.default_sales_revenue_account_id = rev.id
LEFT JOIN chart_of_accounts rec ON c.accounts_receivable_account_id = rec.id
LEFT JOIN chart_of_accounts tax ON c.sales_tax_payable_account_id = tax.id
LEFT JOIN chart_of_accounts inv ON c.default_inventory_account_id = inv.id
LEFT JOIN chart_of_accounts pay ON c.accounts_payable_account_id = pay.id
ORDER BY c.name;
