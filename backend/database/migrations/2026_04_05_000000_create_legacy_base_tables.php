<?php

use App\Support\LegacySchemaHelper;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $helpers = new LegacySchemaHelper();

        $helpers->createTableIfMissing('companies', "
            CREATE TABLE companies (
                id CHAR(36) NOT NULL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                logo TEXT NULL,
                description TEXT NULL,
                industry VARCHAR(100) NULL,
                company_size VARCHAR(50) NULL,
                email VARCHAR(255) NULL,
                phone VARCHAR(50) NULL,
                address TEXT NULL,
                city VARCHAR(100) NULL,
                state VARCHAR(100) NULL,
                zip VARCHAR(20) NULL,
                country VARCHAR(100) NULL,
                currency VARCHAR(10) NULL DEFAULT 'LYD',
                fiscal_year_start VARCHAR(10) NULL DEFAULT '01-01',
                tax_id VARCHAR(50) NULL,
                multi_currency TINYINT(1) NOT NULL DEFAULT 0,
                inventory_tracking TINYINT(1) NOT NULL DEFAULT 1,
                auto_backup TINYINT(1) NOT NULL DEFAULT 1,
                timezone VARCHAR(100) NULL,
                default_warehouse_id CHAR(36) NULL,
                default_sales_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                default_purchase_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                base_currency VARCHAR(10) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('customers', "
            CREATE TABLE customers (
                id CHAR(36) NOT NULL PRIMARY KEY,
                company_id CHAR(36) NOT NULL,
                customer_code VARCHAR(50) NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NULL,
                phone VARCHAR(50) NULL,
                contact_person VARCHAR(255) NULL,
                address TEXT NULL,
                city VARCHAR(100) NULL,
                state VARCHAR(100) NULL,
                zip_code VARCHAR(20) NULL,
                country VARCHAR(100) NULL,
                tax_id VARCHAR(50) NULL,
                credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                payment_terms VARCHAR(100) NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                notes TEXT NULL,
                website VARCHAR(255) NULL,
                industry VARCHAR(100) NULL,
                customer_type ENUM('RETAIL','WHOLESALE','DISTRIBUTOR','CORPORATE') NOT NULL DEFAULT 'RETAIL',
                default_currency VARCHAR(10) NOT NULL DEFAULT 'LYD',
                discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                receivable_account_id CHAR(36) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_customers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('suppliers', "
            CREATE TABLE suppliers (
                id CHAR(36) NOT NULL PRIMARY KEY,
                company_id CHAR(36) NOT NULL,
                supplier_code VARCHAR(50) NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NULL,
                phone VARCHAR(50) NULL,
                contact_person VARCHAR(255) NULL,
                address TEXT NULL,
                city VARCHAR(100) NULL,
                state VARCHAR(100) NULL,
                zip_code VARCHAR(20) NULL,
                country VARCHAR(100) NULL,
                tax_id VARCHAR(50) NULL,
                credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                payment_terms VARCHAR(100) NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                notes TEXT NULL,
                website VARCHAR(255) NULL,
                industry VARCHAR(100) NULL,
                supplier_type ENUM('MANUFACTURER','DISTRIBUTOR','WHOLESALER','SERVICE') NOT NULL DEFAULT 'MANUFACTURER',
                default_currency VARCHAR(10) NOT NULL DEFAULT 'LYD',
                discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                payable_account_id CHAR(36) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_suppliers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('chart_of_accounts', "
            CREATE TABLE chart_of_accounts (
                id CHAR(36) NOT NULL PRIMARY KEY,
                account_code VARCHAR(50) NOT NULL,
                account_name VARCHAR(255) NOT NULL,
                account_type VARCHAR(50) NOT NULL,
                parent_account_id CHAR(36) NULL,
                company_id CHAR(36) NOT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                normal_balance VARCHAR(10) NOT NULL DEFAULT 'DEBIT',
                description TEXT NULL,
                is_group TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_chart_of_accounts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_chart_of_accounts_parent FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('items', "
            CREATE TABLE items (
                id CHAR(36) NOT NULL PRIMARY KEY,
                company_id CHAR(36) NOT NULL,
                item_code VARCHAR(50) NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                category VARCHAR(100) NULL,
                subcategory VARCHAR(100) NULL,
                unit_of_measure VARCHAR(20) NULL,
                unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                cost_price DECIMAL(15,2) NULL DEFAULT 0.00,
                selling_price DECIMAL(15,2) NULL DEFAULT 0.00,
                tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                min_stock_level DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                max_stock_level DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                current_stock DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                reorder_point DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                supplier_id CHAR(36) NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                is_taxable TINYINT(1) NOT NULL DEFAULT 1,
                is_inventory_item TINYINT(1) NOT NULL DEFAULT 1,
                barcode VARCHAR(100) NULL,
                sku VARCHAR(100) NULL,
                weight DECIMAL(10,3) NULL DEFAULT 0.000,
                dimensions VARCHAR(100) NULL,
                image_url TEXT NULL,
                notes TEXT NULL,
                income_account_id CHAR(36) NULL,
                expense_account_id CHAR(36) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_items_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('journal_entries', "
            CREATE TABLE journal_entries (
                id CHAR(36) NOT NULL PRIMARY KEY,
                entry_number VARCHAR(50) NULL,
                journal_number VARCHAR(50) NULL,
                entry_date DATE NOT NULL,
                memo TEXT NULL,
                description TEXT NULL,
                company_id CHAR(36) NOT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                reference VARCHAR(100) NULL,
                reference_type VARCHAR(50) NULL,
                reference_id CHAR(36) NULL,
                reference_number VARCHAR(100) NULL,
                status ENUM('DRAFT','POSTED','VOID') NOT NULL DEFAULT 'POSTED',
                notes TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_journal_entries_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('journal_entry_lines', "
            CREATE TABLE journal_entry_lines (
                id CHAR(36) NOT NULL PRIMARY KEY,
                journal_entry_id CHAR(36) NOT NULL,
                account_id CHAR(36) NOT NULL,
                line_number INT NOT NULL DEFAULT 0,
                debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                description TEXT NULL,
                party_type ENUM('CUSTOMER','SUPPLIER') NULL,
                customer_id CHAR(36) NULL,
                supplier_id CHAR(36) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_journal_entry_lines_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_journal_entry_lines_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
    }

    public function down(): void
    {
    }
};
