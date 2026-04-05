<?php

use App\Support\LegacySchemaHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $helpers = new LegacySchemaHelper();

        $helpers->addColumnIfMissing('companies', 'default_warehouse_id', 'CHAR(36) NULL');
        $helpers->addColumnIfMissing('companies', 'default_sales_tax_rate', 'DECIMAL(5,2) NOT NULL DEFAULT 0.00');
        $helpers->addColumnIfMissing('companies', 'default_purchase_tax_rate', 'DECIMAL(5,2) NOT NULL DEFAULT 0.00');
        $helpers->addColumnIfMissing('companies', 'base_currency', 'VARCHAR(10) NULL');

        $this->extendCustomers($helpers);
        $this->extendSuppliers($helpers);

        $helpers->addColumnIfMissing('chart_of_accounts', 'is_group', 'TINYINT(1) NOT NULL DEFAULT 0');
        $helpers->addIndexIfMissing(
            'chart_of_accounts',
            'idx_chart_of_accounts_company_active',
            'CREATE INDEX idx_chart_of_accounts_company_active ON chart_of_accounts (company_id, is_active)'
        );

        $this->extendItems($helpers);
        $this->extendJournalEntries($helpers);
        $this->extendJournalEntryLines($helpers);
    }

    public function down(): void
    {
    }

    private function extendCustomers(LegacySchemaHelper $helpers): void
    {
        $columns = [
            'customer_code' => 'VARCHAR(50) NULL',
            'contact_person' => 'VARCHAR(255) NULL',
            'address' => 'TEXT NULL',
            'city' => 'VARCHAR(100) NULL',
            'state' => 'VARCHAR(100) NULL',
            'zip_code' => 'VARCHAR(20) NULL',
            'country' => 'VARCHAR(100) NULL',
            'tax_id' => 'VARCHAR(50) NULL',
            'credit_limit' => 'DECIMAL(15,2) NOT NULL DEFAULT 0.00',
            'payment_terms' => 'VARCHAR(100) NULL',
            'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'notes' => 'TEXT NULL',
            'website' => 'VARCHAR(255) NULL',
            'industry' => 'VARCHAR(100) NULL',
            'customer_type' => "ENUM('RETAIL','WHOLESALE','DISTRIBUTOR','CORPORATE') NOT NULL DEFAULT 'RETAIL'",
            'default_currency' => "VARCHAR(10) NOT NULL DEFAULT 'LYD'",
            'discount_percentage' => 'DECIMAL(5,2) NOT NULL DEFAULT 0.00',
            'receivable_account_id' => 'CHAR(36) NULL',
        ];

        foreach ($columns as $column => $definition) {
            $helpers->addColumnIfMissing('customers', $column, $definition);
        }

        DB::statement("
            UPDATE customers
            SET customer_code = CONCAT('CUST-', UPPER(LEFT(REPLACE(id, '-', ''), 8)))
            WHERE customer_code IS NULL OR customer_code = ''
        ");

        $helpers->addIndexIfMissing('customers', 'uq_customers_company_code', 'CREATE UNIQUE INDEX uq_customers_company_code ON customers (company_id, customer_code)');
        $helpers->addIndexIfMissing('customers', 'idx_customers_company_active', 'CREATE INDEX idx_customers_company_active ON customers (company_id, is_active)');
        $helpers->addIndexIfMissing('customers', 'idx_customers_receivable_account', 'CREATE INDEX idx_customers_receivable_account ON customers (receivable_account_id)');
        $helpers->addForeignKeyIfMissing('customers', 'fk_customers_receivable_account', 'ADD CONSTRAINT fk_customers_receivable_account FOREIGN KEY (receivable_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE');
    }

    private function extendSuppliers(LegacySchemaHelper $helpers): void
    {
        $columns = [
            'supplier_code' => 'VARCHAR(50) NULL',
            'contact_person' => 'VARCHAR(255) NULL',
            'address' => 'TEXT NULL',
            'city' => 'VARCHAR(100) NULL',
            'state' => 'VARCHAR(100) NULL',
            'zip_code' => 'VARCHAR(20) NULL',
            'country' => 'VARCHAR(100) NULL',
            'tax_id' => 'VARCHAR(50) NULL',
            'credit_limit' => 'DECIMAL(15,2) NOT NULL DEFAULT 0.00',
            'payment_terms' => 'VARCHAR(100) NULL',
            'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'notes' => 'TEXT NULL',
            'website' => 'VARCHAR(255) NULL',
            'industry' => 'VARCHAR(100) NULL',
            'supplier_type' => "ENUM('MANUFACTURER','DISTRIBUTOR','WHOLESALER','SERVICE') NOT NULL DEFAULT 'MANUFACTURER'",
            'default_currency' => "VARCHAR(10) NOT NULL DEFAULT 'LYD'",
            'discount_percentage' => 'DECIMAL(5,2) NOT NULL DEFAULT 0.00',
            'payable_account_id' => 'CHAR(36) NULL',
        ];

        foreach ($columns as $column => $definition) {
            $helpers->addColumnIfMissing('suppliers', $column, $definition);
        }

        DB::statement("
            UPDATE suppliers
            SET supplier_code = CONCAT('SUPP-', UPPER(LEFT(REPLACE(id, '-', ''), 8)))
            WHERE supplier_code IS NULL OR supplier_code = ''
        ");

        $helpers->addIndexIfMissing('suppliers', 'uq_suppliers_company_code', 'CREATE UNIQUE INDEX uq_suppliers_company_code ON suppliers (company_id, supplier_code)');
        $helpers->addIndexIfMissing('suppliers', 'idx_suppliers_company_active', 'CREATE INDEX idx_suppliers_company_active ON suppliers (company_id, is_active)');
        $helpers->addIndexIfMissing('suppliers', 'idx_suppliers_payable_account', 'CREATE INDEX idx_suppliers_payable_account ON suppliers (payable_account_id)');
        $helpers->addForeignKeyIfMissing('suppliers', 'fk_suppliers_payable_account', 'ADD CONSTRAINT fk_suppliers_payable_account FOREIGN KEY (payable_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE');
    }

    private function extendItems(LegacySchemaHelper $helpers): void
    {
        $columns = [
            'item_code' => 'VARCHAR(50) NULL',
            'category' => 'VARCHAR(100) NULL',
            'subcategory' => 'VARCHAR(100) NULL',
            'unit_of_measure' => 'VARCHAR(20) NULL',
            'cost_price' => 'DECIMAL(15,2) NULL DEFAULT 0.00',
            'selling_price' => 'DECIMAL(15,2) NULL DEFAULT 0.00',
            'tax_rate' => 'DECIMAL(5,2) NOT NULL DEFAULT 0.00',
            'min_stock_level' => 'DECIMAL(15,3) NOT NULL DEFAULT 0.000',
            'max_stock_level' => 'DECIMAL(15,3) NOT NULL DEFAULT 0.000',
            'current_stock' => 'DECIMAL(15,3) NOT NULL DEFAULT 0.000',
            'reorder_point' => 'DECIMAL(15,3) NOT NULL DEFAULT 0.000',
            'supplier_id' => 'CHAR(36) NULL',
            'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'is_taxable' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'is_inventory_item' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'barcode' => 'VARCHAR(100) NULL',
            'sku' => 'VARCHAR(100) NULL',
            'weight' => 'DECIMAL(10,3) NULL DEFAULT 0.000',
            'dimensions' => 'VARCHAR(100) NULL',
            'image_url' => 'TEXT NULL',
            'notes' => 'TEXT NULL',
            'income_account_id' => 'CHAR(36) NULL',
            'expense_account_id' => 'CHAR(36) NULL',
        ];

        foreach ($columns as $column => $definition) {
            $helpers->addColumnIfMissing('items', $column, $definition);
        }

        DB::statement("
            UPDATE items
            SET item_code = CONCAT('ITEM-', UPPER(LEFT(REPLACE(id, '-', ''), 8)))
            WHERE item_code IS NULL OR item_code = ''
        ");

        $helpers->addIndexIfMissing('items', 'uq_items_company_item_code', 'CREATE UNIQUE INDEX uq_items_company_item_code ON items (company_id, item_code)');
        $helpers->addIndexIfMissing('items', 'uq_items_company_barcode', 'CREATE UNIQUE INDEX uq_items_company_barcode ON items (company_id, barcode)');
        $helpers->addIndexIfMissing('items', 'uq_items_company_sku', 'CREATE UNIQUE INDEX uq_items_company_sku ON items (company_id, sku)');
        $helpers->addIndexIfMissing('items', 'idx_items_company_active', 'CREATE INDEX idx_items_company_active ON items (company_id, is_active)');
        $helpers->addIndexIfMissing('items', 'idx_items_supplier', 'CREATE INDEX idx_items_supplier ON items (supplier_id)');
        $helpers->addIndexIfMissing('items', 'idx_items_income_account', 'CREATE INDEX idx_items_income_account ON items (income_account_id)');
        $helpers->addIndexIfMissing('items', 'idx_items_expense_account', 'CREATE INDEX idx_items_expense_account ON items (expense_account_id)');
        $helpers->addForeignKeyIfMissing('items', 'fk_items_supplier', 'ADD CONSTRAINT fk_items_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE');
        $helpers->addForeignKeyIfMissing('items', 'fk_items_income_account', 'ADD CONSTRAINT fk_items_income_account FOREIGN KEY (income_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE');
        $helpers->addForeignKeyIfMissing('items', 'fk_items_expense_account', 'ADD CONSTRAINT fk_items_expense_account FOREIGN KEY (expense_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE');
    }

    private function extendJournalEntries(LegacySchemaHelper $helpers): void
    {
        $columns = [
            'journal_number' => 'VARCHAR(50) NULL',
            'description' => 'TEXT NULL',
            'reference_type' => 'VARCHAR(50) NULL',
            'reference_id' => 'CHAR(36) NULL',
            'reference_number' => 'VARCHAR(100) NULL',
            'notes' => 'TEXT NULL',
        ];

        foreach ($columns as $column => $definition) {
            $helpers->addColumnIfMissing('journal_entries', $column, $definition);
        }

        DB::statement("
            UPDATE journal_entries
            SET
              journal_number = COALESCE(journal_number, entry_number),
              description = COALESCE(description, memo, reference, ''),
              reference_number = COALESCE(reference_number, reference)
            WHERE journal_number IS NULL
               OR description IS NULL
               OR reference_number IS NULL
        ");

        $helpers->addIndexIfMissing('journal_entries', 'uq_journal_entries_company_number', 'CREATE UNIQUE INDEX uq_journal_entries_company_number ON journal_entries (company_id, journal_number)');
        $helpers->addIndexIfMissing('journal_entries', 'idx_journal_entries_reference', 'CREATE INDEX idx_journal_entries_reference ON journal_entries (reference_type, reference_id)');
    }

    private function extendJournalEntryLines(LegacySchemaHelper $helpers): void
    {
        $columns = [
            'party_type' => "ENUM('CUSTOMER','SUPPLIER') NULL",
            'customer_id' => 'CHAR(36) NULL',
            'supplier_id' => 'CHAR(36) NULL',
        ];

        foreach ($columns as $column => $definition) {
            $helpers->addColumnIfMissing('journal_entry_lines', $column, $definition);
        }

        $helpers->addIndexIfMissing('journal_entry_lines', 'idx_journal_entry_lines_customer', 'CREATE INDEX idx_journal_entry_lines_customer ON journal_entry_lines (customer_id)');
        $helpers->addIndexIfMissing('journal_entry_lines', 'idx_journal_entry_lines_supplier', 'CREATE INDEX idx_journal_entry_lines_supplier ON journal_entry_lines (supplier_id)');
        $helpers->addForeignKeyIfMissing('journal_entry_lines', 'fk_journal_entry_lines_customer', 'ADD CONSTRAINT fk_journal_entry_lines_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE');
        $helpers->addForeignKeyIfMissing('journal_entry_lines', 'fk_journal_entry_lines_supplier', 'ADD CONSTRAINT fk_journal_entry_lines_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE');
    }
};
