INSERT INTO companies (
  id, name, description, industry, company_size, email, phone, address, city, state, zip, country,
  currency, fiscal_year_start, tax_id, multi_currency, inventory_tracking, auto_backup, timezone,
  default_warehouse_id, default_sales_tax_rate, default_purchase_tax_rate, base_currency, created_at, updated_at
) VALUES (
  '11111111-1111-1111-1111-000000000001',
  'TopDrinks Distribution',
  'Importer and distributor of RealMix energy drinks serving supermarket chains across Libya.',
  'Beverage Distribution',
  'SME',
  'hello@topdrinks.ly',
  '+218-91-550-2200',
  'Port Logistics Road, Block 7',
  'Tripoli',
  'Tripoli',
  '21810',
  'Libya',
  'LYD',
  '01-01',
  'TD-TRIP-7781',
  0,
  1,
  1,
  'Africa/Tripoli',
  '11111111-1111-1111-1111-000000000101',
  0.00,
  0.00,
  'LYD',
  '2025-10-01 08:00:00',
  '2026-04-02 09:00:00'
) ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  industry = VALUES(industry),
  company_size = VALUES(company_size),
  email = VALUES(email),
  phone = VALUES(phone),
  address = VALUES(address),
  city = VALUES(city),
  state = VALUES(state),
  zip = VALUES(zip),
  country = VALUES(country),
  currency = VALUES(currency),
  fiscal_year_start = VALUES(fiscal_year_start),
  tax_id = VALUES(tax_id),
  multi_currency = VALUES(multi_currency),
  inventory_tracking = VALUES(inventory_tracking),
  auto_backup = VALUES(auto_backup),
  timezone = VALUES(timezone),
  default_warehouse_id = VALUES(default_warehouse_id),
  default_sales_tax_rate = VALUES(default_sales_tax_rate),
  default_purchase_tax_rate = VALUES(default_purchase_tax_rate),
  base_currency = VALUES(base_currency),
  updated_at = VALUES(updated_at);

INSERT INTO warehouses (
  id, company_id, warehouse_code, name, description, address_line_1, address_line_2, city, state,
  postal_code, country, is_default, is_active, created_at, updated_at
) VALUES
(
  '11111111-1111-1111-1111-000000000101',
  '11111111-1111-1111-1111-000000000001',
  'MAIN',
  'Tripoli Main Warehouse',
  'Primary import warehouse used for receiving container shipments and holding core stock.',
  'Port Logistics Road, Gate 2',
  'Free Zone Compound',
  'Tripoli',
  'Tripoli',
  '21810',
  'Libya',
  1,
  1,
  '2025-10-01 08:05:00',
  '2026-04-02 09:00:00'
),
(
  '11111111-1111-1111-1111-000000000102',
  '11111111-1111-1111-1111-000000000001',
  'TRIPOLI',
  'Tripoli Route Hub',
  'Route staging point for west-region supermarket deliveries and marketeer replenishment.',
  'Airport Service Road',
  'Near Ring Road Exit 4',
  'Tripoli',
  'Tripoli',
  '21815',
  'Libya',
  0,
  1,
  '2025-10-01 08:10:00',
  '2026-04-02 09:00:00'
),
(
  '11111111-1111-1111-1111-000000000103',
  '11111111-1111-1111-1111-000000000001',
  'BENGHAZI',
  'Benghazi East Hub',
  'Regional warehouse supporting eastern supermarket accounts and promotional displays.',
  'Coastal Highway KM 12',
  'East Distribution Zone',
  'Benghazi',
  'Benghazi',
  '21501',
  'Libya',
  0,
  1,
  '2025-10-01 08:15:00',
  '2026-04-02 09:00:00'
) ON DUPLICATE KEY UPDATE
  warehouse_code = VALUES(warehouse_code),
  name = VALUES(name),
  description = VALUES(description),
  address_line_1 = VALUES(address_line_1),
  address_line_2 = VALUES(address_line_2),
  city = VALUES(city),
  state = VALUES(state),
  postal_code = VALUES(postal_code),
  country = VALUES(country),
  is_default = VALUES(is_default),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

UPDATE companies
SET default_warehouse_id = '11111111-1111-1111-1111-000000000101'
WHERE id = '11111111-1111-1111-1111-000000000001';

