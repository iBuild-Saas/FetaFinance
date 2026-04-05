INSERT INTO purchase_invoices (
  id, invoice_number, supplier_id, company_id, invoice_date, due_date, status, subtotal, tax_amount,
  discount_amount, total_amount, currency, payment_terms, notes, terms_and_conditions, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000701','PI-0001','11111111-1111-1111-1111-000000000401','11111111-1111-1111-1111-000000000001','2025-10-10','2025-11-10','PAID',91250.00,0.00,0.00,91250.00,'LYD','30 days','First launch import order for the RealMix rollout.','Import invoice linked to container shipment RMX-LAUNCH-01.',1,'2025-10-10 09:00:00','2025-11-08 15:30:00'),
('11111111-1111-1111-1111-000000000702','PI-0002','11111111-1111-1111-1111-000000000401','11111111-1111-1111-1111-000000000001','2026-01-10','2026-02-10','OVERDUE',59800.00,0.00,0.00,59800.00,'LYD','30 days','January replenishment order after holiday demand.','Second import batch for west and east region stock cover.',1,'2026-01-10 10:00:00','2026-03-01 12:00:00'),
('11111111-1111-1111-1111-000000000703','PI-0003','11111111-1111-1111-1111-000000000401','11111111-1111-1111-1111-000000000001','2026-03-12','2026-04-11','RECEIVED',30350.00,0.00,0.00,30350.00,'LYD','30 days','March top-up shipment for spring promotional activity.','Received into main warehouse and staged for Tripoli and Benghazi routes.',1,'2026-03-12 11:00:00','2026-03-14 14:00:00')
ON DUPLICATE KEY UPDATE
  invoice_number = VALUES(invoice_number),
  supplier_id = VALUES(supplier_id),
  invoice_date = VALUES(invoice_date),
  due_date = VALUES(due_date),
  status = VALUES(status),
  subtotal = VALUES(subtotal),
  tax_amount = VALUES(tax_amount),
  discount_amount = VALUES(discount_amount),
  total_amount = VALUES(total_amount),
  currency = VALUES(currency),
  payment_terms = VALUES(payment_terms),
  notes = VALUES(notes),
  terms_and_conditions = VALUES(terms_and_conditions),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

INSERT INTO purchase_invoice_line_items (
  id, invoice_id, item_id, item_name, description, quantity, uom, unit_price, tax_rate, tax_amount,
  discount_rate, discount_amount, line_total, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000711','11111111-1111-1111-1111-000000000701','11111111-1111-1111-1111-000000000601','RealMix Classic 250ml Case','Launch import quantity for the classic SKU.',1800.000,'CASE',26.00,0.00,0.00,0.00,0.00,46800.00,'2025-10-10 09:05:00','2025-10-10 09:05:00'),
('11111111-1111-1111-1111-000000000712','11111111-1111-1111-1111-000000000701','11111111-1111-1111-1111-000000000602','RealMix Zero Sugar 250ml Case','Launch import quantity for the zero sugar SKU.',900.000,'CASE',28.00,0.00,0.00,0.00,0.00,25200.00,'2025-10-10 09:05:00','2025-10-10 09:05:00'),
('11111111-1111-1111-1111-000000000713','11111111-1111-1111-1111-000000000701','11111111-1111-1111-1111-000000000603','RealMix Berry Blast 250ml Case','Launch import quantity for the berry SKU.',700.000,'CASE',27.50,0.00,0.00,0.00,0.00,19250.00,'2025-10-10 09:05:00','2025-10-10 09:05:00'),
('11111111-1111-1111-1111-000000000714','11111111-1111-1111-1111-000000000702','11111111-1111-1111-1111-000000000601','RealMix Classic 250ml Case','January replenishment for west-region supermarket demand.',1200.000,'CASE',26.50,0.00,0.00,0.00,0.00,31800.00,'2026-01-10 10:05:00','2026-01-10 10:05:00'),
('11111111-1111-1111-1111-000000000715','11111111-1111-1111-1111-000000000702','11111111-1111-1111-1111-000000000602','RealMix Zero Sugar 250ml Case','January replenishment for gym-adjacent stores and premium shelves.',500.000,'CASE',28.20,0.00,0.00,0.00,0.00,14100.00,'2026-01-10 10:05:00','2026-01-10 10:05:00'),
('11111111-1111-1111-1111-000000000716','11111111-1111-1111-1111-000000000702','11111111-1111-1111-1111-000000000603','RealMix Berry Blast 250ml Case','January replenishment tied to mixed flavor promotions.',500.000,'CASE',27.80,0.00,0.00,0.00,0.00,13900.00,'2026-01-10 10:05:00','2026-01-10 10:05:00'),
('11111111-1111-1111-1111-000000000717','11111111-1111-1111-1111-000000000703','11111111-1111-1111-1111-000000000601','RealMix Classic 250ml Case','March top-up for main and Tripoli route hub stock.',600.000,'CASE',27.00,0.00,0.00,0.00,0.00,16200.00,'2026-03-12 11:05:00','2026-03-12 11:05:00'),
('11111111-1111-1111-1111-000000000718','11111111-1111-1111-1111-000000000703','11111111-1111-1111-1111-000000000602','RealMix Zero Sugar 250ml Case','March top-up to protect against east-region low stock.',300.000,'CASE',28.50,0.00,0.00,0.00,0.00,8550.00,'2026-03-12 11:05:00','2026-03-12 11:05:00'),
('11111111-1111-1111-1111-000000000719','11111111-1111-1111-1111-000000000703','11111111-1111-1111-1111-000000000603','RealMix Berry Blast 250ml Case','March top-up for mixed flavor promotional bundles.',200.000,'CASE',28.00,0.00,0.00,0.00,0.00,5600.00,'2026-03-12 11:05:00','2026-03-12 11:05:00')
ON DUPLICATE KEY UPDATE
  item_id = VALUES(item_id),
  item_name = VALUES(item_name),
  description = VALUES(description),
  quantity = VALUES(quantity),
  uom = VALUES(uom),
  unit_price = VALUES(unit_price),
  tax_rate = VALUES(tax_rate),
  tax_amount = VALUES(tax_amount),
  discount_rate = VALUES(discount_rate),
  discount_amount = VALUES(discount_amount),
  line_total = VALUES(line_total),
  updated_at = VALUES(updated_at);

INSERT INTO sales_invoices (
  id, invoice_number, customer_id, company_id, invoice_date, due_date, status, delivery_status, subtotal, tax_amount,
  discount_amount, total_amount, currency, payment_terms, notes, terms_and_conditions, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000801','SI-0001','11111111-1111-1111-1111-000000000501','11111111-1111-1111-1111-000000000001','2025-11-14','2025-12-14','PAID','DELIVERED',19390.00,0.00,0.00,19390.00,'LYD','30 days','FreshMart initial launch order with strong opening sell-through.','Shelf placement and cold-box visibility were included in the commercial agreement.',1,'2025-11-14 13:00:00','2025-12-05 14:30:00'),
('11111111-1111-1111-1111-000000000802','SI-0002','11111111-1111-1111-1111-000000000502','11111111-1111-1111-1111-000000000001','2025-12-19','2026-01-18','OVERDUE','DELIVERED',26850.00,0.00,0.00,26850.00,'LYD','30 days','Almadina year-end promotional order with partial payment received.','Display support was delivered together with the mixed flavor shipment.',1,'2025-12-19 11:00:00','2026-03-28 16:00:00'),
('11111111-1111-1111-1111-000000000803','SI-0003','11111111-1111-1111-1111-000000000503','11111111-1111-1111-1111-000000000001','2026-01-28','2026-02-27','PAID','DELIVERED',22905.00,0.00,0.00,22905.00,'LYD','30 days','Benghazi hub replenishment for eastern region supermarket stores.','Order was staged from Tripoli and landed at the east hub before delivery.',1,'2026-01-28 10:30:00','2026-02-24 13:30:00'),
('11111111-1111-1111-1111-000000000804','SI-0004','11111111-1111-1111-1111-000000000501','11111111-1111-1111-1111-000000000001','2026-02-26','2026-03-28','OVERDUE','DELIVERED',20120.00,0.00,0.00,20120.00,'LYD','30 days','FreshMart follow-up order with a delayed balance still outstanding.','Route team confirmed the shelves were refilled before the Ramadan demand build.',1,'2026-02-26 09:30:00','2026-04-02 08:30:00'),
('11111111-1111-1111-1111-000000000805','SI-0005','11111111-1111-1111-1111-000000000504','11111111-1111-1111-1111-000000000001','2026-03-26','2026-04-25','SUBMITTED','DELIVERED',11800.00,0.00,0.00,11800.00,'LYD','30 days','CornerStop regional replenishment handled through route delivery.','Commercial terms include weekly follow-up on store-level sell-through.',1,'2026-03-26 15:00:00','2026-03-26 15:00:00'),
('11111111-1111-1111-1111-000000000806','SI-0006','11111111-1111-1111-1111-000000000502','11111111-1111-1111-1111-000000000001','2026-04-01','2026-05-01','SUBMITTED','PENDING',4540.00,0.00,0.00,4540.00,'LYD','30 days','Early April top-up order created for Almadina before the next promotion window.','Pending final route confirmation for the April delivery slot.',1,'2026-04-01 10:30:00','2026-04-01 10:30:00')
ON DUPLICATE KEY UPDATE
  invoice_number = VALUES(invoice_number),
  customer_id = VALUES(customer_id),
  invoice_date = VALUES(invoice_date),
  due_date = VALUES(due_date),
  status = VALUES(status),
  delivery_status = VALUES(delivery_status),
  subtotal = VALUES(subtotal),
  tax_amount = VALUES(tax_amount),
  discount_amount = VALUES(discount_amount),
  total_amount = VALUES(total_amount),
  currency = VALUES(currency),
  payment_terms = VALUES(payment_terms),
  notes = VALUES(notes),
  terms_and_conditions = VALUES(terms_and_conditions),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);

INSERT INTO sales_invoice_line_items (
  id, sales_invoice_id, item_id, item_name, description, quantity, uom, unit_price, tax_rate, tax_amount,
  discount_rate, discount_amount, line_total, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000811','11111111-1111-1111-1111-000000000801','11111111-1111-1111-1111-000000000601','RealMix Classic 250ml Case','Opening launch quantity.',300.000,'CASE',36.00,0.00,0.00,0.00,0.00,10800.00,'2025-11-14 13:05:00','2025-11-14 13:05:00'),
('11111111-1111-1111-1111-000000000812','11111111-1111-1111-1111-000000000801','11111111-1111-1111-1111-000000000602','RealMix Zero Sugar 250ml Case','Opening launch quantity.',120.000,'CASE',39.50,0.00,0.00,0.00,0.00,4740.00,'2025-11-14 13:05:00','2025-11-14 13:05:00'),
('11111111-1111-1111-1111-000000000813','11111111-1111-1111-1111-000000000801','11111111-1111-1111-1111-000000000603','RealMix Berry Blast 250ml Case','Opening launch quantity.',100.000,'CASE',38.50,0.00,0.00,0.00,0.00,3850.00,'2025-11-14 13:05:00','2025-11-14 13:05:00'),
('11111111-1111-1111-1111-000000000814','11111111-1111-1111-1111-000000000802','11111111-1111-1111-1111-000000000601','RealMix Classic 250ml Case','Year-end mixed order.',420.000,'CASE',36.00,0.00,0.00,0.00,0.00,15120.00,'2025-12-19 11:05:00','2025-12-19 11:05:00'),
('11111111-1111-1111-1111-000000000815','11111111-1111-1111-1111-000000000802','11111111-1111-1111-1111-000000000602','RealMix Zero Sugar 250ml Case','Year-end mixed order.',180.000,'CASE',39.50,0.00,0.00,0.00,0.00,7110.00,'2025-12-19 11:05:00','2025-12-19 11:05:00'),
('11111111-1111-1111-1111-000000000816','11111111-1111-1111-1111-000000000802','11111111-1111-1111-1111-000000000603','RealMix Berry Blast 250ml Case','Year-end mixed order.',120.000,'CASE',38.50,0.00,0.00,0.00,0.00,4620.00,'2025-12-19 11:05:00','2025-12-19 11:05:00'),
('11111111-1111-1111-1111-000000000817','11111111-1111-1111-1111-000000000803','11111111-1111-1111-1111-000000000601','RealMix Classic 250ml Case','Eastern region replenishment.',360.000,'CASE',36.50,0.00,0.00,0.00,0.00,13140.00,'2026-01-28 10:35:00','2026-01-28 10:35:00'),
('11111111-1111-1111-1111-000000000818','11111111-1111-1111-1111-000000000803','11111111-1111-1111-1111-000000000602','RealMix Zero Sugar 250ml Case','Eastern region replenishment.',140.000,'CASE',39.50,0.00,0.00,0.00,0.00,5530.00,'2026-01-28 10:35:00','2026-01-28 10:35:00'),
('11111111-1111-1111-1111-000000000819','11111111-1111-1111-1111-000000000803','11111111-1111-1111-1111-000000000603','RealMix Berry Blast 250ml Case','Eastern region replenishment.',110.000,'CASE',38.50,0.00,0.00,0.00,0.00,4235.00,'2026-01-28 10:35:00','2026-01-28 10:35:00'),
('11111111-1111-1111-1111-000000000820','11111111-1111-1111-1111-000000000804','11111111-1111-1111-1111-000000000601','RealMix Classic 250ml Case','FreshMart Ramadan build-up order.',330.000,'CASE',37.00,0.00,0.00,0.00,0.00,12210.00,'2026-02-26 09:35:00','2026-02-26 09:35:00'),
('11111111-1111-1111-1111-000000000821','11111111-1111-1111-1111-000000000804','11111111-1111-1111-1111-000000000602','RealMix Zero Sugar 250ml Case','FreshMart Ramadan build-up order.',110.000,'CASE',40.00,0.00,0.00,0.00,0.00,4400.00,'2026-02-26 09:35:00','2026-02-26 09:35:00'),
('11111111-1111-1111-1111-000000000822','11111111-1111-1111-1111-000000000804','11111111-1111-1111-1111-000000000603','RealMix Berry Blast 250ml Case','FreshMart Ramadan build-up order.',90.000,'CASE',39.00,0.00,0.00,0.00,0.00,3510.00,'2026-02-26 09:35:00','2026-02-26 09:35:00'),
('11111111-1111-1111-1111-000000000823','11111111-1111-1111-1111-000000000805','11111111-1111-1111-1111-000000000601','RealMix Classic 250ml Case','Route-delivered retail group replenishment.',180.000,'CASE',37.00,0.00,0.00,0.00,0.00,6660.00,'2026-03-26 15:05:00','2026-03-26 15:05:00'),
('11111111-1111-1111-1111-000000000824','11111111-1111-1111-1111-000000000805','11111111-1111-1111-1111-000000000602','RealMix Zero Sugar 250ml Case','Route-delivered retail group replenishment.',70.000,'CASE',40.00,0.00,0.00,0.00,0.00,2800.00,'2026-03-26 15:05:00','2026-03-26 15:05:00'),
('11111111-1111-1111-1111-000000000825','11111111-1111-1111-1111-000000000805','11111111-1111-1111-1111-000000000603','RealMix Berry Blast 250ml Case','Route-delivered retail group replenishment.',60.000,'CASE',39.00,0.00,0.00,0.00,0.00,2340.00,'2026-03-26 15:05:00','2026-03-26 15:05:00'),
('11111111-1111-1111-1111-000000000826','11111111-1111-1111-1111-000000000806','11111111-1111-1111-1111-000000000601','RealMix Classic 250ml Case','Early April top-up before the next promo window.',80.000,'CASE',37.00,0.00,0.00,0.00,0.00,2960.00,'2026-04-01 10:35:00','2026-04-01 10:35:00'),
('11111111-1111-1111-1111-000000000827','11111111-1111-1111-1111-000000000806','11111111-1111-1111-1111-000000000602','RealMix Zero Sugar 250ml Case','Early April top-up before the next promo window.',20.000,'CASE',40.00,0.00,0.00,0.00,0.00,800.00,'2026-04-01 10:35:00','2026-04-01 10:35:00'),
('11111111-1111-1111-1111-000000000828','11111111-1111-1111-1111-000000000806','11111111-1111-1111-1111-000000000603','RealMix Berry Blast 250ml Case','Early April top-up before the next promo window.',20.000,'CASE',39.00,0.00,0.00,0.00,0.00,780.00,'2026-04-01 10:35:00','2026-04-01 10:35:00')
ON DUPLICATE KEY UPDATE
  item_id = VALUES(item_id),
  item_name = VALUES(item_name),
  description = VALUES(description),
  quantity = VALUES(quantity),
  uom = VALUES(uom),
  unit_price = VALUES(unit_price),
  tax_rate = VALUES(tax_rate),
  tax_amount = VALUES(tax_amount),
  discount_rate = VALUES(discount_rate),
  discount_amount = VALUES(discount_amount),
  line_total = VALUES(line_total),
  updated_at = VALUES(updated_at);

INSERT INTO payments (
  id, payment_type, customer_id, supplier_id, invoice_id, company_id, payment_date, payment_method, payment_method_id,
  reference_number, amount, notes, status, currency, is_active, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-000000000901','PAY',NULL,'11111111-1111-1111-1111-000000000401','11111111-1111-1111-1111-000000000701','11111111-1111-1111-1111-000000000001','2025-11-08','Bank Transfer','11111111-1111-1111-1111-000000000322','PAY-0001',91250.00,'Settlement of the first import invoice.','COMPLETED','LYD',1,'2025-11-08 15:30:00','2025-11-08 15:30:00'),
('11111111-1111-1111-1111-000000000902','RECEIVE','11111111-1111-1111-1111-000000000501',NULL,'11111111-1111-1111-1111-000000000801','11111111-1111-1111-1111-000000000001','2025-12-05','Bank Transfer','11111111-1111-1111-1111-000000000322','PAY-0002',19390.00,'FreshMart settled the launch order in full.','COMPLETED','LYD',1,'2025-12-05 14:30:00','2025-12-05 14:30:00'),
('11111111-1111-1111-1111-000000000903','RECEIVE','11111111-1111-1111-1111-000000000502',NULL,'11111111-1111-1111-1111-000000000802','11111111-1111-1111-1111-000000000001','2026-01-15','Bank Transfer','11111111-1111-1111-1111-000000000322','PAY-0003',12000.00,'Partial collection against the year-end Almadina order.','COMPLETED','LYD',1,'2026-01-15 12:00:00','2026-01-15 12:00:00'),
('11111111-1111-1111-1111-000000000904','RECEIVE','11111111-1111-1111-1111-000000000503',NULL,'11111111-1111-1111-1111-000000000803','11111111-1111-1111-1111-000000000001','2026-02-24','Bank Transfer','11111111-1111-1111-1111-000000000322','PAY-0004',22905.00,'Benghazi Super Stores paid in full after delivery confirmation.','COMPLETED','LYD',1,'2026-02-24 13:30:00','2026-02-24 13:30:00'),
('11111111-1111-1111-1111-000000000905','PAY',NULL,'11111111-1111-1111-1111-000000000401','11111111-1111-1111-1111-000000000702','11111111-1111-1111-1111-000000000001','2026-02-25','Bank Transfer','11111111-1111-1111-1111-000000000322','PAY-0005',20000.00,'Partial settlement for the January replenishment import.','COMPLETED','LYD',1,'2026-02-25 11:30:00','2026-02-25 11:30:00'),
('11111111-1111-1111-1111-000000000906','RECEIVE','11111111-1111-1111-1111-000000000501',NULL,'11111111-1111-1111-1111-000000000804','11111111-1111-1111-1111-000000000001','2026-03-22','Bank Transfer','11111111-1111-1111-1111-000000000322','PAY-0006',8000.00,'Partial settlement received for FreshMart February order.','COMPLETED','LYD',1,'2026-03-22 11:00:00','2026-03-22 11:00:00')
ON DUPLICATE KEY UPDATE
  payment_type = VALUES(payment_type),
  customer_id = VALUES(customer_id),
  supplier_id = VALUES(supplier_id),
  invoice_id = VALUES(invoice_id),
  payment_date = VALUES(payment_date),
  payment_method = VALUES(payment_method),
  payment_method_id = VALUES(payment_method_id),
  reference_number = VALUES(reference_number),
  amount = VALUES(amount),
  notes = VALUES(notes),
  status = VALUES(status),
  currency = VALUES(currency),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);
