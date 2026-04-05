<?php

use App\Support\LegacySchemaHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $helpers = new LegacySchemaHelper();

        $helpers->createTableIfMissing('warehouses', "
            CREATE TABLE warehouses (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                warehouse_code VARCHAR(30) NOT NULL,
                name VARCHAR(120) NOT NULL,
                description TEXT NULL,
                address_line_1 VARCHAR(255) NULL,
                address_line_2 VARCHAR(255) NULL,
                city VARCHAR(100) NULL,
                state VARCHAR(100) NULL,
                postal_code VARCHAR(20) NULL,
                country VARCHAR(100) NULL,
                is_default TINYINT(1) NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_warehouses_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('warehouses', 'uq_warehouses_company_code', 'CREATE UNIQUE INDEX uq_warehouses_company_code ON warehouses (company_id, warehouse_code)');

        $helpers->createTableIfMissing('customer_contacts', "
            CREATE TABLE customer_contacts (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                customer_id CHAR(36) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NULL,
                email VARCHAR(255) NULL,
                phone VARCHAR(50) NULL,
                mobile VARCHAR(50) NULL,
                position_title VARCHAR(120) NULL,
                is_primary TINYINT(1) NOT NULL DEFAULT 0,
                notes TEXT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_customer_contacts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_customer_contacts_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('supplier_contacts', "
            CREATE TABLE supplier_contacts (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                supplier_id CHAR(36) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NULL,
                email VARCHAR(255) NULL,
                phone VARCHAR(50) NULL,
                mobile VARCHAR(50) NULL,
                position_title VARCHAR(120) NULL,
                is_primary TINYINT(1) NOT NULL DEFAULT 0,
                notes TEXT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_supplier_contacts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_supplier_contacts_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('customer_addresses', "
            CREATE TABLE customer_addresses (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                customer_id CHAR(36) NOT NULL,
                label VARCHAR(80) NOT NULL,
                address_line_1 VARCHAR(255) NOT NULL,
                address_line_2 VARCHAR(255) NULL,
                city VARCHAR(100) NULL,
                state VARCHAR(100) NULL,
                postal_code VARCHAR(20) NULL,
                country VARCHAR(100) NULL,
                is_billing TINYINT(1) NOT NULL DEFAULT 0,
                is_shipping TINYINT(1) NOT NULL DEFAULT 1,
                is_primary TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_customer_addresses_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_customer_addresses_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('supplier_addresses', "
            CREATE TABLE supplier_addresses (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                supplier_id CHAR(36) NOT NULL,
                label VARCHAR(80) NOT NULL,
                address_line_1 VARCHAR(255) NOT NULL,
                address_line_2 VARCHAR(255) NULL,
                city VARCHAR(100) NULL,
                state VARCHAR(100) NULL,
                postal_code VARCHAR(20) NULL,
                country VARCHAR(100) NULL,
                is_billing TINYINT(1) NOT NULL DEFAULT 1,
                is_shipping TINYINT(1) NOT NULL DEFAULT 0,
                is_primary TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_supplier_addresses_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_supplier_addresses_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('sales_orders', "
            CREATE TABLE sales_orders (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                order_number VARCHAR(50) NOT NULL,
                customer_id CHAR(36) NOT NULL,
                company_id CHAR(36) NOT NULL,
                order_date DATE NOT NULL,
                requested_delivery_date DATE NULL,
                status ENUM('DRAFT','CONFIRMED','PARTIAL','FULFILLED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
                subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(10) NOT NULL DEFAULT 'LYD',
                payment_terms VARCHAR(100) NULL,
                notes TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_sales_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT fk_sales_orders_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('sales_order_line_items', "
            CREATE TABLE sales_order_line_items (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                sales_order_id CHAR(36) NOT NULL,
                item_id CHAR(36) NULL,
                item_name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                quantity DECIMAL(15,3) NOT NULL DEFAULT 1.000,
                uom VARCHAR(20) NULL,
                unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_sales_order_lines_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_sales_order_lines_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('purchase_orders', "
            CREATE TABLE purchase_orders (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                order_number VARCHAR(50) NOT NULL,
                supplier_id CHAR(36) NOT NULL,
                company_id CHAR(36) NOT NULL,
                order_date DATE NOT NULL,
                expected_receipt_date DATE NULL,
                status ENUM('DRAFT','APPROVED','PARTIAL','RECEIVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
                subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(10) NOT NULL DEFAULT 'LYD',
                payment_terms VARCHAR(100) NULL,
                notes TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT fk_purchase_orders_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('purchase_order_line_items', "
            CREATE TABLE purchase_order_line_items (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                purchase_order_id CHAR(36) NOT NULL,
                item_id CHAR(36) NULL,
                item_name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                quantity DECIMAL(15,3) NOT NULL DEFAULT 1.000,
                uom VARCHAR(20) NULL,
                unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_purchase_order_lines_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_purchase_order_lines_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('stock_transfers', "
            CREATE TABLE stock_transfers (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                transfer_number VARCHAR(50) NOT NULL,
                company_id CHAR(36) NOT NULL,
                source_warehouse_id CHAR(36) NOT NULL,
                destination_warehouse_id CHAR(36) NOT NULL,
                transfer_date DATE NOT NULL,
                status ENUM('DRAFT','IN_TRANSIT','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
                notes TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_stock_transfers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_stock_transfers_source_warehouse FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT fk_stock_transfers_destination_warehouse FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('stock_transfer_line_items', "
            CREATE TABLE stock_transfer_line_items (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                stock_transfer_id CHAR(36) NOT NULL,
                item_id CHAR(36) NOT NULL,
                quantity DECIMAL(15,3) NOT NULL DEFAULT 1.000,
                uom VARCHAR(20) NULL,
                unit_cost DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
                total_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_stock_transfer_lines_transfer FOREIGN KEY (stock_transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_stock_transfer_lines_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('item_supplier_prices', "
            CREATE TABLE item_supplier_prices (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                item_id CHAR(36) NOT NULL,
                supplier_id CHAR(36) NOT NULL,
                supplier_sku VARCHAR(100) NULL,
                minimum_order_quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                lead_time_days INT NOT NULL DEFAULT 0,
                last_purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(10) NOT NULL DEFAULT 'LYD',
                is_preferred TINYINT(1) NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_item_supplier_prices_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_item_supplier_prices_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_item_supplier_prices_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('item_supplier_prices', 'uq_item_supplier_prices_company_item_supplier', 'CREATE UNIQUE INDEX uq_item_supplier_prices_company_item_supplier ON item_supplier_prices (company_id, item_id, supplier_id)');

        $helpers->createTableIfMissing('inventory_counts', "
            CREATE TABLE inventory_counts (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                warehouse_id CHAR(36) NULL,
                count_number VARCHAR(50) NOT NULL,
                count_date DATE NOT NULL,
                status ENUM('DRAFT','IN_PROGRESS','POSTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
                notes TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_inventory_counts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_inventory_counts_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $helpers->createTableIfMissing('inventory_count_lines', "
            CREATE TABLE inventory_count_lines (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                inventory_count_id CHAR(36) NOT NULL,
                item_id CHAR(36) NOT NULL,
                system_quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                counted_quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                variance_quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
                unit_cost DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
                notes TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_inventory_count_lines_count FOREIGN KEY (inventory_count_id) REFERENCES inventory_counts(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_inventory_count_lines_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $companies = DB::table('companies')->select('id')->get();
        foreach ($companies as $company) {
            DB::insert("
                INSERT INTO warehouses (id, company_id, warehouse_code, name, description, is_default)
                SELECT uuid(), ?, 'MAIN', 'Main Warehouse', 'Default warehouse created by migration', 1
                WHERE NOT EXISTS (
                  SELECT 1 FROM warehouses WHERE company_id = ? AND is_default = 1
                )
            ", [$company->id, $company->id]);
        }

        DB::statement("
            UPDATE stock_items target
            JOIN (
                SELECT
                    MIN(id) AS keep_id,
                    company_id,
                    item_id,
                    SUM(current_quantity) AS merged_current_quantity,
                    SUM(quantity_on_hand) AS merged_quantity_on_hand,
                    SUM(reserved_quantity) AS merged_reserved_quantity,
                    SUM(available_quantity) AS merged_available_quantity,
                    MAX(reorder_level) AS merged_reorder_level,
                    MAX(max_level) AS merged_max_level,
                    AVG(average_cost) AS merged_average_cost,
                    MAX(last_cost) AS merged_last_cost
                FROM stock_items
                WHERE warehouse_id IS NULL
                GROUP BY company_id, item_id
                HAVING COUNT(*) > 1
            ) merged ON merged.keep_id = target.id
            SET
                target.current_quantity = merged.merged_current_quantity,
                target.quantity_on_hand = merged.merged_quantity_on_hand,
                target.reserved_quantity = merged.merged_reserved_quantity,
                target.available_quantity = merged.merged_available_quantity,
                target.reorder_level = merged.merged_reorder_level,
                target.max_level = merged.merged_max_level,
                target.average_cost = merged.merged_average_cost,
                target.last_cost = merged.merged_last_cost
        ");
        DB::statement("
            DELETE duplicate_rows
            FROM stock_items duplicate_rows
            JOIN (
                SELECT id
                FROM (
                    SELECT
                        id,
                        ROW_NUMBER() OVER (PARTITION BY company_id, item_id ORDER BY created_at, id) AS row_num
                    FROM stock_items
                    WHERE warehouse_id IS NULL
                ) ranked
                WHERE ranked.row_num > 1
            ) duplicates ON duplicates.id = duplicate_rows.id
        ");
        DB::statement("
            UPDATE stock_items existing_rows
            JOIN warehouses default_warehouses
              ON default_warehouses.company_id = existing_rows.company_id
             AND default_warehouses.is_default = 1
            JOIN stock_items null_rows
              ON null_rows.company_id = existing_rows.company_id
             AND null_rows.item_id = existing_rows.item_id
             AND null_rows.warehouse_id IS NULL
            SET
                existing_rows.current_quantity = existing_rows.current_quantity + null_rows.current_quantity,
                existing_rows.quantity_on_hand = existing_rows.quantity_on_hand + null_rows.quantity_on_hand,
                existing_rows.reserved_quantity = existing_rows.reserved_quantity + null_rows.reserved_quantity,
                existing_rows.available_quantity = existing_rows.available_quantity + null_rows.available_quantity,
                existing_rows.reorder_level = GREATEST(existing_rows.reorder_level, null_rows.reorder_level),
                existing_rows.max_level = GREATEST(existing_rows.max_level, null_rows.max_level),
                existing_rows.average_cost = GREATEST(existing_rows.average_cost, null_rows.average_cost),
                existing_rows.last_cost = GREATEST(existing_rows.last_cost, null_rows.last_cost)
            WHERE existing_rows.warehouse_id = default_warehouses.id
        ");
        DB::statement("
            DELETE null_rows
            FROM stock_items null_rows
            JOIN warehouses default_warehouses
              ON default_warehouses.company_id = null_rows.company_id
             AND default_warehouses.is_default = 1
            JOIN stock_items existing_rows
              ON existing_rows.company_id = null_rows.company_id
             AND existing_rows.item_id = null_rows.item_id
             AND existing_rows.warehouse_id = default_warehouses.id
            WHERE null_rows.warehouse_id IS NULL
        ");
        DB::statement("
            UPDATE stock_items si
            JOIN warehouses w ON w.company_id = si.company_id AND w.is_default = 1
            SET si.warehouse_id = w.id
            WHERE si.warehouse_id IS NULL
        ");
        DB::statement("
            UPDATE stock_movements sm
            JOIN warehouses w ON w.company_id = sm.company_id AND w.is_default = 1
            SET sm.warehouse_id = w.id
            WHERE sm.warehouse_id IS NULL
        ");
        $helpers->addForeignKeyIfMissing('stock_items', 'fk_stock_items_warehouse', 'ADD CONSTRAINT fk_stock_items_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE');
        $helpers->addForeignKeyIfMissing('stock_movements', 'fk_stock_movements_warehouse', 'ADD CONSTRAINT fk_stock_movements_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE');
    }

    public function down(): void
    {
    }
};
