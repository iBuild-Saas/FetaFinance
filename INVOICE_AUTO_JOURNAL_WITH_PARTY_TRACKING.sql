-- Invoice Auto Journal Entry System with Customer/Supplier Tracking
-- Creates automatic journal entries for sales and purchase invoices with party tracking

-- Create function to generate journal entries for sales invoices
CREATE OR REPLACE FUNCTION create_sales_invoice_journal_entry(
    p_invoice_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_invoice RECORD;
    v_company RECORD;
    v_journal_entry_id UUID;
    v_entry_number TEXT;
    v_line_item RECORD;
    v_line_number INTEGER := 1;
BEGIN
    -- Get sales invoice details
    SELECT si.*, c.name as customer_name
    INTO v_invoice
    FROM sales_invoices si
    LEFT JOIN customers c ON si.customer_id = c.id
    WHERE si.id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales invoice not found: %', p_invoice_id;
    END IF;
    
    -- Get company with default accounts
    SELECT c.*, 
           ar.id as ar_account_id, 
           sr.id as sales_revenue_account_id,
           st.id as sales_tax_account_id
    INTO v_company
    FROM companies c
    LEFT JOIN chart_of_accounts ar ON c.default_accounts_receivable_id = ar.id
    LEFT JOIN chart_of_accounts sr ON sr.company_id = c.id AND sr.account_code = '4110' -- المبيعات
    LEFT JOIN chart_of_accounts st ON st.company_id = c.id AND st.account_code = '2140' -- Sales Tax Payable
    WHERE c.id = v_invoice.company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Company not found: %', v_invoice.company_id;
    END IF;
    
    IF v_company.ar_account_id IS NULL THEN
        RAISE EXCEPTION 'Company % does not have default Accounts Receivable account configured', v_invoice.company_id;
    END IF;
    
    -- Generate journal entry number
    SELECT 'JE-SI-' || LPAD(NEXTVAL('journal_entry_number_seq')::TEXT, 6, '0')
    INTO v_entry_number;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        reference,
        memo,
        status,
        source_type,
        source_id,
        is_active
    ) VALUES (
        gen_random_uuid(),
        v_invoice.company_id,
        v_entry_number,
        v_invoice.invoice_date::DATE,
        'Sales Invoice: ' || v_invoice.invoice_number,
        'Auto-generated from sales invoice: ' || v_invoice.invoice_number || ' - ' || COALESCE(v_invoice.customer_name, 'Customer'),
        'POSTED',
        'SALES_INVOICE',
        v_invoice.id,
        true
    ) RETURNING id INTO v_journal_entry_id;
    
    -- Create AR debit line (total amount including tax)
    INSERT INTO journal_entry_lines (
        id,
        journal_entry_id,
        line_number,
        account_id,
        description,
        debit_amount,
        credit_amount,
        customer_id,
        party_type,
        reference_document_type,
        reference_document_id,
        due_date
    ) VALUES (
        gen_random_uuid(),
        v_journal_entry_id,
        v_line_number,
        v_company.ar_account_id,
        'Sales Invoice: ' || v_invoice.invoice_number,
        v_invoice.total_amount,
        0,
        v_invoice.customer_id,
        'CUSTOMER',
        'SALES_INVOICE',
        v_invoice.id,
        v_invoice.due_date
    );
    
    v_line_number := v_line_number + 1;
    
    -- Create sales revenue credit line
    IF v_company.sales_revenue_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            id,
            journal_entry_id,
            line_number,
            account_id,
            description,
            debit_amount,
            credit_amount,
            reference_document_type,
            reference_document_id
        ) VALUES (
            gen_random_uuid(),
            v_journal_entry_id,
            v_line_number,
            v_company.sales_revenue_account_id,
            'Sales Revenue: ' || v_invoice.invoice_number,
            0,
            v_invoice.total_amount,
            'SALES_INVOICE',
            v_invoice.id
        );
        
        v_line_number := v_line_number + 1;
    END IF;
    
    -- Create sales tax credit line if there's tax
    IF v_invoice.tax_amount > 0 AND v_company.sales_tax_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            id,
            journal_entry_id,
            line_number,
            account_id,
            description,
            debit_amount,
            credit_amount,
            reference_document_type,
            reference_document_id
        ) VALUES (
            gen_random_uuid(),
            v_journal_entry_id,
            v_line_number,
            v_company.sales_tax_account_id,
            'Sales Tax: ' || v_invoice.invoice_number,
            0,
            v_invoice.tax_amount,
            'SALES_INVOICE',
            v_invoice.id
        );
    END IF;
    
    RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry(UUID);

