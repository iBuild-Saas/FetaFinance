-- Dynamic Account Mapping System
-- This script creates a flexible system where users can configure which accounts to use for auto journal entries

-- =====================================================
-- 1. ACCOUNT MAPPING CONFIGURATION TABLE
-- =====================================================

-- Create account_mapping_config table for flexible account assignment
CREATE TABLE IF NOT EXISTS account_mapping_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- SALES_INVOICE, PURCHASE_INVOICE
    mapping_key VARCHAR(50) NOT NULL, -- receivable_account, sales_account, tax_payable_account, etc.
    account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, transaction_type, mapping_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_mapping_company_type ON account_mapping_config(company_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_account_mapping_key ON account_mapping_config(mapping_key);

-- =====================================================
-- 2. CUSTOMER/SUPPLIER ACCOUNT CONFIGURATION
-- =====================================================

-- Add default account columns to customers table if they don't exist
DO $$
BEGIN
    -- Check if receivable_account_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'receivable_account_id'
    ) THEN
        ALTER TABLE customers ADD COLUMN receivable_account_id UUID REFERENCES chart_of_accounts(id);
        COMMENT ON COLUMN customers.receivable_account_id IS 'Default receivable account for this customer';
    END IF;
END $$;

-- Add default account columns to suppliers table if they don't exist
DO $$
BEGIN
    -- Check if payable_account_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'suppliers' 
        AND column_name = 'payable_account_id'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN payable_account_id UUID REFERENCES chart_of_accounts(id);
        COMMENT ON COLUMN suppliers.payable_account_id IS 'Default payable account for this supplier';
    END IF;
END $$;

-- Add default account columns to items table if they don't exist
DO $$
BEGIN
    -- Check if income_account_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'income_account_id'
    ) THEN
        ALTER TABLE items ADD COLUMN income_account_id UUID REFERENCES chart_of_accounts(id);
        COMMENT ON COLUMN items.income_account_id IS 'Default income/sales account for this item';
    END IF;
    
    -- Check if expense_account_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'expense_account_id'
    ) THEN
        ALTER TABLE items ADD COLUMN expense_account_id UUID REFERENCES chart_of_accounts(id);
        COMMENT ON COLUMN items.expense_account_id IS 'Default expense/inventory account for this item';
    END IF;
END $$;

-- =====================================================
-- 3. HELPER FUNCTIONS FOR ACCOUNT MAPPING
-- =====================================================

-- Function to get account mapping for a transaction type
CREATE OR REPLACE FUNCTION get_account_mapping(
    p_company_id UUID,
    p_transaction_type VARCHAR(50),
    p_mapping_key VARCHAR(50)
)
RETURNS UUID AS $$
DECLARE
    mapped_account_id UUID;
BEGIN
    SELECT account_id INTO mapped_account_id
    FROM account_mapping_config
    WHERE company_id = p_company_id
    AND transaction_type = p_transaction_type
    AND mapping_key = p_mapping_key
    AND is_active = true;
    
    RETURN mapped_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to set account mapping
