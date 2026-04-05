import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadEnvFiles([
  path.join(projectRoot, ".env.local"),
  path.join(projectRoot, ".env"),
  path.join(projectRoot, "src", ".env.local"),
  path.join(projectRoot, "src", ".env"),
]);

const port = Number(process.env.PORT || process.env.API_PORT || 3001);

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.VITE_MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || process.env.VITE_MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE || process.env.VITE_MYSQL_DATABASE || "close_statement_hub",
  user: process.env.MYSQL_USER || process.env.VITE_MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || process.env.VITE_MYSQL_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
});

const tableColumnsCache = new Map();

const TABLES = {
  companies: {
    tableName: "companies",
    idColumn: "id",
    writableColumns: [
      "name",
      "logo",
      "description",
      "industry",
      "company_size",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "zip",
      "country",
      "currency",
      "fiscal_year_start",
      "tax_id",
      "multi_currency",
      "inventory_tracking",
      "auto_backup",
      "timezone",
      "default_warehouse_id",
      "default_sales_tax_rate",
      "default_purchase_tax_rate",
      "base_currency",
    ],
    defaultValues: {
      multi_currency: false,
      inventory_tracking: true,
      auto_backup: true,
    },
  },
  customers: {
    tableName: "customers",
    idColumn: "id",
    writableColumns: [
      "customer_code",
      "name",
      "email",
      "phone",
      "contact_person",
      "address",
      "city",
      "state",
      "zip_code",
      "country",
      "tax_id",
      "credit_limit",
      "payment_terms",
      "is_active",
      "notes",
      "website",
      "industry",
      "customer_type",
      "default_currency",
      "discount_percentage",
      "receivable_account_id",
      "company_id",
    ],
    defaultValues: {
      is_active: true,
      customer_type: "RETAIL",
      default_currency: "LYD",
    },
  },
  suppliers: {
    tableName: "suppliers",
    idColumn: "id",
    writableColumns: [
      "supplier_code",
      "name",
      "email",
      "phone",
      "contact_person",
      "address",
      "city",
      "state",
      "zip_code",
      "country",
      "tax_id",
      "credit_limit",
      "payment_terms",
      "is_active",
      "notes",
      "website",
      "industry",
      "supplier_type",
      "default_currency",
      "discount_percentage",
      "payable_account_id",
      "company_id",
    ],
    defaultValues: {
      is_active: true,
      supplier_type: "MANUFACTURER",
      default_currency: "LYD",
    },
  },
  chart_of_accounts: {
    tableName: "chart_of_accounts",
    idColumn: "id",
    writableColumns: [
      "account_code",
      "account_name",
      "account_type",
      "parent_account_id",
      "company_id",
      "is_active",
      "normal_balance",
      "description",
      "is_group",
    ],
    defaultValues: {
      is_active: true,
      is_group: false,
    },
  },
  items: {
    tableName: "items",
    idColumn: "id",
    writableColumns: [
      "item_code",
      "name",
      "description",
      "category",
      "subcategory",
      "unit_of_measure",
      "unit_price",
      "cost_price",
      "selling_price",
      "tax_rate",
      "min_stock_level",
      "max_stock_level",
      "current_stock",
      "reorder_point",
      "supplier_id",
      "company_id",
      "is_active",
      "is_taxable",
      "is_inventory_item",
      "barcode",
      "sku",
      "weight",
      "dimensions",
      "image_url",
      "notes",
      "income_account_id",
      "expense_account_id",
    ],
    defaultValues: {
      is_active: true,
      is_taxable: false,
      is_inventory_item: true,
      current_stock: 0,
    },
  },
  item_categories: {
    tableName: "item_categories",
    idColumn: "id",
    writableColumns: [
      "name",
      "description",
      "parent_category_id",
      "company_id",
      "is_active",
    ],
    defaultValues: {
      is_active: true,
    },
  },
  item_units_of_measure: {
    tableName: "item_units_of_measure",
    idColumn: "id",
    writableColumns: [
      "code",
      "name",
      "description",
      "company_id",
      "is_active",
    ],
    defaultValues: {
      is_active: true,
    },
  },
  journal_entries: {
    tableName: "journal_entries",
    idColumn: "id",
    writableColumns: [
      "entry_number",
      "journal_number",
      "entry_date",
      "memo",
      "description",
      "company_id",
      "is_active",
      "reference",
      "reference_type",
      "reference_id",
      "reference_number",
      "status",
      "notes",
    ],
    defaultValues: {
      is_active: true,
      status: "POSTED",
    },
  },
  journal_entry_lines: {
    tableName: "journal_entry_lines",
    idColumn: "id",
    writableColumns: [
      "journal_entry_id",
      "account_id",
      "line_number",
      "debit_amount",
      "credit_amount",
      "description",
      "party_type",
      "customer_id",
      "supplier_id",
    ],
    defaultValues: {},
  },
  sales_invoices: {
    tableName: "sales_invoices",
    idColumn: "id",
    writableColumns: [
      "invoice_number",
      "customer_id",
      "company_id",
      "invoice_date",
      "due_date",
      "status",
      "delivery_status",
      "subtotal",
      "tax_amount",
      "discount_amount",
      "total_amount",
      "currency",
      "payment_terms",
      "notes",
      "terms_and_conditions",
      "is_active",
    ],
    defaultValues: {
      is_active: true,
      status: "DRAFT",
      currency: "LYD",
    },
  },
  sales_invoice_line_items: {
    tableName: "sales_invoice_line_items",
    idColumn: "id",
    writableColumns: [
      "sales_invoice_id",
      "item_id",
      "item_name",
      "description",
      "quantity",
      "uom",
      "unit_price",
      "tax_rate",
      "tax_amount",
      "discount_rate",
      "discount_amount",
      "line_total",
    ],
    defaultValues: {},
  },
  invoice_line_items: {
    tableName: "invoice_line_items",
    idColumn: "id",
    writableColumns: [
      "invoice_id",
      "item_id",
      "item_name",
      "description",
      "quantity",
      "uom",
      "unit_price",
      "tax_rate",
      "tax_amount",
      "discount_rate",
      "discount_amount",
      "line_total",
    ],
    defaultValues: {},
  },
  stock_items: {
    tableName: "stock_items",
    idColumn: "id",
    writableColumns: [
      "item_id",
      "company_id",
      "warehouse_id",
      "current_quantity",
      "quantity_on_hand",
      "reserved_quantity",
      "available_quantity",
      "reorder_level",
      "max_level",
      "average_cost",
      "last_cost",
      "is_active",
    ],
    defaultValues: {},
  },
  stock_movements: {
    tableName: "stock_movements",
    idColumn: "id",
    writableColumns: [
      "item_id",
      "company_id",
      "warehouse_id",
      "movement_type",
      "movement_source",
      "quantity",
      "unit_cost",
      "total_cost",
      "reference_type",
      "reference_id",
      "reference_number",
      "movement_date",
      "description",
      "notes",
      "is_active",
    ],
    defaultValues: {},
  },
};

