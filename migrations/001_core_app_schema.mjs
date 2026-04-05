export async function up({ query, helpers }) {
  await extendCompanies(helpers);
  await extendCustomers(helpers, query);
  await extendSuppliers(helpers, query);
  await extendChartOfAccounts(helpers);
  await extendItems(helpers, query);
  await extendJournalEntries(helpers, query);
  await extendJournalEntryLines(helpers);

  await createItemMasterTables(helpers);
  await createSalesTables(helpers);
  await createPurchaseTables(helpers);
  await createInventoryTables(helpers);
  await createPaymentsTables(helpers);
  await createAccountMappingTable(helpers);

  await createViews(helpers);
  await seedMasterData(query);
  await seedStockItems(query);
}

async function extendCompanies(helpers) {
  await helpers.addColumnIfMissing("companies", "default_warehouse_id", "CHAR(36) NULL");
  await helpers.addColumnIfMissing("companies", "default_sales_tax_rate", "DECIMAL(5,2) NOT NULL DEFAULT 0.00");
  await helpers.addColumnIfMissing("companies", "default_purchase_tax_rate", "DECIMAL(5,2) NOT NULL DEFAULT 0.00");
  await helpers.addColumnIfMissing("companies", "base_currency", "VARCHAR(10) NULL");
}

async function extendCustomers(helpers, query) {
  const columns = {
    customer_code: "VARCHAR(50) NULL",
    contact_person: "VARCHAR(255) NULL",
    address: "TEXT NULL",
    city: "VARCHAR(100) NULL",
    state: "VARCHAR(100) NULL",
    zip_code: "VARCHAR(20) NULL",
    country: "VARCHAR(100) NULL",
    tax_id: "VARCHAR(50) NULL",
    credit_limit: "DECIMAL(15,2) NOT NULL DEFAULT 0.00",
    payment_terms: "VARCHAR(100) NULL",
    is_active: "TINYINT(1) NOT NULL DEFAULT 1",
    notes: "TEXT NULL",
    website: "VARCHAR(255) NULL",
    industry: "VARCHAR(100) NULL",
    customer_type: "ENUM('RETAIL','WHOLESALE','DISTRIBUTOR','CORPORATE') NOT NULL DEFAULT 'RETAIL'",
    default_currency: "VARCHAR(10) NOT NULL DEFAULT 'LYD'",
    discount_percentage: "DECIMAL(5,2) NOT NULL DEFAULT 0.00",
    receivable_account_id: "CHAR(36) NULL",
  };

  for (const [column, definition] of Object.entries(columns)) {
    await helpers.addColumnIfMissing("customers", column, definition);
  }

  await query(`
    UPDATE customers
    SET customer_code = CONCAT('CUST-', UPPER(LEFT(REPLACE(id, '-', ''), 8)))
    WHERE customer_code IS NULL OR customer_code = ''
  `);

  await helpers.addIndexIfMissing(
    "customers",
    "uq_customers_company_code",
    "CREATE UNIQUE INDEX uq_customers_company_code ON customers (company_id, customer_code)",
  );
  await helpers.addIndexIfMissing(
    "customers",
    "idx_customers_company_active",
    "CREATE INDEX idx_customers_company_active ON customers (company_id, is_active)",
  );
  await helpers.addIndexIfMissing(
    "customers",
    "idx_customers_receivable_account",
    "CREATE INDEX idx_customers_receivable_account ON customers (receivable_account_id)",
  );
  await helpers.addForeignKeyIfMissing(
    "customers",
    "fk_customers_receivable_account",
    "ADD CONSTRAINT fk_customers_receivable_account FOREIGN KEY (receivable_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE",
  );
}

