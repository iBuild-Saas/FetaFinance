<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait BuildsLegacyReports
{
    public function rpc(string $name, array $params): array
    {
        try {
            $data = match ($name) {
                'generate_invoice_number' => $this->generateInvoiceNumber($params['company_uuid'] ?? ($params['company_id'] ?? null)),
                'update_item_stock' => $this->updateItemStock($params['item_uuid'] ?? null, (float) ($params['quantity_change'] ?? 0)),
                'get_account_ledger' => $this->getAccountLedger($params),
                'get_company_trial_balance' => $this->getCompanyTrialBalance($params),
                'get_account_balance' => $this->getAccountBalance($params),
                'get_hierarchical_income_statement' => $this->getHierarchicalIncomeStatement($params),
                'get_hierarchical_balance_sheet' => $this->getHierarchicalBalanceSheet($params),
                'get_financial_summary' => $this->getFinancialSummary($params),
                'get_company_account_mappings' => $this->getCompanyAccountMappings($params),
                'set_account_mapping' => $this->setAccountMapping($params),
                default => null,
            };

            if ($data === null) {
                return [404, ['error' => "RPC {$name} is not implemented"]];
            }

            return [200, $data];
        } catch (\Throwable $exception) {
            return [500, ['error' => $exception->getMessage()]];
        }
    }

    public function buildCompanyOverview(string $companyId): array
    {
        $company = (array) (DB::table('companies')->where('id', $companyId)->first() ?? []);

        $salesRows = DB::selectOne("
            SELECT COALESCE(SUM(total_amount), 0) AS total_sales, COUNT(*) AS invoice_count
            FROM sales_invoices
            WHERE company_id = ? AND is_active = 1 AND status <> 'CANCELLED'
        ", [$companyId]);
        $purchaseRows = DB::selectOne("
            SELECT COALESCE(SUM(total_amount), 0) AS total_purchases, COUNT(*) AS invoice_count
            FROM purchase_invoices
            WHERE company_id = ? AND is_active = 1 AND status <> 'CANCELLED'
        ", [$companyId]);
        $stockRows = DB::selectOne("
            SELECT
              COALESCE(SUM(current_quantity * average_cost), 0) AS stock_value,
              SUM(CASE WHEN current_quantity < 0 THEN 1 ELSE 0 END) AS negative_stock_items,
              SUM(CASE WHEN reorder_level > 0 AND current_quantity <= reorder_level THEN 1 ELSE 0 END) AS low_stock_items
            FROM stock_items
            WHERE company_id = ? AND is_active = 1
        ", [$companyId]);
        $arRows = DB::selectOne("
            SELECT
              COALESCE(SUM(balance), 0) AS receivables_total,
              SUM(CASE WHEN days_overdue > 0 THEN balance ELSE 0 END) AS overdue_receivables,
              SUM(CASE WHEN days_overdue > 0 THEN 1 ELSE 0 END) AS overdue_receivable_count
            FROM customer_receivables
            WHERE company_id = ?
        ", [$companyId]);
        $apRows = DB::selectOne("
            SELECT
              COALESCE(SUM(balance), 0) AS payables_total,
              SUM(CASE WHEN days_overdue > 0 THEN balance ELSE 0 END) AS overdue_payables,
              SUM(CASE WHEN days_overdue > 0 THEN 1 ELSE 0 END) AS overdue_payable_count
            FROM supplier_payables
            WHERE company_id = ?
        ", [$companyId]);
        $unpostedRows = DB::selectOne("
            SELECT
              (SELECT COUNT(*) FROM sales_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS draft_sales,
              (SELECT COUNT(*) FROM purchase_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS draft_purchases,
              (SELECT COUNT(*) FROM journal_entries WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS draft_journals
        ", [$companyId, $companyId, $companyId]);
        $ledgerRows = DB::selectOne("
            SELECT
              COALESCE(SUM(jel.debit_amount), 0) AS total_debits,
              COALESCE(SUM(jel.credit_amount), 0) AS total_credits
            FROM journal_entries je
            JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
            WHERE je.company_id = ? AND je.is_active = 1
        ", [$companyId]);
        $cashRows = DB::selectOne("
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
        ", [$companyId]);
        $trendRows = DB::select("
            SELECT DATE_FORMAT(invoice_date, '%Y-%m') AS period, COALESCE(SUM(total_amount), 0) AS total
            FROM sales_invoices
            WHERE company_id = ?
              AND is_active = 1
              AND status <> 'CANCELLED'
              AND invoice_date >= DATE_SUB(CURRENT_DATE, INTERVAL 5 MONTH)
            GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
            ORDER BY period ASC
        ", [$companyId]);

        $currentPeriod = $this->getCurrentPeriod($companyId);
        $missingMappings = $this->getMissingMappingKeys($companyId);

        return [
            'company' => $company ?: null,
            'kpis' => [
                'cashBalance' => (float) ($cashRows->cash_balance ?? 0),
                'receivablesTotal' => (float) ($arRows->receivables_total ?? 0),
                'payablesTotal' => (float) ($apRows->payables_total ?? 0),
                'stockValue' => (float) ($stockRows->stock_value ?? 0),
                'totalSales' => (float) ($salesRows->total_sales ?? 0),
                'totalPurchases' => (float) ($purchaseRows->total_purchases ?? 0),
                'lowStockItems' => (int) ($stockRows->low_stock_items ?? 0),
                'negativeStockItems' => (int) ($stockRows->negative_stock_items ?? 0),
                'overdueReceivableCount' => (int) ($arRows->overdue_receivable_count ?? 0),
                'overduePayableCount' => (int) ($apRows->overdue_payable_count ?? 0),
                'draftDocuments' => (int) (($unpostedRows->draft_sales ?? 0) + ($unpostedRows->draft_purchases ?? 0) + ($unpostedRows->draft_journals ?? 0)),
                'trialBalanceDifference' => (float) (($ledgerRows->total_debits ?? 0) - ($ledgerRows->total_credits ?? 0)),
                'missingMappingCount' => count($missingMappings),
            ],
            'workflow' => [
                'draftSales' => (int) ($unpostedRows->draft_sales ?? 0),
                'draftPurchases' => (int) ($unpostedRows->draft_purchases ?? 0),
                'draftJournals' => (int) ($unpostedRows->draft_journals ?? 0),
                'overdueReceivables' => (float) ($arRows->overdue_receivables ?? 0),
                'overduePayables' => (float) ($apRows->overdue_payables ?? 0),
            ],
            'period' => $currentPeriod,
            'salesTrend' => array_map(fn ($row) => ['period' => $row->period, 'total' => (float) ($row->total ?? 0)], $trendRows),
        ];
    }

    public function buildCompanyExceptions(string $companyId): array
    {
        $missingMappings = $this->getMissingMappingKeys($companyId);
        $lowStockRows = DB::select("
            SELECT i.name, i.item_code, si.current_quantity, si.reorder_level
            FROM stock_items si
            JOIN items i ON i.id = si.item_id
            WHERE si.company_id = ?
              AND si.is_active = 1
              AND si.reorder_level > 0
              AND si.current_quantity <= si.reorder_level
            ORDER BY si.current_quantity ASC
            LIMIT 6
        ", [$companyId]);
        $negativeStockRows = DB::select("
            SELECT i.name, i.item_code, si.current_quantity
            FROM stock_items si
            JOIN items i ON i.id = si.item_id
            WHERE si.company_id = ?
              AND si.is_active = 1
              AND si.current_quantity < 0
            ORDER BY si.current_quantity ASC
            LIMIT 6
        ", [$companyId]);
        $overdueReceivables = DB::select("
            SELECT customer_name, reference, balance, days_overdue
            FROM customer_receivables
            WHERE company_id = ? AND days_overdue > 0
            ORDER BY days_overdue DESC, balance DESC
            LIMIT 6
        ", [$companyId]);
        $overduePayables = DB::select("
            SELECT supplier_name, reference, balance, days_overdue
            FROM supplier_payables
            WHERE company_id = ? AND days_overdue > 0
            ORDER BY days_overdue DESC, balance DESC
            LIMIT 6
        ", [$companyId]);
        $draftRows = DB::selectOne("
            SELECT
              (SELECT COUNT(*) FROM sales_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS sales_drafts,
              (SELECT COUNT(*) FROM purchase_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS purchase_drafts,
              (SELECT COUNT(*) FROM journal_entries WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS journal_drafts
        ", [$companyId, $companyId, $companyId]);

        $exceptions = [];

        foreach ($negativeStockRows as $row) {
            $exceptions[] = [
                'severity' => 'critical',
                'code' => 'NEGATIVE_STOCK',
                'title' => (($row->item_code ?? null) ?: $row->name) . ' has negative stock',
                'description' => 'Current quantity is ' . number_format((float) $row->current_quantity, 3) . '.',
            ];
        }

        foreach ($lowStockRows as $row) {
            $exceptions[] = [
                'severity' => 'warning',
                'code' => 'LOW_STOCK',
                'title' => (($row->item_code ?? null) ?: $row->name) . ' is at or below reorder level',
                'description' => 'Current quantity ' . number_format((float) $row->current_quantity, 3) . ' vs reorder ' . number_format((float) $row->reorder_level, 3) . '.',
            ];
        }

        foreach ($overdueReceivables as $row) {
            $exceptions[] = [
                'severity' => 'critical',
                'code' => 'OVERDUE_RECEIVABLES',
                'title' => 'Receivable overdue from ' . $row->customer_name,
                'description' => (($row->reference ?? 'Open invoice')) . ' is ' . $row->days_overdue . ' days overdue for ' . $this->formatMoney($row->balance) . '.',
            ];
        }

        foreach ($overduePayables as $row) {
            $exceptions[] = [
                'severity' => 'warning',
                'code' => 'OVERDUE_PAYABLES',
                'title' => 'Payable overdue to ' . $row->supplier_name,
                'description' => (($row->reference ?? 'Open invoice')) . ' is ' . $row->days_overdue . ' days overdue for ' . $this->formatMoney($row->balance) . '.',
            ];
        }

        foreach ($missingMappings as $mapping) {
            $exceptions[] = [
                'severity' => 'critical',
                'code' => 'MISSING_ACCOUNT_MAPPINGS',
                'title' => 'Missing ' . $mapping['transactionType'] . ' mapping',
                'description' => str_replace('_', ' ', $mapping['mappingKey']) . ' is not configured.',
            ];
        }

        $draftSales = (int) ($draftRows->sales_drafts ?? 0);
        $draftPurchases = (int) ($draftRows->purchase_drafts ?? 0);
        $draftJournals = (int) ($draftRows->journal_drafts ?? 0);
        if ($draftSales + $draftPurchases + $draftJournals > 0) {
            $exceptions[] = [
                'severity' => 'warning',
                'code' => 'UNPOSTED_DOCUMENTS',
                'title' => 'Unposted work needs review',
                'description' => "{$draftSales} sales drafts, {$draftPurchases} purchase drafts, and {$draftJournals} draft journals are still open.",
            ];
        }

        return [
            'companyId' => $companyId,
            'exceptions' => $exceptions,
            'counts' => [
                'critical' => count(array_filter($exceptions, fn ($item) => $item['severity'] === 'critical')),
                'warning' => count(array_filter($exceptions, fn ($item) => $item['severity'] === 'warning')),
                'info' => count(array_filter($exceptions, fn ($item) => $item['severity'] === 'info')),
            ],
        ];
    }

    public function buildCompanyAudit(string $companyId): array
    {
        return [
            'companyId' => $companyId,
            'events' => array_map(fn ($row) => (array) $row, DB::select("
                SELECT id, actor_name, action_type, resource_type, resource_label, status, summary, occurred_at
                FROM audit_events
                WHERE company_id = ?
                ORDER BY occurred_at DESC
                LIMIT 120
            ", [$companyId])),
        ];
    }

    public function buildCompanyPeriodStatus(string $companyId): array
    {
        $currentPeriod = $this->getCurrentPeriod($companyId);
        $closeRuns = array_map(fn ($row) => (array) $row, DB::select("
            SELECT run_type, status, created_by, created_at, notes
            FROM period_close_runs
            WHERE company_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        ", [$companyId]));
        $missingMappings = $this->getMissingMappingKeys($companyId);
        $balanceRows = DB::selectOne("
            SELECT COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) AS difference
            FROM journal_entries je
            JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
            WHERE je.company_id = ? AND je.is_active = 1
        ", [$companyId]);
        $negativeStockRows = DB::selectOne("
            SELECT COUNT(*) AS count
            FROM stock_items
            WHERE company_id = ? AND is_active = 1 AND current_quantity < 0
        ", [$companyId]);
        $draftRows = DB::selectOne("
            SELECT
              (SELECT COUNT(*) FROM sales_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1)
              + (SELECT COUNT(*) FROM purchase_invoices WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1)
              + (SELECT COUNT(*) FROM journal_entries WHERE company_id = ? AND status = 'DRAFT' AND is_active = 1) AS open_documents
        ", [$companyId, $companyId, $companyId]);

        return [
            'companyId' => $companyId,
            'currentPeriod' => $currentPeriod,
            'checklist' => [
                'missingMappings' => count($missingMappings),
                'negativeStockItems' => (int) ($negativeStockRows->count ?? 0),
                'openDocuments' => (int) ($draftRows->open_documents ?? 0),
                'trialBalanceDifference' => (float) ($balanceRows->difference ?? 0),
            ],
            'closeRuns' => $closeRuns,
        ];
    }

    private function generateInvoiceNumber(?string $companyId): string
    {
        $rows = DB::table('sales_invoices')
            ->select('invoice_number')
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->get();
        $year = now()->format('Y');
        $maxNumber = 0;

        foreach ($rows as $row) {
            if (preg_match('/INV-(\d+)$/', (string) $row->invoice_number, $matches)) {
                $maxNumber = max($maxNumber, (int) $matches[1]);
            }
        }

        return "{$year}-INV-" . str_pad((string) ($maxNumber + 1), 4, '0', STR_PAD_LEFT);
    }

    private function updateItemStock(?string $itemId, float $quantityChange): array
    {
        if (!$itemId) {
            throw new \InvalidArgumentException('item_uuid is required');
        }

        $item = DB::table('items')->where('id', $itemId)->first();
        if (!$item) {
            throw new \RuntimeException('Item not found');
        }

        $nextStock = (float) ($item->current_stock ?? 0) + $quantityChange;
        DB::table('items')->where('id', $itemId)->update([
            'current_stock' => $nextStock,
            'updated_at' => $this->nowString(),
        ]);

        return (array) DB::table('items')->where('id', $itemId)->first();
    }

    private function getAccountLedger(array $params): array
    {
        $companyId = $params['p_company_id'] ?? null;
        $accountId = $params['p_account_id'] ?? null;
        $startDate = $params['p_start_date'] ?? null;
        $endDate = $params['p_end_date'] ?? null;

        $entries = collect(DB::table('journal_entries')->where('company_id', $companyId)->get())
            ->filter(fn ($entry) => (!$startDate || $entry->entry_date >= $startDate) && (!$endDate || $entry->entry_date <= $endDate) && $entry->is_active !== 0)
            ->values();
        $entryMap = [];
        foreach ($entries as $entry) {
            $entryMap[$entry->id] = $entry;
        }

        $accountMap = [];
        foreach (DB::table('chart_of_accounts')->where('company_id', $companyId)->get() as $account) {
            $accountMap[$account->id] = $account;
        }

        $runningBalance = 0.0;
        $rows = [];
        foreach (DB::table('journal_entry_lines')->get() as $line) {
            if (($line->account_id ?? null) !== $accountId || !isset($entryMap[$line->journal_entry_id])) {
                continue;
            }

            $entry = $entryMap[$line->journal_entry_id];
            $account = $accountMap[$line->account_id] ?? null;
            $runningBalance += (float) ($line->debit_amount ?? 0) - (float) ($line->credit_amount ?? 0);
            $rows[] = [
                'line_id' => $line->id,
                'journal_entry_id' => $entry->id,
                'entry_number' => $entry->journal_number,
                'entry_date' => $entry->entry_date,
                'reference' => $entry->reference_number,
                'journal_memo' => $entry->description,
                'line_description' => $line->description,
                'account_id' => $line->account_id,
                'account_code' => $account->account_code ?? '',
                'account_name' => $account->account_name ?? '',
                'account_type' => $account->account_type ?? '',
                'normal_balance' => $account->normal_balance ?? '',
                'line_number' => 0,
                'debit_amount' => (float) ($line->debit_amount ?? 0),
                'credit_amount' => (float) ($line->credit_amount ?? 0),
                'balance_effect' => (float) ($line->debit_amount ?? 0) - (float) ($line->credit_amount ?? 0),
                'running_balance' => $runningBalance,
            ];
        }

        usort($rows, fn ($a, $b) => strcmp((string) $a['entry_date'], (string) $b['entry_date']));

        return $rows;
    }

    private function getCompanyTrialBalance(array $params): array
    {
        $companyId = $params['company_uuid'] ?? ($params['p_company_id'] ?? null);
        $endDate = $params['end_date'] ?? ($params['p_as_of_date'] ?? null);

        $entries = collect(DB::table('journal_entries')->where('company_id', $companyId)->get())
            ->filter(fn ($entry) => (!$endDate || $entry->entry_date <= $endDate) && $entry->is_active !== 0)
            ->pluck('id')
            ->flip()
            ->all();

        $grouped = [];
        foreach (DB::table('chart_of_accounts')->where('company_id', $companyId)->get() as $account) {
            $grouped[$account->id] = [
                'account_id' => $account->id,
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'account_type' => $account->account_type,
                'normal_balance' => $account->normal_balance,
                'debit_total' => 0.0,
                'credit_total' => 0.0,
                'balance' => 0.0,
            ];
        }

        foreach (DB::table('journal_entry_lines')->get() as $line) {
            if (!isset($entries[$line->journal_entry_id]) || !isset($grouped[$line->account_id])) {
                continue;
            }

            $grouped[$line->account_id]['debit_total'] += (float) ($line->debit_amount ?? 0);
            $grouped[$line->account_id]['credit_total'] += (float) ($line->credit_amount ?? 0);
            $grouped[$line->account_id]['balance'] = $grouped[$line->account_id]['debit_total'] - $grouped[$line->account_id]['credit_total'];
        }

        $rows = array_values($grouped);
        usort($rows, fn ($a, $b) => strcmp($a['account_code'], $b['account_code']));

        return $rows;
    }

    private function getAccountBalance(array $params): float
    {
        $rows = $this->getAccountLedger([
            'p_account_id' => $params['p_account_id'] ?? null,
            'p_company_id' => $params['p_company_id'] ?? null,
            'p_end_date' => $params['p_as_of_date'] ?? null,
        ]);

        return $rows ? (float) ($rows[count($rows) - 1]['running_balance'] ?? 0) : 0.0;
    }

    private function getHierarchicalIncomeStatement(array $params): array
    {
        return $this->buildStatement($params['p_company_id'] ?? null, $params['p_start_date'] ?? null, $params['p_end_date'] ?? null, ['Revenue', 'Expense']);
    }

    private function getHierarchicalBalanceSheet(array $params): array
    {
        return $this->buildStatement($params['p_company_id'] ?? null, null, $params['p_as_of_date'] ?? null, ['Asset', 'Liability', 'Equity']);
    }

    private function getFinancialSummary(array $params): array
    {
        $income = $this->getHierarchicalIncomeStatement($params);
        $balance = $this->getHierarchicalBalanceSheet([
            'p_company_id' => $params['p_company_id'] ?? null,
            'p_as_of_date' => $params['p_end_date'] ?? null,
        ]);

        $incomeTotal = array_reduce($income, fn ($sum, $item) => $sum + (float) ($item['amount'] ?? 0), 0.0);
        $balanceTotal = array_reduce($balance, fn ($sum, $item) => $sum + (float) ($item['amount'] ?? 0), 0.0);

        return [
            ['statement_type' => 'Income Statement', 'category' => 'Net Activity', 'total_amount' => $incomeTotal],
            ['statement_type' => 'Balance Sheet', 'category' => 'Total Balance', 'total_amount' => $balanceTotal],
        ];
    }

    private function getCompanyAccountMappings(array $params): array
    {
        $companyId = $params['p_company_id'] ?? ($params['company_id'] ?? null);

        return array_map(
            fn ($row) => (array) $row,
            DB::table('account_mapping_view')->where('company_id', $companyId)->get()->all()
        );
    }

    private function setAccountMapping(array $params): array
    {
        $companyId = $params['p_company_id'] ?? ($params['company_id'] ?? null);
        $transactionType = $params['p_transaction_type'] ?? ($params['transaction_type'] ?? null);
        $mappingKey = $params['p_mapping_key'] ?? ($params['mapping_key'] ?? null);
        $accountId = $params['p_account_id'] ?? ($params['account_id'] ?? null);
        $description = $params['p_description'] ?? ($params['description'] ?? null);

        $existing = DB::table('account_mapping_config')
            ->where('company_id', $companyId)
            ->where('transaction_type', $transactionType)
            ->where('mapping_key', $mappingKey)
            ->first();

        if ($existing) {
            DB::table('account_mapping_config')->where('id', $existing->id)->update([
                'account_id' => $accountId,
                'description' => $description,
                'is_active' => 1,
                'updated_at' => $this->nowString(),
            ]);

            return (array) DB::table('account_mapping_config')->where('id', $existing->id)->first();
        }

        $id = (string) Str::uuid();
        DB::table('account_mapping_config')->insert([
            'id' => $id,
            'company_id' => $companyId,
            'transaction_type' => $transactionType,
            'mapping_key' => $mappingKey,
            'account_id' => $accountId,
            'description' => $description,
            'is_active' => 1,
            'created_at' => $this->nowString(),
            'updated_at' => $this->nowString(),
        ]);

        return (array) DB::table('account_mapping_config')->where('id', $id)->first();
    }

    private function buildStatement(?string $companyId, ?string $startDate, ?string $endDate, array $accountTypes): array
    {
        $validEntries = collect(DB::table('journal_entries')->where('company_id', $companyId)->get())
            ->filter(fn ($entry) => $entry->is_active !== 0 && (!$startDate || $entry->entry_date >= $startDate) && (!$endDate || $entry->entry_date <= $endDate))
            ->pluck('id')
            ->flip()
            ->all();

        $byId = [];
        foreach (DB::table('chart_of_accounts')->where('company_id', $companyId)->get() as $account) {
            if (!in_array($account->account_type, $accountTypes, true)) {
                continue;
            }

            $byId[$account->id] = [
                'account_id' => $account->id,
                'parent_account_id' => $account->parent_account_id,
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'category' => $account->account_type,
                'subcategory' => $account->account_type,
                'level_depth' => $account->parent_account_id ? 1 : 0,
                'is_group' => (bool) $account->is_group,
                'amount' => 0.0,
            ];
        }

        foreach (DB::table('journal_entry_lines')->get() as $line) {
            if (!isset($validEntries[$line->journal_entry_id]) || !isset($byId[$line->account_id])) {
                continue;
            }

            $byId[$line->account_id]['amount'] += (float) ($line->debit_amount ?? 0) - (float) ($line->credit_amount ?? 0);
        }

        $rows = array_values($byId);
        usort($rows, fn ($a, $b) => strcmp($a['account_code'], $b['account_code']));

        return $rows;
    }
}
