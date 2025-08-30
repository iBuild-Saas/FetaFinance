-- Complete setup script for Journal Entries System
-- This script creates all necessary tables in the correct order

-- Step 1: Create Chart of Accounts table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    company_id UUID REFERENCES companies(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chart_of_accounts
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_id ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_id ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_account_code ON chart_of_accounts(account_code);

-- Create function to update updated_at timestamp for chart_of_accounts
CREATE OR REPLACE FUNCTION update_chart_of_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at for chart_of_accounts
DROP TRIGGER IF EXISTS trigger_update_chart_of_accounts_updated_at ON chart_of_accounts;
CREATE TRIGGER trigger_update_chart_of_accounts_updated_at
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_chart_of_accounts_updated_at();

-- Step 2: Create Journal Entries table
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) NOT NULL,
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    reference VARCHAR(100),
    memo TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'VOID')),
    total_debit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_credit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    is_balanced BOOLEAN DEFAULT false,
    posted_by UUID REFERENCES auth.users(id),
    posted_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create Journal Entry Lines table
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
    line_number INTEGER NOT NULL,
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create constraints and indexes
-- Drop existing constraint if it exists, then create new one
DO $$
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_journal_entry_number_per_company'
    ) THEN
        ALTER TABLE journal_entries DROP CONSTRAINT unique_journal_entry_number_per_company;
    END IF;
    
    -- Create the constraint
    ALTER TABLE journal_entries 
    ADD CONSTRAINT unique_journal_entry_number_per_company 
    UNIQUE (entry_number, company_id);
END $$;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_number ON journal_entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_line_number ON journal_entry_lines(journal_entry_id, line_number);

-- Step 5: Create functions and triggers for journal entries
-- Function to update updated_at timestamp for journal_entries
CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for journal_entry_lines
CREATE OR REPLACE FUNCTION update_journal_entry_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if journal entry is balanced
CREATE OR REPLACE FUNCTION check_journal_entry_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the is_balanced flag based on total_debit and total_credit
    UPDATE journal_entries 
    SET is_balanced = (total_debit = total_credit)
    WHERE id = NEW.journal_entry_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update totals when lines change
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update totals in journal_entries table
    UPDATE journal_entries 
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit_amount), 0)
            FROM journal_entry_lines
            WHERE journal_entry_id = NEW.journal_entry_id
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit_amount), 0)
            FROM journal_entry_lines
            WHERE journal_entry_id = NEW.journal_entry_id
        )
    WHERE id = NEW.journal_entry_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create triggers
-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS trigger_update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER trigger_update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entries_updated_at();

DROP TRIGGER IF EXISTS trigger_update_journal_entry_lines_updated_at ON journal_entry_lines;
CREATE TRIGGER trigger_update_journal_entry_lines_updated_at
    BEFORE UPDATE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entry_lines_updated_at();

DROP TRIGGER IF EXISTS trigger_check_journal_entry_balance ON journal_entry_lines;
CREATE TRIGGER trigger_check_journal_entry_balance
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION check_journal_entry_balance();

DROP TRIGGER IF EXISTS trigger_update_journal_entry_totals ON journal_entry_lines;
CREATE TRIGGER trigger_update_journal_entry_totals
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entry_totals();

-- Step 7: Insert sample chart of accounts for testing (optional)
-- This will create basic accounts for the first company in your system
DO $$
DECLARE
    first_company_id UUID;
BEGIN
    -- Get the first company ID
    SELECT id INTO first_company_id FROM companies LIMIT 1;
    
    -- Only insert if we have a company and no accounts exist yet
    IF first_company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = first_company_id) THEN
        -- Insert root accounts
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
        VALUES 
            ('1000', 'Assets', 'ASSET', NULL, first_company_id, 'DEBIT', 'All company assets'),
            ('2000', 'Liabilities', 'LIABILITY', NULL, first_company_id, 'CREDIT', 'All company liabilities'),
            ('3000', 'Equity', 'EQUITY', NULL, first_company_id, 'CREDIT', 'Owner equity and retained earnings'),
            ('4000', 'Revenue', 'REVENUE', NULL, first_company_id, 'CREDIT', 'All income and revenue accounts'),
            ('5000', 'Expenses', 'EXPENSE', NULL, first_company_id, 'DEBIT', 'All expense accounts');
        
        -- Insert common sub-accounts under Assets
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
        SELECT 
            '1100', 'Current Assets', 'ASSET', 
            (SELECT id FROM chart_of_accounts WHERE account_code = '1000' AND company_id = first_company_id), 
            first_company_id, 'DEBIT', 'Assets that can be converted to cash within one year';
        
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
        SELECT 
            '1110', 'Cash and Cash Equivalents', 'ASSET', 
            (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = first_company_id), 
            first_company_id, 'DEBIT', 'Cash, bank accounts, and short-term investments';
        
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
        SELECT 
            '1120', 'Accounts Receivable', 'ASSET', 
            (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = first_company_id), 
            first_company_id, 'DEBIT', 'Amounts owed by customers';
        
        -- Insert common sub-accounts under Liabilities
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
        SELECT 
            '2100', 'Current Liabilities', 'LIABILITY', 
            (SELECT id FROM chart_of_accounts WHERE account_code = '2000' AND company_id = first_company_id), 
            first_company_id, 'CREDIT', 'Liabilities due within one year';
        
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
        SELECT 
            '2110', 'Accounts Payable', 'LIABILITY', 
            (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = first_company_id), 
            first_company_id, 'CREDIT', 'Amounts owed to suppliers';
        
        RAISE NOTICE 'Sample chart of accounts created for company %', first_company_id;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE chart_of_accounts IS 'Chart of accounts for each company';
COMMENT ON TABLE journal_entries IS 'Main table for accounting journal entries';
COMMENT ON TABLE journal_entry_lines IS 'Individual line items for journal entries';
COMMENT ON COLUMN journal_entries.entry_number IS 'Unique journal entry number (format: JE-YYYYMMDD-0001)';
COMMENT ON COLUMN journal_entries.status IS 'Entry status: DRAFT, POSTED, VOID';
COMMENT ON COLUMN journal_entries.is_balanced IS 'Whether debits equal credits (automatically calculated)';
COMMENT ON COLUMN journal_entry_lines.line_number IS 'Sequential line number within the journal entry';
COMMENT ON COLUMN journal_entry_lines.debit_amount IS 'Debit amount for this line (only one of debit/credit should be > 0)';
COMMENT ON COLUMN journal_entry_lines.credit_amount IS 'Credit amount for this line (only one of debit/credit should be > 0)';

-- Final verification
SELECT 'Journal Entries System Setup Complete!' as status;
SELECT COUNT(*) as chart_of_accounts_count FROM chart_of_accounts;
SELECT COUNT(*) as journal_entries_count FROM journal_entries;
SELECT COUNT(*) as journal_entry_lines_count FROM journal_entry_lines;