async function extendSuppliers(helpers, query) {
  const columns = {
    supplier_code: "VARCHAR(50) NULL",
    contact_person: "VARCHAR(255) NULL",
    address: "TEXT NULL",
    city: "VARCHAR(100) NULL",
    state: "VARCHAR(100) NULL",
    zip_code: "VARCHAR(20) NULL",
    country: "VARCHAR(100) NULL",
    tax_id: "VARCHAR(50) NULL",
    credit_limit: "DECIMAL(15,2) NOT NULL DEFAULT 0.00",
    payment_terms: "VARCHAR(100) NULL",
    is_active: "TINYINT(1) NOT NULL DEFAULT 1",
    notes: "TEXT NULL",
    website: "VARCHAR(255) NULL",
    industry: "VARCHAR(100) NULL",
    supplier_type: "ENUM('MANUFACTURER','DISTRIBUTOR','WHOLESALER','SERVICE') NOT NULL DEFAULT 'MANUFACTURER'",
    default_currency: "VARCHAR(10) NOT NULL DEFAULT 'LYD'",
    discount_percentage: "DECIMAL(5,2) NOT NULL DEFAULT 0.00",
    payable_account_id: "CHAR(36) NULL",
  };

  for (const [column, definition] of Object.entries(columns)) {
    await helpers.addColumnIfMissing("suppliers", column, definition);
  }

  await query(`
    UPDATE suppliers
    SET supplier_code = CONCAT('SUPP-', UPPER(LEFT(REPLACE(id, '-', ''), 8)))
    WHERE supplier_code IS NULL OR supplier_code = ''
  `);

  await helpers.addIndexIfMissing(
    "suppliers",
    "uq_suppliers_company_code",
    "CREATE UNIQUE INDEX uq_suppliers_company_code ON suppliers (company_id, supplier_code)",
  );
  await helpers.addIndexIfMissing(
    "suppliers",
    "idx_suppliers_company_active",
    "CREATE INDEX idx_suppliers_company_active ON suppliers (company_id, is_active)",
  );
  await helpers.addIndexIfMissing(
    "suppliers",
    "idx_suppliers_payable_account",
    "CREATE INDEX idx_suppliers_payable_account ON suppliers (payable_account_id)",
  );
  await helpers.addForeignKeyIfMissing(
    "suppliers",
    "fk_suppliers_payable_account",
    "ADD CONSTRAINT fk_suppliers_payable_account FOREIGN KEY (payable_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE",
  );
}

async function extendChartOfAccounts(helpers) {
  await helpers.addColumnIfMissing("chart_of_accounts", "is_group", "TINYINT(1) NOT NULL DEFAULT 0");
  await helpers.addIndexIfMissing(
    "chart_of_accounts",
    "idx_chart_of_accounts_company_active",
    "CREATE INDEX idx_chart_of_accounts_company_active ON chart_of_accounts (company_id, is_active)",
  );
}

