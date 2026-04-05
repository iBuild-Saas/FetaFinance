<?php

use App\Support\LegacySchemaHelper;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $helpers = new LegacySchemaHelper();

        $helpers->createTableIfMissing('item_categories', "
            CREATE TABLE item_categories (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                name VARCHAR(100) NOT NULL,
                description TEXT NULL,
                parent_category_id CHAR(36) NULL,
                company_id CHAR(36) NOT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_item_categories_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_item_categories_parent FOREIGN KEY (parent_category_id) REFERENCES item_categories(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('item_units_of_measure', "
            CREATE TABLE item_units_of_measure (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                code VARCHAR(10) NOT NULL,
                name VARCHAR(50) NOT NULL,
                description TEXT NULL,
                company_id CHAR(36) NOT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_item_units_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('item_categories', 'uq_item_categories_company_name', 'CREATE UNIQUE INDEX uq_item_categories_company_name ON item_categories (company_id, name)');
        $helpers->addIndexIfMissing('item_units_of_measure', 'uq_item_units_company_code', 'CREATE UNIQUE INDEX uq_item_units_company_code ON item_units_of_measure (company_id, code)');

        $helpers->createTableIfMissing('sales_invoices', "
            CREATE TABLE sales_invoices (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                invoice_number VARCHAR(50) NOT NULL,
                customer_id CHAR(36) NOT NULL,
                company_id CHAR(36) NOT NULL,
                invoice_date DATE NOT NULL,
                due_date DATE NULL,
                status ENUM('DRAFT','SUBMITTED','PAID','OVERDUE','CANCELLED') NOT NULL DEFAULT 'DRAFT',
                delivery_status ENUM('PENDING','PARTIAL','DELIVERED','RETURNED','CANCELLED') NOT NULL DEFAULT 'PENDING',
                subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(10) NOT NULL DEFAULT 'LYD',
                payment_terms VARCHAR(100) NULL,
                notes TEXT NULL,
                terms_and_conditions TEXT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_sales_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT fk_sales_invoices_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('sales_invoice_line_items', "
            CREATE TABLE sales_invoice_line_items (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                sales_invoice_id CHAR(36) NOT NULL,
                item_id CHAR(36) NULL,
                item_name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                quantity DECIMAL(15,3) NOT NULL DEFAULT 1.000,
                uom VARCHAR(20) NULL,
                unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_sales_invoice_line_items_invoice FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_sales_invoice_line_items_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('sales_invoices', 'uq_sales_invoices_company_number', 'CREATE UNIQUE INDEX uq_sales_invoices_company_number ON sales_invoices (company_id, invoice_number)');
        $helpers->addIndexIfMissing('sales_invoices', 'idx_sales_invoices_company_status', 'CREATE INDEX idx_sales_invoices_company_status ON sales_invoices (company_id, status)');
        $helpers->addIndexIfMissing('sales_invoice_line_items', 'idx_sales_invoice_line_items_invoice', 'CREATE INDEX idx_sales_invoice_line_items_invoice ON sales_invoice_line_items (sales_invoice_id)');

        $helpers->createTableIfMissing('purchase_invoices', "
            CREATE TABLE purchase_invoices (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                invoice_number VARCHAR(50) NOT NULL,
                supplier_id CHAR(36) NOT NULL,
                company_id CHAR(36) NOT NULL,
                invoice_date DATE NOT NULL,
                due_date DATE NULL,
                status ENUM('DRAFT','SUBMITTED','RECEIVED','PAID','OVERDUE','CANCELLED') NOT NULL DEFAULT 'SUBMITTED',
                subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(10) NOT NULL DEFAULT 'LYD',
                payment_terms VARCHAR(100) NULL,
                notes TEXT NULL,
                terms_and_conditions TEXT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_purchase_invoices_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT fk_purchase_invoices_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('purchase_invoice_line_items', "
            CREATE TABLE purchase_invoice_line_items (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                invoice_id CHAR(36) NOT NULL,
                item_id CHAR(36) NULL,
                item_name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                quantity DECIMAL(15,3) NOT NULL DEFAULT 1.000,
                uom VARCHAR(20) NULL,
                unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_purchase_invoice_line_items_invoice FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_purchase_invoice_line_items_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('purchase_invoices', 'uq_purchase_invoices_company_number', 'CREATE UNIQUE INDEX uq_purchase_invoices_company_number ON purchase_invoices (company_id, invoice_number)');
        $helpers->addIndexIfMissing('purchase_invoices', 'idx_purchase_invoices_company_status', 'CREATE INDEX idx_purchase_invoices_company_status ON purchase_invoices (company_id, status)');
        $helpers->addIndexIfMissing('purchase_invoice_line_items', 'idx_purchase_invoice_line_items_invoice', 'CREATE INDEX idx_purchase_invoice_line_items_invoice ON purchase_invoice_line_items (invoice_id)');

        $helpers->createTableIfMissing('stock_items', "
            CREATE TABLE stock_items (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                item_id CHAR(36) NOT NULL,
                company_id CHAR(36) NOT NULL,
                warehouse_id CHAR(36) NULL,
                current_quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                quantity_on_hand DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                reserved_quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                available_quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                reorder_level DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                max_level DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                average_cost DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
                last_cost DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_stock_items_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_stock_items_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('stock_movements', "
            CREATE TABLE stock_movements (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                item_id CHAR(36) NOT NULL,
                company_id CHAR(36) NOT NULL,
                warehouse_id CHAR(36) NULL,
                movement_type ENUM('IN','OUT','ADJUSTMENT','TRANSFER') NOT NULL,
                movement_source VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
                quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                unit_cost DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
                total_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                reference_type VARCHAR(50) NULL,
                reference_id CHAR(36) NULL,
                reference_number VARCHAR(100) NULL,
                movement_date DATE NOT NULL,
                description TEXT NULL,
                notes TEXT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_stock_movements_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_stock_movements_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('stock_items', 'uq_stock_items_company_item_warehouse', 'CREATE UNIQUE INDEX uq_stock_items_company_item_warehouse ON stock_items (company_id, item_id, warehouse_id)');
        $helpers->addIndexIfMissing('stock_items', 'idx_stock_items_company', 'CREATE INDEX idx_stock_items_company ON stock_items (company_id)');
        $helpers->addIndexIfMissing('stock_movements', 'idx_stock_movements_company_date', 'CREATE INDEX idx_stock_movements_company_date ON stock_movements (company_id, movement_date)');
        $helpers->addIndexIfMissing('stock_movements', 'idx_stock_movements_reference', 'CREATE INDEX idx_stock_movements_reference ON stock_movements (reference_type, reference_id)');

        $helpers->createTableIfMissing('payment_methods', "
            CREATE TABLE payment_methods (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                name VARCHAR(100) NOT NULL,
                account_id CHAR(36) NULL,
                description TEXT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_payment_methods_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_payment_methods_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('payments', "
            CREATE TABLE payments (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                payment_type ENUM('RECEIVE','PAY') NOT NULL,
                customer_id CHAR(36) NULL,
                supplier_id CHAR(36) NULL,
                invoice_id CHAR(36) NULL,
                company_id CHAR(36) NOT NULL,
                payment_date DATE NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                payment_method_id CHAR(36) NULL,
                reference_number VARCHAR(100) NOT NULL,
                amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                notes TEXT NULL,
                status ENUM('COMPLETED','PENDING','FAILED','CANCELLED') NOT NULL DEFAULT 'COMPLETED',
                currency VARCHAR(10) NOT NULL DEFAULT 'LYD',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT fk_payments_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT fk_payments_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_payments_payment_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('payment_methods', 'uq_payment_methods_company_name', 'CREATE UNIQUE INDEX uq_payment_methods_company_name ON payment_methods (company_id, name)');
        $helpers->addIndexIfMissing('payments', 'uq_payments_company_reference', 'CREATE UNIQUE INDEX uq_payments_company_reference ON payments (company_id, reference_number)');
        $helpers->addIndexIfMissing('payments', 'idx_payments_company_type', 'CREATE INDEX idx_payments_company_type ON payments (company_id, payment_type)');
        $helpers->addIndexIfMissing('payments', 'idx_payments_invoice', 'CREATE INDEX idx_payments_invoice ON payments (invoice_id)');

        $helpers->createTableIfMissing('account_mapping_config', "
            CREATE TABLE account_mapping_config (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                transaction_type ENUM('SALES_INVOICE','PURCHASE_INVOICE','PAYMENT_RECEIPT','PAYMENT_DISBURSEMENT','STOCK_ADJUSTMENT') NOT NULL,
                mapping_key VARCHAR(50) NOT NULL,
                account_id CHAR(36) NOT NULL,
                description TEXT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_account_mapping_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_account_mapping_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('account_mapping_config', 'uq_account_mapping_company_type_key', 'CREATE UNIQUE INDEX uq_account_mapping_company_type_key ON account_mapping_config (company_id, transaction_type, mapping_key)');
    }

    public function down(): void
    {
    }
};
