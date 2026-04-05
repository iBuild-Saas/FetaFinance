// MySQL Database Connection
export interface MySQLConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// For now, we'll use a simple REST API approach
// In a real implementation, you'd need a backend server with MySQL driver
export const mysqlConfig: MySQLConnection = {
  host: import.meta.env.VITE_MYSQL_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_MYSQL_PORT || '3306'),
  database: import.meta.env.VITE_MYSQL_DATABASE || 'close_statement_hub',
  user: import.meta.env.VITE_MYSQL_USER || 'root',
  password: import.meta.env.VITE_MYSQL_PASSWORD || ''
};

// Database types (same as Supabase but for MySQL)
export interface Database {
  companies: CompanyTable;
  customers: CustomerTable;
  suppliers: SupplierTable;
  items: ItemTable;
  chart_of_accounts: ChartOfAccountsTable;
  journal_entries: JournalEntriesTable;
  journal_entry_lines: JournalEntryLinesTable;
  sales_invoices: SalesInvoicesTable;
  purchase_invoices: PurchaseInvoicesTable;
  stock_items: StockItemsTable;
  stock_movements: StockMovementsTable;
  account_mappings: AccountMappingsTable;
}

export interface CompanyTable {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  industry?: string;
  company_size?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  currency?: string;
  fiscal_year_start?: string;
  tax_id?: string;
  multi_currency?: boolean;
  inventory_tracking?: boolean;
  auto_backup?: boolean;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerTable {
  id: string;
  customer_code?: string;
  name: string;
  email: string;
  phone: string;
  contact_person?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tax_id?: string;
  credit_limit?: number;
  payment_terms?: string;
  is_active?: boolean;
  notes?: string;
  website?: string;
  industry?: string;
  customer_type?: string;
  default_currency?: string;
  discount_percentage?: number;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierTable {
  id: string;
  supplier_code?: string;
  name: string;
  email: string;
  phone: string;
  contact_person?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tax_id?: string;
  credit_limit?: number;
  payment_terms?: string;
  is_active?: boolean;
  notes?: string;
  website?: string;
  industry?: string;
  supplier_type?: string;
  default_currency?: string;
  discount_percentage?: number;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface ItemTable {
  id: string;
  item_code?: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  unit_of_measure?: string;
  unit_price: number;
  cost_price?: number;
  selling_price?: number;
  tax_rate?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  current_stock?: number;
  reorder_point?: number;
  supplier_id?: string;
  company_id: string;
  is_active?: boolean;
  is_taxable?: boolean;
  is_inventory_item?: boolean;
  barcode?: string;
  sku?: string;
  weight?: number;
  dimensions?: string;
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccountsTable {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_account_id?: string;
  company_id: string;
  is_active?: boolean;
  normal_balance: string;
  description?: string;
  is_group?: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntriesTable {
  id: string;
  journal_number: string;
  entry_date?: string;
  description: string;
  company_id: string;
  is_active?: boolean;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  status?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLinesTable {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
  created_at: string;
}

export interface SalesInvoicesTable {
  id: string;
  invoice_number?: string;
  customer_id: string;
  company_id: string;
  invoice_date: string;
  due_date: string;
  status?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  currency?: string;
  payment_terms?: string;
  notes?: string;
  terms_and_conditions?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoicesTable {
  id: string;
  invoice_number?: string;
  supplier_id: string;
  company_id: string;
  invoice_date: string;
  due_date: string;
  status?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  currency?: string;
  payment_terms?: string;
  notes?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockItemsTable {
  id: string;
  item_id: string;
  company_id: string;
  warehouse_id?: string;
  quantity_on_hand: number;
  reserved_quantity?: number;
  available_quantity: number;
  average_cost: number;
  last_cost: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovementsTable {
  id: string;
  item_id: string;
  company_id: string;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type: string;
  reference_id: string;
  reference_number: string;
  movement_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountMappingsTable {
  id: string;
  company_id: string;
  transaction_type: string;
  account_type: string;
  account_id: string;
  created_at: string;
  updated_at: string;
}
