-- Create journal entries table for proper accounting journal entries
-- This script creates a comprehensive journal entry system with proper double-entry accounting

-- Create the journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) NOT NULL,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
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

-- Create journal entry lines table
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

-- Create unique constraint on entry_number per company
ALTER TABLE journal_entries 
ADD CONSTRAINT unique_journal_entry_number_per_company 
UNIQUE (entry_number, company_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_number ON journal_entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_line_number ON journal_entry_lines(journal_entry_id, line_number);

-- Create function to update updated_at timestamp for journal_entries
CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp for journal_entry_lines
CREATE OR REPLACE FUNCTION update_journal_entry_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at for journal_entries
CREATE TRIGGER trigger_update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entries_updated_at();

-- Create trigger to automatically update updated_at for journal_entry_lines
CREATE TRIGGER trigger_update_journal_entry_lines_updated_at
    BEFORE UPDATE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entry_lines_updated_at();

-- Create function to generate entry number
CREATE OR REPLACE FUNCTION generate_journal_entry_number(company_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    entry_num VARCHAR;
BEGIN
    -- Get the next number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 'JE-([0-9]+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM journal_entries
    WHERE company_id = company_uuid;
    
    -- Format: JE-YYYYMMDD-0001
    entry_num := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN entry_num;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if journal entry is balanced
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

-- Create trigger to check balance when lines are updated
CREATE TRIGGER trigger_check_journal_entry_balance
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION check_journal_entry_balance();

-- Create function to update totals when lines change
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

-- Create trigger to update totals when lines change
CREATE TRIGGER trigger_update_journal_entry_totals
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_entry_totals();

-- Add comments for documentation
COMMENT ON TABLE journal_entries IS 'Main table for accounting journal entries';
COMMENT ON TABLE journal_entry_lines IS 'Individual line items for journal entries';
COMMENT ON COLUMN journal_entries.entry_number IS 'Unique journal entry number (format: JE-YYYYMMDD-0001)';
COMMENT ON COLUMN journal_entries.status IS 'Entry status: DRAFT, POSTED, VOID';
COMMENT ON COLUMN journal_entries.is_balanced IS 'Whether debits equal credits (automatically calculated)';
COMMENT ON COLUMN journal_entry_lines.line_number IS 'Sequential line number within the journal entry';
COMMENT ON COLUMN journal_entry_lines.debit_amount IS 'Debit amount for this line (only one of debit/credit should be > 0)';
COMMENT ON COLUMN journal_entry_lines.credit_amount IS 'Credit amount for this line (only one of debit/credit should be > 0)';