async function extendItems(helpers, query) {
  const columns = {
    item_code: "VARCHAR(50) NULL",
    category: "VARCHAR(100) NULL",
    subcategory: "VARCHAR(100) NULL",
    unit_of_measure: "VARCHAR(20) NULL",
    cost_price: "DECIMAL(15,2) NULL DEFAULT 0.00",
    selling_price: "DECIMAL(15,2) NULL DEFAULT 0.00",
    tax_rate: "DECIMAL(5,2) NOT NULL DEFAULT 0.00",
    min_stock_level: "DECIMAL(15,3) NOT NULL DEFAULT 0.000",
    max_stock_level: "DECIMAL(15,3) NOT NULL DEFAULT 0.000",
    current_stock: "DECIMAL(15,3) NOT NULL DEFAULT 0.000",
    reorder_point: "DECIMAL(15,3) NOT NULL DEFAULT 0.000",
    supplier_id: "CHAR(36) NULL",
    is_active: "TINYINT(1) NOT NULL DEFAULT 1",
    is_taxable: "TINYINT(1) NOT NULL DEFAULT 1",
    is_inventory_item: "TINYINT(1) NOT NULL DEFAULT 1",
    barcode: "VARCHAR(100) NULL",
    sku: "VARCHAR(100) NULL",
    weight: "DECIMAL(10,3) NULL DEFAULT 0.000",
    dimensions: "VARCHAR(100) NULL",
    image_url: "TEXT NULL",
    notes: "TEXT NULL",
    income_account_id: "CHAR(36) NULL",
    expense_account_id: "CHAR(36) NULL",
  };

  for (const [column, definition] of Object.entries(columns)) {
    await helpers.addColumnIfMissing("items", column, definition);
  }

  await query(`
    UPDATE items
    SET item_code = CONCAT('ITEM-', UPPER(LEFT(REPLACE(id, '-', ''), 8)))
    WHERE item_code IS NULL OR item_code = ''
  `);

  await helpers.addIndexIfMissing(
    "items",
    "uq_items_company_item_code",
    "CREATE UNIQUE INDEX uq_items_company_item_code ON items (company_id, item_code)",
  );
  await helpers.addIndexIfMissing(
    "items",
    "uq_items_company_barcode",
    "CREATE UNIQUE INDEX uq_items_company_barcode ON items (company_id, barcode)",
  );
  await helpers.addIndexIfMissing(
    "items",
    "uq_items_company_sku",
    "CREATE UNIQUE INDEX uq_items_company_sku ON items (company_id, sku)",
  );
  await helpers.addIndexIfMissing(
    "items",
    "idx_items_company_active",
    "CREATE INDEX idx_items_company_active ON items (company_id, is_active)",
  );
  await helpers.addIndexIfMissing(
    "items",
    "idx_items_supplier",
    "CREATE INDEX idx_items_supplier ON items (supplier_id)",
  );
  await helpers.addIndexIfMissing(
    "items",
    "idx_items_income_account",
    "CREATE INDEX idx_items_income_account ON items (income_account_id)",
  );
  await helpers.addIndexIfMissing(
    "items",
    "idx_items_expense_account",
    "CREATE INDEX idx_items_expense_account ON items (expense_account_id)",
  );
  await helpers.addForeignKeyIfMissing(
    "items",
    "fk_items_supplier",
    "ADD CONSTRAINT fk_items_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE",
  );
  await helpers.addForeignKeyIfMissing(
    "items",
    "fk_items_income_account",
    "ADD CONSTRAINT fk_items_income_account FOREIGN KEY (income_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE",
  );
  await helpers.addForeignKeyIfMissing(
    "items",
    "fk_items_expense_account",
    "ADD CONSTRAINT fk_items_expense_account FOREIGN KEY (expense_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE",
  );
}

async function extendJournalEntries(helpers, query) {
  const columns = {
    journal_number: "VARCHAR(50) NULL",
    description: "TEXT NULL",
    reference_type: "VARCHAR(50) NULL",
    reference_id: "CHAR(36) NULL",
    reference_number: "VARCHAR(100) NULL",
    notes: "TEXT NULL",
  };

  for (const [column, definition] of Object.entries(columns)) {
    await helpers.addColumnIfMissing("journal_entries", column, definition);
  }

  await query(`
    UPDATE journal_entries
    SET
      journal_number = COALESCE(journal_number, entry_number),
      description = COALESCE(description, memo, reference, ''),
      reference_number = COALESCE(reference_number, reference)
    WHERE journal_number IS NULL
       OR description IS NULL
       OR reference_number IS NULL
  `);

  await helpers.addIndexIfMissing(
    "journal_entries",
    "uq_journal_entries_company_number",
    "CREATE UNIQUE INDEX uq_journal_entries_company_number ON journal_entries (company_id, journal_number)",
  );
  await helpers.addIndexIfMissing(
    "journal_entries",
    "idx_journal_entries_reference",
    "CREATE INDEX idx_journal_entries_reference ON journal_entries (reference_type, reference_id)",
  );
}

