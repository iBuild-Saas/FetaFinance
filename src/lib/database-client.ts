import { CompanyTable, CustomerTable, SupplierTable, ItemTable, ChartOfAccountsTable } from './mysql';

type MemoryTable = 'companies' | 'customers' | 'suppliers' | 'items' | 'chart_of_accounts';
export type DatabaseTable = string;

type ApiError = { message: string } | null;

type QueryResult<T = any> = {
  data: T;
  error: ApiError;
  count?: number | null;
};

type SortConfig = {
  column: string;
  ascending: boolean;
};

type FilterConfig = {
  type: 'eq' | 'gte' | 'lte' | 'in' | 'not_null';
  column: string;
  value: any;
};

type SearchConfig = {
  column: string;
  value: string;
};

class QueryBuilder implements PromiseLike<QueryResult<any>> {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: FilterConfig[] = [];
  private searches: SearchConfig[] = [];
  private sorts: SortConfig[] = [];
  private rowLimit: number | null = null;
  private expectSingle = false;
  private selectOptions: { count?: 'exact'; head?: boolean } | undefined;
  private payload: any = null;
  private selectionRequested = false;

  constructor(
    private readonly client: DatabaseClient,
    private readonly tableName: string
  ) {}

  select(_columns?: string, options?: { count?: 'exact'; head?: boolean }) {
    this.selectionRequested = true;
    if (this.action === 'select') {
      this.selectOptions = options;
    }
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.payload = data;
    return this;
  }

  update(arg1: any, arg2?: any) {
    this.action = 'update';
    if (arg2 !== undefined) {
      this.payload = arg2;
      this.eq('id', arg1);
    } else {
      this.payload = arg1;
    }
    return this;
  }

  delete(id?: string) {
    this.action = 'delete';
    if (id !== undefined) {
      this.eq('id', id);
    }
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  in(column: string, value: any[]) {
    this.filters.push({ type: 'in', column, value });
    return this;
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && value === null) {
      this.filters.push({ type: 'not_null', column, value: null });
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sorts.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  single() {
    this.expectSingle = true;
    return this;
  }

  or(expression: string) {
    const parsed = expression
      .split(',')
      .map(part => part.trim())
      .map(part => {
        const match = part.match(/^([a-zA-Z0-9_]+)\.ilike\.%(.*)%$/);
        if (!match) return null;
        return { column: match[1], value: match[2].toLowerCase() };
      })
      .filter((item): item is SearchConfig => item !== null);

    this.searches.push(...parsed);
    return this;
  }

  then<TResult1 = QueryResult<any>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ) {
    return this.execute().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null) {
    return this.execute().finally(onfinally ?? undefined);
  }

  private async execute(): Promise<QueryResult<any>> {
    switch (this.action) {
      case 'select':
        return this.executeSelect();
      case 'insert':
        return this.executeInsert();
      case 'update':
        return this.executeUpdate();
      case 'delete':
        return this.executeDelete();
      default:
        return { data: null, error: { message: 'Unsupported operation' } };
    }
  }

  private async executeSelect(): Promise<QueryResult<any>> {
    const rowsResult = await this.client.getRows(this.tableName);
    if (rowsResult.error) {
      return { data: this.selectOptions?.head ? null : [], count: null, error: rowsResult.error };
    }

    let rows = this.client.applyFilters(rowsResult.data, this.filters);
    rows = this.client.applySearch(rows, this.searches);
    rows = this.client.applySorts(rows, this.sorts);

    const totalCount = rows.length;
    if (this.rowLimit !== null) {
      rows = rows.slice(0, this.rowLimit);
    }

    const data = this.expectSingle ? (rows[0] ?? null) : (this.selectOptions?.head ? null : rows);
    return {
      data,
      count: this.selectOptions?.count === 'exact' ? totalCount : null,
      error: null
    };
  }

  private async executeInsert(): Promise<QueryResult<any>> {
    return this.client.insertRow(this.tableName, this.payload);
  }

  private async executeUpdate(): Promise<QueryResult<any>> {
    return this.client.updateRows(this.tableName, this.filters, this.payload, this.expectSingle);
  }

  private async executeDelete(): Promise<QueryResult<any>> {
    return this.client.deleteRows(this.tableName, this.filters);
  }
}

export class DatabaseClient {
  private static instance: DatabaseClient;
  private readonly apiTables = new Set([
    'companies',
    'customers',
    'suppliers',
    'items',
    'item_categories',
    'item_units_of_measure',
    'chart_of_accounts',
    'journal_entries',
    'journal_entry_lines',
    'sales_invoices',
    'sales_invoice_line_items',
    'invoice_line_items',
    'purchase_invoices',
    'purchase_invoice_line_items',
    'stock_items',
    'stock_movements',
    'payment_methods',
    'payment_methods_view',
    'payments',
    'account_mapping_config',
    'account_mapping_view',
    'customer_receivables',
    'customer_receivables_aging',
    'supplier_payables',
    'supplier_payables_aging',
    'warehouses',
    'customer_contacts',
    'supplier_contacts',
    'customer_addresses',
    'supplier_addresses',
    'sales_orders',
    'sales_order_line_items',
    'purchase_orders',
    'purchase_order_line_items',
    'stock_transfers',
    'stock_transfer_line_items',
    'item_supplier_prices',
    'inventory_counts',
    'inventory_count_lines',
    'document_sequences',
    'fiscal_periods',
    'period_close_runs',
    'audit_events',
    'notification_rules',
    'notification_events',
    'audit_event_feed',
    'period_status_summary'
  ]);
  private data: {
    companies: CompanyTable[];
    customers: CustomerTable[];
    suppliers: SupplierTable[];
    items: ItemTable[];
    chart_of_accounts: ChartOfAccountsTable[];
  };

