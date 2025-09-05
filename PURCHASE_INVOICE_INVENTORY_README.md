# Purchase Invoice Inventory System

This system allows you to automatically update stock quantities and create journal entries when purchase invoices are marked as "RECEIVED".

## 🚀 Quick Setup

### 1. Run the Database Fix
Execute the SQL script to set up the inventory system:

```sql
-- Run this in your Supabase SQL editor
\i COMPLETE_PURCHASE_INVOICE_INVENTORY_FIX.sql
```

### 2. Verify Installation
Run the test script to ensure everything is working:

```sql
-- Run this to verify the system is ready
\i TEST_PURCHASE_INVOICE_FIX.sql
```

## 📋 How It Works

### Workflow
1. **Create Purchase Invoice** → Status: `DRAFT`
2. **Submit Invoice** → Status: `SUBMITTED` → Auto journal entry created
3. **Mark as Received** → Status: `RECEIVED` → Stock quantities updated + Stock movements recorded

### What Happens When You Mark as "Received"
- ✅ Stock quantities are automatically increased
- ✅ Stock movements are recorded for audit trail
- ✅ Journal entries are created (if not already created)
- ✅ Average costs are calculated using weighted average method

## 🗄️ Database Tables

### `stock_items`
Tracks current inventory levels for each item:
- `current_quantity` - Total stock on hand
- `available_quantity` - Stock available for use
- `average_cost` - Weighted average cost per unit
- `reserved_quantity` - Stock reserved for orders

### `stock_movements`
Records all inventory transactions:
- `movement_type` - IN (receiving) or OUT (shipping)
- `movement_source` - PURCHASE, SALE, ADJUSTMENT, etc.
- `reference_type` - purchase_invoice, sales_invoice, etc.
- `reference_id` - Links to the source document

## 🔧 Functions

### `create_stock_movement()`
Creates stock movements and updates inventory quantities.

### `record_purchase_invoice_stock_movement()`
Processes purchase invoice line items and creates stock movements.

### `create_purchase_invoice_journal_entry()`
Creates accounting journal entries for received invoices.

## 🎯 Triggers

### `trg_purchase_invoice_stock_movement`
Automatically fires when invoice status changes to `RECEIVED`.

### `trigger_purchase_invoice_journal`
Automatically creates journal entries when invoices are received.

## 💡 Usage Examples

### Mark Invoice as Received
```typescript
// In the frontend, click "Mark as Received" button
// This will:
// 1. Update invoice status to RECEIVED
// 2. Trigger stock movement creation
// 3. Update inventory quantities
// 4. Create journal entries
```

### View Stock Levels
Navigate to **Inventory Management** page to see:
- Current stock quantities
- Average costs
- Stock movement history
- Low stock alerts

### View Stock Movements
The system automatically tracks:
- When items are received
- Source documents (purchase invoices)
- Quantities and costs
- Movement dates

## 🔍 Troubleshooting

### Common Issues

#### 1. Constraint Violation Error
**Error:** `violates check constraint "purchase_invoices_status_check"`

**Solution:** Run the fix script to update the constraint:
```sql
\i COMPLETE_PURCHASE_INVOICE_INVENTORY_FIX.sql
```

#### 2. Missing Tables
**Error:** `relation "stock_items" does not exist`

**Solution:** The fix script creates all required tables automatically.

#### 3. Missing Functions
**Error:** `function "create_stock_movement" does not exist`

**Solution:** Run the fix script to create all required functions.

### Verification Queries

Check if the system is working:

```sql
-- Check stock items
SELECT COUNT(*) FROM stock_items;

-- Check stock movements
SELECT COUNT(*) FROM stock_movements;

-- Check journal entries
SELECT COUNT(*) FROM journal_entries WHERE reference_type = 'purchase_invoice';

-- Check triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name LIKE '%purchase_invoice%';
```

## 📊 Monitoring

### Stock Levels
Monitor inventory levels in real-time:
- Navigate to **Inventory Management**
- View current quantities and costs
- Set up reorder levels

### Audit Trail
Track all inventory changes:
- Stock movement history
- Source documents
- User actions
- Timestamps

### Financial Impact
Journal entries are automatically created:
- Debit: Inventory Asset
- Credit: Accounts Payable
- Proper accounting treatment

## 🚨 Important Notes

### Status Flow
- `DRAFT` → `SUBMITTED` → `RECEIVED` → `PAID`
- Only `RECEIVED` status triggers stock updates
- Journal entries are created on `SUBMITTED` status

### Data Integrity
- Stock quantities are updated atomically
- Average costs are calculated automatically
- All movements are recorded for audit
- No manual stock adjustments needed

### Performance
- Indexes are created for optimal performance
- Triggers are lightweight and efficient
- Bulk operations are supported

## 🔮 Future Enhancements

### Planned Features
- [ ] Stock reservations for sales orders
- [ ] Batch stock movements
- [ ] Stock reconciliation tools
- [ ] Advanced reporting
- [ ] Mobile inventory management

### Customization
The system can be extended for:
- Different inventory valuation methods (FIFO, LIFO)
- Multiple warehouses
- Serial number tracking
- Lot tracking
- Expiry date management

## 📞 Support

If you encounter issues:

1. **Check the logs** in Supabase dashboard
2. **Run the test script** to verify system status
3. **Check constraints** and table structures
4. **Verify triggers** are properly installed

## 📚 Related Documentation

- [Chart of Accounts Setup](CHART_OF_ACCOUNTS_SETUP.md)
- [Journal Entries System](SALES_INVOICE_JOURNAL_ENTRY_README.md)
- [Database Schema](CREATE_PURCHASE_INVOICES_TABLE.sql)

---

**System Status:** ✅ Ready for Production Use
**Last Updated:** Current Date
**Version:** 1.0.0