Object.assign(TABLES, {
  purchase_invoices: {
    tableName: "purchase_invoices",
    idColumn: "id",
    writableColumns: [
      "invoice_number",
      "supplier_id",
      "company_id",
      "invoice_date",
      "due_date",
      "status",
      "subtotal",
      "tax_amount",
      "discount_amount",
      "total_amount",
      "currency",
      "payment_terms",
      "notes",
      "terms_and_conditions",
      "is_active",
    ],
    defaultValues: {
      is_active: true,
      status: "SUBMITTED",
      currency: "LYD",
    },
  },
  purchase_invoice_line_items: {
    tableName: "purchase_invoice_line_items",
    idColumn: "id",
    writableColumns: [
      "invoice_id",
      "item_id",
      "item_name",
      "description",
      "quantity",
      "uom",
      "unit_price",
      "tax_rate",
      "tax_amount",
      "discount_rate",
      "discount_amount",
      "line_total",
    ],
    defaultValues: {},
  },
  payment_methods: {
    tableName: "payment_methods",
    idColumn: "id",
    writableColumns: ["company_id", "name", "account_id", "description", "is_active"],
    defaultValues: { is_active: true },
  },
  payment_methods_view: {
    tableName: "payment_methods_view",
    idColumn: "id",
    writableColumns: [],
    defaultValues: {},
    readOnly: true,
  },
  payments: {
    tableName: "payments",
    idColumn: "id",
    writableColumns: [
      "payment_type",
      "customer_id",
      "supplier_id",
      "invoice_id",
      "company_id",
      "payment_date",
      "payment_method",
      "payment_method_id",
      "reference_number",
      "amount",
      "notes",
      "status",
      "currency",
      "is_active",
    ],
    defaultValues: {
      is_active: true,
      status: "COMPLETED",
      currency: "LYD",
    },
  },
  account_mapping_config: {
    tableName: "account_mapping_config",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "transaction_type",
      "mapping_key",
      "account_id",
      "description",
      "is_active",
    ],
    defaultValues: { is_active: true },
  },
  account_mapping_view: {
    tableName: "account_mapping_view",
    idColumn: "id",
    writableColumns: [],
    defaultValues: {},
    readOnly: true,
  },
  customer_receivables: {
    tableName: "customer_receivables",
    idColumn: "reference_document_id",
    writableColumns: [],
    defaultValues: {},
    readOnly: true,
  },
  customer_receivables_aging: {
    tableName: "customer_receivables_aging",
    idColumn: "customer_id",
    writableColumns: [],
    defaultValues: {},
    readOnly: true,
  },
  supplier_payables: {
    tableName: "supplier_payables",
    idColumn: "reference_document_id",
    writableColumns: [],
    defaultValues: {},
    readOnly: true,
  },
  supplier_payables_aging: {
    tableName: "supplier_payables_aging",
    idColumn: "supplier_id",
    writableColumns: [],
    defaultValues: {},
    readOnly: true,
  },
  warehouses: {
    tableName: "warehouses",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "warehouse_code",
      "name",
      "description",
      "address_line_1",
      "address_line_2",
      "city",
      "state",
      "postal_code",
      "country",
      "is_default",
      "is_active",
    ],
    defaultValues: { is_default: false, is_active: true },
  },
  customer_contacts: {
    tableName: "customer_contacts",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "customer_id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "mobile",
      "position_title",
      "is_primary",
      "notes",
      "is_active",
    ],
    defaultValues: { is_primary: false, is_active: true },
  },
  supplier_contacts: {
    tableName: "supplier_contacts",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "supplier_id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "mobile",
      "position_title",
      "is_primary",
      "notes",
      "is_active",
    ],
    defaultValues: { is_primary: false, is_active: true },
  },
  customer_addresses: {
    tableName: "customer_addresses",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "customer_id",
      "label",
      "address_line_1",
      "address_line_2",
      "city",
      "state",
      "postal_code",
      "country",
      "is_billing",
      "is_shipping",
      "is_primary",
    ],
    defaultValues: { is_billing: false, is_shipping: true, is_primary: false },
  },
  supplier_addresses: {
    tableName: "supplier_addresses",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "supplier_id",
      "label",
      "address_line_1",
      "address_line_2",
      "city",
      "state",
      "postal_code",
      "country",
      "is_billing",
      "is_shipping",
      "is_primary",
    ],
    defaultValues: { is_billing: true, is_shipping: false, is_primary: false },
  },
  sales_orders: {
    tableName: "sales_orders",
    idColumn: "id",
    writableColumns: [
      "order_number",
      "customer_id",
      "company_id",
      "order_date",
      "requested_delivery_date",
      "status",
      "subtotal",
      "tax_amount",
      "discount_amount",
      "total_amount",
      "currency",
      "payment_terms",
      "notes",
    ],
    defaultValues: { status: "DRAFT", currency: "LYD" },
  },
  sales_order_line_items: {
    tableName: "sales_order_line_items",
    idColumn: "id",
    writableColumns: [
      "sales_order_id",
      "item_id",
      "item_name",
      "description",
      "quantity",
      "uom",
      "unit_price",
      "tax_rate",
      "tax_amount",
      "discount_amount",
      "line_total",
    ],
    defaultValues: {},
  },
  purchase_orders: {
    tableName: "purchase_orders",
    idColumn: "id",
    writableColumns: [
      "order_number",
      "supplier_id",
      "company_id",
      "order_date",
      "expected_receipt_date",
      "status",
      "subtotal",
      "tax_amount",
      "discount_amount",
      "total_amount",
      "currency",
      "payment_terms",
      "notes",
    ],
    defaultValues: { status: "DRAFT", currency: "LYD" },
  },
  purchase_order_line_items: {
    tableName: "purchase_order_line_items",
    idColumn: "id",
    writableColumns: [
      "purchase_order_id",
      "item_id",
      "item_name",
      "description",
      "quantity",
      "uom",
      "unit_price",
      "tax_rate",
      "tax_amount",
      "discount_amount",
      "line_total",
    ],
    defaultValues: {},
  },
  stock_transfers: {
    tableName: "stock_transfers",
    idColumn: "id",
    writableColumns: [
      "transfer_number",
      "company_id",
      "source_warehouse_id",
      "destination_warehouse_id",
      "transfer_date",
      "status",
      "notes",
    ],
    defaultValues: { status: "DRAFT" },
  },
  stock_transfer_line_items: {
    tableName: "stock_transfer_line_items",
    idColumn: "id",
    writableColumns: [
      "stock_transfer_id",
      "item_id",
      "quantity",
      "uom",
      "unit_cost",
      "total_cost",
    ],
    defaultValues: {},
  },
  item_supplier_prices: {
    tableName: "item_supplier_prices",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "item_id",
      "supplier_id",
      "supplier_sku",
      "minimum_order_quantity",
      "lead_time_days",
      "last_purchase_price",
      "currency",
      "is_preferred",
      "is_active",
    ],
    defaultValues: { currency: "LYD", is_preferred: false, is_active: true },
  },
  inventory_counts: {
    tableName: "inventory_counts",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "warehouse_id",
      "count_number",
      "count_date",
      "status",
      "notes",
    ],
    defaultValues: { status: "DRAFT" },
  },
  inventory_count_lines: {
    tableName: "inventory_count_lines",
    idColumn: "id",
    writableColumns: [
      "inventory_count_id",
      "item_id",
      "system_quantity",
      "counted_quantity",
      "variance_quantity",
      "unit_cost",
      "notes",
    ],
    defaultValues: {},
  },
  document_sequences: {
    tableName: "document_sequences",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "document_type",
      "prefix",
      "next_number",
      "padding",
      "is_active",
    ],
    defaultValues: { next_number: 1, padding: 4, is_active: true },
  },
  fiscal_periods: {
    tableName: "fiscal_periods",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "period_code",
      "period_name",
      "start_date",
      "end_date",
      "status",
      "closed_at",
      "reopened_at",
      "notes",
    ],
    defaultValues: { status: "OPEN" },
  },
  period_close_runs: {
    tableName: "period_close_runs",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "fiscal_period_id",
      "run_type",
      "status",
      "checklist_snapshot",
      "notes",
      "created_by",
    ],
    defaultValues: { status: "COMPLETED" },
  },
  audit_events: {
    tableName: "audit_events",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "actor_id",
      "actor_name",
      "action_type",
      "resource_type",
      "resource_id",
      "resource_label",
      "status",
      "summary",
      "metadata",
      "occurred_at",
    ],
    defaultValues: { actor_name: "System", status: "SUCCESS" },
  },
  notification_rules: {
    tableName: "notification_rules",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "rule_code",
      "title",
      "severity",
      "is_active",
      "settings",
    ],
    defaultValues: { severity: "INFO", is_active: true },
  },
  notification_events: {
    tableName: "notification_events",
    idColumn: "id",
    writableColumns: [
      "company_id",
      "rule_id",
      "source_type",
      "source_id",
      "severity",
      "title",
      "message",
      "status",
      "triggered_at",
      "acknowledged_at",
      "resolved_at",
      "metadata",
    ],
    defaultValues: { severity: "INFO", status: "OPEN" },
  },
  audit_event_feed: {
    tableName: "audit_event_feed",
    idColumn: "id",
    writableColumns: [],
    defaultValues: {},
    readOnly: true,
  },
  period_status_summary: {
    tableName: "period_status_summary",
    idColumn: "fiscal_period_id",
    writableColumns: [],
    defaultValues: {},
    readOnly: true,
  },
});

