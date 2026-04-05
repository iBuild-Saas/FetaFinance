<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait SeedsLegacyWorkspace
{
    private function seedCompanyWorkspace(string $companyId, array $company): void
    {
        $this->ensureDefaultWarehouse($companyId);
        $this->seedCompanyChartOfAccounts($companyId);
        $this->seedCompanyAccountMappings($companyId);
        $this->seedCompanyMasterData($companyId);
        $this->ensureCompanyControlSeeds($companyId, $company);
    }

    private function ensureDefaultWarehouse(string $companyId): void
    {
        if (!$this->tableExists('warehouses')) {
            return;
        }

        $warehouseId = DB::table('warehouses')->where('company_id', $companyId)->where('is_default', 1)->value('id');
        if (!$warehouseId) {
            $warehouseId = (string) Str::uuid();
            DB::table('warehouses')->insert([
                'id' => $warehouseId,
                'company_id' => $companyId,
                'warehouse_code' => 'MAIN',
                'name' => 'Main Warehouse',
                'description' => 'Default warehouse for the company workspace',
                'is_default' => 1,
                'is_active' => 1,
                'created_at' => $this->nowString(),
                'updated_at' => $this->nowString(),
            ]);
        }

        if (in_array('default_warehouse_id', $this->getTableColumns('companies'), true)) {
            DB::table('companies')->where('id', $companyId)->update(['default_warehouse_id' => $warehouseId]);
        }
    }

    private function seedCompanyChartOfAccounts(string $companyId): void
    {
        if (!$this->tableExists('chart_of_accounts')) {
            return;
        }

        $accounts = [
            ['1000', 'Cash', 'Asset', 'DEBIT'],
            ['1010', 'Bank', 'Asset', 'DEBIT'],
            ['1100', 'Accounts Receivable', 'Asset', 'DEBIT'],
            ['1200', 'Inventory', 'Asset', 'DEBIT'],
            ['1300', 'Tax Receivable', 'Asset', 'DEBIT'],
            ['2000', 'Accounts Payable', 'Liability', 'CREDIT'],
            ['2100', 'Sales Tax Payable', 'Liability', 'CREDIT'],
            ['3000', "Owner's Equity", 'Equity', 'CREDIT'],
            ['4000', 'Sales Revenue', 'Revenue', 'CREDIT'],
            ['5000', 'Cost of Goods Sold', 'Expense', 'DEBIT'],
            ['5100', 'Purchase Expense', 'Expense', 'DEBIT'],
        ];

        foreach ($accounts as [$accountCode, $accountName, $accountType, $normalBalance]) {
            DB::insert("
                INSERT INTO chart_of_accounts (
                  id, account_code, account_name, account_type, company_id, is_active, normal_balance, is_group, created_at, updated_at
                )
                SELECT ?, ?, ?, ?, ?, 1, ?, 0, ?, ?
                WHERE NOT EXISTS (
                  SELECT 1 FROM chart_of_accounts WHERE company_id = ? AND account_code = ?
                )
            ", [
                (string) Str::uuid(),
                $accountCode,
                $accountName,
                $accountType,
                $companyId,
                $normalBalance,
                $this->nowString(),
                $this->nowString(),
                $companyId,
                $accountCode,
            ]);
        }
    }

    private function seedCompanyAccountMappings(string $companyId): void
    {
        if (!$this->tableExists('account_mapping_config')) {
            return;
        }

        $accounts = DB::table('chart_of_accounts')->select('id', 'account_code')->where('company_id', $companyId)->get();
        $byCode = [];
        foreach ($accounts as $account) {
            $byCode[$account->account_code] = $account->id;
        }

        $mappings = array_filter([
            ['SALES_INVOICE', 'receivable_account', $byCode['1100'] ?? null, 'Default receivable account for sales invoices'],
            ['SALES_INVOICE', 'default_sales_account', $byCode['4000'] ?? null, 'Default sales revenue account'],
            ['SALES_INVOICE', 'tax_payable_account', $byCode['2100'] ?? null, 'Default sales tax payable account'],
            ['PURCHASE_INVOICE', 'payable_account', $byCode['2000'] ?? null, 'Default payable account for purchase invoices'],
            ['PURCHASE_INVOICE', 'default_inventory_account', $byCode['1200'] ?? ($byCode['5100'] ?? null), 'Default inventory or expense account'],
            ['PURCHASE_INVOICE', 'tax_receivable_account', $byCode['1300'] ?? null, 'Default purchase tax receivable account'],
        ], fn ($item) => !empty($item[2]));

        foreach ($mappings as [$transactionType, $mappingKey, $accountId, $description]) {
            DB::insert("
                INSERT INTO account_mapping_config (
                  id, company_id, transaction_type, mapping_key, account_id, description, is_active, created_at, updated_at
                )
                SELECT ?, ?, ?, ?, ?, ?, 1, ?, ?
                WHERE NOT EXISTS (
                  SELECT 1 FROM account_mapping_config WHERE company_id = ? AND transaction_type = ? AND mapping_key = ?
                )
            ", [
                (string) Str::uuid(),
                $companyId,
                $transactionType,
                $mappingKey,
                $accountId,
                $description,
                $this->nowString(),
                $this->nowString(),
                $companyId,
                $transactionType,
                $mappingKey,
            ]);
        }
    }

    private function seedCompanyMasterData(string $companyId): void
    {
        if ($this->tableExists('item_units_of_measure')) {
            foreach ([['PCS', 'Pieces', 'Individual units'], ['KG', 'Kilograms', 'Weight in kilograms'], ['L', 'Liters', 'Volume in liters']] as [$code, $name, $description]) {
                DB::insert("
                    INSERT INTO item_units_of_measure (id, code, name, description, company_id, is_active, created_at, updated_at)
                    SELECT ?, ?, ?, ?, ?, 1, ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM item_units_of_measure WHERE company_id = ? AND code = ?
                    )
                ", [(string) Str::uuid(), $code, $name, $description, $companyId, $this->nowString(), $this->nowString(), $companyId, $code]);
            }
        }

        if ($this->tableExists('item_categories')) {
            foreach ([['Finished Goods', 'Products ready for sale'], ['Raw Materials', 'Materials used for purchasing and stock'], ['Services', 'Non-stock services']] as [$name, $description]) {
                DB::insert("
                    INSERT INTO item_categories (id, name, description, company_id, is_active, created_at, updated_at)
                    SELECT ?, ?, ?, ?, 1, ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM item_categories WHERE company_id = ? AND name = ?
                    )
                ", [(string) Str::uuid(), $name, $description, $companyId, $this->nowString(), $this->nowString(), $companyId, $name]);
            }
        }

        if ($this->tableExists('payment_methods')) {
            $bankAccountId = DB::table('chart_of_accounts')->where('company_id', $companyId)->where('account_code', '1010')->value('id');
            foreach ([['Cash', null, 'Cash collections and payments'], ['Bank Transfer', $bankAccountId, 'Bank collections and settlements']] as [$name, $accountId, $description]) {
                DB::insert("
                    INSERT INTO payment_methods (id, company_id, name, account_id, description, is_active, created_at, updated_at)
                    SELECT ?, ?, ?, ?, ?, 1, ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM payment_methods WHERE company_id = ? AND name = ?
                    )
                ", [(string) Str::uuid(), $companyId, $name, $accountId, $description, $this->nowString(), $this->nowString(), $companyId, $name]);
            }
        }
    }

    private function ensureCompanyControlSeeds(string $companyId, array $company): void
    {
        $companyCurrency = $company['currency'] ?? 'LYD';
        if (in_array('base_currency', $this->getTableColumns('companies'), true)) {
            DB::update(
                'UPDATE companies SET base_currency = COALESCE(base_currency, ?), currency = COALESCE(currency, ?), fiscal_year_start = COALESCE(fiscal_year_start, ?) WHERE id = ?',
                [$companyCurrency, $companyCurrency, '01-01', $companyId]
            );
        }

        if ($this->tableExists('document_sequences')) {
            foreach ([['SALES_INVOICE', 'SI-'], ['PURCHASE_INVOICE', 'PI-'], ['JOURNAL_ENTRY', 'JE-'], ['PAYMENT', 'PAY-'], ['INVENTORY_COUNT', 'CNT-']] as [$documentType, $prefix]) {
                DB::insert("
                    INSERT INTO document_sequences (id, company_id, document_type, prefix, next_number, padding, is_active, created_at, updated_at)
                    SELECT ?, ?, ?, ?, 1, 4, 1, ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM document_sequences WHERE company_id = ? AND document_type = ?
                    )
                ", [(string) Str::uuid(), $companyId, $documentType, $prefix, $this->nowString(), $this->nowString(), $companyId, $documentType]);
            }
        }

        if ($this->tableExists('notification_rules')) {
            foreach ([['LOW_STOCK', 'Low stock items', 'WARNING'], ['OVERDUE_RECEIVABLES', 'Overdue receivables', 'CRITICAL'], ['OVERDUE_PAYABLES', 'Overdue payables', 'WARNING'], ['MISSING_ACCOUNT_MAPPINGS', 'Missing account mappings', 'CRITICAL'], ['NEGATIVE_STOCK', 'Negative stock', 'CRITICAL'], ['UNPOSTED_DOCUMENTS', 'Unposted documents', 'WARNING']] as [$ruleCode, $title, $severity]) {
                DB::insert("
                    INSERT INTO notification_rules (id, company_id, rule_code, title, severity, is_active, created_at, updated_at)
                    SELECT ?, ?, ?, ?, ?, 1, ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM notification_rules WHERE company_id = ? AND rule_code = ?
                    )
                ", [(string) Str::uuid(), $companyId, $ruleCode, $title, $severity, $this->nowString(), $this->nowString(), $companyId, $ruleCode]);
            }
        }

        if ($this->tableExists('fiscal_periods')) {
            $year = (int) now()->utc()->format('Y');
            foreach ([$year, $year + 1] as $periodYear) {
                DB::insert("
                    INSERT INTO fiscal_periods (
                      id, company_id, period_code, period_name, start_date, end_date, status, created_at, updated_at
                    )
                    SELECT ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM fiscal_periods WHERE company_id = ? AND period_code = ?
                    )
                ", [
                    (string) Str::uuid(),
                    $companyId,
                    (string) $periodYear,
                    "Fiscal Year {$periodYear}",
                    "{$periodYear}-01-01",
                    "{$periodYear}-12-31",
                    $this->nowString(),
                    $this->nowString(),
                    $companyId,
                    (string) $periodYear,
                ]);
            }
        }
    }

    private function getCurrentPeriod(string $companyId): ?array
    {
        if (!$this->tableExists('fiscal_periods')) {
            return null;
        }

        $row = DB::selectOne("
            SELECT id, period_code, period_name, start_date, end_date, status, closed_at, reopened_at
            FROM fiscal_periods
            WHERE company_id = ?
              AND CURRENT_DATE BETWEEN start_date AND end_date
            ORDER BY start_date DESC
            LIMIT 1
        ", [$companyId]);

        return $row ? (array) $row : null;
    }

    private function getMissingMappingKeys(string $companyId): array
    {
        if (!$this->tableExists('account_mapping_config')) {
            return [];
        }

        $requiredMappings = [
            ['transactionType' => 'SALES_INVOICE', 'mappingKey' => 'receivable_account'],
            ['transactionType' => 'SALES_INVOICE', 'mappingKey' => 'default_sales_account'],
            ['transactionType' => 'SALES_INVOICE', 'mappingKey' => 'tax_payable_account'],
            ['transactionType' => 'PURCHASE_INVOICE', 'mappingKey' => 'payable_account'],
            ['transactionType' => 'PURCHASE_INVOICE', 'mappingKey' => 'default_inventory_account'],
            ['transactionType' => 'PURCHASE_INVOICE', 'mappingKey' => 'tax_receivable_account'],
        ];

        $rows = DB::select("
            SELECT transaction_type, mapping_key
            FROM account_mapping_config
            WHERE company_id = ? AND is_active = 1
        ", [$companyId]);

        $existing = [];
        foreach ($rows as $row) {
            $existing[$row->transaction_type . ':' . $row->mapping_key] = true;
        }

        return array_values(array_filter($requiredMappings, fn ($mapping) => empty($existing[$mapping['transactionType'] . ':' . $mapping['mappingKey']])));
    }

    private function tableExists(string $tableName): bool
    {
        return count($this->getTableColumns($tableName)) > 0;
    }

    private function getTableColumns(string $tableName): array
    {
        if (array_key_exists($tableName, $this->tableColumnsCache)) {
            return $this->tableColumnsCache[$tableName];
        }

        $rows = DB::select(
            'SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
            [$tableName]
        );
        $columns = array_map(fn ($row) => $row->COLUMN_NAME, $rows);
        $this->tableColumnsCache[$tableName] = $columns;

        return $columns;
    }

    private function generateCustomerCode(?string $companyId): string
    {
        if (!$companyId) {
            return 'CUST-0001';
        }

        $rows = DB::table('customers')->select('customer_code')->where('company_id', $companyId)->orderByDesc('created_at')->get();
        $maxSequence = 0;
        foreach ($rows as $row) {
            if (preg_match('/^CUST-(\d+)$/i', (string) $row->customer_code, $matches)) {
                $maxSequence = max($maxSequence, (int) $matches[1]);
            }
        }

        return 'CUST-' . str_pad((string) ($maxSequence + 1), 4, '0', STR_PAD_LEFT);
    }

    private function generateSupplierCode(?string $companyId): string
    {
        if (!$companyId) {
            return 'SUPP-0001';
        }

        $rows = DB::table('suppliers')->select('supplier_code')->where('company_id', $companyId)->orderByDesc('created_at')->get();
        $maxSequence = 0;
        foreach ($rows as $row) {
            if (preg_match('/^SUPP-(\d+)$/i', (string) $row->supplier_code, $matches)) {
                $maxSequence = max($maxSequence, (int) $matches[1]);
            }
        }

        return 'SUPP-' . str_pad((string) ($maxSequence + 1), 4, '0', STR_PAD_LEFT);
    }

    private function formatMoney(mixed $amount): string
    {
        return '$' . number_format((float) ($amount ?? 0), 2, '.', ',');
    }

    private function nowString(): string
    {
        return now()->format('Y-m-d H:i:s');
    }
}
