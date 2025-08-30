# Translation Implementation Guide

## ✅ Completed Pages
- ✅ **AppSidebar** - Sidebar navigation fully translated
- ✅ **AppLayout** - Header, breadcrumbs, and layout elements translated
- ✅ **AccountMappings** - Complete translation implementation
- ✅ **PurchaseInvoices** - Create form fully translated

## 🔄 How to Add Translations to Other Pages

### Step 1: Add Translation Hook
```typescript
import { useTranslation } from "react-i18next";

const YourComponent = () => {
  const { t } = useTranslation();
  // ... rest of component
};
```

### Step 2: Update Page Title
```typescript
// Before
<AppLayout title="Your Page Title">

// After
<AppLayout title={t("yourPage.title")}>
```

### Step 3: Replace Hard-coded Text
```typescript
// Before
<Label>Invoice Date *</Label>
<Button>Save Invoice</Button>
<SelectValue placeholder="Select supplier" />

// After
<Label>{t("purchaseInvoice.invoiceDate")} *</Label>
<Button>{t("purchaseInvoice.saveInvoice")}</Button>
<SelectValue placeholder={t("purchaseInvoice.selectSupplier")} />
```

### Step 4: Add Translation Keys
Add corresponding keys to both `src/i18n/locales/en.json` and `src/i18n/locales/ar.json`:

```json
// en.json
{
  "yourPage": {
    "title": "Your Page Title",
    "field": "Field Label",
    "button": "Button Text"
  }
}

// ar.json
{
  "yourPage": {
    "title": "عنوان صفحتك",
    "field": "تسمية الحقل",
    "button": "نص الزر"
  }
}
```

## 🎯 Priority Pages to Translate

### High Priority (Core Functionality)
1. **Customers** (`src/pages/Customers.tsx`)
2. **Items** (`src/pages/Items.tsx`)
3. **Suppliers** (`src/pages/Suppliers.tsx`)
4. **Invoices** (`src/pages/Invoices.tsx`)
5. **Dashboard** (`src/pages/Dashboard.tsx`)

### Medium Priority
6. **Companies** (`src/pages/Companies.tsx`)
7. **ChartOfAccounts** (`src/pages/ChartOfAccounts.tsx`)
8. **JournalEntries** (`src/pages/JournalEntries.tsx`)
9. **Reports** (`src/pages/Reports.tsx`)

### Low Priority
10. Other utility pages and forms

## 🔧 Common Translation Patterns

### Form Labels
```typescript
// Use common translations when possible
{t("common.name")}        // "Name" / "الاسم"
{t("common.email")}       // "Email" / "البريد الإلكتروني"
{t("common.phone")}       // "Phone" / "الهاتف"
{t("common.status")}      // "Status" / "الحالة"
{t("common.actions")}     // "Actions" / "الإجراءات"
```

### Buttons
```typescript
{t("common.save")}        // "Save" / "حفظ"
{t("common.cancel")}      // "Cancel" / "إلغاء"
{t("common.edit")}        // "Edit" / "تعديل"
{t("common.delete")}      // "Delete" / "حذف"
{t("common.create")}      // "Create" / "إنشاء"
```

### Status Values
```typescript
{t("common.loading")}     // "Loading..." / "جاري التحميل..."
{t("common.success")}     // "Success" / "نجح"
{t("common.error")}       // "Error" / "خطأ"
```

## 📝 Translation Keys Structure

```
{
  "common": {          // Shared across all pages
    "save": "Save",
    "cancel": "Cancel"
  },
  "customers": {       // Customer-specific
    "title": "Customers",
    "addCustomer": "Add Customer"
  },
  "items": {          // Items-specific
    "title": "Items",
    "addItem": "Add Item"
  }
}
```

## 🚀 Current Features Working

✅ **Language Switching**: Dropdown in header  
✅ **RTL Layout**: Sidebar flips to right, content flows RTL  
✅ **Arabic Typography**: Proper Arabic fonts  
✅ **Breadcrumb Translation**: Navigation shows translated names  
✅ **Sidebar Translation**: All navigation items translated  

## 🎯 Next Steps

1. Apply the translation pattern to the remaining high-priority pages
2. Test each page in both languages
3. Ensure all form validations and error messages are translated
4. Add more specific translation keys as needed

## 💡 Tips

- Use existing `common` translations when possible to maintain consistency
- Always add translations to both English and Arabic files
- Test in Arabic mode to ensure RTL layout works properly
- Use meaningful key names that describe the content