const server = http.createServer(async (req, res) => {
  try {
    applyCors(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      const [rows] = await pool.query("SELECT 1 AS ok");
      sendJson(res, 200, {
        ok: true,
        database: rows?.[0]?.ok === 1 ? "connected" : "unknown",
      });
      return;
    }

    const routeMatch = url.pathname.match(/^\/api\/([a-z_]+)(?:\/([^/]+))?$/);
    if (!routeMatch) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const [, resourceName, recordId] = routeMatch;
    const customGetResponse = await handleCustomGetResource(resourceName, recordId, req.method);
    if (customGetResponse) {
      sendJson(res, 200, customGetResponse);
      return;
    }

    const config = TABLES[resourceName];
    if (!config) {
      sendJson(res, 404, { error: `Unsupported resource: ${resourceName}` });
      return;
    }

    if (req.method === "GET" && !recordId) {
      const filters = Object.fromEntries(url.searchParams.entries());
      const rows = await selectRows(config, filters);
      sendJson(res, 200, rows);
      return;
    }

    if (req.method === "GET" && recordId) {
      const rows = await selectRows(config, { [config.idColumn]: recordId });
      if (!rows.length) {
        sendJson(res, 404, { error: `${resourceName.slice(0, -1)} not found` });
        return;
      }
      sendJson(res, 200, rows[0]);
      return;
    }

    if (config.readOnly) {
      sendJson(res, 405, { error: `${resourceName} is read-only` });
      return;
    }

    if (req.method === "POST" && !recordId) {
      const body = await readJsonBody(req);
      const tableColumns = await getTableColumns(config.tableName);
      const payload = normalizeResourcePayload(
        resourceName,
        sanitizePayload(config, body, true, tableColumns),
        tableColumns,
      );
      const id = String(body.id || randomUUID());
      const now = new Date();

      const filteredDefaults = Object.fromEntries(
        Object.entries(config.defaultValues).filter(([column]) => tableColumns.has(column)),
      );

      const insertData = {
        ...filteredDefaults,
        ...payload,
      };

      if (tableColumns.has("id")) {
        insertData.id = id;
      }
      if (tableColumns.has("created_at")) {
        insertData.created_at = toMySqlDateTime(now);
      }
      if (tableColumns.has("updated_at")) {
        insertData.updated_at = toMySqlDateTime(now);
      }

      if (resourceName === "customers" && tableColumns.has("customer_code") && !insertData.customer_code) {
        insertData.customer_code = await generateCustomerCode(insertData.company_id);
      }
      if (resourceName === "suppliers" && tableColumns.has("supplier_code") && !insertData.supplier_code) {
        insertData.supplier_code = await generateSupplierCode(insertData.company_id);
      }

      await insertRow(config.tableName, insertData);
      if (resourceName === "companies") {
        await seedCompanyWorkspace(id, insertData);
      }
      await logAuditEvent({
        companyId: insertData.company_id || (resourceName === "companies" ? id : null),
        actionType: "CREATE",
        resourceType: resourceName,
        resourceId: id,
        resourceLabel: getAuditResourceLabel(resourceName, insertData),
        summary: `Created ${resourceName.replace(/_/g, " ")}`,
        metadata: buildAuditMetadata(insertData),
      });
      const rows = await selectRows(config, tableColumns.has("id") ? { id } : payload);
      sendJson(res, 201, rows[0] || insertData);
      return;
    }

    if (req.method === "PUT" && recordId) {
      const body = await readJsonBody(req);
      const existingRows = await selectRows(config, { [config.idColumn]: recordId });
      const existingRow = existingRows[0];
      if (!existingRow) {
        sendJson(res, 404, { error: `${resourceName.slice(0, -1)} not found` });
        return;
      }

      const tableColumns = await getTableColumns(config.tableName);
      const payload = normalizeResourcePayload(
        resourceName,
        sanitizePayload(config, body, false, tableColumns),
        tableColumns,
      );
      if (tableColumns.has("updated_at")) {
        payload.updated_at = toMySqlDateTime(new Date());
      }

      if (!Object.keys(payload).length) {
        sendJson(res, 400, { error: "No valid fields supplied" });
        return;
      }

      if (await isBlockedProtectedUpdate(resourceName, existingRow, payload)) {
        await logAuditEvent({
          companyId: existingRow.company_id || null,
          actionType: "UPDATE_ATTEMPT",
          resourceType: resourceName,
          resourceId: recordId,
          resourceLabel: getAuditResourceLabel(resourceName, existingRow),
          status: "BLOCKED",
          summary: `Blocked update to protected ${resourceName.replace(/_/g, " ")}`,
          metadata: buildAuditMetadata({ attemptedChanges: payload, currentStatus: existingRow.status }),
        });
        sendJson(res, 409, { error: "Posted or completed documents can only be changed through controlled status actions." });
        return;
      }

      await updateRow(config.tableName, config.idColumn, recordId, payload);
      const rows = await selectRows(config, { [config.idColumn]: recordId });
      if (!rows.length) {
        sendJson(res, 404, { error: `${resourceName.slice(0, -1)} not found` });
        return;
      }
      await logAuditEvent({
        companyId: rows[0].company_id || existingRow.company_id || null,
        actionType: resourceName === "account_mapping_config" ? "MAPPING_CHANGE" : "UPDATE",
        resourceType: resourceName,
        resourceId: recordId,
        resourceLabel: getAuditResourceLabel(resourceName, rows[0]),
        summary: `Updated ${resourceName.replace(/_/g, " ")}`,
        metadata: buildAuditMetadata(payload),
      });
      sendJson(res, 200, rows[0]);
      return;
    }

    if (req.method === "DELETE" && recordId) {
      const existingRows = await selectRows(config, { [config.idColumn]: recordId });
      const existingRow = existingRows[0];
      if (!existingRow) {
        sendJson(res, 404, { error: `${resourceName.slice(0, -1)} not found` });
        return;
      }

      if (isBlockedProtectedDelete(resourceName, existingRow)) {
        await logAuditEvent({
          companyId: existingRow.company_id || null,
          actionType: "DELETE_ATTEMPT",
          resourceType: resourceName,
          resourceId: recordId,
          resourceLabel: getAuditResourceLabel(resourceName, existingRow),
          status: "BLOCKED",
          summary: `Blocked deletion of protected ${resourceName.replace(/_/g, " ")}`,
          metadata: buildAuditMetadata({ currentStatus: existingRow.status }),
        });
        sendJson(res, 409, { error: "Protected financial documents cannot be deleted once posted or completed." });
        return;
      }

      await pool.execute(
        `DELETE FROM \`${config.tableName}\` WHERE \`${config.idColumn}\` = ?`,
        [recordId],
      );
      await logAuditEvent({
        companyId: existingRow.company_id || null,
        actionType: "DELETE",
        resourceType: resourceName,
        resourceId: recordId,
        resourceLabel: getAuditResourceLabel(resourceName, existingRow),
        summary: `Deleted ${resourceName.replace(/_/g, " ")}`,
        metadata: buildAuditMetadata(existingRow),
      });
      sendJson(res, 200, { success: true });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("[api] Request failed:", error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

server.listen(port, () => {
  console.log(`[api] MySQL API listening on http://localhost:${port}`);
});

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function selectRows(config, filters) {
  const tableColumns = await getTableColumns(config.tableName);
  const clauses = [];
  const values = [];

  for (const [column, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    clauses.push(`\`${column}\` = ?`);
    values.push(value);
  }

  const whereClause = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const orderColumns = ["updated_at", "created_at"].filter((column) => tableColumns.has(column));
  const orderClause = orderColumns.length
    ? ` ORDER BY ${orderColumns.map((column) => `\`${column}\` DESC`).join(", ")}`
    : "";
  const [rows] = await pool.query(
    `SELECT * FROM \`${config.tableName}\`${whereClause}${orderClause}`,
    values,
  );

  return rows;
}

async function insertRow(tableName, data) {
  const columns = Object.keys(data);
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO \`${tableName}\` (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES (${placeholders})`;
  await pool.execute(sql, columns.map((column) => data[column]));
}

async function updateRow(tableName, idColumn, id, data) {
  const columns = Object.keys(data);
  const assignments = columns.map((column) => `\`${column}\` = ?`).join(", ");
  const sql = `UPDATE \`${tableName}\` SET ${assignments} WHERE \`${idColumn}\` = ?`;
  await pool.execute(sql, [...columns.map((column) => data[column]), id]);
}

async function handleCustomGetResource(resourceName, recordId, method) {
  if (method !== "GET" || !recordId) {
    return null;
  }

  if (resourceName === "company_overview") {
    return buildCompanyOverview(recordId);
  }
  if (resourceName === "company_exceptions") {
    return buildCompanyExceptions(recordId);
  }
  if (resourceName === "company_audit") {
    return buildCompanyAudit(recordId);
  }
  if (resourceName === "company_period_status") {
    return buildCompanyPeriodStatus(recordId);
  }

  return null;
}

async function isBlockedProtectedUpdate(resourceName, existingRow, payload) {
  if (!existingRow || !existingRow.status) {
    return false;
  }

  const protectedFieldsByResource = {
    sales_invoices: new Set([
      "invoice_number",
      "customer_id",
      "invoice_date",
      "due_date",
      "subtotal",
      "tax_amount",
      "discount_amount",
      "total_amount",
      "currency",
      "payment_terms",
    ]),
    purchase_invoices: new Set([
      "invoice_number",
      "supplier_id",
      "invoice_date",
      "due_date",
      "subtotal",
      "tax_amount",
      "discount_amount",
      "total_amount",
      "currency",
      "payment_terms",
    ]),
    payments: new Set([
      "payment_type",
      "customer_id",
      "supplier_id",
      "invoice_id",
      "payment_date",
      "payment_method",
      "payment_method_id",
      "reference_number",
      "amount",
      "currency",
    ]),
    journal_entries: new Set([
      "entry_number",
      "journal_number",
      "entry_date",
      "reference",
      "reference_type",
      "reference_id",
      "reference_number",
    ]),
  };

  const immutableStatuses = {
    sales_invoices: new Set(["SUBMITTED", "PAID", "OVERDUE", "CANCELLED"]),
    purchase_invoices: new Set(["SUBMITTED", "RECEIVED", "PAID", "OVERDUE", "CANCELLED"]),
    payments: new Set(["COMPLETED"]),
    journal_entries: new Set(["POSTED", "VOID"]),
  };

  const protectedFields = protectedFieldsByResource[resourceName];
  const statuses = immutableStatuses[resourceName];
  if (!protectedFields || !statuses?.has(String(existingRow.status))) {
    return false;
  }

  return Object.keys(payload).some((column) => protectedFields.has(column));
}

function isBlockedProtectedDelete(resourceName, existingRow) {
  if (!existingRow || !existingRow.status) {
    return false;
  }

  const protectedStatuses = {
    sales_invoices: new Set(["SUBMITTED", "PAID", "OVERDUE", "CANCELLED"]),
    purchase_invoices: new Set(["SUBMITTED", "RECEIVED", "PAID", "OVERDUE", "CANCELLED"]),
    payments: new Set(["COMPLETED"]),
    journal_entries: new Set(["POSTED", "VOID"]),
  };

  return Boolean(protectedStatuses[resourceName]?.has(String(existingRow.status)));
}

function getAuditResourceLabel(resourceName, row = {}) {
  return row.name
    || row.account_name
    || row.invoice_number
    || row.journal_number
    || row.entry_number
    || row.reference_number
    || row.period_name
    || `${resourceName}:${row.id || row.resource_id || "record"}`;
}

function buildAuditMetadata(payload) {
  return JSON.stringify(payload ?? {});
}

async function logAuditEvent({
  companyId = null,
  actionType,
  resourceType,
  resourceId = null,
  resourceLabel = null,
  status = "SUCCESS",
  summary,
  metadata = "{}",
  actorName = "System",
}) {
  if (resourceType === "audit_events" || !(await tableExists("audit_events"))) {
    return;
  }

  const occurredAt = toMySqlDateTime(new Date());
  await pool.execute(
    `
      INSERT INTO audit_events (
        id,
        company_id,
        actor_name,
        action_type,
        resource_type,
        resource_id,
        resource_label,
        status,
        summary,
        metadata,
        occurred_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      companyId,
      actorName,
      actionType,
      resourceType,
      resourceId,
      resourceLabel,
      status,
      summary,
      metadata,
      occurredAt,
      occurredAt,
      occurredAt,
    ],
  );
}

async function seedCompanyWorkspace(companyId, company) {
  await ensureDefaultWarehouse(companyId);
  await seedCompanyChartOfAccounts(companyId);
  await seedCompanyAccountMappings(companyId);
  await seedCompanyMasterData(companyId);
  await ensureCompanyControlSeeds(companyId, company);
}

async function ensureDefaultWarehouse(companyId) {
  if (!(await tableExists("warehouses"))) {
    return;
  }

  const [warehouseRows] = await pool.query(
    "SELECT id FROM warehouses WHERE company_id = ? AND is_default = 1 LIMIT 1",
    [companyId],
  );

  let warehouseId = warehouseRows[0]?.id || null;
  if (!warehouseId) {
    warehouseId = randomUUID();
    await pool.execute(
      `
        INSERT INTO warehouses (
          id, company_id, warehouse_code, name, description, is_default, is_active, created_at, updated_at
        ) VALUES (?, ?, 'MAIN', 'Main Warehouse', 'Default warehouse for the company workspace', 1, 1, ?, ?)
      `,
      [warehouseId, companyId, toMySqlDateTime(new Date()), toMySqlDateTime(new Date())],
    );
  }

  const companyColumns = await getTableColumns("companies");
  if (companyColumns.has("default_warehouse_id")) {
    await pool.execute("UPDATE companies SET default_warehouse_id = ? WHERE id = ?", [warehouseId, companyId]);
  }
}

async function seedCompanyChartOfAccounts(companyId) {
  if (!(await tableExists("chart_of_accounts"))) {
    return;
  }

  const accounts = [
    ["1000", "Cash", "Asset", "DEBIT"],
    ["1010", "Bank", "Asset", "DEBIT"],
    ["1100", "Accounts Receivable", "Asset", "DEBIT"],
    ["1200", "Inventory", "Asset", "DEBIT"],
    ["1300", "Tax Receivable", "Asset", "DEBIT"],
    ["2000", "Accounts Payable", "Liability", "CREDIT"],
    ["2100", "Sales Tax Payable", "Liability", "CREDIT"],
    ["3000", "Owner's Equity", "Equity", "CREDIT"],
    ["4000", "Sales Revenue", "Revenue", "CREDIT"],
    ["5000", "Cost of Goods Sold", "Expense", "DEBIT"],
    ["5100", "Purchase Expense", "Expense", "DEBIT"],
  ];

  for (const [accountCode, accountName, accountType, normalBalance] of accounts) {
    await pool.execute(
      `
        INSERT INTO chart_of_accounts (
          id, account_code, account_name, account_type, company_id, is_active, normal_balance, is_group, created_at, updated_at
        )
        SELECT ?, ?, ?, ?, ?, 1, ?, 0, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM chart_of_accounts WHERE company_id = ? AND account_code = ?
        )
      `,
      [
        randomUUID(),
        accountCode,
        accountName,
        accountType,
        companyId,
        normalBalance,
        toMySqlDateTime(new Date()),
        toMySqlDateTime(new Date()),
        companyId,
        accountCode,
      ],
    );
  }
}

async function seedCompanyAccountMappings(companyId) {
  if (!(await tableExists("account_mapping_config"))) {
    return;
  }

  const [accounts] = await pool.query(
    "SELECT id, account_code FROM chart_of_accounts WHERE company_id = ?",
    [companyId],
  );
  const byCode = Object.fromEntries(accounts.map((account) => [account.account_code, account.id]));
  const mappings = [
    ["SALES_INVOICE", "receivable_account", byCode["1100"], "Default receivable account for sales invoices"],
    ["SALES_INVOICE", "default_sales_account", byCode["4000"], "Default sales revenue account"],
    ["SALES_INVOICE", "tax_payable_account", byCode["2100"], "Default sales tax payable account"],
    ["PURCHASE_INVOICE", "payable_account", byCode["2000"], "Default payable account for purchase invoices"],
    ["PURCHASE_INVOICE", "default_inventory_account", byCode["1200"] || byCode["5100"], "Default inventory or expense account"],
    ["PURCHASE_INVOICE", "tax_receivable_account", byCode["1300"], "Default purchase tax receivable account"],
  ].filter(([, , accountId]) => Boolean(accountId));

  for (const [transactionType, mappingKey, accountId, description] of mappings) {
    await pool.execute(
      `
        INSERT INTO account_mapping_config (
          id, company_id, transaction_type, mapping_key, account_id, description, is_active, created_at, updated_at
        )
        SELECT ?, ?, ?, ?, ?, ?, 1, ?, ?
        WHERE NOT EXISTS (
          SELECT 1
          FROM account_mapping_config
          WHERE company_id = ? AND transaction_type = ? AND mapping_key = ?
        )
      `,
      [
        randomUUID(),
        companyId,
        transactionType,
        mappingKey,
        accountId,
        description,
        toMySqlDateTime(new Date()),
        toMySqlDateTime(new Date()),
        companyId,
        transactionType,
        mappingKey,
      ],
    );
  }
}

async function seedCompanyMasterData(companyId) {
  if (await tableExists("item_units_of_measure")) {
    const units = [
      ["PCS", "Pieces", "Individual units"],
      ["KG", "Kilograms", "Weight in kilograms"],
      ["L", "Liters", "Volume in liters"],
    ];
    for (const [code, name, description] of units) {
      await pool.execute(
        `
          INSERT INTO item_units_of_measure (id, code, name, description, company_id, is_active, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, 1, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM item_units_of_measure WHERE company_id = ? AND code = ?
          )
        `,
        [randomUUID(), code, name, description, companyId, toMySqlDateTime(new Date()), toMySqlDateTime(new Date()), companyId, code],
      );
    }
  }

  if (await tableExists("item_categories")) {
    const categories = [
      ["Finished Goods", "Products ready for sale"],
      ["Raw Materials", "Materials used for purchasing and stock"],
      ["Services", "Non-stock services"],
    ];
    for (const [name, description] of categories) {
      await pool.execute(
        `
          INSERT INTO item_categories (id, name, description, company_id, is_active, created_at, updated_at)
          SELECT ?, ?, ?, ?, 1, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM item_categories WHERE company_id = ? AND name = ?
          )
        `,
        [randomUUID(), name, description, companyId, toMySqlDateTime(new Date()), toMySqlDateTime(new Date()), companyId, name],
      );
    }
  }

  if (await tableExists("payment_methods")) {
    const [bankAccountRows] = await pool.query(
      "SELECT id FROM chart_of_accounts WHERE company_id = ? AND account_code = '1010' LIMIT 1",
      [companyId],
    );
    const bankAccountId = bankAccountRows[0]?.id || null;
    const methods = [
      ["Cash", null, "Cash collections and payments"],
      ["Bank Transfer", bankAccountId, "Bank collections and settlements"],
    ];
    for (const [name, accountId, description] of methods) {
      await pool.execute(
        `
          INSERT INTO payment_methods (id, company_id, name, account_id, description, is_active, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, 1, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM payment_methods WHERE company_id = ? AND name = ?
          )
        `,
        [randomUUID(), companyId, name, accountId, description, toMySqlDateTime(new Date()), toMySqlDateTime(new Date()), companyId, name],
      );
    }
  }
}

async function ensureCompanyControlSeeds(companyId, company) {
  const companyCurrency = company.currency || "LYD";
  const companyColumns = await getTableColumns("companies");

  if (companyColumns.has("base_currency")) {
    await pool.execute(
      "UPDATE companies SET base_currency = COALESCE(base_currency, ?), currency = COALESCE(currency, ?), fiscal_year_start = COALESCE(fiscal_year_start, ?) WHERE id = ?",
      [companyCurrency, companyCurrency, "01-01", companyId],
    );
  }

  if (await tableExists("document_sequences")) {
    const sequences = [
      ["SALES_INVOICE", "SI-"],
      ["PURCHASE_INVOICE", "PI-"],
      ["JOURNAL_ENTRY", "JE-"],
      ["PAYMENT", "PAY-"],
      ["INVENTORY_COUNT", "CNT-"],
    ];
    for (const [documentType, prefix] of sequences) {
      await pool.execute(
        `
          INSERT INTO document_sequences (id, company_id, document_type, prefix, next_number, padding, is_active, created_at, updated_at)
          SELECT ?, ?, ?, ?, 1, 4, 1, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM document_sequences WHERE company_id = ? AND document_type = ?
          )
        `,
        [randomUUID(), companyId, documentType, prefix, toMySqlDateTime(new Date()), toMySqlDateTime(new Date()), companyId, documentType],
      );
    }
  }

  if (await tableExists("notification_rules")) {
    const rules = [
      ["LOW_STOCK", "Low stock items", "WARNING"],
      ["OVERDUE_RECEIVABLES", "Overdue receivables", "CRITICAL"],
      ["OVERDUE_PAYABLES", "Overdue payables", "WARNING"],
      ["MISSING_ACCOUNT_MAPPINGS", "Missing account mappings", "CRITICAL"],
      ["NEGATIVE_STOCK", "Negative stock", "CRITICAL"],
      ["UNPOSTED_DOCUMENTS", "Unposted documents", "WARNING"],
    ];
    for (const [ruleCode, title, severity] of rules) {
      await pool.execute(
        `
          INSERT INTO notification_rules (id, company_id, rule_code, title, severity, is_active, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, 1, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM notification_rules WHERE company_id = ? AND rule_code = ?
          )
        `,
        [randomUUID(), companyId, ruleCode, title, severity, toMySqlDateTime(new Date()), toMySqlDateTime(new Date()), companyId, ruleCode],
      );
    }
  }

  if (await tableExists("fiscal_periods")) {
    const year = new Date().getUTCFullYear();
    for (const periodYear of [year, year + 1]) {
      await pool.execute(
        `
          INSERT INTO fiscal_periods (
            id, company_id, period_code, period_name, start_date, end_date, status, created_at, updated_at
          )
          SELECT ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM fiscal_periods WHERE company_id = ? AND period_code = ?
          )
        `,
        [
          randomUUID(),
          companyId,
          String(periodYear),
          `Fiscal Year ${periodYear}`,
          `${periodYear}-01-01`,
          `${periodYear}-12-31`,
          toMySqlDateTime(new Date()),
          toMySqlDateTime(new Date()),
          companyId,
          String(periodYear),
        ],
      );
    }
  }
}

async function buildCompanyOverview(companyId) {
  const [companies] = await pool.query("SELECT * FROM companies WHERE id = ? LIMIT 1", [companyId]);
  const company = companies[0] || null;

  const [salesRows] = await pool.query(
    `
      SELECT COALESCE(SUM(total_amount), 0) AS total_sales,
             COUNT(*) AS invoice_count
      FROM sales_invoices
      WHERE company_id = ? AND is_active = 1 AND status <> 'CANCELLED'
    `,
    [companyId],
  );
  const [purchaseRows] = await pool.query(
    `
      SELECT COALESCE(SUM(total_amount), 0) AS total_purchases,
             COUNT(*) AS invoice_count
      FROM purchase_invoices
      WHERE company_id = ? AND is_active = 1 AND status <> 'CANCELLED'
    `,
    [companyId],
  );
  const [stockRows] = await pool.query(
    `
      SELECT
        COALESCE(SUM(current_quantity * average_cost), 0) AS stock_value,
        SUM(CASE WHEN current_quantity < 0 THEN 1 ELSE 0 END) AS negative_stock_items,
        SUM(CASE WHEN reorder_level > 0 AND current_quantity <= reorder_level THEN 1 ELSE 0 END) AS low_stock_items
      FROM stock_items
      WHERE company_id = ? AND is_active = 1
    `,
    [companyId],
  );
  const [arRows] = await pool.query(
    `
      SELECT
        COALESCE(SUM(balance), 0) AS receivables_total,
        SUM(CASE WHEN days_overdue > 0 THEN balance ELSE 0 END) AS overdue_receivables,
        SUM(CASE WHEN days_overdue > 0 THEN 1 ELSE 0 END) AS overdue_receivable_count
      FROM customer_receivables
      WHERE company_id = ?
    `,
    [companyId],
  );
  const [apRows] = await pool.query(
    `
      SELECT
        COALESCE(SUM(balance), 0) AS payables_total,
        SUM(CASE WHEN days_overdue > 0 THEN balance ELSE 0 END) AS overdue_payables,
        SUM(CASE WHEN days_overdue > 0 THEN 1 ELSE 0 END) AS overdue_payable_count
      FROM supplier_payables
      WHERE company_id = ?
    `,
    [companyId],
  );
  const [unpostedRows] = await pool.query(
    `
      SELECT
        (SELECT COUNT(*) FROM sales_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS draft_sales,
        (SELECT COUNT(*) FROM purchase_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS draft_purchases,
        (SELECT COUNT(*) FROM journal_entries WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS draft_journals
    `,
    [companyId, companyId, companyId],
  );
  const [ledgerRows] = await pool.query(
    `
      SELECT
        COALESCE(SUM(jel.debit_amount), 0) AS total_debits,
        COALESCE(SUM(jel.credit_amount), 0) AS total_credits
      FROM journal_entries je
      JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
      WHERE je.company_id = ? AND je.is_active = 1
    `,
    [companyId],
  );
  const [cashRows] = await pool.query(
    `
      SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) AS cash_balance
      FROM journal_entries je
      JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON coa.id = jel.account_id
      WHERE je.company_id = ?
        AND je.is_active = 1
        AND (
          coa.account_code IN ('1000', '1010')
          OR coa.account_name LIKE '%Cash%'
          OR coa.account_name LIKE '%Bank%'
        )
    `,
    [companyId],
  );
  const [trendRows] = await pool.query(
    `
      SELECT DATE_FORMAT(invoice_date, '%Y-%m') AS period, COALESCE(SUM(total_amount), 0) AS total
      FROM sales_invoices
      WHERE company_id = ?
        AND is_active = 1
        AND status <> 'CANCELLED'
        AND invoice_date >= DATE_SUB(CURRENT_DATE, INTERVAL 5 MONTH)
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
      ORDER BY period ASC
    `,
    [companyId],
  );

  const currentPeriod = await getCurrentPeriod(companyId);
  const missingMappings = await getMissingMappingKeys(companyId);

  return {
    company,
    kpis: {
      cashBalance: Number(cashRows[0]?.cash_balance || 0),
      receivablesTotal: Number(arRows[0]?.receivables_total || 0),
      payablesTotal: Number(apRows[0]?.payables_total || 0),
      stockValue: Number(stockRows[0]?.stock_value || 0),
      totalSales: Number(salesRows[0]?.total_sales || 0),
      totalPurchases: Number(purchaseRows[0]?.total_purchases || 0),
      lowStockItems: Number(stockRows[0]?.low_stock_items || 0),
      negativeStockItems: Number(stockRows[0]?.negative_stock_items || 0),
      overdueReceivableCount: Number(arRows[0]?.overdue_receivable_count || 0),
      overduePayableCount: Number(apRows[0]?.overdue_payable_count || 0),
      draftDocuments:
        Number(unpostedRows[0]?.draft_sales || 0)
        + Number(unpostedRows[0]?.draft_purchases || 0)
        + Number(unpostedRows[0]?.draft_journals || 0),
      trialBalanceDifference: Number(ledgerRows[0]?.total_debits || 0) - Number(ledgerRows[0]?.total_credits || 0),
      missingMappingCount: missingMappings.length,
    },
    workflow: {
      draftSales: Number(unpostedRows[0]?.draft_sales || 0),
      draftPurchases: Number(unpostedRows[0]?.draft_purchases || 0),
      draftJournals: Number(unpostedRows[0]?.draft_journals || 0),
      overdueReceivables: Number(arRows[0]?.overdue_receivables || 0),
      overduePayables: Number(apRows[0]?.overdue_payables || 0),
    },
    period: currentPeriod,
    salesTrend: trendRows.map((row) => ({
      period: row.period,
      total: Number(row.total || 0),
    })),
  };
}

async function buildCompanyExceptions(companyId) {
  const missingMappings = await getMissingMappingKeys(companyId);
  const [lowStockRows] = await pool.query(
    `
      SELECT i.name, i.item_code, si.current_quantity, si.reorder_level
      FROM stock_items si
      JOIN items i ON i.id = si.item_id
      WHERE si.company_id = ?
        AND si.is_active = 1
        AND si.reorder_level > 0
        AND si.current_quantity <= si.reorder_level
      ORDER BY si.current_quantity ASC
      LIMIT 6
    `,
    [companyId],
  );
  const [negativeStockRows] = await pool.query(
    `
      SELECT i.name, i.item_code, si.current_quantity
      FROM stock_items si
      JOIN items i ON i.id = si.item_id
      WHERE si.company_id = ?
        AND si.is_active = 1
        AND si.current_quantity < 0
      ORDER BY si.current_quantity ASC
      LIMIT 6
    `,
    [companyId],
  );
  const [overdueReceivables] = await pool.query(
    `
      SELECT customer_name, reference, balance, days_overdue
      FROM customer_receivables
      WHERE company_id = ? AND days_overdue > 0
      ORDER BY days_overdue DESC, balance DESC
      LIMIT 6
    `,
    [companyId],
  );
  const [overduePayables] = await pool.query(
    `
      SELECT supplier_name, reference, balance, days_overdue
      FROM supplier_payables
      WHERE company_id = ? AND days_overdue > 0
      ORDER BY days_overdue DESC, balance DESC
      LIMIT 6
    `,
    [companyId],
  );
  const [draftRows] = await pool.query(
    `
      SELECT
        (SELECT COUNT(*) FROM sales_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS sales_drafts,
        (SELECT COUNT(*) FROM purchase_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS purchase_drafts,
        (SELECT COUNT(*) FROM journal_entries WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS journal_drafts
    `,
    [companyId, companyId, companyId],
  );

  const exceptions = [];

  for (const row of negativeStockRows) {
    exceptions.push({
      severity: "critical",
      code: "NEGATIVE_STOCK",
      title: `${row.item_code || row.name} has negative stock`,
      description: `Current quantity is ${Number(row.current_quantity).toFixed(3)}.`,
    });
  }

  for (const row of lowStockRows) {
    exceptions.push({
      severity: "warning",
      code: "LOW_STOCK",
      title: `${row.item_code || row.name} is at or below reorder level`,
      description: `Current quantity ${Number(row.current_quantity).toFixed(3)} vs reorder ${Number(row.reorder_level).toFixed(3)}.`,
    });
  }

  for (const row of overdueReceivables) {
    exceptions.push({
      severity: "critical",
      code: "OVERDUE_RECEIVABLES",
      title: `Receivable overdue from ${row.customer_name}`,
      description: `${row.reference || "Open invoice"} is ${row.days_overdue} days overdue for ${formatMoney(row.balance)}.`,
    });
  }

  for (const row of overduePayables) {
    exceptions.push({
      severity: "warning",
      code: "OVERDUE_PAYABLES",
      title: `Payable overdue to ${row.supplier_name}`,
      description: `${row.reference || "Open invoice"} is ${row.days_overdue} days overdue for ${formatMoney(row.balance)}.`,
    });
  }

  for (const mapping of missingMappings) {
    exceptions.push({
      severity: "critical",
      code: "MISSING_ACCOUNT_MAPPINGS",
      title: `Missing ${mapping.transactionType} mapping`,
      description: `${mapping.mappingKey.replace(/_/g, " ")} is not configured.`,
    });
  }

  const draftSales = Number(draftRows[0]?.sales_drafts || 0);
  const draftPurchases = Number(draftRows[0]?.purchase_drafts || 0);
  const draftJournals = Number(draftRows[0]?.journal_drafts || 0);
  if (draftSales + draftPurchases + draftJournals > 0) {
    exceptions.push({
      severity: "warning",
      code: "UNPOSTED_DOCUMENTS",
      title: "Unposted work needs review",
      description: `${draftSales} sales drafts, ${draftPurchases} purchase drafts, and ${draftJournals} draft journals are still open.`,
    });
  }

  return {
    companyId,
    exceptions,
    counts: {
      critical: exceptions.filter((item) => item.severity === "critical").length,
      warning: exceptions.filter((item) => item.severity === "warning").length,
      info: exceptions.filter((item) => item.severity === "info").length,
    },
  };
}

async function buildCompanyAudit(companyId) {
  const [rows] = await pool.query(
    `
      SELECT id, actor_name, action_type, resource_type, resource_label, status, summary, occurred_at
      FROM audit_events
      WHERE company_id = ?
      ORDER BY occurred_at DESC
      LIMIT 120
    `,
    [companyId],
  );
  return {
    companyId,
    events: rows,
  };
}

async function buildCompanyPeriodStatus(companyId) {
  const currentPeriod = await getCurrentPeriod(companyId);
  const [closeRuns] = await pool.query(
    `
      SELECT run_type, status, created_by, created_at, notes
      FROM period_close_runs
      WHERE company_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [companyId],
  );
  const missingMappings = await getMissingMappingKeys(companyId);
  const [balanceRows] = await pool.query(
    `
      SELECT COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) AS difference
      FROM journal_entries je
      JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
      WHERE je.company_id = ? AND je.is_active = 1
    `,
    [companyId],
  );
  const [negativeStockRows] = await pool.query(
    "SELECT COUNT(*) AS count FROM stock_items WHERE company_id = ? AND is_active = 1 AND current_quantity < 0",
    [companyId],
  );
  const [draftRows] = await pool.query(
    `
      SELECT
        (SELECT COUNT(*) FROM sales_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1)
        + (SELECT COUNT(*) FROM purchase_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1)
        + (SELECT COUNT(*) FROM journal_entries WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS open_documents
    `,
    [companyId, companyId, companyId],
  );

  return {
    companyId,
    currentPeriod,
    checklist: {
      missingMappings: missingMappings.length,
      negativeStockItems: Number(negativeStockRows[0]?.count || 0),
      openDocuments: Number(draftRows[0]?.open_documents || 0),
      trialBalanceDifference: Number(balanceRows[0]?.difference || 0),
    },
    closeRuns,
  };
}

async function getCurrentPeriod(companyId) {
  if (!(await tableExists("fiscal_periods"))) {
    return null;
  }

  const [rows] = await pool.query(
    `
      SELECT id, period_code, period_name, start_date, end_date, status, closed_at, reopened_at
      FROM fiscal_periods
      WHERE company_id = ?
        AND CURRENT_DATE BETWEEN start_date AND end_date
      ORDER BY start_date DESC
      LIMIT 1
    `,
    [companyId],
  );
  return rows[0] || null;
}

async function getMissingMappingKeys(companyId) {
  if (!(await tableExists("account_mapping_config"))) {
    return [];
  }

  const requiredMappings = [
    { transactionType: "SALES_INVOICE", mappingKey: "receivable_account" },
    { transactionType: "SALES_INVOICE", mappingKey: "default_sales_account" },
    { transactionType: "SALES_INVOICE", mappingKey: "tax_payable_account" },
    { transactionType: "PURCHASE_INVOICE", mappingKey: "payable_account" },
    { transactionType: "PURCHASE_INVOICE", mappingKey: "default_inventory_account" },
    { transactionType: "PURCHASE_INVOICE", mappingKey: "tax_receivable_account" },
  ];
  const [rows] = await pool.query(
    `
      SELECT transaction_type, mapping_key
      FROM account_mapping_config
      WHERE company_id = ? AND is_active = 1
    `,
    [companyId],
  );
  const existing = new Set(rows.map((row) => `${row.transaction_type}:${row.mapping_key}`));
  return requiredMappings.filter((mapping) => !existing.has(`${mapping.transactionType}:${mapping.mappingKey}`));
}

async function tableExists(tableName) {
  return (await getTableColumns(tableName)).size > 0;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function sanitizePayload(config, payload, includeDefaults, tableColumns) {
  const result = {};

  for (const column of config.writableColumns) {
    if (!tableColumns.has(column)) {
      continue;
    }
    if (!(column in payload)) {
      continue;
    }

    const value = payload[column];
    result[column] = value === undefined ? null : value;
  }

  if (includeDefaults) {
    for (const [column, value] of Object.entries(config.defaultValues)) {
      if (!tableColumns.has(column)) {
        continue;
      }
      if (!(column in result)) {
        result[column] = value;
      }
    }
  }

  return result;
}

function normalizeResourcePayload(resourceName, payload, tableColumns) {
  const normalized = { ...payload };

  if (resourceName === "journal_entries") {
    if (normalized.journal_number && tableColumns.has("entry_number") && !normalized.entry_number) {
      normalized.entry_number = normalized.journal_number;
    }
    if (normalized.entry_number && tableColumns.has("journal_number") && !normalized.journal_number) {
      normalized.journal_number = normalized.entry_number;
    }
    if (normalized.description && tableColumns.has("memo") && !normalized.memo) {
      normalized.memo = normalized.description;
    }
    if (normalized.memo && tableColumns.has("description") && !normalized.description) {
      normalized.description = normalized.memo;
    }
    if (normalized.reference_number && tableColumns.has("reference") && !normalized.reference) {
      normalized.reference = normalized.reference_number;
    }
    if (normalized.reference && tableColumns.has("reference_number") && !normalized.reference_number) {
      normalized.reference_number = normalized.reference;
    }
  }

  if (resourceName === "stock_items") {
    const currentQuantity = Number(
      normalized.current_quantity
        ?? normalized.quantity_on_hand
        ?? 0,
    );
    const reservedQuantity = Number(normalized.reserved_quantity ?? 0);
    if (tableColumns.has("current_quantity")) {
      normalized.current_quantity = currentQuantity;
    }
    if (tableColumns.has("quantity_on_hand")) {
      normalized.quantity_on_hand = currentQuantity;
    }
    if (tableColumns.has("available_quantity") && normalized.available_quantity === undefined) {
      normalized.available_quantity = currentQuantity - reservedQuantity;
    }
  }

  if (resourceName === "stock_movements" && normalized.description && tableColumns.has("notes") && !normalized.notes) {
    normalized.notes = normalized.description;
  }

  return normalized;
}

async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }

  const [rows] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName],
  );

  const columns = new Set(rows.map((row) => row.COLUMN_NAME));
  tableColumnsCache.set(tableName, columns);
  return columns;
}

async function generateCustomerCode(companyId) {
  if (!companyId) {
    return "CUST-0001";
  }

  const [rows] = await pool.query(
    "SELECT customer_code FROM `customers` WHERE company_id = ? ORDER BY created_at DESC",
    [companyId],
  );

  const maxSequence = rows.reduce((max, row) => {
    const match = String(row.customer_code || "").match(/^CUST-(\d+)$/i);
    const sequence = match ? Number(match[1]) : 0;
    return Math.max(max, sequence);
  }, 0);

  return `CUST-${String(maxSequence + 1).padStart(4, "0")}`;
}

async function generateSupplierCode(companyId) {
  if (!companyId) {
    return "SUPP-0001";
  }

  const [rows] = await pool.query(
    "SELECT supplier_code FROM `suppliers` WHERE company_id = ? ORDER BY created_at DESC",
    [companyId],
  );

  const maxSequence = rows.reduce((max, row) => {
    const match = String(row.supplier_code || "").match(/^SUPP-(\d+)$/i);
    const sequence = match ? Number(match[1]) : 0;
    return Math.max(max, sequence);
  }, 0);

  return `SUPP-${String(maxSequence + 1).padStart(4, "0")}`;
}

function toMySqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function loadEnvFiles(filePaths) {
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
      }
    }
  }
}
