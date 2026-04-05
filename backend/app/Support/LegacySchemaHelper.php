<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class LegacySchemaHelper
{
    public function createTableIfMissing(string $tableName, string $createSql): void
    {
        if (!$this->tableExists($tableName)) {
            DB::unprepared($createSql);
        }
    }

    public function addColumnIfMissing(string $tableName, string $columnName, string $definition): void
    {
        if (!$this->columnExists($tableName, $columnName)) {
            DB::statement("ALTER TABLE `{$tableName}` ADD COLUMN `{$columnName}` {$definition}");
        }
    }

    public function addIndexIfMissing(string $tableName, string $indexName, string $createSql): void
    {
        if (!$this->indexExists($tableName, $indexName)) {
            DB::statement($createSql);
        }
    }

    public function addForeignKeyIfMissing(string $tableName, string $constraintName, string $alterClause): void
    {
        if (!$this->foreignKeyExists($tableName, $constraintName)) {
            DB::statement("ALTER TABLE `{$tableName}` {$alterClause}");
        }
    }

    public function createOrReplaceView(string $viewName, string $selectSql): void
    {
        DB::unprepared("CREATE OR REPLACE VIEW `{$viewName}` AS {$selectSql}");
    }

    public function tableExists(string $tableName): bool
    {
        return (bool) DB::selectOne(
            'SELECT 1 AS present FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
            [$tableName]
        );
    }

    public function columnExists(string $tableName, string $columnName): bool
    {
        return (bool) DB::selectOne(
            'SELECT 1 AS present FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1',
            [$tableName, $columnName]
        );
    }

    public function indexExists(string $tableName, string $indexName): bool
    {
        return (bool) DB::selectOne(
            'SELECT 1 AS present FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1',
            [$tableName, $indexName]
        );
    }

    public function foreignKeyExists(string $tableName, string $constraintName): bool
    {
        return (bool) DB::selectOne(
            'SELECT 1 AS present FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = ? AND constraint_name = ? LIMIT 1',
            [$tableName, $constraintName]
        );
    }
}
