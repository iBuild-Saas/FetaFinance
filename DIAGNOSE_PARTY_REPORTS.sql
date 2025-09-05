-- Diagnostic script to check party tracking setup and data

-- 1. Check if party tracking columns exist in journal_entry_lines
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'journal_entry_lines' 
  AND column_name IN ('customer_id', 'supplier_id', 'party_type', 'due_date', 'reference_document_type', 'reference_document_id')
ORDER BY column_name;

-- 2. Check if views exist
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name IN ('customer_receivables', 'supplier_payables', 'customer_receivables_aging', 'supplier_payables_aging')
ORDER BY table_name;

-- 3. Check if we have any journal entries with party data
SELECT 
    COUNT(*) as total_lines,
    COUNT(CASE WHEN party_type = 'CUSTOMER' THEN 1 END) as customer_lines,
    COUNT(CASE WHEN party_type = 'SUPPLIER' THEN 1 END) as supplier_lines,
    COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as lines_with_customer_id,
    COUNT(CASE WHEN supplier_id IS NOT NULL THEN 1 END) as lines_with_supplier_id
FROM journal_entry_lines;

-- 4. Sample journal entry lines with party data
SELECT 
    jel.id,
    je.reference,
    jel.party_type,
    jel.customer_id,
    jel.supplier_id,
    c.name as customer_name,
    s.name as supplier_name,
    jel.debit_amount,
    jel.credit_amount
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
LEFT JOIN customers c ON jel.customer_id = c.id
LEFT JOIN suppliers s ON jel.supplier_id = s.id
WHERE jel.party_type IS NOT NULL
LIMIT 10;

-- 5. Test customer_receivables view
SELECT COUNT(*) as receivables_count FROM customer_receivables;

-- 6. Test supplier_payables view  
SELECT COUNT(*) as payables_count FROM supplier_payables;

-- 7. Test aging views
SELECT COUNT(*) as customer_aging_count FROM customer_receivables_aging;
SELECT COUNT(*) as supplier_aging_count FROM supplier_payables_aging;

-- 8. Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN ('get_customer_balance', 'get_supplier_balance')
ORDER BY routine_name;
