<?php

return [
    'tables' => [
        'companies' => [
            'tableName' => 'companies',
            'idColumn' => 'id',
            'writableColumns' => [
                'name', 'logo', 'description', 'industry', 'company_size', 'email', 'phone', 'address',
                'city', 'state', 'zip', 'country', 'currency', 'fiscal_year_start', 'tax_id',
                'multi_currency', 'inventory_tracking', 'auto_backup', 'timezone', 'default_warehouse_id',
                'default_sales_tax_rate', 'default_purchase_tax_rate', 'base_currency',
            ],
            'defaultValues' => ['multi_currency' => false, 'inventory_tracking' => true, 'auto_backup' => true],
        ],
        'customers' => [
            'tableName' => 'customers',
            'idColumn' => 'id',
            'writableColumns' => [
                'customer_code', 'name', 'email', 'phone', 'contact_person', 'address', 'city', 'state',
                'zip_code', 'country', 'tax_id', 'credit_limit', 'payment_terms', 'is_active', 'notes',
                'website', 'industry', 'customer_type', 'default_currency', 'discount_percentage',
                'receivable_account_id', 'company_id',
            ],
            'defaultValues' => ['is_active' => true, 'customer_type' => 'RETAIL', 'default_currency' => 'LYD'],
        ],
        'suppliers' => [
            'tableName' => 'suppliers',
            'idColumn' => 'id',
            'writableColumns' => [
                'supplier_code', 'name', 'email', 'phone', 'contact_person', 'address', 'city', 'state',
                'zip_code', 'country', 'tax_id', 'credit_limit', 'payment_terms', 'is_active', 'notes',
                'website', 'industry', 'supplier_type', 'default_currency', 'discount_percentage',
                'payable_account_id', 'company_id',
            ],
            'defaultValues' => ['is_active' => true, 'supplier_type' => 'MANUFACTURER', 'default_currency' => 'LYD'],
        ],
        'chart_of_accounts' => [
            'tableName' => 'chart_of_accounts',
            'idColumn' => 'id',
            'writableColumns' => [
                'account_code', 'account_name', 'account_type', 'parent_account_id', 'company_id',
                'is_active', 'normal_balance', 'description', 'is_group',
            ],
            'defaultValues' => ['is_active' => true, 'is_group' => false],
        ],
        'items' => [
            'tableName' => 'items',
            'idColumn' => 'id',
            'writableColumns' => [
                'item_code', 'name', 'description', 'category', 'subcategory', 'unit_of_measure',
                'unit_price', 'cost_price', 'selling_price', 'tax_rate', 'min_stock_level', 'max_stock_level',
                'current_stock', 'reorder_point', 'supplier_id', 'company_id', 'is_active', 'is_taxable',
                'is_inventory_item', 'barcode', 'sku', 'weight', 'dimensions', 'image_url', 'notes',
                'income_account_id', 'expense_account_id',
            ],
            'defaultValues' => ['is_active' => true, 'is_taxable' => false, 'is_inventory_item' => true, 'current_stock' => 0],
        ],
        'item_categories' => [
            'tableName' => 'item_categories',
            'idColumn' => 'id',
            'writableColumns' => ['name', 'description', 'parent_category_id', 'company_id', 'is_active'],
            'defaultValues' => ['is_active' => true],
        ],
        'item_units_of_measure' => [
            'tableName' => 'item_units_of_measure',
            'idColumn' => 'id',
            'writableColumns' => ['code', 'name', 'description', 'company_id', 'is_active'],
            'defaultValues' => ['is_active' => true],
        ],
        'journal_entries' => [
            'tableName' => 'journal_entries',
            'idColumn' => 'id',
            'writableColumns' => [
                'entry_number', 'journal_number', 'entry_date', 'memo', 'description', 'company_id',
                'is_active', 'reference', 'reference_type', 'reference_id', 'reference_number', 'status', 'notes',
            ],
            'defaultValues' => ['is_active' => true, 'status' => 'POSTED'],
        ],
        'journal_entry_lines' => [
            'tableName' => 'journal_entry_lines',
            'idColumn' => 'id',
            'writableColumns' => [
                'journal_entry_id', 'account_id', 'line_number', 'debit_amount', 'credit_amount',
                'description', 'party_type', 'customer_id', 'supplier_id',
            ],
            'defaultValues' => [],
        ],
        'sales_invoices' => [
            'tableName' => 'sales_invoices',
            'idColumn' => 'id',
            'writableColumns' => [
                'invoice_number', 'customer_id', 'company_id', 'invoice_date', 'due_date', 'status',
                'delivery_status', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'currency',
                'payment_terms', 'notes', 'terms_and_conditions', 'is_active',
            ],
            'defaultValues' => ['is_active' => true, 'status' => 'DRAFT', 'currency' => 'LYD'],
        ],
        'sales_invoice_line_items' => [
            'tableName' => 'sales_invoice_line_items',
            'idColumn' => 'id',
            'writableColumns' => [
                'sales_invoice_id', 'item_id', 'item_name', 'description', 'quantity', 'uom',
                'unit_price', 'tax_rate', 'tax_amount', 'discount_rate', 'discount_amount', 'line_total',
            ],
            'defaultValues' => [],
        ],
        'invoice_line_items' => [
            'tableName' => 'invoice_line_items',
            'idColumn' => 'id',
            'writableColumns' => [
                'invoice_id', 'item_id', 'item_name', 'description', 'quantity', 'uom', 'unit_price',
                'tax_rate', 'tax_amount', 'discount_rate', 'discount_amount', 'line_total',
            ],
            'defaultValues' => [],
        ],
        'stock_items' => [
            'tableName' => 'stock_items',
            'idColumn' => 'id',
            'writableColumns' => [
                'item_id', 'company_id', 'warehouse_id', 'current_quantity', 'quantity_on_hand',
                'reserved_quantity', 'available_quantity', 'reorder_level', 'max_level', 'average_cost',
                'last_cost', 'is_active',
            ],
            'defaultValues' => [],
        ],
        'stock_movements' => [
            'tableName' => 'stock_movements',
            'idColumn' => 'id',
            'writableColumns' => [
                'item_id', 'company_id', 'warehouse_id', 'movement_type', 'movement_source', 'quantity',
                'unit_cost', 'total_cost', 'reference_type', 'reference_id', 'reference_number',
                'movement_date', 'description', 'notes', 'is_active',
            ],
            'defaultValues' => [],
        ],
        'purchase_invoices' => [
            'tableName' => 'purchase_invoices',
            'idColumn' => 'id',
            'writableColumns' => [
                'invoice_number', 'supplier_id', 'company_id', 'invoice_date', 'due_date', 'status',
                'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'currency', 'payment_terms',
                'notes', 'terms_and_conditions', 'is_active',
            ],
            'defaultValues' => ['is_active' => true, 'status' => 'SUBMITTED', 'currency' => 'LYD'],
        ],
        'purchase_invoice_line_items' => [
            'tableName' => 'purchase_invoice_line_items',
            'idColumn' => 'id',
            'writableColumns' => [
                'invoice_id', 'item_id', 'item_name', 'description', 'quantity', 'uom', 'unit_price',
                'tax_rate', 'tax_amount', 'discount_rate', 'discount_amount', 'line_total',
            ],
            'defaultValues' => [],
        ],
        'payment_methods' => [
            'tableName' => 'payment_methods',
            'idColumn' => 'id',
            'writableColumns' => ['company_id', 'name', 'account_id', 'description', 'is_active'],
            'defaultValues' => ['is_active' => true],
        ],
        'payment_methods_view' => [
            'tableName' => 'payment_methods_view',
            'idColumn' => 'id',
            'writableColumns' => [],
            'defaultValues' => [],
            'readOnly' => true,
        ],
        'payments' => [
            'tableName' => 'payments',
            'idColumn' => 'id',
            'writableColumns' => [
                'payment_type', 'customer_id', 'supplier_id', 'invoice_id', 'company_id', 'payment_date',
                'payment_method', 'payment_method_id', 'reference_number', 'amount', 'notes', 'status',
                'currency', 'is_active',
            ],
            'defaultValues' => ['is_active' => true, 'status' => 'COMPLETED', 'currency' => 'LYD'],
        ],
        'account_mapping_config' => [
            'tableName' => 'account_mapping_config',
            'idColumn' => 'id',
            'writableColumns' => ['company_id', 'transaction_type', 'mapping_key', 'account_id', 'description', 'is_active'],
            'defaultValues' => ['is_active' => true],
        ],
        'account_mapping_view' => [
            'tableName' => 'account_mapping_view',
            'idColumn' => 'id',
            'writableColumns' => [],
            'defaultValues' => [],
            'readOnly' => true,
        ],
        'customer_receivables' => [
            'tableName' => 'customer_receivables',
            'idColumn' => 'reference_document_id',
            'writableColumns' => [],
            'defaultValues' => [],
            'readOnly' => true,
        ],
        'customer_receivables_aging' => [
            'tableName' => 'customer_receivables_aging',
            'idColumn' => 'customer_id',
            'writableColumns' => [],
            'defaultValues' => [],
            'readOnly' => true,
        ],
        'supplier_payables' => [
            'tableName' => 'supplier_payables',
            'idColumn' => 'reference_document_id',
            'writableColumns' => [],
            'defaultValues' => [],
            'readOnly' => true,
        ],
        'supplier_payables_aging' => [
            'tableName' => 'supplier_payables_aging',
            'idColumn' => 'supplier_id',
            'writableColumns' => [],
            'defaultValues' => [],
            'readOnly' => true,
        ],
        'warehouses' => [
            'tableName' => 'warehouses',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'warehouse_code', 'name', 'description', 'address_line_1', 'address_line_2',
                'city', 'state', 'postal_code', 'country', 'is_default', 'is_active',
            ],
            'defaultValues' => ['is_default' => false, 'is_active' => true],
        ],
        'customer_contacts' => [
            'tableName' => 'customer_contacts',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'customer_id', 'first_name', 'last_name', 'email', 'phone', 'mobile',
                'position_title', 'is_primary', 'notes', 'is_active',
            ],
            'defaultValues' => ['is_primary' => false, 'is_active' => true],
        ],
        'supplier_contacts' => [
            'tableName' => 'supplier_contacts',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'supplier_id', 'first_name', 'last_name', 'email', 'phone', 'mobile',
                'position_title', 'is_primary', 'notes', 'is_active',
            ],
            'defaultValues' => ['is_primary' => false, 'is_active' => true],
        ],
        'customer_addresses' => [
            'tableName' => 'customer_addresses',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'customer_id', 'label', 'address_line_1', 'address_line_2', 'city', 'state',
                'postal_code', 'country', 'is_billing', 'is_shipping', 'is_primary',
            ],
            'defaultValues' => ['is_billing' => false, 'is_shipping' => true, 'is_primary' => false],
        ],
        'supplier_addresses' => [
            'tableName' => 'supplier_addresses',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'supplier_id', 'label', 'address_line_1', 'address_line_2', 'city', 'state',
                'postal_code', 'country', 'is_billing', 'is_shipping', 'is_primary',
            ],
            'defaultValues' => ['is_billing' => true, 'is_shipping' => false, 'is_primary' => false],
        ],
        'sales_orders' => [
            'tableName' => 'sales_orders',
            'idColumn' => 'id',
            'writableColumns' => [
                'order_number', 'customer_id', 'company_id', 'order_date', 'requested_delivery_date',
                'status', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'currency',
                'payment_terms', 'notes',
            ],
            'defaultValues' => ['status' => 'DRAFT', 'currency' => 'LYD'],
        ],
        'sales_order_line_items' => [
            'tableName' => 'sales_order_line_items',
            'idColumn' => 'id',
            'writableColumns' => [
                'sales_order_id', 'item_id', 'item_name', 'description', 'quantity', 'uom', 'unit_price',
                'tax_rate', 'tax_amount', 'discount_amount', 'line_total',
            ],
            'defaultValues' => [],
        ],
        'purchase_orders' => [
            'tableName' => 'purchase_orders',
            'idColumn' => 'id',
            'writableColumns' => [
                'order_number', 'supplier_id', 'company_id', 'order_date', 'expected_receipt_date', 'status',
                'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'currency', 'payment_terms', 'notes',
            ],
            'defaultValues' => ['status' => 'DRAFT', 'currency' => 'LYD'],
        ],
        'purchase_order_line_items' => [
            'tableName' => 'purchase_order_line_items',
            'idColumn' => 'id',
            'writableColumns' => [
                'purchase_order_id', 'item_id', 'item_name', 'description', 'quantity', 'uom', 'unit_price',
                'tax_rate', 'tax_amount', 'discount_amount', 'line_total',
            ],
            'defaultValues' => [],
        ],
        'stock_transfers' => [
            'tableName' => 'stock_transfers',
            'idColumn' => 'id',
            'writableColumns' => [
                'transfer_number', 'company_id', 'source_warehouse_id', 'destination_warehouse_id',
                'transfer_date', 'status', 'notes',
            ],
            'defaultValues' => ['status' => 'DRAFT'],
        ],
        'stock_transfer_line_items' => [
            'tableName' => 'stock_transfer_line_items',
            'idColumn' => 'id',
            'writableColumns' => ['stock_transfer_id', 'item_id', 'quantity', 'uom', 'unit_cost', 'total_cost'],
            'defaultValues' => [],
        ],
        'item_supplier_prices' => [
            'tableName' => 'item_supplier_prices',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'item_id', 'supplier_id', 'supplier_sku', 'minimum_order_quantity',
                'lead_time_days', 'last_purchase_price', 'currency', 'is_preferred', 'is_active',
            ],
            'defaultValues' => ['currency' => 'LYD', 'is_preferred' => false, 'is_active' => true],
        ],
        'inventory_counts' => [
            'tableName' => 'inventory_counts',
            'idColumn' => 'id',
            'writableColumns' => ['company_id', 'warehouse_id', 'count_number', 'count_date', 'status', 'notes'],
            'defaultValues' => ['status' => 'DRAFT'],
        ],
        'inventory_count_lines' => [
            'tableName' => 'inventory_count_lines',
            'idColumn' => 'id',
            'writableColumns' => [
                'inventory_count_id', 'item_id', 'system_quantity', 'counted_quantity', 'variance_quantity',
                'unit_cost', 'notes',
            ],
            'defaultValues' => [],
        ],
        'document_sequences' => [
            'tableName' => 'document_sequences',
            'idColumn' => 'id',
            'writableColumns' => ['company_id', 'document_type', 'prefix', 'next_number', 'padding', 'is_active'],
            'defaultValues' => ['next_number' => 1, 'padding' => 4, 'is_active' => true],
        ],
        'fiscal_periods' => [
            'tableName' => 'fiscal_periods',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'period_code', 'period_name', 'start_date', 'end_date', 'status',
                'closed_at', 'reopened_at', 'notes',
            ],
            'defaultValues' => ['status' => 'OPEN'],
        ],
        'period_close_runs' => [
            'tableName' => 'period_close_runs',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'fiscal_period_id', 'run_type', 'status', 'checklist_snapshot', 'notes', 'created_by',
            ],
            'defaultValues' => ['status' => 'COMPLETED'],
        ],
        'audit_events' => [
            'tableName' => 'audit_events',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'actor_id', 'actor_name', 'action_type', 'resource_type', 'resource_id',
                'resource_label', 'status', 'summary', 'metadata', 'occurred_at',
            ],
            'defaultValues' => ['actor_name' => 'System', 'status' => 'SUCCESS'],
        ],
        'notification_rules' => [
            'tableName' => 'notification_rules',
            'idColumn' => 'id',
            'writableColumns' => ['company_id', 'rule_code', 'title', 'severity', 'is_active', 'settings'],
            'defaultValues' => ['severity' => 'INFO', 'is_active' => true],
        ],
        'notification_events' => [
            'tableName' => 'notification_events',
            'idColumn' => 'id',
            'writableColumns' => [
                'company_id', 'rule_id', 'source_type', 'source_id', 'severity', 'title', 'message', 'status',
                'triggered_at', 'acknowledged_at', 'resolved_at', 'metadata',
            ],
            'defaultValues' => ['severity' => 'INFO', 'status' => 'OPEN'],
        ],
        'audit_event_feed' => [
            'tableName' => 'audit_event_feed',
            'idColumn' => 'id',
            'writableColumns' => [],
            'defaultValues' => [],
            'readOnly' => true,
        ],
        'period_status_summary' => [
            'tableName' => 'period_status_summary',
            'idColumn' => 'fiscal_period_id',
            'writableColumns' => [],
            'defaultValues' => [],
            'readOnly' => true,
        ],
    ],
];