CREATE OR REPLACE FUNCTION set_account_mapping(
    p_company_id UUID,
    p_transaction_type VARCHAR(50),
    p_mapping_key VARCHAR(50),
    p_account_id UUID,
    p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO account_mapping_config (
        company_id, transaction_type, mapping_key, account_id, description
    )
    VALUES (
        p_company_id, p_transaction_type, p_mapping_key, p_account_id, p_description
    )
    ON CONFLICT (company_id, transaction_type, mapping_key)
    DO UPDATE SET
        account_id = EXCLUDED.account_id,
        description = EXCLUDED.description,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. UPDATED AUTO JOURNAL ENTRY FUNCTIONS
-- =====================================================

-- Updated function to create journal entry from sales invoice with dynamic accounts
CREATE OR REPLACE FUNCTION create_sales_invoice_journal_entry_dynamic(
    p_invoice_id UUID
)
RETURNS UUID AS $$
DECLARE
    invoice_record RECORD;
    customer_record RECORD;
    line_item RECORD;
    journal_entry_id UUID;
    entry_number VARCHAR(50);
    line_number INTEGER := 1;
    total_debit DECIMAL(15,2) := 0;
    total_credit DECIMAL(15,2) := 0;
    receivable_account_id UUID;
    tax_payable_account_id UUID;
    default_sales_account_id UUID;
BEGIN
    -- Get invoice details
    SELECT * INTO invoice_record
    FROM sales_invoices
    WHERE id = p_invoice_id;
    
    -- Get customer details
    SELECT * INTO customer_record
    FROM customers
    WHERE id = invoice_record.customer_id;
    
    -- Get account mappings
    receivable_account_id := get_account_mapping(
        invoice_record.company_id, 'SALES_INVOICE', 'receivable_account'
    );
    
    tax_payable_account_id := get_account_mapping(
        invoice_record.company_id, 'SALES_INVOICE', 'tax_payable_account'
    );
    
    default_sales_account_id := get_account_mapping(
        invoice_record.company_id, 'SALES_INVOICE', 'default_sales_account'
    );
    
    -- Use customer's specific receivable account if configured
    IF customer_record.receivable_account_id IS NOT NULL THEN
        receivable_account_id := customer_record.receivable_account_id;
    END IF;
    
    -- Check if we have required account mappings
    IF receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No receivable account configured for sales invoices in company %', invoice_record.company_id;
    END IF;
    
    -- Generate journal entry number
    entry_number := 'SI-JE-' || invoice_record.invoice_number;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced
    )
    VALUES (
        invoice_record.company_id, entry_number, invoice_record.invoice_date,
        'Sales Invoice: ' || invoice_record.invoice_number,
        'Auto-generated from Sales Invoice: ' || invoice_record.invoice_number,
        'POSTED', 0, 0, true
    )
    RETURNING id INTO journal_entry_id;
    
    -- Debit: Accounts Receivable
    INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, line_number, description,
        debit_amount, credit_amount
    )
    VALUES (
        journal_entry_id, 
        receivable_account_id,
        line_number,
        'Sales to ' || customer_record.name,
        invoice_record.total_amount,
        0
    );
    total_debit := total_debit + invoice_record.total_amount;
    line_number := line_number + 1;
    
    -- Credit: Sales Revenue (for each line item)
    FOR line_item IN 
        SELECT ili.*, i.income_account_id
        FROM invoice_line_items ili
        LEFT JOIN items i ON ili.item_id = i.id
        WHERE ili.invoice_id = p_invoice_id
    LOOP
        -- Use item's specific income account, or default sales account, or skip if no mapping
        DECLARE
            sales_account_id UUID;
        BEGIN
            sales_account_id := COALESCE(
                line_item.income_account_id,
                default_sales_account_id
            );
            
            IF sales_account_id IS NOT NULL THEN
                INSERT INTO journal_entry_lines (
                    journal_entry_id, 
                    account_id,
                    line_number, 
                    description,
                    debit_amount, 
                    credit_amount
                )
                VALUES (
                    journal_entry_id,
                    sales_account_id,
                    line_number,
                    line_item.item_name || ' - ' || COALESCE(line_item.description, ''),
                    0,
                    line_item.line_total - line_item.tax_amount
                );
                total_credit := total_credit + (line_item.line_total - line_item.tax_amount);
                line_number := line_number + 1;
            END IF;
        END;
        
        -- Create stock movement for inventory items
        IF line_item.item_id IS NOT NULL THEN
            PERFORM create_stock_movement(
                invoice_record.company_id,
                line_item.item_id,
                line_item.quantity,
                0, -- Cost is 0 for sales (we'll use average cost)
                'OUT',
                'SALE',
                'sales_invoice',
                p_invoice_id,
                invoice_record.invoice_number,
                'Sale to ' || customer_record.name
            );
        END IF;
    END LOOP;
    
    -- Credit: Tax Payable (if there's tax and account is configured)
    IF invoice_record.tax_amount > 0 AND tax_payable_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            line_number,
            description,
            debit_amount,
            credit_amount
        )
        VALUES (
            journal_entry_id,
            tax_payable_account_id,
            line_number,
            'Sales Tax on Invoice ' || invoice_record.invoice_number,
            0,
            invoice_record.tax_amount
        );
        total_credit := total_credit + invoice_record.tax_amount;
    END IF;
    
    -- Update journal entry totals
    UPDATE journal_entries
    SET 
        total_debit = total_debit,
        total_credit = total_credit,
        is_balanced = (total_debit = total_credit)
    WHERE id = journal_entry_id;
    
    RETURN journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Updated function to create journal entry from purchase invoice with dynamic accounts
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry_dynamic(
    p_invoice_id UUID
)
RETURNS UUID AS $$
DECLARE
    invoice_record RECORD;
    supplier_record RECORD;
    line_item RECORD;
    journal_entry_id UUID;
    entry_number VARCHAR(50);
    line_number INTEGER := 1;
    total_debit DECIMAL(15,2) := 0;
    total_credit DECIMAL(15,2) := 0;
    payable_account_id UUID;
    tax_receivable_account_id UUID;
    default_inventory_account_id UUID;
BEGIN
    -- Get invoice details
    SELECT * INTO invoice_record
    FROM purchase_invoices
    WHERE id = p_invoice_id;
    
    -- Get supplier details
    SELECT * INTO supplier_record
    FROM suppliers
    WHERE id = invoice_record.supplier_id;
    
    -- Get account mappings
    payable_account_id := get_account_mapping(
        invoice_record.company_id, 'PURCHASE_INVOICE', 'payable_account'
    );
    
    tax_receivable_account_id := get_account_mapping(
        invoice_record.company_id, 'PURCHASE_INVOICE', 'tax_receivable_account'
    );
    
    default_inventory_account_id := get_account_mapping(
        invoice_record.company_id, 'PURCHASE_INVOICE', 'default_inventory_account'
    );
    
    -- Use supplier's specific payable account if configured
    IF supplier_record.payable_account_id IS NOT NULL THEN
        payable_account_id := supplier_record.payable_account_id;
    END IF;
    
    -- Check if we have required account mappings
    IF payable_account_id IS NULL THEN
        RAISE EXCEPTION 'No payable account configured for purchase invoices in company %', invoice_record.company_id;
    END IF;
    
    -- Generate journal entry number
    entry_number := 'PI-JE-' || invoice_record.invoice_number;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced
    )
    VALUES (
        invoice_record.company_id, entry_number, invoice_record.invoice_date,
        'Purchase Invoice: ' || invoice_record.invoice_number,
        'Auto-generated from Purchase Invoice: ' || invoice_record.invoice_number,
        'POSTED', 0, 0, true
    )
    RETURNING id INTO journal_entry_id;
    
    -- Debit: Inventory/Expense (for each line item)
    FOR line_item IN 
        SELECT pili.*, i.expense_account_id
        FROM purchase_invoice_line_items pili
        LEFT JOIN items i ON pili.item_id = i.id
        WHERE pili.invoice_id = p_invoice_id
    LOOP
        -- Use item's specific expense account, or default inventory account, or skip if no mapping
        DECLARE
            expense_account_id UUID;
        BEGIN
            expense_account_id := COALESCE(
                line_item.expense_account_id,
                default_inventory_account_id
            );
            
            IF expense_account_id IS NOT NULL THEN
                INSERT INTO journal_entry_lines (
                    journal_entry_id,
                    account_id,
                    line_number,
                    description,
                    debit_amount,
                    credit_amount
                )
                VALUES (
                    journal_entry_id,
                    expense_account_id,
                    line_number,
                    line_item.item_name || ' - ' || COALESCE(line_item.description, ''),
                    line_item.line_total - line_item.tax_amount,
                    0
                );
                total_debit := total_debit + (line_item.line_total - line_item.tax_amount);
                line_number := line_number + 1;
            END IF;
        END;
        
        -- Create stock movement for inventory items
        IF line_item.item_id IS NOT NULL THEN
            PERFORM create_stock_movement(
                invoice_record.company_id,
                line_item.item_id,
                line_item.quantity,
                line_item.unit_price,
                'IN',
                'PURCHASE',
                'purchase_invoice',
                p_invoice_id,
                invoice_record.invoice_number,
                'Purchase from ' || supplier_record.name
            );
        END IF;
    END LOOP;
    
    -- Debit: Tax Receivable (if there's tax and account is configured)
    IF invoice_record.tax_amount > 0 AND tax_receivable_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            line_number,
            description,
            debit_amount,
            credit_amount
        )
        VALUES (
            journal_entry_id,
            tax_receivable_account_id,
            line_number,
            'Purchase Tax on Invoice ' || invoice_record.invoice_number,
            invoice_record.tax_amount,
            0
        );
        total_debit := total_debit + invoice_record.tax_amount;
        line_number := line_number + 1;
    END IF;
    
    -- Credit: Accounts Payable
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        line_number,
        description,
        debit_amount,
        credit_amount
    )
    VALUES (
        journal_entry_id,
        payable_account_id,
        line_number,
        'Purchase from ' || supplier_record.name,
        0,
        invoice_record.total_amount
    );
    total_credit := total_credit + invoice_record.total_amount;
    
    -- Update journal entry totals
    UPDATE journal_entries
    SET 
        total_debit = total_debit,
        total_credit = total_credit,
        is_balanced = (total_debit = total_credit)
    WHERE id = journal_entry_id;
    
    RETURN journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. UPDATE TRIGGERS TO USE DYNAMIC FUNCTIONS