async function extendJournalEntryLines(helpers) {
  const columns = {
    party_type: "ENUM('CUSTOMER','SUPPLIER') NULL",
    customer_id: "CHAR(36) NULL",
    supplier_id: "CHAR(36) NULL",
  };

  for (const [column, definition] of Object.entries(columns)) {
    await helpers.addColumnIfMissing("journal_entry_lines", column, definition);
  }

  await helpers.addIndexIfMissing(
    "journal_entry_lines",
    "idx_journal_entry_lines_customer",
    "CREATE INDEX idx_journal_entry_lines_customer ON journal_entry_lines (customer_id)",
  );
  await helpers.addIndexIfMissing(
    "journal_entry_lines",
    "idx_journal_entry_lines_supplier",
    "CREATE INDEX idx_journal_entry_lines_supplier ON journal_entry_lines (supplier_id)",
  );
  await helpers.addForeignKeyIfMissing(
    "journal_entry_lines",
    "fk_journal_entry_lines_customer",
    "ADD CONSTRAINT fk_journal_entry_lines_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE",
  );
  await helpers.addForeignKeyIfMissing(
    "journal_entry_lines",
    "fk_journal_entry_lines_supplier",
    "ADD CONSTRAINT fk_journal_entry_lines_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE",
  );
}

async function createItemMasterTables(helpers) {
  await helpers.createTableIfMissing(
    "item_categories",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "item_units_of_measure",
    `
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
    `,
  );

  await helpers.addIndexIfMissing(
    "item_categories",
    "uq_item_categories_company_name",
    "CREATE UNIQUE INDEX uq_item_categories_company_name ON item_categories (company_id, name)",
  );
  await helpers.addIndexIfMissing(
    "item_units_of_measure",
    "uq_item_units_company_code",
    "CREATE UNIQUE INDEX uq_item_units_company_code ON item_units_of_measure (company_id, code)",
  );
}

async function createSalesTables(helpers) {
  await helpers.createTableIfMissing(
    "sales_invoices",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "sales_invoice_line_items",
    `
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
    `,
  );

  await helpers.addIndexIfMissing(
    "sales_invoices",
    "uq_sales_invoices_company_number",
    "CREATE UNIQUE INDEX uq_sales_invoices_company_number ON sales_invoices (company_id, invoice_number)",
  );
  await helpers.addIndexIfMissing(
    "sales_invoices",
    "idx_sales_invoices_company_status",
    "CREATE INDEX idx_sales_invoices_company_status ON sales_invoices (company_id, status)",
  );
  await helpers.addIndexIfMissing(
    "sales_invoice_line_items",
    "idx_sales_invoice_line_items_invoice",
    "CREATE INDEX idx_sales_invoice_line_items_invoice ON sales_invoice_line_items (sales_invoice_id)",
  );
}

async function createPurchaseTables(helpers) {
  await helpers.createTableIfMissing(
    "purchase_invoices",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "purchase_invoice_line_items",
    `
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
    `,
  );

  await helpers.addIndexIfMissing(
    "purchase_invoices",
    "uq_purchase_invoices_company_number",
    "CREATE UNIQUE INDEX uq_purchase_invoices_company_number ON purchase_invoices (company_id, invoice_number)",
  );
  await helpers.addIndexIfMissing(
    "purchase_invoices",
    "idx_purchase_invoices_company_status",
    "CREATE INDEX idx_purchase_invoices_company_status ON purchase_invoices (company_id, status)",
  );
  await helpers.addIndexIfMissing(
    "purchase_invoice_line_items",
    "idx_purchase_invoice_line_items_invoice",
    "CREATE INDEX idx_purchase_invoice_line_items_invoice ON purchase_invoice_line_items (invoice_id)",
  );
}

async function createInventoryTables(helpers) {
  await helpers.createTableIfMissing(
    "stock_items",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "stock_movements",
    `
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
    `,
  );

  await helpers.addIndexIfMissing(
    "stock_items",
    "uq_stock_items_company_item_warehouse",
    "CREATE UNIQUE INDEX uq_stock_items_company_item_warehouse ON stock_items (company_id, item_id, warehouse_id)",
  );
  await helpers.addIndexIfMissing(
    "stock_items",
    "idx_stock_items_company",
    "CREATE INDEX idx_stock_items_company ON stock_items (company_id)",
  );
  await helpers.addIndexIfMissing(
    "stock_movements",
    "idx_stock_movements_company_date",
    "CREATE INDEX idx_stock_movements_company_date ON stock_movements (company_id, movement_date)",
  );
  await helpers.addIndexIfMissing(
    "stock_movements",
    "idx_stock_movements_reference",
    "CREATE INDEX idx_stock_movements_reference ON stock_movements (reference_type, reference_id)",
  );
}

