export async function up({ query, helpers }) {
  await createWarehouseTables(helpers);
  await createPartyExtensionTables(helpers);
  await createOrderTables(helpers);
  await createTransferTables(helpers);
  await createProcurementTables(helpers);
  await createInventoryCountTables(helpers);

  await seedDefaultWarehouses(query);
  await attachExistingInventoryToDefaultWarehouses(query, helpers);
}

async function createWarehouseTables(helpers) {
  await helpers.createTableIfMissing(
    "warehouses",
    `
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
    `,
  );

  await helpers.addIndexIfMissing(
    "warehouses",
    "uq_warehouses_company_code",
    "CREATE UNIQUE INDEX uq_warehouses_company_code ON warehouses (company_id, warehouse_code)",
  );
}

async function createPartyExtensionTables(helpers) {
  await helpers.createTableIfMissing(
    "customer_contacts",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "supplier_contacts",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "customer_addresses",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "supplier_addresses",
    `
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
    `,
  );
}

async function createOrderTables(helpers) {
  await helpers.createTableIfMissing(
    "sales_orders",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "sales_order_line_items",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "purchase_orders",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "purchase_order_line_items",
    `
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
    `,
  );
}

async function createTransferTables(helpers) {
  await helpers.createTableIfMissing(
    "stock_transfers",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "stock_transfer_line_items",
    `
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
    `,
  );
}

async function createProcurementTables(helpers) {
  await helpers.createTableIfMissing(
    "item_supplier_prices",
    `
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
    `,
  );

  await helpers.addIndexIfMissing(
    "item_supplier_prices",
    "uq_item_supplier_prices_company_item_supplier",
    "CREATE UNIQUE INDEX uq_item_supplier_prices_company_item_supplier ON item_supplier_prices (company_id, item_id, supplier_id)",
  );
}

async function createInventoryCountTables(helpers) {
  await helpers.createTableIfMissing(
    "inventory_counts",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "inventory_count_lines",
    `
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
    `,
  );
}

async function seedDefaultWarehouses(query) {
  const [companies] = await query("SELECT id FROM companies");
  for (const company of companies) {
    await query(
      `
        INSERT INTO warehouses (id, company_id, warehouse_code, name, description, is_default)
        SELECT uuid(), ?, 'MAIN', 'Main Warehouse', 'Default warehouse created by migration', 1
        WHERE NOT EXISTS (
          SELECT 1 FROM warehouses WHERE company_id = ? AND is_default = 1
        )
      `,
      [company.id, company.id],
    );
  }
}

async function attachExistingInventoryToDefaultWarehouses(query, helpers) {
  await query(`
    UPDATE stock_items si
    JOIN warehouses w
      ON w.company_id = si.company_id
     AND w.is_default = 1
    SET si.warehouse_id = w.id
    WHERE si.warehouse_id IS NULL
  `);

  await query(`
    UPDATE stock_movements sm
    JOIN warehouses w
      ON w.company_id = sm.company_id
     AND w.is_default = 1
    SET sm.warehouse_id = w.id
    WHERE sm.warehouse_id IS NULL
  `);

  await helpers.addForeignKeyIfMissing(
    "stock_items",
    "fk_stock_items_warehouse",
    "ADD CONSTRAINT fk_stock_items_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE",
  );
  await helpers.addForeignKeyIfMissing(
    "stock_movements",
    "fk_stock_movements_warehouse",
    "ADD CONSTRAINT fk_stock_movements_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE",
  );
}
