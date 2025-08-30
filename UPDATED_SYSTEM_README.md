# Updated Purchase Invoice System

## 🎯 **System Overview**

The purchase invoice system now has **separate workflows** for different business processes:

1. **Journal Entries** → Created when invoice is **SUBMITTED** (existing system)
2. **Stock Movements** → Created when invoice is **RECEIVED** (new system)

## 🔄 **Workflow**

### **Step 1: Create Invoice**
- Status: `DRAFT`
- No automatic actions

### **Step 2: Submit Invoice**
- Status: `SUBMITTED`
- ✅ **Journal Entry Created** (existing system)
- ✅ Accounts Payable recorded
- ✅ Inventory/Expense recorded

### **Step 3: Mark as Received**
- Status: `RECEIVED`
- ✅ **Stock Quantities Updated**
- ✅ **Stock Movements Recorded**
- ✅ **Average Costs Calculated**

## 🗄️ **Database Changes**

### **New Tables Created:**
- `stock_items` - Tracks current inventory levels
- `stock_movements` - Records all inventory transactions

### **New Functions:**
- `create_stock_movement()` - Creates stock movements and updates inventory
- `record_purchase_invoice_stock_movement()` - Processes purchase invoice line items

### **New Triggers:**
- `trg_purchase_invoice_stock_movement` - Fires when status changes to RECEIVED

## 📱 **Frontend Updates**

### **Status Options:**
- `DRAFT` - Invoice created but not submitted
- `SUBMITTED` - Invoice submitted, journal entry created
- `RECEIVED` - Stock received, quantities updated
- `PAID` - Invoice paid
- `CANCELLED` - Invoice cancelled

### **Form Behavior:**
- **SUBMITTED status**: Shows blue message "Journal entry will be created automatically"
- **RECEIVED status**: Shows green message "Stock quantities will be updated and movements recorded"

## 🚀 **Quick Setup**

### **1. Run the Fix Script:**
```sql
\i COMPLETE_PURCHASE_INVOICE_INVENTORY_FIX.sql
```

### **2. Verify Installation:**
```sql
\i TEST_PURCHASE_INVOICE_FIX.sql
```

### **3. Test the System:**
1. Create a purchase invoice
2. Submit it (status = SUBMITTED) → Journal entry created
3. Mark as received (status = RECEIVED) → Stock quantities updated

## 📊 **What Happens When You Mark as "Received"**

### **Automatic Actions:**
1. **Stock Quantities** increase based on line item quantities
2. **Stock Movements** are recorded for audit trail
3. **Average Costs** are calculated using weighted average method
4. **Inventory Records** are created if they don't exist

### **Data Created:**
- New records in `stock_items` table
- New records in `stock_movements` table
- Updated quantities and costs

## 🔍 **Monitoring**

### **Check Stock Levels:**
- Navigate to **Inventory Management**
- View current quantities and average costs
- See stock movement history

### **Check Stock Movements:**
- All movements are automatically recorded
- Source documents are linked
- Quantities and costs are tracked

### **Check Journal Entries:**
- Created when invoice is submitted
- Use existing journal entry system
- No changes to existing workflow

## 🚨 **Important Notes**

### **Status Flow:**
```
DRAFT → SUBMITTED → RECEIVED → PAID
  ↓         ↓         ↓        ↓
Nothing  Journal   Stock    Payment
         Entry    Update   Recorded
```

### **Triggers:**
- **Journal Entry**: Created by existing system on SUBMITTED
- **Stock Movement**: Created by new system on RECEIVED
- **No Conflicts**: Systems work independently

### **Data Integrity:**
- Stock quantities updated atomically
- All movements recorded for audit
- Average costs calculated automatically
- No manual adjustments needed

## 🔧 **Troubleshooting**

### **If Stock Movements Not Created:**
1. Check if trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement'`
2. Verify function exists: `SELECT * FROM information_schema.routines WHERE routine_name = 'record_purchase_invoice_stock_movement'`
3. Check database logs for errors

### **If Status Update Fails:**
1. Run the fix script to update constraints
2. Verify the invoice status is valid
3. Check if all required tables exist

## 📈 **Benefits**

### **Separation of Concerns:**
- **Accounting**: Handled by existing journal entry system
- **Inventory**: Handled by new stock movement system
- **No Interference**: Systems work independently

### **Audit Trail:**
- Complete stock movement history
- Source document tracking
- Cost calculation transparency

### **Flexibility:**
- Can submit invoice without receiving stock
- Can receive stock without immediate payment
- Supports real-world business processes

---

**System Status:** ✅ Updated and Ready
**Journal Entries:** ✅ Existing system (SUBMITTED)
**Stock Movements:** ✅ New system (RECEIVED)
**Last Updated:** Current Date
**Version:** 2.0.0