INSERT INTO chart_of_accounts (
  id, account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance,
  description, is_group, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000201','1000','Cash','Asset',NULL,'11111111-1111-1111-1111-000000000001',1,'DEBIT','Cash collections from route sales and petty cash usage.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000202','1010','Bank','Asset',NULL,'11111111-1111-1111-1111-000000000001',1,'DEBIT','Main operating bank account.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000203','1100','Accounts Receivable','Asset',NULL,'11111111-1111-1111-1111-000000000001',1,'DEBIT','Amounts due from supermarkets and retail chains.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000204','1200','Inventory','Asset',NULL,'11111111-1111-1111-1111-000000000001',1,'DEBIT','Finished goods inventory for RealMix cases.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000205','1300','Tax Receivable','Asset',NULL,'11111111-1111-1111-1111-000000000001',1,'DEBIT','Recoverable taxes and import credits.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000206','2000','Accounts Payable','Liability',NULL,'11111111-1111-1111-1111-000000000001',1,'CREDIT','Outstanding balances owed to suppliers.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000207','2100','Sales Tax Payable','Liability',NULL,'11111111-1111-1111-1111-000000000001',1,'CREDIT','Sales tax payable account.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000208','3000','Owners Equity','Equity',NULL,'11111111-1111-1111-1111-000000000001',1,'CREDIT','Owner capital used to fund inventory purchases.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000209','4000','Sales Revenue','Revenue',NULL,'11111111-1111-1111-1111-000000000001',1,'CREDIT','Revenue from supermarket sales of RealMix.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000210','5000','Cost of Goods Sold','Expense',NULL,'11111111-1111-1111-1111-000000000001',1,'DEBIT','Inventory cost recognized on supermarket sales.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000211','5100','Operating Expenses','Expense',NULL,'11111111-1111-1111-1111-000000000001',1,'DEBIT','Trade marketing and route support expenses.',0,'2025-10-01 08:20:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  account_name = VALUES(account_name),
  account_type = VALUES(account_type),
  normal_balance = VALUES(normal_balance),
  description = VALUES(description),
  is_active = VALUES(is_active),
  is_group = VALUES(is_group),
  updated_at = VALUES(updated_at);

INSERT INTO payment_methods (
  id, company_id, name, account_id, description, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000321','11111111-1111-1111-1111-000000000001','Cash','11111111-1111-1111-1111-000000000201','Cash collections from marketeers and small store settlements.',1,'2025-10-01 08:35:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000322','11111111-1111-1111-1111-000000000001','Bank Transfer','11111111-1111-1111-1111-000000000202','Bank settlements with key supermarket customers and the importer.',1,'2025-10-01 08:35:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000323','11111111-1111-1111-1111-000000000001','POS Collection','11111111-1111-1111-1111-000000000202','Card-based receipt collection from retail partners.',1,'2025-10-01 08:35:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  account_id = VALUES(account_id),
  description = VALUES(description),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

INSERT INTO document_sequences (
  id, company_id, document_type, prefix, next_number, padding, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000341','11111111-1111-1111-1111-000000000001','SALES_INVOICE','SI-',7,4,1,'2025-10-01 08:40:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000342','11111111-1111-1111-1111-000000000001','PURCHASE_INVOICE','PI-',4,4,1,'2025-10-01 08:40:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000343','11111111-1111-1111-1111-000000000001','JOURNAL_ENTRY','JE-',24,4,1,'2025-10-01 08:40:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000344','11111111-1111-1111-1111-000000000001','PAYMENT','PAY-',7,4,1,'2025-10-01 08:40:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000345','11111111-1111-1111-1111-000000000001','INVENTORY_COUNT','CNT-',1,4,1,'2025-10-01 08:40:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  prefix = VALUES(prefix),
  next_number = VALUES(next_number),
  padding = VALUES(padding),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

INSERT INTO notification_rules (
  id, company_id, rule_code, title, severity, is_active, settings, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000351','11111111-1111-1111-1111-000000000001','LOW_STOCK','Low stock items','WARNING',1,NULL,'2025-10-01 08:45:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000352','11111111-1111-1111-1111-000000000001','OVERDUE_RECEIVABLES','Overdue receivables','CRITICAL',1,NULL,'2025-10-01 08:45:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000353','11111111-1111-1111-1111-000000000001','OVERDUE_PAYABLES','Overdue payables','WARNING',1,NULL,'2025-10-01 08:45:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000354','11111111-1111-1111-1111-000000000001','MISSING_ACCOUNT_MAPPINGS','Missing account mappings','CRITICAL',1,NULL,'2025-10-01 08:45:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000355','11111111-1111-1111-1111-000000000001','NEGATIVE_STOCK','Negative stock','CRITICAL',1,NULL,'2025-10-01 08:45:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000356','11111111-1111-1111-1111-000000000001','UNPOSTED_DOCUMENTS','Unposted documents','WARNING',1,NULL,'2025-10-01 08:45:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  severity = VALUES(severity),
  is_active = VALUES(is_active),
  settings = VALUES(settings),
  updated_at = VALUES(updated_at);

INSERT INTO fiscal_periods (
  id, company_id, period_code, period_name, start_date, end_date, status, closed_at, reopened_at, notes, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000331','11111111-1111-1111-1111-000000000001','2025','Fiscal Year 2025','2025-01-01','2025-12-31','HARD_CLOSED','2026-01-05 17:30:00',NULL,'Closed after the first full import and launch quarter.','2025-10-01 08:50:00','2026-01-05 17:30:00'),
('11111111-1111-1111-1111-000000000332','11111111-1111-1111-1111-000000000001','2026','Fiscal Year 2026','2026-01-01','2026-12-31','OPEN',NULL,NULL,'Active operating year for the current TopDrinks demo.','2026-01-01 08:00:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000333','11111111-1111-1111-1111-000000000001','2027','Fiscal Year 2027','2027-01-01','2027-12-31','OPEN',NULL,NULL,'Future planning period kept ready for the next operating year.','2026-12-01 08:00:00','2026-12-01 08:00:00')
ON DUPLICATE KEY UPDATE
  period_name = VALUES(period_name),
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  status = VALUES(status),
  closed_at = VALUES(closed_at),
  reopened_at = VALUES(reopened_at),
  notes = VALUES(notes),
  updated_at = VALUES(updated_at);
