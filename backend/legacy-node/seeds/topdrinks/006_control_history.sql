INSERT INTO audit_events (
  id, company_id, actor_id, actor_name, action_type, resource_type, resource_id, resource_label,
  status, summary, metadata, occurred_at, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000001501','11111111-1111-1111-1111-000000000001','demo-admin','Amina Saleh','CREATE','company','11111111-1111-1111-1111-000000000001','TopDrinks Distribution','SUCCESS','Created demo workspace for TopDrinks Distribution','{\"source\":\"seed\",\"module\":\"companies\"}','2025-10-01 09:45:00','2025-10-01 09:45:00','2025-10-01 09:45:00'),
('11111111-1111-1111-1111-000000001502','11111111-1111-1111-1111-000000000001','demo-admin','Amina Saleh','CREATE','purchase_invoices','11111111-1111-1111-1111-000000000703','PI-0003','SUCCESS','Recorded March top-up import for RealMix stock','{\"source\":\"seed\",\"module\":\"purchasing\",\"warehouse\":\"Tripoli Main Warehouse\"}','2026-03-12 11:30:00','2026-03-12 11:30:00','2026-03-12 11:30:00'),
('11111111-1111-1111-1111-000000001503','11111111-1111-1111-1111-000000000001','route-west','Nader Khlifa','UPDATE','stock_transfers','11111111-1111-1111-1111-000000001201','TRF-0001','SUCCESS','Completed stock transfer from Tripoli to Benghazi hub','{\"source\":\"seed\",\"module\":\"inventory\",\"destination\":\"Benghazi East Hub\"}','2026-03-18 14:10:00','2026-03-18 14:10:00','2026-03-18 14:10:00'),
('11111111-1111-1111-1111-000000001504','11111111-1111-1111-1111-000000000001','collections-team','Huda Mansour','CREATE','payments','11111111-1111-1111-1111-000000000906','PAY-0006','SUCCESS','Posted partial collection for FreshMart February order','{\"source\":\"seed\",\"module\":\"collections\",\"customer\":\"FreshMart Tripoli\"}','2026-03-22 11:10:00','2026-03-22 11:10:00','2026-03-22 11:10:00'),
('11111111-1111-1111-1111-000000001505','11111111-1111-1111-1111-000000000001','route-south','Mahmoud Sassi','CREATE','sales_invoices','11111111-1111-1111-1111-000000000805','SI-0005','SUCCESS','Submitted CornerStop route delivery invoice','{\"source\":\"seed\",\"module\":\"sales\",\"customer\":\"CornerStop Retail Group\"}','2026-03-26 15:20:00','2026-03-26 15:20:00','2026-03-26 15:20:00'),
('11111111-1111-1111-1111-000000001506','11111111-1111-1111-1111-000000000001','ops-controller','Rania Alharbi','ALERT','notification_rules','11111111-1111-1111-1111-000000000351','LOW_STOCK','SUCCESS','Reviewed low stock exposure on RealMix Zero Sugar','{\"source\":\"seed\",\"module\":\"control_center\",\"item\":\"RMX-ZERO-24\"}','2026-04-01 08:20:00','2026-04-01 08:20:00','2026-04-01 08:20:00'),
('11111111-1111-1111-1111-000000001507','11111111-1111-1111-1111-000000000001','ops-controller','Rania Alharbi','CREATE','sales_invoices','11111111-1111-1111-1111-000000000806','SI-0006','SUCCESS','Created April replenishment invoice for Almadina','{\"source\":\"seed\",\"module\":\"sales\",\"status\":\"SUBMITTED\"}','2026-04-01 10:50:00','2026-04-01 10:50:00','2026-04-01 10:50:00'),
('11111111-1111-1111-1111-000000001508','11111111-1111-1111-1111-000000000001','finance-manager','Amina Saleh','CREATE','journal_entries','11111111-1111-1111-1111-000000001323','JE-0023','SUCCESS','Saved draft April activation accrual for review','{\"source\":\"seed\",\"module\":\"ledger\",\"status\":\"DRAFT\"}','2026-04-02 08:50:00','2026-04-02 08:50:00','2026-04-02 08:50:00')
ON DUPLICATE KEY UPDATE
  actor_id = VALUES(actor_id),
  actor_name = VALUES(actor_name),
  action_type = VALUES(action_type),
  resource_type = VALUES(resource_type),
  resource_id = VALUES(resource_id),
  resource_label = VALUES(resource_label),
  status = VALUES(status),
  summary = VALUES(summary),
  metadata = VALUES(metadata),
  occurred_at = VALUES(occurred_at),
  updated_at = VALUES(updated_at);

INSERT INTO period_close_runs (
  id, company_id, fiscal_period_id, run_type, status, checklist_snapshot, notes, created_by, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000001601','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000331','HARD_CLOSE','COMPLETED','{\"missingMappings\":0,\"negativeStockItems\":0,\"openDocuments\":0,\"trialBalanceDifference\":0}','Completed the 2025 year close after the launch season.','Amina Saleh','2026-01-05 17:35:00','2026-01-05 17:35:00'),
('11111111-1111-1111-1111-000000001602','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000332','SOFT_CLOSE','COMPLETED','{\"missingMappings\":0,\"negativeStockItems\":0,\"openDocuments\":1,\"trialBalanceDifference\":0}','March management soft close completed with one April accrual draft left open.','Rania Alharbi','2026-03-31 18:00:00','2026-03-31 18:00:00')
ON DUPLICATE KEY UPDATE
  fiscal_period_id = VALUES(fiscal_period_id),
  run_type = VALUES(run_type),
  status = VALUES(status),
  checklist_snapshot = VALUES(checklist_snapshot),
  notes = VALUES(notes),
  created_by = VALUES(created_by),
  created_at = VALUES(created_at),
  updated_at = VALUES(updated_at);
