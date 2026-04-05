<?php

use App\Support\LegacySchemaHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $helpers = new LegacySchemaHelper();

        $helpers->createTableIfMissing('document_sequences', "
            CREATE TABLE document_sequences (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                document_type VARCHAR(50) NOT NULL,
                prefix VARCHAR(20) NOT NULL,
                next_number INT NOT NULL DEFAULT 1,
                padding INT NOT NULL DEFAULT 4,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_document_sequences_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('document_sequences', 'uq_document_sequences_company_type', 'CREATE UNIQUE INDEX uq_document_sequences_company_type ON document_sequences (company_id, document_type)');

        $helpers->createTableIfMissing('fiscal_periods', "
            CREATE TABLE fiscal_periods (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                period_code VARCHAR(20) NOT NULL,
                period_name VARCHAR(120) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status ENUM('OPEN','SOFT_CLOSED','HARD_CLOSED') NOT NULL DEFAULT 'OPEN',
                closed_at TIMESTAMP NULL,
                reopened_at TIMESTAMP NULL,
                notes TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_fiscal_periods_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('fiscal_periods', 'uq_fiscal_periods_company_code', 'CREATE UNIQUE INDEX uq_fiscal_periods_company_code ON fiscal_periods (company_id, period_code)');

        $helpers->createTableIfMissing('period_close_runs', "
            CREATE TABLE period_close_runs (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                fiscal_period_id CHAR(36) NOT NULL,
                run_type ENUM('SOFT_CLOSE','HARD_CLOSE','REOPEN') NOT NULL,
                status ENUM('COMPLETED','BLOCKED','CANCELLED') NOT NULL DEFAULT 'COMPLETED',
                checklist_snapshot JSON NULL,
                notes TEXT NULL,
                created_by VARCHAR(255) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_period_close_runs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_period_close_runs_period FOREIGN KEY (fiscal_period_id) REFERENCES fiscal_periods(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('period_close_runs', 'idx_period_close_runs_company_period', 'CREATE INDEX idx_period_close_runs_company_period ON period_close_runs (company_id, fiscal_period_id, created_at)');

        $helpers->createTableIfMissing('audit_events', "
            CREATE TABLE audit_events (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NULL,
                actor_id VARCHAR(255) NULL,
                actor_name VARCHAR(255) NULL,
                action_type VARCHAR(50) NOT NULL,
                resource_type VARCHAR(50) NOT NULL,
                resource_id CHAR(36) NULL,
                resource_label VARCHAR(255) NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
                summary VARCHAR(255) NOT NULL,
                metadata JSON NULL,
                occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_audit_events_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('audit_events', 'idx_audit_events_company_time', 'CREATE INDEX idx_audit_events_company_time ON audit_events (company_id, occurred_at)');

        $helpers->createTableIfMissing('notification_rules', "
            CREATE TABLE notification_rules (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                rule_code VARCHAR(50) NOT NULL,
                title VARCHAR(120) NOT NULL,
                severity ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                settings JSON NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_notification_rules_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('notification_rules', 'uq_notification_rules_company_code', 'CREATE UNIQUE INDEX uq_notification_rules_company_code ON notification_rules (company_id, rule_code)');

        $helpers->createTableIfMissing('notification_events', "
            CREATE TABLE notification_events (
                id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (uuid()),
                company_id CHAR(36) NOT NULL,
                rule_id CHAR(36) NULL,
                source_type VARCHAR(50) NOT NULL,
                source_id CHAR(36) NULL,
                severity ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
                title VARCHAR(120) NOT NULL,
                message TEXT NOT NULL,
                status ENUM('OPEN','ACKNOWLEDGED','RESOLVED') NOT NULL DEFAULT 'OPEN',
                triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                acknowledged_at TIMESTAMP NULL,
                resolved_at TIMESTAMP NULL,
                metadata JSON NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_notification_events_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_notification_events_rule FOREIGN KEY (rule_id) REFERENCES notification_rules(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");
        $helpers->addIndexIfMissing('notification_events', 'idx_notification_events_company_status', 'CREATE INDEX idx_notification_events_company_status ON notification_events (company_id, status, triggered_at)');

        $helpers->createOrReplaceView('audit_event_feed', "
            SELECT
                ae.id,
                ae.company_id,
                ae.actor_id,
                ae.actor_name,
                ae.action_type,
                ae.resource_type,
                ae.resource_id,
                ae.resource_label,
                ae.status,
                ae.summary,
                ae.metadata,
                ae.occurred_at
            FROM audit_events ae
            ORDER BY ae.occurred_at DESC
        ");

        $helpers->createOrReplaceView('period_status_summary', "
            SELECT
                fp.company_id,
                fp.id AS fiscal_period_id,
                fp.period_code,
                fp.period_name,
                fp.start_date,
                fp.end_date,
                fp.status,
                fp.closed_at,
                fp.reopened_at
            FROM fiscal_periods fp
            WHERE CURRENT_DATE BETWEEN fp.start_date AND fp.end_date
               OR (
                 YEAR(CURRENT_DATE) = YEAR(fp.start_date)
                 AND YEAR(CURRENT_DATE) = YEAR(fp.end_date)
               )
        ");

        $companies = DB::table('companies')->select('id')->get();
        foreach ($companies as $company) {
            foreach ([['SALES_INVOICE', 'SI-'], ['PURCHASE_INVOICE', 'PI-'], ['JOURNAL_ENTRY', 'JE-'], ['PAYMENT', 'PAY-'], ['INVENTORY_COUNT', 'CNT-']] as [$documentType, $prefix]) {
                DB::insert("
                    INSERT INTO document_sequences (id, company_id, document_type, prefix, next_number, padding, is_active)
                    SELECT uuid(), ?, ?, ?, 1, 4, 1
                    WHERE NOT EXISTS (
                      SELECT 1 FROM document_sequences WHERE company_id = ? AND document_type = ?
                    )
                ", [$company->id, $documentType, $prefix, $company->id, $documentType]);
            }

            foreach ([['LOW_STOCK', 'Low stock items', 'WARNING'], ['OVERDUE_RECEIVABLES', 'Overdue receivables', 'CRITICAL'], ['OVERDUE_PAYABLES', 'Overdue payables', 'WARNING'], ['MISSING_ACCOUNT_MAPPINGS', 'Missing account mappings', 'CRITICAL'], ['NEGATIVE_STOCK', 'Negative stock', 'CRITICAL'], ['UNPOSTED_DOCUMENTS', 'Unposted documents', 'WARNING'], ['CLOSED_PERIOD_ATTEMPT', 'Closed period posting attempts', 'CRITICAL']] as [$ruleCode, $title, $severity]) {
                DB::insert("
                    INSERT INTO notification_rules (id, company_id, rule_code, title, severity, is_active)
                    SELECT uuid(), ?, ?, ?, ?, 1
                    WHERE NOT EXISTS (
                      SELECT 1 FROM notification_rules WHERE company_id = ? AND rule_code = ?
                    )
                ", [$company->id, $ruleCode, $title, $severity, $company->id, $ruleCode]);
            }

            foreach ([(int) now()->utc()->format('Y'), (int) now()->utc()->format('Y') + 1] as $year) {
                $periodCode = (string) $year;
                DB::insert("
                    INSERT INTO fiscal_periods (
                        id, company_id, period_code, period_name, start_date, end_date, status
                    )
                    SELECT uuid(), ?, ?, ?, ?, ?, 'OPEN'
                    WHERE NOT EXISTS (
                      SELECT 1 FROM fiscal_periods WHERE company_id = ? AND period_code = ?
                    )
                ", [$company->id, $periodCode, "Fiscal Year {$year}", "{$year}-01-01", "{$year}-12-31", $company->id, $periodCode]);
            }
        }
    }

    public function down(): void
    {
    }
};
