<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait HandlesLegacyCrud
{
    public function health(): array
    {
        $row = DB::selectOne('SELECT 1 AS ok');

        return [200, [
            'ok' => true,
            'database' => (($row->ok ?? null) === 1) ? 'connected' : 'unknown',
        ]];
    }

    public function index(string $resource, array $filters): array
    {
        $config = $this->getConfig($resource);
        if (!$config) {
            return [404, ['error' => "Unsupported resource: {$resource}"]];
        }

        return [200, $this->selectRows($config, $filters)];
    }

    public function show(string $resource, string $recordId): array
    {
        $config = $this->getConfig($resource);
        if (!$config) {
            return [404, ['error' => "Unsupported resource: {$resource}"]];
        }

        $rows = $this->selectRows($config, [$config['idColumn'] => $recordId]);
        if (!$rows) {
            return [404, ['error' => $this->singularLabel($resource) . ' not found']];
        }

        return [200, $rows[0]];
    }

    public function store(string $resource, array $body): array
    {
        $config = $this->getConfig($resource);
        if (!$config) {
            return [404, ['error' => "Unsupported resource: {$resource}"]];
        }
        if (!empty($config['readOnly'])) {
            return [405, ['error' => "{$resource} is read-only"]];
        }

        $tableColumns = $this->getTableColumns($config['tableName']);
        $payload = $this->normalizeResourcePayload(
            $resource,
            $this->sanitizePayload($config, $body, true, $tableColumns),
            $tableColumns
        );
        $id = (string) ($body['id'] ?? Str::uuid());
        $now = $this->nowString();

        $insertData = array_merge(
            $this->filteredDefaults($config, $tableColumns),
            $payload
        );

        if (in_array('id', $tableColumns, true)) {
            $insertData['id'] = $id;
        }
        if (in_array('created_at', $tableColumns, true)) {
            $insertData['created_at'] = $now;
        }
        if (in_array('updated_at', $tableColumns, true)) {
            $insertData['updated_at'] = $now;
        }

        if ($resource === 'customers' && in_array('customer_code', $tableColumns, true) && empty($insertData['customer_code'])) {
            $insertData['customer_code'] = $this->generateCustomerCode($insertData['company_id'] ?? null);
        }
        if ($resource === 'suppliers' && in_array('supplier_code', $tableColumns, true) && empty($insertData['supplier_code'])) {
            $insertData['supplier_code'] = $this->generateSupplierCode($insertData['company_id'] ?? null);
        }

        $this->insertRow($config['tableName'], $insertData);

        if ($resource === 'companies') {
            $this->seedCompanyWorkspace($id, $insertData);
        }

        $this->logAuditEvent([
            'companyId' => $insertData['company_id'] ?? ($resource === 'companies' ? $id : null),
            'actionType' => 'CREATE',
            'resourceType' => $resource,
            'resourceId' => $id,
            'resourceLabel' => $this->getAuditResourceLabel($resource, $insertData),
            'summary' => 'Created ' . str_replace('_', ' ', $resource),
            'metadata' => $this->buildAuditMetadata($insertData),
        ]);

        $rows = $this->selectRows($config, in_array('id', $tableColumns, true) ? ['id' => $id] : $payload);

        return [201, $rows[0] ?? $insertData];
    }

    public function update(string $resource, string $recordId, array $body): array
    {
        $config = $this->getConfig($resource);
        if (!$config) {
            return [404, ['error' => "Unsupported resource: {$resource}"]];
        }
        if (!empty($config['readOnly'])) {
            return [405, ['error' => "{$resource} is read-only"]];
        }

        $existingRow = $this->selectRows($config, [$config['idColumn'] => $recordId])[0] ?? null;
        if (!$existingRow) {
            return [404, ['error' => $this->singularLabel($resource) . ' not found']];
        }

        $tableColumns = $this->getTableColumns($config['tableName']);
        $payload = $this->normalizeResourcePayload(
            $resource,
            $this->sanitizePayload($config, $body, false, $tableColumns),
            $tableColumns
        );

        if (in_array('updated_at', $tableColumns, true)) {
            $payload['updated_at'] = $this->nowString();
        }

        if (!$payload) {
            return [400, ['error' => 'No valid fields supplied']];
        }

        if ($this->isBlockedProtectedUpdate($resource, $existingRow, $payload)) {
            $this->logAuditEvent([
                'companyId' => $existingRow['company_id'] ?? null,
                'actionType' => 'UPDATE_ATTEMPT',
                'resourceType' => $resource,
                'resourceId' => $recordId,
                'resourceLabel' => $this->getAuditResourceLabel($resource, $existingRow),
                'status' => 'BLOCKED',
                'summary' => 'Blocked update to protected ' . str_replace('_', ' ', $resource),
                'metadata' => $this->buildAuditMetadata([
                    'attemptedChanges' => $payload,
                    'currentStatus' => $existingRow['status'] ?? null,
                ]),
            ]);

            return [409, ['error' => 'Posted or completed documents can only be changed through controlled status actions.']];
        }

        $this->updateRow($config['tableName'], $config['idColumn'], $recordId, $payload);
        $row = $this->selectRows($config, [$config['idColumn'] => $recordId])[0] ?? null;
        if (!$row) {
            return [404, ['error' => $this->singularLabel($resource) . ' not found']];
        }

        $this->logAuditEvent([
            'companyId' => $row['company_id'] ?? ($existingRow['company_id'] ?? null),
            'actionType' => $resource === 'account_mapping_config' ? 'MAPPING_CHANGE' : 'UPDATE',
            'resourceType' => $resource,
            'resourceId' => $recordId,
            'resourceLabel' => $this->getAuditResourceLabel($resource, $row),
            'summary' => 'Updated ' . str_replace('_', ' ', $resource),
            'metadata' => $this->buildAuditMetadata($payload),
        ]);

        return [200, $row];
    }

    public function destroy(string $resource, string $recordId): array
    {
        $config = $this->getConfig($resource);
        if (!$config) {
            return [404, ['error' => "Unsupported resource: {$resource}"]];
        }
        if (!empty($config['readOnly'])) {
            return [405, ['error' => "{$resource} is read-only"]];
        }

        $existingRow = $this->selectRows($config, [$config['idColumn'] => $recordId])[0] ?? null;
        if (!$existingRow) {
            return [404, ['error' => $this->singularLabel($resource) . ' not found']];
        }

        if ($this->isBlockedProtectedDelete($resource, $existingRow)) {
            $this->logAuditEvent([
                'companyId' => $existingRow['company_id'] ?? null,
                'actionType' => 'DELETE_ATTEMPT',
                'resourceType' => $resource,
                'resourceId' => $recordId,
                'resourceLabel' => $this->getAuditResourceLabel($resource, $existingRow),
                'status' => 'BLOCKED',
                'summary' => 'Blocked deletion of protected ' . str_replace('_', ' ', $resource),
                'metadata' => $this->buildAuditMetadata(['currentStatus' => $existingRow['status'] ?? null]),
            ]);

            return [409, ['error' => 'Protected financial documents cannot be deleted once posted or completed.']];
        }

        DB::table($config['tableName'])->where($config['idColumn'], $recordId)->delete();

        $this->logAuditEvent([
            'companyId' => $existingRow['company_id'] ?? null,
            'actionType' => 'DELETE',
            'resourceType' => $resource,
            'resourceId' => $recordId,
            'resourceLabel' => $this->getAuditResourceLabel($resource, $existingRow),
            'summary' => 'Deleted ' . str_replace('_', ' ', $resource),
            'metadata' => $this->buildAuditMetadata($existingRow),
        ]);

        return [200, ['success' => true]];
    }

    private function selectRows(array $config, array $filters): array
    {
        $query = DB::table($config['tableName']);
        $tableColumns = $this->getTableColumns($config['tableName']);

        foreach ($filters as $column => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            if (!in_array($column, $tableColumns, true)) {
                continue;
            }

            $query->where($column, $value);
        }

        foreach (['updated_at', 'created_at'] as $column) {
            if (in_array($column, $tableColumns, true)) {
                $query->orderByDesc($column);
            }
        }

        return array_map(fn ($row) => (array) $row, $query->get()->all());
    }

    private function insertRow(string $tableName, array $data): void
    {
        DB::table($tableName)->insert($data);
    }

    private function updateRow(string $tableName, string $idColumn, string $id, array $data): void
    {
        DB::table($tableName)->where($idColumn, $id)->update($data);
    }

    private function filteredDefaults(array $config, array $tableColumns): array
    {
        $defaults = [];
        foreach ($config['defaultValues'] as $column => $value) {
            if (in_array($column, $tableColumns, true)) {
                $defaults[$column] = $value;
            }
        }

        return $defaults;
    }

    private function sanitizePayload(array $config, array $payload, bool $includeDefaults, array $tableColumns): array
    {
        $result = [];
        foreach ($config['writableColumns'] as $column) {
            if (!in_array($column, $tableColumns, true) || !array_key_exists($column, $payload)) {
                continue;
            }

            $value = $payload[$column];
            if (is_array($value) || is_object($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            $result[$column] = $value;
        }

        if ($includeDefaults) {
            foreach ($config['defaultValues'] as $column => $value) {
                if (in_array($column, $tableColumns, true) && !array_key_exists($column, $result)) {
                    $result[$column] = $value;
                }
            }
        }

        return $result;
    }

    private function normalizeResourcePayload(string $resource, array $payload, array $tableColumns): array
    {
        $normalized = $payload;

        if ($resource === 'journal_entries') {
            if (!empty($normalized['journal_number']) && in_array('entry_number', $tableColumns, true) && empty($normalized['entry_number'])) {
                $normalized['entry_number'] = $normalized['journal_number'];
            }
            if (!empty($normalized['entry_number']) && in_array('journal_number', $tableColumns, true) && empty($normalized['journal_number'])) {
                $normalized['journal_number'] = $normalized['entry_number'];
            }
            if (!empty($normalized['description']) && in_array('memo', $tableColumns, true) && empty($normalized['memo'])) {
                $normalized['memo'] = $normalized['description'];
            }
            if (!empty($normalized['memo']) && in_array('description', $tableColumns, true) && empty($normalized['description'])) {
                $normalized['description'] = $normalized['memo'];
            }
            if (!empty($normalized['reference_number']) && in_array('reference', $tableColumns, true) && empty($normalized['reference'])) {
                $normalized['reference'] = $normalized['reference_number'];
            }
            if (!empty($normalized['reference']) && in_array('reference_number', $tableColumns, true) && empty($normalized['reference_number'])) {
                $normalized['reference_number'] = $normalized['reference'];
            }
        }

        if ($resource === 'stock_items') {
            $currentQuantity = (float) ($normalized['current_quantity'] ?? ($normalized['quantity_on_hand'] ?? 0));
            $reservedQuantity = (float) ($normalized['reserved_quantity'] ?? 0);
            if (in_array('current_quantity', $tableColumns, true)) {
                $normalized['current_quantity'] = $currentQuantity;
            }
            if (in_array('quantity_on_hand', $tableColumns, true)) {
                $normalized['quantity_on_hand'] = $currentQuantity;
            }
            if (in_array('available_quantity', $tableColumns, true) && !array_key_exists('available_quantity', $normalized)) {
                $normalized['available_quantity'] = $currentQuantity - $reservedQuantity;
            }
        }

        if ($resource === 'stock_movements' && !empty($normalized['description']) && in_array('notes', $tableColumns, true) && empty($normalized['notes'])) {
            $normalized['notes'] = $normalized['description'];
        }

        return $normalized;
    }

    private function isBlockedProtectedUpdate(string $resource, array $existingRow, array $payload): bool
    {
        if (empty($existingRow['status'])) {
            return false;
        }

        $protectedFieldsByResource = [
            'sales_invoices' => ['invoice_number', 'customer_id', 'invoice_date', 'due_date', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'currency', 'payment_terms'],
            'purchase_invoices' => ['invoice_number', 'supplier_id', 'invoice_date', 'due_date', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'currency', 'payment_terms'],
            'payments' => ['payment_type', 'customer_id', 'supplier_id', 'invoice_id', 'payment_date', 'payment_method', 'payment_method_id', 'reference_number', 'amount', 'currency'],
            'journal_entries' => ['entry_number', 'journal_number', 'entry_date', 'reference', 'reference_type', 'reference_id', 'reference_number'],
        ];
        $immutableStatuses = [
            'sales_invoices' => ['SUBMITTED', 'PAID', 'OVERDUE', 'CANCELLED'],
            'purchase_invoices' => ['SUBMITTED', 'RECEIVED', 'PAID', 'OVERDUE', 'CANCELLED'],
            'payments' => ['COMPLETED'],
            'journal_entries' => ['POSTED', 'VOID'],
        ];

        if (!in_array((string) $existingRow['status'], $immutableStatuses[$resource] ?? [], true)) {
            return false;
        }

        foreach (array_keys($payload) as $column) {
            if (in_array($column, $protectedFieldsByResource[$resource] ?? [], true)) {
                return true;
            }
        }

        return false;
    }

    private function isBlockedProtectedDelete(string $resource, array $existingRow): bool
    {
        if (empty($existingRow['status'])) {
            return false;
        }

        $protectedStatuses = [
            'sales_invoices' => ['SUBMITTED', 'PAID', 'OVERDUE', 'CANCELLED'],
            'purchase_invoices' => ['SUBMITTED', 'RECEIVED', 'PAID', 'OVERDUE', 'CANCELLED'],
            'payments' => ['COMPLETED'],
            'journal_entries' => ['POSTED', 'VOID'],
        ];

        return in_array((string) $existingRow['status'], $protectedStatuses[$resource] ?? [], true);
    }

    private function getAuditResourceLabel(string $resource, array $row = []): string
    {
        return $row['name']
            ?? $row['account_name']
            ?? $row['invoice_number']
            ?? $row['journal_number']
            ?? $row['entry_number']
            ?? $row['reference_number']
            ?? $row['period_name']
            ?? ($resource . ':' . ($row['id'] ?? ($row['resource_id'] ?? 'record')));
    }

    private function buildAuditMetadata(mixed $payload): string
    {
        return json_encode($payload ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function logAuditEvent(array $event): void
    {
        if (($event['resourceType'] ?? null) === 'audit_events' || !$this->tableExists('audit_events')) {
            return;
        }

        DB::table('audit_events')->insert([
            'id' => (string) Str::uuid(),
            'company_id' => $event['companyId'] ?? null,
            'actor_name' => $event['actorName'] ?? 'System',
            'action_type' => $event['actionType'],
            'resource_type' => $event['resourceType'],
            'resource_id' => $event['resourceId'] ?? null,
            'resource_label' => $event['resourceLabel'] ?? null,
            'status' => $event['status'] ?? 'SUCCESS',
            'summary' => $event['summary'],
            'metadata' => $event['metadata'] ?? '{}',
            'occurred_at' => $this->nowString(),
            'created_at' => $this->nowString(),
            'updated_at' => $this->nowString(),
        ]);
    }
}
