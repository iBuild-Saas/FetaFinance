<?php

use App\Support\LegacySchemaHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $helpers = new LegacySchemaHelper();

        $helpers->createOrReplaceView('invoice_line_items', "
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
        ");

        $helpers->createOrReplaceView('payment_methods_view', "
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
        ");

        $helpers->createOrReplaceView('account_mapping_view', "
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
        ");

        $helpers->createOrReplaceView('customer_receivables', "
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
                SELECT company_id, invoice_id, SUM(amount) AS amount_paid
                FROM payments
                WHERE payment_type = 'RECEIVE' AND status = 'COMPLETED' AND is_active = 1 AND invoice_id IS NOT NULL
                GROUP BY company_id, invoice_id
            ) payments_summary ON payments_summary.company_id = si.company_id AND payments_summary.invoice_id = si.id
            WHERE si.is_active = 1
              AND si.status <> 'CANCELLED'
              AND GREATEST(si.total_amount - COALESCE(payments_summary.amount_paid, 0), 0) > 0
        ");

        $helpers->createOrReplaceView('customer_receivables_aging', "
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
        ");

        $helpers->createOrReplaceView('supplier_payables', "
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
                SELECT company_id, invoice_id, SUM(amount) AS amount_paid
                FROM payments
                WHERE payment_type = 'PAY' AND status = 'COMPLETED' AND is_active = 1 AND invoice_id IS NOT NULL
                GROUP BY company_id, invoice_id
            ) payments_summary ON payments_summary.company_id = pi.company_id AND payments_summary.invoice_id = pi.id
            WHERE pi.is_active = 1
              AND pi.status <> 'CANCELLED'
              AND GREATEST(pi.total_amount - COALESCE(payments_summary.amount_paid, 0), 0) > 0
        ");

        $helpers->createOrReplaceView('supplier_payables_aging', "
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
        ");

        $companies = DB::table('companies')->select('id')->get();
        foreach ($companies as $company) {
            foreach ([['PCS', 'Pieces', 'Individual units'], ['KG', 'Kilograms', 'Weight in kilograms'], ['L', 'Liters', 'Volume in liters'], ['BOX', 'Boxes', 'Boxed units'], ['SET', 'Sets', 'Grouped unit sets'], ['M', 'Meters', 'Length in meters']] as [$code, $name, $description]) {
                DB::insert("
                    INSERT INTO item_units_of_measure (id, code, name, description, company_id)
                    SELECT uuid(), ?, ?, ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM item_units_of_measure WHERE company_id = ? AND code = ?
                    )
                ", [$code, $name, $description, $company->id, $company->id, $code]);
            }

            foreach ([['Raw Materials', 'Basic materials used in procurement and manufacturing'], ['Finished Goods', 'Products ready for sale'], ['Services', 'Non-stock service items'], ['Supplies', 'Operational and office supplies'], ['Equipment', 'Machinery and long-lived assets']] as [$name, $description]) {
                DB::insert("
                    INSERT INTO item_categories (id, name, description, company_id)
                    SELECT uuid(), ?, ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM item_categories WHERE company_id = ? AND name = ?
                    )
                ", [$name, $description, $company->id, $company->id, $name]);
            }

            foreach ([['Cash', 'Cash payments'], ['Bank Transfer', 'Bank transfer settlements'], ['Credit Card', 'Card collections and settlements']] as [$name, $description]) {
                DB::insert("
                    INSERT INTO payment_methods (id, company_id, name, description)
                    SELECT uuid(), ?, ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM payment_methods WHERE company_id = ? AND name = ?
                    )
                ", [$company->id, $name, $description, $company->id, $name]);
            }
        }

        DB::statement("
            INSERT INTO stock_items (
                id, item_id, company_id, current_quantity, quantity_on_hand, available_quantity, reorder_level, max_level, average_cost, last_cost
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
        ");
    }

    public function down(): void
    {
    }
};
