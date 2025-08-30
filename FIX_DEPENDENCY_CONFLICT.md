# 🚨 Fix Dependency Conflict - Force Clean Start

## ❌ **The Problem**

The clean start script is failing because there are existing dependencies:

```
ERROR: 2BP01: cannot drop function trigger_purchase_invoice_stock_movement() 
because other objects depend on it

DETAIL: trigger trg_sales_invoice_stock_movement on table sales_invoices 
depends on function trigger_purchase_invoice_stock_movement()
```

**What this means:**
- There's a **sales invoice trigger** using a **purchase invoice function**
- This creates a dependency conflict
- The regular cleanup can't remove it

## 🔧 **The Solution**

We need to **force remove** all dependencies first, then do a clean start.

## 🚀 **Step-by-Step Fix**

### **Step 1: Force Cleanup (Remove All Dependencies)**
Run this in your Supabase SQL Editor:

```sql
\i FORCE_CLEAN_START.sql
```

**What this does:**
- 🗑️ **Forcefully removes ALL triggers** (with CASCADE)
- 🗑️ **Forcefully removes ALL functions** (with CASCADE)
- 🗑️ **Forcefully removes ALL tables** (with CASCADE)
- 🗑️ **Forcefully removes ALL constraints** (with CASCADE)
- ✅ **No dependency conflicts**

### **Step 2: Verify Clean State**
After the force cleanup, you should see:
- **Remaining Triggers: 0**
- **Remaining Functions: 0**
- **Remaining Tables: 0**

### **Step 3: Clean Start (Create New System)**
Now run the clean start:

```sql
\i CLEAN_START_PURCHASE_INVOICE_SYSTEM.sql
```

**What this does:**
- 🆕 **Creates clean stock tables**
- 🔧 **Creates simple stock function**
- ⚡ **Creates simple trigger**
- ✅ **Fixes status constraints**

### **Step 4: Verify Installation**
Run the test script:

```sql
\i TEST_CLEAN_SYSTEM.sql
```

**Expected Results:**
- Tables: 2
- Functions: 1
- Triggers: 1
- Constraints: 1

## 🔍 **Why This Happened**

### **Root Cause:**
- **Sales invoices** were using **purchase invoice functions**
- This created **cross-dependencies**
- Regular cleanup couldn't break the dependency chain

### **The Fix:**
- **Force removal** with `CASCADE` option
- **Complete cleanup** of all related objects
- **Fresh start** with no legacy dependencies

## ⚠️ **Important Notes**

### **What Gets Removed:**
- ✅ All existing stock movement triggers
- ✅ All existing stock movement functions
- ✅ All existing stock movement tables
- ✅ All existing constraints
- ✅ All existing sequences

### **What Gets Created:**
- 🆕 Clean, simple stock system
- 🆕 No legacy dependencies
- 🆕 Clear separation of concerns
- 🆕 Easy to maintain

## 🧪 **Testing After Fix**

### **Test the Complete Workflow:**
1. **Create a purchase invoice** → Status: DRAFT
2. **Submit invoice** → Status: SUBMITTED → Journal entry created
3. **Mark as received** → Status: RECEIVED → Stock updated
4. **Check results** → Inventory page shows updated quantities

## 🚨 **If You Still Get Errors**

### **Check What Remains:**
```sql
-- Check for any remaining triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table IN ('purchase_invoices', 'sales_invoices');

-- Check for any remaining functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%stock%' OR routine_name LIKE '%invoice%';
```

### **Force Remove Again:**
```sql
\i FORCE_CLEAN_START.sql
```

## 🎯 **Expected Outcome**

After the fix:
- ✅ **No dependency conflicts**
- ✅ **Clean system installed**
- ✅ **Stock movements work**
- ✅ **Journal entries work**
- ✅ **No legacy issues**

---

**Status:** 🚨 Dependency Conflict Detected
**Solution:** Force Cleanup + Clean Start
**Difficulty:** Medium (10 minutes)
**Impact:** High (Resolves all conflicts)
**Approach:** Force removal, then fresh start