async function createPaymentsTables(helpers) {
  await helpers.createTableIfMissing(
    "payment_methods",
    `
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
    `,
  );

  await helpers.createTableIfMissing(
    "payments",
    `
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
    `,
  );

  await helpers.addIndexIfMissing(
    "payment_methods",
    "uq_payment_methods_company_name",
    "CREATE UNIQUE INDEX uq_payment_methods_company_name ON payment_methods (company_id, name)",
  );
  await helpers.addIndexIfMissing(
    "payments",
    "uq_payments_company_reference",
    "CREATE UNIQUE INDEX uq_payments_company_reference ON payments (company_id, reference_number)",
  );
  await helpers.addIndexIfMissing(
    "payments",
    "idx_payments_company_type",
    "CREATE INDEX idx_payments_company_type ON payments (company_id, payment_type)",
  );
  await helpers.addIndexIfMissing(
    "payments",
    "idx_payments_invoice",
    "CREATE INDEX idx_payments_invoice ON payments (invoice_id)",
  );
}

async function createAccountMappingTable(helpers) {
  await helpers.createTableIfMissing(
    "account_mapping_config",
    `
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
    `,
  );

  await helpers.addIndexIfMissing(
    "account_mapping_config",
    "uq_account_mapping_company_type_key",
    "CREATE UNIQUE INDEX uq_account_mapping_company_type_key ON account_mapping_config (company_id, transaction_type, mapping_key)",
  );
}