-- Create function to generate journal entries for purchase invoices
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry(
    p_invoice_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_invoice RECORD;
    v_company RECORD;
    v_journal_entry_id UUID;
    v_entry_number TEXT;
    v_line_item RECORD;
    v_line_number INTEGER := 1;
BEGIN
    -- Get purchase invoice details
    SELECT pi.*, s.name as supplier_name
    INTO v_invoice
    FROM purchase_invoices pi
    LEFT JOIN suppliers s ON pi.supplier_id = s.id
    WHERE pi.id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase invoice not found: %', p_invoice_id;
    END IF;
    
    -- Get company with default accounts
    SELECT c.*, 
           ap.id as ap_account_id,
           inv.id as inventory_account_id,
           exp.id as expense_account_id
    INTO v_company
    FROM companies c
    LEFT JOIN chart_of_accounts ap ON c.default_accounts_payable_id = ap.id
    LEFT JOIN chart_of_accounts inv ON inv.company_id = c.id AND inv.account_code = '1130' -- Inventory
    LEFT JOIN chart_of_accounts exp ON exp.company_id = c.id AND exp.account_code = '5110' -- تكلفة المبيعات
    WHERE c.id = v_invoice.company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Company not found: %', v_invoice.company_id;
    END IF;
    
    IF v_company.ap_account_id IS NULL THEN
        RAISE EXCEPTION 'Company % does not have default Accounts Payable account configured', v_invoice.company_id;
    END IF;
    
    -- Generate journal entry number
    SELECT 'JE-PI-' || LPAD(NEXTVAL('journal_entry_number_seq')::TEXT, 6, '0')
    INTO v_entry_number;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        reference,
        memo,
        status,
        source_type,
        source_id,
        is_active
    ) VALUES (
        gen_random_uuid(),
        v_invoice.company_id,
        v_entry_number,
        v_invoice.invoice_date::DATE,
        'Purchase Invoice: ' || v_invoice.invoice_number,
        'Auto-generated from purchase invoice: ' || v_invoice.invoice_number || ' - ' || COALESCE(v_invoice.supplier_name, 'Supplier'),
        'POSTED',
        'PURCHASE_INVOICE',
        v_invoice.id,
        true
    ) RETURNING id INTO v_journal_entry_id;
    
    -- Create inventory/expense debit line
    IF v_company.inventory_account_id IS NOT NULL THEN
        -- Use inventory account for goods
        INSERT INTO journal_entry_lines (
            id,
            journal_entry_id,
            line_number,
            account_id,
            description,
            debit_amount,
            credit_amount,
            reference_document_type,
            reference_document_id
        ) VALUES (
            gen_random_uuid(),
            v_journal_entry_id,
            v_line_number,
            v_company.inventory_account_id,
            'Inventory Purchase: ' || v_invoice.invoice_number,
            v_invoice.total_amount,
            0,
            'PURCHASE_INVOICE',
            v_invoice.id
        );
    ELSIF v_company.expense_account_id IS NOT NULL THEN
        -- Use expense account as fallback
        INSERT INTO journal_entry_lines (
            id,
            journal_entry_id,
            line_number,
            account_id,
            description,
            debit_amount,
            credit_amount,
            reference_document_type,
            reference_document_id
        ) VALUES (
            gen_random_uuid(),
            v_journal_entry_id,
            v_line_number,
            v_company.expense_account_id,
            'Expense: ' || v_invoice.invoice_number,
            v_invoice.total_amount,
            0,
            'PURCHASE_INVOICE',
            v_invoice.id
        );
    END IF;
    
    v_line_number := v_line_number + 1;
    
    -- Create AP credit line (total amount including tax)
    INSERT INTO journal_entry_lines (
        id,
        journal_entry_id,
        line_number,
        account_id,
        description,
        debit_amount,
        credit_amount,
        supplier_id,
        party_type,
        reference_document_type,
        reference_document_id,
        due_date
    ) VALUES (
        gen_random_uuid(),
        v_journal_entry_id,
        v_line_number,
        v_company.ap_account_id,
        'Purchase Invoice: ' || v_invoice.invoice_number,
        0,
        v_invoice.total_amount,
        v_invoice.supplier_id,
        'SUPPLIER',
        'PURCHASE_INVOICE',
        v_invoice.id,
        v_invoice.due_date
    );
    
    RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for sales invoices
CREATE OR REPLACE FUNCTION trigger_sales_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_entry_id UUID;
BEGIN
    -- Only create journal entry if status is SUBMITTED
    IF NEW.status = 'SUBMITTED' THEN
        -- Check if journal entry already exists for this invoice
        IF NOT EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE source_type = 'SALES_INVOICE' 
            AND source_id = NEW.id 
            AND is_active = true
        ) THEN
            -- Create journal entry
            SELECT create_sales_invoice_journal_entry(NEW.id) INTO v_journal_entry_id;
            
            RAISE NOTICE 'Created journal entry % for sales invoice %', v_journal_entry_id, NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for purchase invoices
CREATE OR REPLACE FUNCTION trigger_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_entry_id UUID;
BEGIN
    -- Only create journal entry if status is SUBMITTED
    IF NEW.status = 'SUBMITTED' THEN
        -- Check if journal entry already exists for this invoice
        IF NOT EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE source_type = 'PURCHASE_INVOICE' 
            AND source_id = NEW.id 
            AND is_active = true
        ) THEN
            -- Create journal entry
            SELECT create_purchase_invoice_journal_entry(NEW.id) INTO v_journal_entry_id;
            
            RAISE NOTICE 'Created journal entry % for purchase invoice %', v_journal_entry_id, NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on invoice tables
DROP TRIGGER IF EXISTS sales_invoice_journal_entry_trigger ON sales_invoices;
CREATE TRIGGER sales_invoice_journal_entry_trigger
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sales_invoice_journal_entry();

DROP TRIGGER IF EXISTS purchase_invoice_journal_entry_trigger ON purchase_invoices;
CREATE TRIGGER purchase_invoice_journal_entry_trigger
    AFTER INSERT OR UPDATE ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_purchase_invoice_journal_entry();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_sales_invoice_journal_entry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_purchase_invoice_journal_entry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_sales_invoice_journal_entry() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_purchase_invoice_journal_entry() TO authenticated;

SELECT 'Invoice auto journal entry system with party tracking created successfully' as status;