-- =====================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_sales_invoice_auto_journal ON sales_invoices;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_auto_journal ON purchase_invoices;

-- Trigger function for sales invoice journal entry creation (dynamic)
CREATE OR REPLACE FUNCTION trigger_create_sales_invoice_journal_dynamic()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create journal entry when status changes to SUBMITTED or PAID
    IF NEW.status IN ('SUBMITTED', 'PAID') AND 
       (OLD IS NULL OR OLD.status != NEW.status) THEN
        
        -- Check if journal entry already exists
        IF NOT EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE reference = 'Sales Invoice: ' || NEW.invoice_number
            AND company_id = NEW.company_id
        ) THEN
            PERFORM create_sales_invoice_journal_entry_dynamic(NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the invoice creation
        RAISE WARNING 'Failed to create auto journal entry for sales invoice %: %', NEW.invoice_number, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for purchase invoice journal entry creation (dynamic)
CREATE OR REPLACE FUNCTION trigger_create_purchase_invoice_journal_dynamic()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create journal entry when status changes to RECEIVED or PAID
    IF NEW.status IN ('RECEIVED', 'PAID') AND 
       (OLD IS NULL OR OLD.status != NEW.status) THEN
        
        -- Check if journal entry already exists
        IF NOT EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE reference = 'Purchase Invoice: ' || NEW.invoice_number
            AND company_id = NEW.company_id
        ) THEN
            PERFORM create_purchase_invoice_journal_entry_dynamic(NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the invoice creation
        RAISE WARNING 'Failed to create auto journal entry for purchase invoice %: %', NEW.invoice_number, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new triggers
CREATE TRIGGER trigger_sales_invoice_auto_journal_dynamic
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_sales_invoice_journal_dynamic();

CREATE TRIGGER trigger_purchase_invoice_auto_journal_dynamic
    AFTER INSERT OR UPDATE ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_purchase_invoice_journal_dynamic();

-- =====================================================
-- 6. UTILITY FUNCTIONS AND VIEWS
-- =====================================================

-- Function to get all account mappings for a company
CREATE OR REPLACE FUNCTION get_company_account_mappings(p_company_id UUID)
RETURNS TABLE (
    transaction_type VARCHAR(50),
    mapping_key VARCHAR(50),
    account_id UUID,
    account_code VARCHAR(20),
    account_name VARCHAR(255),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        amc.transaction_type,
        amc.mapping_key,
        amc.account_id,
        coa.account_code,
        coa.account_name,
        amc.description
    FROM account_mapping_config amc
    JOIN chart_of_accounts coa ON amc.account_id = coa.id
    WHERE amc.company_id = p_company_id
    AND amc.is_active = true
    ORDER BY amc.transaction_type, amc.mapping_key;
END;
$$ LANGUAGE plpgsql;

-- View for account mapping configuration
CREATE OR REPLACE VIEW account_mapping_view AS
SELECT 
    amc.*,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    comp.name as company_name
FROM account_mapping_config amc
JOIN chart_of_accounts coa ON amc.account_id = coa.id
JOIN companies comp ON amc.company_id = comp.id
WHERE amc.is_active = true
ORDER BY comp.name, amc.transaction_type, amc.mapping_key;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON account_mapping_config TO authenticated;
GRANT SELECT ON account_mapping_view TO authenticated;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE account_mapping_config IS 'Dynamic account mapping configuration for auto journal entries';
COMMENT ON FUNCTION get_account_mapping IS 'Retrieves account mapping for a specific transaction type and key';
COMMENT ON FUNCTION set_account_mapping IS 'Sets or updates account mapping configuration';
COMMENT ON FUNCTION create_sales_invoice_journal_entry_dynamic IS 'Creates journal entry from sales invoice using dynamic account mapping';
COMMENT ON FUNCTION create_purchase_invoice_journal_entry_dynamic IS 'Creates journal entry from purchase invoice using dynamic account mapping';

SELECT 'Dynamic Account Mapping System Created Successfully!' as status;