async function createViews(helpers) {
  await helpers.createOrReplaceView(
    "invoice_line_items",
    `
      SELECT
        id,
        sales_invoice_id AS invoice_id,
        item_id,
        item_name,
        description,
        quantity,
        uom,
        unit_price,
        tax_rate,
        tax_amount,
        discount_rate,
        discount_amount,
        line_total,
        created_at,
        updated_at
      FROM sales_invoice_line_items
    `,
  );

  await helpers.createOrReplaceView(
    "payment_methods_view",
    `
      SELECT
        pm.id,
        pm.company_id,
        pm.name,
        pm.account_id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        pm.description,
        pm.is_active,
        pm.created_at,
        pm.updated_at
      FROM payment_methods pm
      LEFT JOIN chart_of_accounts coa ON coa.id = pm.account_id
      WHERE pm.is_active = 1
    `,
  );

  await helpers.createOrReplaceView(
    "account_mapping_view",
    `
      SELECT
        amc.id,
        amc.company_id,
        amc.transaction_type,
        amc.mapping_key,
        amc.account_id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        amc.description,
        amc.is_active,
        amc.created_at,
        amc.updated_at
      FROM account_mapping_config amc
      JOIN chart_of_accounts coa ON coa.id = amc.account_id
      WHERE amc.is_active = 1
    `,
  );

  await helpers.createOrReplaceView(
    "customer_receivables",
    `
      SELECT
        si.company_id,
        si.customer_id,
        c.name AS customer_name,
        c.email,
        c.phone,
        coa.account_code,
        coa.account_name,
        'SALES_INVOICE' AS reference_document_type,
        si.id AS reference_document_id,
        si.invoice_date AS entry_date,
        si.due_date,
        si.notes AS description,
        si.invoice_number AS reference,
        GREATEST(si.total_amount - COALESCE(payments_summary.amount_paid, 0), 0) AS balance,
        CASE
          WHEN DATEDIFF(CURRENT_DATE, COALESCE(si.due_date, si.invoice_date)) <= 0 THEN 'Current'
          WHEN DATEDIFF(CURRENT_DATE, COALESCE(si.due_date, si.invoice_date)) BETWEEN 1 AND 30 THEN '1-30 Days'
          WHEN DATEDIFF(CURRENT_DATE, COALESCE(si.due_date, si.invoice_date)) BETWEEN 31 AND 60 THEN '31-60 Days'
          WHEN DATEDIFF(CURRENT_DATE, COALESCE(si.due_date, si.invoice_date)) BETWEEN 61 AND 90 THEN '61-90 Days'
          ELSE 'Over 90 Days'
        END AS aging_bucket,
        GREATEST(DATEDIFF(CURRENT_DATE, COALESCE(si.due_date, si.invoice_date)), 0) AS days_overdue
      FROM sales_invoices si
      JOIN customers c ON c.id = si.customer_id
      LEFT JOIN chart_of_accounts coa ON coa.id = c.receivable_account_id
      LEFT JOIN (
        SELECT
          company_id,
          invoice_id,
          SUM(amount) AS amount_paid
        FROM payments
        WHERE payment_type = 'RECEIVE'
          AND status = 'COMPLETED'
          AND is_active = 1
          AND invoice_id IS NOT NULL
        GROUP BY company_id, invoice_id
      ) payments_summary ON payments_summary.company_id = si.company_id
        AND payments_summary.invoice_id = si.id
      WHERE si.is_active = 1
        AND si.status <> 'CANCELLED'
        AND GREATEST(si.total_amount - COALESCE(payments_summary.amount_paid, 0), 0) > 0
    `,
  );

  await helpers.createOrReplaceView(
    "customer_receivables_aging",
    `
      SELECT
        company_id,
        customer_id,
        customer_name,
        SUM(CASE WHEN aging_bucket = 'Current' THEN balance ELSE 0 END) AS current_amount,
        SUM(CASE WHEN aging_bucket = '1-30 Days' THEN balance ELSE 0 END) AS days_1_30,
        SUM(CASE WHEN aging_bucket = '31-60 Days' THEN balance ELSE 0 END) AS days_31_60,
        SUM(CASE WHEN aging_bucket = '61-90 Days' THEN balance ELSE 0 END) AS days_61_90,
        SUM(CASE WHEN aging_bucket = 'Over 90 Days' THEN balance ELSE 0 END) AS over_90_days,
        SUM(balance) AS total_balance
      FROM customer_receivables
      GROUP BY company_id, customer_id, customer_name
    `,
  );

  await helpers.createOrReplaceView(
    "supplier_payables",
    `
      SELECT
        pi.company_id,
        pi.supplier_id,
        s.name AS supplier_name,
        s.email,
        s.phone,
        coa.account_code,
        coa.account_name,
        'PURCHASE_INVOICE' AS reference_document_type,
        pi.id AS reference_document_id,
        pi.invoice_date AS entry_date,
        pi.due_date,
        pi.notes AS description,
        pi.invoice_number AS reference,
        GREATEST(pi.total_amount - COALESCE(payments_summary.amount_paid, 0), 0) AS balance,
        CASE
          WHEN DATEDIFF(CURRENT_DATE, COALESCE(pi.due_date, pi.invoice_date)) <= 0 THEN 'Current'
          WHEN DATEDIFF(CURRENT_DATE, COALESCE(pi.due_date, pi.invoice_date)) BETWEEN 1 AND 30 THEN '1-30 Days'
          WHEN DATEDIFF(CURRENT_DATE, COALESCE(pi.due_date, pi.invoice_date)) BETWEEN 31 AND 60 THEN '31-60 Days'
          WHEN DATEDIFF(CURRENT_DATE, COALESCE(pi.due_date, pi.invoice_date)) BETWEEN 61 AND 90 THEN '61-90 Days'
          ELSE 'Over 90 Days'
        END AS aging_bucket,
        GREATEST(DATEDIFF(CURRENT_DATE, COALESCE(pi.due_date, pi.invoice_date)), 0) AS days_overdue
      FROM purchase_invoices pi
      JOIN suppliers s ON s.id = pi.supplier_id
      LEFT JOIN chart_of_accounts coa ON coa.id = s.payable_account_id
      LEFT JOIN (
        SELECT
          company_id,
          invoice_id,
          SUM(amount) AS amount_paid
        FROM payments
        WHERE payment_type = 'PAY'
          AND status = 'COMPLETED'
          AND is_active = 1
          AND invoice_id IS NOT NULL
        GROUP BY company_id, invoice_id
      ) payments_summary ON payments_summary.company_id = pi.company_id
        AND payments_summary.invoice_id = pi.id
      WHERE pi.is_active = 1
        AND pi.status <> 'CANCELLED'
        AND GREATEST(pi.total_amount - COALESCE(payments_summary.amount_paid, 0), 0) > 0
    `,
  );

  await helpers.createOrReplaceView(
    "supplier_payables_aging",
    `
      SELECT
        company_id,
        supplier_id,
        supplier_name,
        SUM(CASE WHEN aging_bucket = 'Current' THEN balance ELSE 0 END) AS current_amount,
        SUM(CASE WHEN aging_bucket = '1-30 Days' THEN balance ELSE 0 END) AS days_1_30,
        SUM(CASE WHEN aging_bucket = '31-60 Days' THEN balance ELSE 0 END) AS days_31_60,
        SUM(CASE WHEN aging_bucket = '61-90 Days' THEN balance ELSE 0 END) AS days_61_90,
        SUM(CASE WHEN aging_bucket = 'Over 90 Days' THEN balance ELSE 0 END) AS over_90_days,
        SUM(balance) AS total_balance
      FROM supplier_payables
      GROUP BY company_id, supplier_id, supplier_name
    `,
  );
}