  private constructor() {
    this.data = {
      companies: [],
      customers: [],
      suppliers: [],
      items: [],
      chart_of_accounts: []
    };
  }

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  from<T extends DatabaseTable>(table: T) {
    return new QueryBuilder(this, String(table));
  }

  async rpc(name: string, params: Record<string, any> = {}): Promise<QueryResult<any>> {
    try {
      switch (name) {
        case 'generate_invoice_number':
          return await this.generateInvoiceNumber(params.company_uuid || params.company_id);
        case 'update_item_stock':
          return await this.updateItemStock(params.item_uuid, params.quantity_change);
        case 'get_account_ledger':
          return await this.getAccountLedger(params);
        case 'get_company_trial_balance':
          return await this.getCompanyTrialBalance(params);
        case 'get_account_balance':
          return await this.getAccountBalance(params);
        case 'get_hierarchical_income_statement':
          return await this.getHierarchicalIncomeStatement(params);
        case 'get_hierarchical_balance_sheet':
          return await this.getHierarchicalBalanceSheet(params);
        case 'get_financial_summary':
          return await this.getFinancialSummary(params);
        case 'get_company_account_mappings':
          return await this.getCompanyAccountMappings(params);
        case 'set_account_mapping':
          return await this.setAccountMapping(params);
        default:
          return { data: null, error: { message: `RPC ${name} is not implemented in the local database client` } };
      }
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : 'RPC failed' } };
    }
  }

  async getRows(tableName: string): Promise<QueryResult<any[]>> {
    if (this.apiTables.has(tableName)) {
      return this.apiSelectAll(tableName);
    }

    if (!(tableName in this.data)) {
      return { data: [], error: { message: `Table ${tableName} is not configured in the local client` } };
    }

    return { data: [...this.data[tableName as MemoryTable]], error: null };
  }

  applyFilters(rows: any[], filters: FilterConfig[]) {
    return rows.filter(row =>
      filters.every(filter => {
        const value = row?.[filter.column];
        if (filter.type === 'eq') return value == filter.value;
        if (filter.type === 'gte') return value >= filter.value;
        if (filter.type === 'lte') return value <= filter.value;
        if (filter.type === 'in') return Array.isArray(filter.value) ? filter.value.includes(value) : false;
        if (filter.type === 'not_null') return value !== null && value !== undefined;
        return true;
      })
    );
  }

  applySearch(rows: any[], searches: SearchConfig[]) {
    if (!searches.length) return rows;
    return rows.filter(row =>
      searches.some(search => String(row?.[search.column] ?? '').toLowerCase().includes(search.value))
    );
  }

  applySorts(rows: any[], sorts: SortConfig[]) {
    if (!sorts.length) return rows;
    return [...rows].sort((a, b) => {
      for (const sort of sorts) {
        const aValue = a?.[sort.column];
        const bValue = b?.[sort.column];
        if (aValue === bValue) continue;
        if (aValue == null) return sort.ascending ? -1 : 1;
        if (bValue == null) return sort.ascending ? 1 : -1;
        if (aValue < bValue) return sort.ascending ? -1 : 1;
        if (aValue > bValue) return sort.ascending ? 1 : -1;
      }
      return 0;
    });
  }

  async insertRow(tableName: string, payload: any): Promise<QueryResult<any>> {
    if (Array.isArray(payload)) {
      const results = [];
      for (const item of payload) {
        const result = await this.insertRow(tableName, item);
        if (result.error) {
          return { data: null, error: result.error };
        }
        results.push(result.data);
      }
      return { data: results, error: null };
    }

    if (this.apiTables.has(tableName)) {
      return this.apiWrite('POST', tableName, payload);
    }

    if (!(tableName in this.data)) {
      return { data: null, error: { message: `Table ${tableName} is not configured in the local client` } };
    }

    const record = {
      ...payload,
      id: payload.id || Date.now().toString(),
      created_at: payload.created_at || new Date().toISOString(),
      updated_at: payload.updated_at || new Date().toISOString()
    };
    this.data[tableName as MemoryTable].push(record);
    return { data: record, error: null };
  }

  async updateRows(tableName: string, filters: FilterConfig[], payload: any, expectSingle = false): Promise<QueryResult<any>> {
    if (this.apiTables.has(tableName)) {
      const idFilter = filters.find(filter => filter.type === 'eq' && filter.column === 'id');
      if (!idFilter) {
        return { data: null, error: { message: `Updates for ${tableName} require an id filter` } };
      }
      return this.apiWrite('PUT', `${tableName}/${idFilter.value}`, payload);
    }

    if (!(tableName in this.data)) {
      return { data: null, error: { message: `Table ${tableName} is not configured in the local client` } };
    }

    const rows = this.data[tableName as MemoryTable];
    const matches = this.applyFilters(rows, filters);
    const first = matches[0];
    if (!first) {
      return { data: null, error: { message: 'Record not found' } };
    }

    Object.assign(first, payload, { updated_at: new Date().toISOString() });
    return { data: expectSingle ? first : matches, error: null };
  }

  async deleteRows(tableName: string, filters: FilterConfig[]): Promise<QueryResult<any>> {
    if (this.apiTables.has(tableName)) {
      const idFilter = filters.find(filter => filter.type === 'eq' && filter.column === 'id');
      if (!idFilter) {
        return { data: null, error: { message: `Deletes for ${tableName} require an id filter` } };
      }
      return this.apiWrite('DELETE', `${tableName}/${idFilter.value}`);
    }

    if (!(tableName in this.data)) {
      return { data: null, error: { message: `Table ${tableName} is not configured in the local client` } };
    }

    const rows = this.data[tableName as MemoryTable];
    const matches = this.applyFilters(rows, filters);
    if (!matches.length) {
      return { data: null, error: { message: 'Record not found' } };
    }

    this.data[tableName as MemoryTable] = rows.filter(row => !matches.includes(row)) as any;
    return { data: true, error: null };
  }

  auth = {
    signIn: async (email: string) => ({
      data: {
        user: {
          id: '1',
          email,
          user_metadata: {}
        }
      },
      error: null
    }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({
      data: {
        user: {
          id: '1',
          email: 'demo@example.com',
          user_metadata: {}
        }
      },
      error: null
    })
  };

  channel(channelName: string) {
    return {
      on: (event: string) => ({
        subscribe: async () => ({ subscription: `${channelName}:${event}` }),
        unsubscribe: async () => ({ error: null })
      })
    };
  }

  private async apiSelectAll(tableName: string): Promise<QueryResult<any[]>> {
    try {
      const response = await fetch(`/api/${tableName}`);
      const payload = await response.json();
      if (!response.ok) {
        return { data: [], error: { message: payload.error || 'Request failed' } };
      }
      return { data: payload, error: null };
    } catch (error) {
      return { data: [], error: { message: error instanceof Error ? error.message : 'Request failed' } };
    }
  }

  private async apiWrite(method: string, path: string, data?: any): Promise<QueryResult<any>> {
    try {
      const response = await fetch(`/api/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined
      });
      const payload = await response.json();
      if (!response.ok) {
        return { data: null, error: { message: payload.error || 'Request failed' } };
      }
      return { data: payload, error: null };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : 'Request failed' } };
    }
  }

  private async generateInvoiceNumber(companyId?: string) {
    const invoices = await this.from('sales_invoices').select('*').eq('company_id', companyId || '');
    const rows = Array.isArray(invoices.data) ? invoices.data : [];
    const year = new Date().getFullYear();
    const maxNumber = rows.reduce((max, invoice) => {
      const match = String(invoice.invoice_number || '').match(/INV-(\d+)$/);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0);
    return { data: `${year}-INV-${String(maxNumber + 1).padStart(4, '0')}`, error: null };
  }

  private async updateItemStock(itemId: string, quantityChange: number) {
    const itemResult = await this.from('items').select('*').eq('id', itemId).single();
    if (itemResult.error || !itemResult.data) {
      return { data: null, error: itemResult.error || { message: 'Item not found' } };
    }
    const nextStock = Number(itemResult.data.current_stock || 0) + Number(quantityChange || 0);
    return this.from('items').update(itemId, { current_stock: nextStock });
  }

  private async getAccountLedger(params: Record<string, any>) {
    const companyId = params.p_company_id;
    const accountId = params.p_account_id;
    const startDate = params.p_start_date;
    const endDate = params.p_end_date;

    const entriesResult = await this.from('journal_entries').select('*').eq('company_id', companyId);
    const linesResult = await this.from('journal_entry_lines').select('*');
    const accountsResult = await this.from('chart_of_accounts').select('*').eq('company_id', companyId);

    if (entriesResult.error || linesResult.error || accountsResult.error) {
      return { data: [], error: entriesResult.error || linesResult.error || accountsResult.error };
    }

    const entries = (entriesResult.data || []).filter((entry: any) =>
      (!startDate || entry.entry_date >= startDate) &&
      (!endDate || entry.entry_date <= endDate) &&
      (entry.is_active !== false)
    );
    const entryMap = new Map(entries.map((entry: any) => [entry.id, entry]));
    const accountMap = new Map((accountsResult.data || []).map((account: any) => [account.id, account]));

    let runningBalance = 0;
    const rows = (linesResult.data || [])
      .filter((line: any) => line.account_id === accountId && entryMap.has(line.journal_entry_id))
      .map((line: any) => {
        const entry = entryMap.get(line.journal_entry_id);
        const account = accountMap.get(line.account_id);
        runningBalance += Number(line.debit_amount || 0) - Number(line.credit_amount || 0);
        return {
          line_id: line.id,
          journal_entry_id: entry.id,
          entry_number: entry.journal_number,
          entry_date: entry.entry_date,
          reference: entry.reference_number,
          journal_memo: entry.description,
          line_description: line.description,
          account_id: line.account_id,
          account_code: account?.account_code || '',
          account_name: account?.account_name || '',
          account_type: account?.account_type || '',
          normal_balance: account?.normal_balance || '',
          line_number: 0,
          debit_amount: Number(line.debit_amount || 0),
          credit_amount: Number(line.credit_amount || 0),
          balance_effect: Number(line.debit_amount || 0) - Number(line.credit_amount || 0),
          running_balance: runningBalance
        };
      })
      .sort((a: any, b: any) => String(a.entry_date).localeCompare(String(b.entry_date)));

    return { data: rows, error: null };
  }

  private async getCompanyTrialBalance(params: Record<string, any>) {
    const companyId = params.company_uuid || params.p_company_id;
    const endDate = params.end_date || params.p_as_of_date;
    const entriesResult = await this.from('journal_entries').select('*').eq('company_id', companyId);
    const linesResult = await this.from('journal_entry_lines').select('*');
    const accountsResult = await this.from('chart_of_accounts').select('*').eq('company_id', companyId);

    if (entriesResult.error || linesResult.error || accountsResult.error) {
      return { data: [], error: entriesResult.error || linesResult.error || accountsResult.error };
    }

    const validEntries = new Set((entriesResult.data || [])
      .filter((entry: any) => (!endDate || entry.entry_date <= endDate) && entry.is_active !== false)
      .map((entry: any) => entry.id));

    const grouped = new Map<string, any>();
    for (const account of accountsResult.data || []) {
      grouped.set(account.id, {
        account_id: account.id,
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        normal_balance: account.normal_balance,
        debit_total: 0,
        credit_total: 0,
        balance: 0
      });
    }

    for (const line of linesResult.data || []) {
      if (!validEntries.has(line.journal_entry_id)) continue;
      const bucket = grouped.get(line.account_id);
      if (!bucket) continue;
      bucket.debit_total += Number(line.debit_amount || 0);
      bucket.credit_total += Number(line.credit_amount || 0);
      bucket.balance = bucket.debit_total - bucket.credit_total;
    }

    return { data: Array.from(grouped.values()).sort((a, b) => a.account_code.localeCompare(b.account_code)), error: null };
  }

  private async getAccountBalance(params: Record<string, any>) {
    const ledger = await this.getAccountLedger({
      p_account_id: params.p_account_id,
      p_company_id: params.p_company_id,
      p_end_date: params.p_as_of_date
    });
    if (ledger.error) return { data: 0, error: ledger.error };
    const rows = ledger.data || [];
    return { data: rows.length ? rows[rows.length - 1].running_balance : 0, error: null };
  }

  private async getHierarchicalIncomeStatement(params: Record<string, any>) {
    return this.buildStatement(params.p_company_id, params.p_start_date, params.p_end_date, ['Revenue', 'Expense']);
  }

  private async getHierarchicalBalanceSheet(params: Record<string, any>) {
    return this.buildStatement(params.p_company_id, null, params.p_as_of_date, ['Asset', 'Liability', 'Equity']);
  }

  private async getFinancialSummary(params: Record<string, any>) {
    const income = await this.getHierarchicalIncomeStatement(params);
    const balance = await this.getHierarchicalBalanceSheet({
      p_company_id: params.p_company_id,
      p_as_of_date: params.p_end_date
    });
    if (income.error || balance.error) {
      return { data: [], error: income.error || balance.error };
    }
    const incomeTotal = (income.data || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
    const balanceTotal = (balance.data || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
    return {
      data: [
        { statement_type: 'Income Statement', category: 'Net Activity', total_amount: incomeTotal },
        { statement_type: 'Balance Sheet', category: 'Total Balance', total_amount: balanceTotal }
      ],
      error: null
    };
  }

  private async getCompanyAccountMappings(params: Record<string, any>) {
    const companyId = params.p_company_id || params.company_id;
    const result = await this.from('account_mapping_view').select('*').eq('company_id', companyId);
    if (result.error) {
      return { data: [], error: result.error };
    }
    return { data: result.data || [], error: null };
  }

  private async setAccountMapping(params: Record<string, any>) {
    const companyId = params.p_company_id || params.company_id;
    const transactionType = params.p_transaction_type || params.transaction_type;
    const mappingKey = params.p_mapping_key || params.mapping_key;
    const accountId = params.p_account_id || params.account_id;
    const description = params.p_description || params.description || null;

    const existing = await this.from('account_mapping_config')
      .select('*')
      .eq('company_id', companyId)
      .eq('transaction_type', transactionType)
      .eq('mapping_key', mappingKey)
      .single();

    if (existing.error) {
      return { data: null, error: existing.error };
    }

    if (existing.data?.id) {
      return this.from('account_mapping_config').update(existing.data.id, {
        account_id: accountId,
        description,
        is_active: true
      });
    }

    return this.from('account_mapping_config').insert({
      company_id: companyId,
      transaction_type: transactionType,
      mapping_key: mappingKey,
      account_id: accountId,
      description,
      is_active: true
    });
  }

  private async buildStatement(companyId: string, startDate: string | null, endDate: string | null, accountTypes: string[]) {
    const entriesResult = await this.from('journal_entries').select('*').eq('company_id', companyId);
    const linesResult = await this.from('journal_entry_lines').select('*');
    const accountsResult = await this.from('chart_of_accounts').select('*').eq('company_id', companyId);

    if (entriesResult.error || linesResult.error || accountsResult.error) {
      return { data: [], error: entriesResult.error || linesResult.error || accountsResult.error };
    }

    const validEntries = new Set((entriesResult.data || [])
      .filter((entry: any) =>
        entry.is_active !== false &&
        (!startDate || entry.entry_date >= startDate) &&
        (!endDate || entry.entry_date <= endDate)
      )
      .map((entry: any) => entry.id));

    const byId = new Map<string, any>();
    for (const account of (accountsResult.data || []).filter((account: any) => accountTypes.includes(account.account_type))) {
      byId.set(account.id, {
        account_id: account.id,
        parent_account_id: account.parent_account_id,
        account_code: account.account_code,
        account_name: account.account_name,
        category: account.account_type,
        subcategory: account.account_type,
        level_depth: account.parent_account_id ? 1 : 0,
        is_group: !!account.is_group,
        amount: 0
      });
    }

    for (const line of linesResult.data || []) {
      if (!validEntries.has(line.journal_entry_id)) continue;
      const bucket = byId.get(line.account_id);
      if (!bucket) continue;
      bucket.amount += Number(line.debit_amount || 0) - Number(line.credit_amount || 0);
    }

    const rows = Array.from(byId.values()).sort((a, b) => a.account_code.localeCompare(b.account_code));
    return { data: rows, error: null };
  }
}

export const db = DatabaseClient.getInstance();
