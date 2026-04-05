INSERT INTO item_categories (
  id, name, description, parent_category_id, company_id, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000301','Energy Drinks','Imported finished goods for supermarket and retail distribution.',NULL,'11111111-1111-1111-1111-000000000001',1,'2025-10-01 08:30:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000302','Trade Marketing','Display and route support assets for promotions.',NULL,'11111111-1111-1111-1111-000000000001',1,'2025-10-01 08:30:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000303','Services','Non-stock services used in commercial operations.',NULL,'11111111-1111-1111-1111-000000000001',1,'2025-10-01 08:30:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

INSERT INTO item_units_of_measure (
  id, code, name, description, company_id, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000311','CASE','Cases','Outer cases used for supermarket distribution.','11111111-1111-1111-1111-000000000001',1,'2025-10-01 08:32:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000312','CAN','Cans','Single retail cans.','11111111-1111-1111-1111-000000000001',1,'2025-10-01 08:32:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000313','PALLET','Pallets','Palletized import quantity.','11111111-1111-1111-1111-000000000001',1,'2025-10-01 08:32:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000314','DISPLAY','Displays','Promotional display units.','11111111-1111-1111-1111-000000000001',1,'2025-10-01 08:32:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

INSERT INTO suppliers (
  id, supplier_code, name, email, phone, contact_person, address, city, state, zip_code, country, tax_id,
  credit_limit, payment_terms, is_active, notes, website, industry, supplier_type, default_currency,
  discount_percentage, payable_account_id, company_id, created_at, updated_at
) VALUES (
  '11111111-1111-1111-1111-000000000401',
  'SUPP-REALMIX',
  'RealMix Beverages FZE',
  'exports@realmixbev.com',
  '+971-4-555-8080',
  'Mina Darwish',
  'Jebel Ali Free Zone, South 3',
  'Dubai',
  'Dubai',
  '00000',
  'UAE',
  'RMX-FZE-448',
  250000.00,
  '30 days from invoice date',
  1,
  'Primary import supplier for all RealMix energy drink cases.',
  'https://www.realmixbev.com',
  'Beverage Manufacturing',
  'MANUFACTURER',
  'LYD',
  0.00,
  '11111111-1111-1111-1111-000000000206',
  '11111111-1111-1111-1111-000000000001',
  '2025-10-01 09:00:00',
  '2026-04-02 09:00:00'
) ON DUPLICATE KEY UPDATE
  supplier_code = VALUES(supplier_code),
  name = VALUES(name),
  email = VALUES(email),
  phone = VALUES(phone),
  contact_person = VALUES(contact_person),
  address = VALUES(address),
  city = VALUES(city),
  state = VALUES(state),
  zip_code = VALUES(zip_code),
  country = VALUES(country),
  tax_id = VALUES(tax_id),
  credit_limit = VALUES(credit_limit),
  payment_terms = VALUES(payment_terms),
  is_active = VALUES(is_active),
  notes = VALUES(notes),
  website = VALUES(website),
  industry = VALUES(industry),
  supplier_type = VALUES(supplier_type),
  default_currency = VALUES(default_currency),
  discount_percentage = VALUES(discount_percentage),
  payable_account_id = VALUES(payable_account_id),
  updated_at = VALUES(updated_at);

INSERT INTO supplier_contacts (
  id, company_id, supplier_id, first_name, last_name, email, phone, mobile, position_title, is_primary, notes, is_active, created_at, updated_at
) VALUES (
  '11111111-1111-1111-1111-000000000411',
  '11111111-1111-1111-1111-000000000001',
  '11111111-1111-1111-1111-000000000401',
  'Mina',
  'Darwish',
  'mina.darwish@realmixbev.com',
  '+971-4-555-8080',
  '+971-50-808-4401',
  'Export Manager',
  1,
  'Coordinates shipment timing and export documentation.',
  1,
  '2025-10-01 09:05:00',
  '2026-04-02 09:00:00'
) ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  email = VALUES(email),
  phone = VALUES(phone),
  mobile = VALUES(mobile),
  position_title = VALUES(position_title),
  is_primary = VALUES(is_primary),
  notes = VALUES(notes),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

INSERT INTO supplier_addresses (
  id, company_id, supplier_id, label, address_line_1, address_line_2, city, state, postal_code, country,
  is_billing, is_shipping, is_primary, created_at, updated_at
) VALUES (
  '11111111-1111-1111-1111-000000000412',
  '11111111-1111-1111-1111-000000000001',
  '11111111-1111-1111-1111-000000000401',
  'Export Office',
  'Jebel Ali Free Zone, South 3',
  'Warehouse 14',
  'Dubai',
  'Dubai',
  '00000',
  'UAE',
  1,
  1,
  1,
  '2025-10-01 09:05:00',
  '2026-04-02 09:00:00'
) ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  address_line_1 = VALUES(address_line_1),
  address_line_2 = VALUES(address_line_2),
  city = VALUES(city),
  state = VALUES(state),
  postal_code = VALUES(postal_code),
  country = VALUES(country),
  is_billing = VALUES(is_billing),
  is_shipping = VALUES(is_shipping),
  is_primary = VALUES(is_primary),
  updated_at = VALUES(updated_at);

INSERT INTO customers (
  id, customer_code, name, email, phone, contact_person, address, city, state, zip_code, country, tax_id,
  credit_limit, payment_terms, is_active, notes, website, industry, customer_type, default_currency,
  discount_percentage, receivable_account_id, company_id, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000501','CUST-FMART','FreshMart Tripoli','ap@freshmart.ly','+218-21-555-1101','Rania Alharbi','Sharia Omar Al Mukhtar','Tripoli','Tripoli','21821','Libya','FM-1190',45000.00,'30 days',1,'West route key account supplied through weekly marketeer visits and shelf checks.','https://www.freshmart.ly','Supermarket','WHOLESALE','LYD',0.00,'11111111-1111-1111-1111-000000000203','11111111-1111-1111-1111-000000000001','2025-10-01 09:10:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000502','CUST-ALMAD','Almadina Hypermarket','purchasing@almadina.ly','+218-21-555-2202','Yousef Ben Ali','Airport Road Commercial Strip','Tripoli','Tripoli','21818','Libya','AM-2230',65000.00,'30 days',1,'Major promotion partner with seasonal display campaigns for RealMix.','https://www.almadina.ly','Hypermarket','WHOLESALE','LYD',0.00,'11111111-1111-1111-1111-000000000203','11111111-1111-1111-1111-000000000001','2025-10-01 09:12:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000503','CUST-BSS','Benghazi Super Stores','finance@bss.ly','+218-61-555-3303','Sara Almasri','Jamal Abdul Nasser Street','Benghazi','Benghazi','21510','Libya','BSS-3391',40000.00,'30 days',1,'Eastern region chain served from the Benghazi hub with monthly volume planning.','https://www.bss.ly','Supermarket','WHOLESALE','LYD',0.00,'11111111-1111-1111-1111-000000000203','11111111-1111-1111-1111-000000000001','2025-10-01 09:14:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000504','CUST-CSTOP','CornerStop Retail Group','accounts@cornerstop.ly','+218-91-555-4404','Mahmoud Sassi','University District Retail Park','Misrata','Misrata','21555','Libya','CS-4408',25000.00,'30 days',1,'Smaller regional retail group supplied through a van-sales and shelf refill model.','https://www.cornerstop.ly','Retail','WHOLESALE','LYD',0.00,'11111111-1111-1111-1111-000000000203','11111111-1111-1111-1111-000000000001','2025-10-01 09:16:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  customer_code = VALUES(customer_code),
  name = VALUES(name),
  email = VALUES(email),
  phone = VALUES(phone),
  contact_person = VALUES(contact_person),
  address = VALUES(address),
  city = VALUES(city),
  state = VALUES(state),
  zip_code = VALUES(zip_code),
  country = VALUES(country),
  tax_id = VALUES(tax_id),
  credit_limit = VALUES(credit_limit),
  payment_terms = VALUES(payment_terms),
  is_active = VALUES(is_active),
  notes = VALUES(notes),
  website = VALUES(website),
  industry = VALUES(industry),
  customer_type = VALUES(customer_type),
  default_currency = VALUES(default_currency),
  discount_percentage = VALUES(discount_percentage),
  receivable_account_id = VALUES(receivable_account_id),
  updated_at = VALUES(updated_at);

INSERT INTO customer_contacts (
  id, company_id, customer_id, first_name, last_name, email, phone, mobile, position_title, is_primary, notes, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000511','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000501','Rania','Alharbi','rania.alharbi@freshmart.ly','+218-21-555-1101','+218-91-300-5101','Branch Buyer',1,'Approves weekly replenishment and display requests.',1,'2025-10-01 09:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000512','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000502','Yousef','Ben Ali','yousef.benali@almadina.ly','+218-21-555-2202','+218-91-300-5202','Category Manager',1,'Coordinates central buying and monthly promo plans.',1,'2025-10-01 09:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000513','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000503','Sara','Almasri','sara.almasri@bss.ly','+218-61-555-3303','+218-92-300-5303','Supply Coordinator',1,'Schedules eastern region drop-offs from the Benghazi hub.',1,'2025-10-01 09:20:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000514','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000504','Mahmoud','Sassi','mahmoud.sassi@cornerstop.ly','+218-91-555-4404','+218-93-300-5404','Retail Operations Lead',1,'Receives route-based replenishment and fast-moving shelf reports.',1,'2025-10-01 09:20:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  email = VALUES(email),
  phone = VALUES(phone),
  mobile = VALUES(mobile),
  position_title = VALUES(position_title),
  is_primary = VALUES(is_primary),
  notes = VALUES(notes),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

INSERT INTO customer_addresses (
  id, company_id, customer_id, label, address_line_1, address_line_2, city, state, postal_code, country,
  is_billing, is_shipping, is_primary, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000521','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000501','FreshMart HQ','Sharia Omar Al Mukhtar','Store 14','Tripoli','Tripoli','21821','Libya',1,1,1,'2025-10-01 09:25:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000522','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000502','Almadina Main Store','Airport Road Commercial Strip','Buying Department','Tripoli','Tripoli','21818','Libya',1,1,1,'2025-10-01 09:25:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000523','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000503','Benghazi Main Branch','Jamal Abdul Nasser Street','Receiving Dock','Benghazi','Benghazi','21510','Libya',1,1,1,'2025-10-01 09:25:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000524','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000504','CornerStop Regional Office','University District Retail Park','Accounts Desk','Misrata','Misrata','21555','Libya',1,1,1,'2025-10-01 09:25:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  address_line_1 = VALUES(address_line_1),
  address_line_2 = VALUES(address_line_2),
  city = VALUES(city),
  state = VALUES(state),
  postal_code = VALUES(postal_code),
  country = VALUES(country),
  is_billing = VALUES(is_billing),
  is_shipping = VALUES(is_shipping),
  is_primary = VALUES(is_primary),
  updated_at = VALUES(updated_at);

INSERT INTO items (
  id, item_code, name, description, category, subcategory, unit_of_measure, unit_price, cost_price, selling_price,
  tax_rate, min_stock_level, max_stock_level, current_stock, reorder_point, supplier_id, company_id, is_active,
  is_taxable, is_inventory_item, barcode, sku, weight, dimensions, image_url, notes, income_account_id, expense_account_id,
  created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000601','RMX-CLASSIC-24','RealMix Classic 250ml Case','24-can distribution case for supermarkets and convenience retailers.','Energy Drinks','Classic','CASE',37.00,26.33,37.00,0.00,500.000,4000.000,1930.000,500.000,'11111111-1111-1111-1111-000000000401','11111111-1111-1111-1111-000000000001',1,0,1,'6280010006014','RMX-C24',9.600,'40x27x15 cm',NULL,'Fastest-moving SKU across supermarket chains.','11111111-1111-1111-1111-000000000209','11111111-1111-1111-1111-000000000210','2025-10-01 09:30:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000602','RMX-ZERO-24','RealMix Zero Sugar 250ml Case','24-can zero sugar case for modern trade and fitness-oriented retail shelves.','Energy Drinks','Zero Sugar','CASE',40.00,28.15,40.00,0.00,1200.000,2500.000,1060.000,1200.000,'11111111-1111-1111-1111-000000000401','11111111-1111-1111-1111-000000000001',1,0,1,'6280010006021','RMX-Z24',9.600,'40x27x15 cm',NULL,'Purposefully set near reorder level so the dashboard shows a realistic low-stock warning.','11111111-1111-1111-1111-000000000209','11111111-1111-1111-1111-000000000210','2025-10-01 09:30:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000603','RMX-BERRY-24','RealMix Berry Blast 250ml Case','24-can berry flavor case used in promotional displays and mixed supermarket orders.','Energy Drinks','Berry Blast','CASE',39.00,27.68,39.00,0.00,450.000,2200.000,900.000,450.000,'11111111-1111-1111-1111-000000000401','11111111-1111-1111-1111-000000000001',1,0,1,'6280010006038','RMX-B24',9.600,'40x27x15 cm',NULL,'Promo-friendly flavor used to support mixed-case sales campaigns.','11111111-1111-1111-1111-000000000209','11111111-1111-1111-1111-000000000210','2025-10-01 09:30:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  item_code = VALUES(item_code),
  name = VALUES(name),
  description = VALUES(description),
  category = VALUES(category),
  subcategory = VALUES(subcategory),
  unit_of_measure = VALUES(unit_of_measure),
  unit_price = VALUES(unit_price),
  cost_price = VALUES(cost_price),
  selling_price = VALUES(selling_price),
  tax_rate = VALUES(tax_rate),
  min_stock_level = VALUES(min_stock_level),
  max_stock_level = VALUES(max_stock_level),
  current_stock = VALUES(current_stock),
  reorder_point = VALUES(reorder_point),
  supplier_id = VALUES(supplier_id),
  is_active = VALUES(is_active),
  is_taxable = VALUES(is_taxable),
  is_inventory_item = VALUES(is_inventory_item),
  barcode = VALUES(barcode),
  sku = VALUES(sku),
  weight = VALUES(weight),
  dimensions = VALUES(dimensions),
  image_url = VALUES(image_url),
  notes = VALUES(notes),
  income_account_id = VALUES(income_account_id),
  expense_account_id = VALUES(expense_account_id),
  updated_at = VALUES(updated_at);

INSERT INTO item_supplier_prices (
  id, company_id, item_id, supplier_id, supplier_sku, minimum_order_quantity, lead_time_days,
  last_purchase_price, currency, is_preferred, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000611','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000601','11111111-1111-1111-1111-000000000401','RMX-C24-FZE',300.000,21,27.00,'LYD',1,1,'2025-10-01 09:35:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000612','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000602','11111111-1111-1111-1111-000000000401','RMX-Z24-FZE',200.000,21,28.50,'LYD',1,1,'2025-10-01 09:35:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000613','11111111-1111-1111-1111-000000000001','11111111-1111-1111-1111-000000000603','11111111-1111-1111-1111-000000000401','RMX-B24-FZE',150.000,21,28.00,'LYD',1,1,'2025-10-01 09:35:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  supplier_sku = VALUES(supplier_sku),
  minimum_order_quantity = VALUES(minimum_order_quantity),
  lead_time_days = VALUES(lead_time_days),
  last_purchase_price = VALUES(last_purchase_price),
  currency = VALUES(currency),
  is_preferred = VALUES(is_preferred),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

INSERT INTO account_mapping_config (
  id, company_id, transaction_type, mapping_key, account_id, description, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000621','11111111-1111-1111-1111-000000000001','SALES_INVOICE','receivable_account','11111111-1111-1111-1111-000000000203','Default receivable account for supermarket sales.',1,'2025-10-01 09:40:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000622','11111111-1111-1111-1111-000000000001','SALES_INVOICE','default_sales_account','11111111-1111-1111-1111-000000000209','Default sales revenue account.',1,'2025-10-01 09:40:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000623','11111111-1111-1111-1111-000000000001','SALES_INVOICE','tax_payable_account','11111111-1111-1111-1111-000000000207','Default sales tax payable account.',1,'2025-10-01 09:40:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000624','11111111-1111-1111-1111-000000000001','PURCHASE_INVOICE','payable_account','11111111-1111-1111-1111-000000000206','Default payable account for supplier invoices.',1,'2025-10-01 09:40:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000625','11111111-1111-1111-1111-000000000001','PURCHASE_INVOICE','default_inventory_account','11111111-1111-1111-1111-000000000204','Default inventory account for imported stock.',1,'2025-10-01 09:40:00','2026-04-02 09:00:00'),
('11111111-1111-1111-1111-000000000626','11111111-1111-1111-1111-000000000001','PURCHASE_INVOICE','tax_receivable_account','11111111-1111-1111-1111-000000000205','Default purchase tax receivable account.',1,'2025-10-01 09:40:00','2026-04-02 09:00:00')
ON DUPLICATE KEY UPDATE
  account_id = VALUES(account_id),
  description = VALUES(description),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);