async function seedMasterData(query) {
  const [companies] = await query("SELECT id FROM companies");
  const defaultUnits = [
    ["PCS", "Pieces", "Individual units"],
    ["KG", "Kilograms", "Weight in kilograms"],
    ["L", "Liters", "Volume in liters"],
    ["BOX", "Boxes", "Boxed units"],
    ["SET", "Sets", "Grouped unit sets"],
    ["M", "Meters", "Length in meters"],
  ];
  const defaultCategories = [
    ["Raw Materials", "Basic materials used in procurement and manufacturing"],
    ["Finished Goods", "Products ready for sale"],
    ["Services", "Non-stock service items"],
    ["Supplies", "Operational and office supplies"],
    ["Equipment", "Machinery and long-lived assets"],
  ];
  const defaultPaymentMethods = [
    ["Cash", "Cash payments"],
    ["Bank Transfer", "Bank transfer settlements"],
    ["Credit Card", "Card collections and settlements"],
  ];

  for (const company of companies) {
    for (const [code, name, description] of defaultUnits) {
      await query(
        `
          INSERT INTO item_units_of_measure (id, code, name, description, company_id)
          SELECT uuid(), ?, ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1
            FROM item_units_of_measure
            WHERE company_id = ? AND code = ?
          )
        `,
        [code, name, description, company.id, company.id, code],
      );
    }

    for (const [name, description] of defaultCategories) {
      await query(
        `
          INSERT INTO item_categories (id, name, description, company_id)
          SELECT uuid(), ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1
            FROM item_categories
            WHERE company_id = ? AND name = ?
          )
        `,
        [name, description, company.id, company.id, name],
      );
    }

    for (const [name, description] of defaultPaymentMethods) {
      await query(
        `
          INSERT INTO payment_methods (id, company_id, name, description)
          SELECT uuid(), ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1
            FROM payment_methods
            WHERE company_id = ? AND name = ?
          )
        `,
        [company.id, name, description, company.id, name],
      );
    }
  }
}

async function seedStockItems(query) {
  await query(`
    INSERT INTO stock_items (
      id,
      item_id,
      company_id,
      current_quantity,
      quantity_on_hand,
      available_quantity,
      reorder_level,
      max_level,
      average_cost,
      last_cost
    )
    SELECT
      uuid(),
      i.id,
      i.company_id,
      COALESCE(i.current_stock, 0),
      COALESCE(i.current_stock, 0),
      COALESCE(i.current_stock, 0),
      COALESCE(i.reorder_point, 0),
      COALESCE(i.max_stock_level, 0),
      COALESCE(i.cost_price, 0),
      COALESCE(i.cost_price, 0)
    FROM items i
    LEFT JOIN stock_items si
      ON si.item_id = i.id
     AND si.company_id = i.company_id
     AND si.warehouse_id IS NULL
    WHERE i.is_inventory_item = 1
      AND si.id IS NULL
  `);
}
