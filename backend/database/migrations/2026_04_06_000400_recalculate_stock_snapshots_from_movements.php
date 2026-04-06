<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            UPDATE stock_items si
            JOIN (
                SELECT
                    company_id,
                    item_id,
                    warehouse_id,
                    SUM(
                        CASE
                            WHEN movement_type IN ('IN', 'TRANSFER_IN', 'ADJUSTMENT_IN') THEN quantity
                            WHEN movement_type IN ('OUT', 'TRANSFER_OUT', 'ADJUSTMENT_OUT') THEN -quantity
                            ELSE 0
                        END
                    ) AS net_quantity
                FROM stock_movements
                WHERE is_active = 1
                GROUP BY company_id, item_id, warehouse_id
            ) movement_totals
              ON movement_totals.company_id = si.company_id
             AND movement_totals.item_id = si.item_id
             AND movement_totals.warehouse_id <=> si.warehouse_id
            SET
                si.current_quantity = movement_totals.net_quantity,
                si.quantity_on_hand = movement_totals.net_quantity,
                si.available_quantity = movement_totals.net_quantity - COALESCE(si.reserved_quantity, 0),
                si.updated_at = CURRENT_TIMESTAMP
            WHERE ABS(COALESCE(si.current_quantity, 0) - COALESCE(movement_totals.net_quantity, 0)) > 0.0009
               OR ABS(COALESCE(si.quantity_on_hand, 0) - COALESCE(movement_totals.net_quantity, 0)) > 0.0009
               OR ABS(COALESCE(si.available_quantity, 0) - (COALESCE(movement_totals.net_quantity, 0) - COALESCE(si.reserved_quantity, 0))) > 0.0009
        ");

        DB::statement("
            UPDATE items i
            JOIN (
                SELECT company_id, item_id, SUM(current_quantity) AS total_quantity
                FROM stock_items
                WHERE is_active = 1
                GROUP BY company_id, item_id
            ) stock_totals
              ON stock_totals.company_id = i.company_id
             AND stock_totals.item_id = i.id
            SET
                i.current_stock = stock_totals.total_quantity,
                i.updated_at = CURRENT_TIMESTAMP
            WHERE ABS(COALESCE(i.current_stock, 0) - COALESCE(stock_totals.total_quantity, 0)) > 0.0009
        ");
    }

    public function down(): void
    {
    }
};