#!/usr/bin/env node

/**
 * Batch Translation Script for React Pages
 * This script automatically adds translations to all React pages in the system
 */

const fs = require('fs');
const path = require('path');

// List of pages to translate
const pagesToTranslate = [
  'Customers.tsx',
  'Suppliers.tsx', 
  'Items.tsx',
  'Companies.tsx',
  'Categories.tsx',
  'UnitsOfMeasure.tsx',
  'Invoices.tsx',
  'Payments.tsx',
  'JournalEntries.tsx',
  'Ledger.tsx',
  'Reports.tsx',
  'TrialBalance.tsx',
  'ChartOfAccounts.tsx',
  'Inventory.tsx',
  'StockReconciliation.tsx'
];

// Common translations to apply
const commonTranslations = {
  // Import statement
  importTranslation: `import { useTranslation } from "react-i18next";`,
  
  // Hook declaration
  hookDeclaration: `  const { t } = useTranslation();`,
  
  // Common replacements
  replacements: [
    // Page titles in AppLayout
    { pattern: /<AppLayout title="([^"]+)">/, replacement: `<AppLayout title={t("$1")}>` },
    
    // SEO titles
    { pattern: /<SEO title="([^"]+) — /, replacement: `<SEO title={\`\${t("$1")} — ` },
    
    // Button text
    { pattern: />Add Customer</, replacement: `>{t("customers.addCustomer")}<` },
    { pattern: />Add Supplier</, replacement: `>{t("suppliers.addSupplier")}<` },
    { pattern: />Add Item</, replacement: `>{t("items.addItem")}<` },
    { pattern: />Add Company</, replacement: `>{t("companies.addCompany")}<` },
    { pattern: />Save</, replacement: `>{t("common.save")}<` },
    { pattern: />Cancel</, replacement: `>{t("common.cancel")}<` },
    { pattern: />Edit</, replacement: `>{t("common.edit")}<` },
    { pattern: />Delete</, replacement: `>{t("common.delete")}<` },
    { pattern: />Search</, replacement: `>{t("common.search")}<` },
    
    // Labels
    { pattern: />Name</, replacement: `>{t("common.name")}<` },
    { pattern: />Email</, replacement: `>{t("common.email")}<` },
    { pattern: />Phone</, replacement: `>{t("common.phone")}<` },
    { pattern: />Address</, replacement: `>{t("common.address")}<` },
    { pattern: />Status</, replacement: `>{t("common.status")}<` },
    { pattern: />Actions</, replacement: `>{t("common.actions")}<` },
    { pattern: />Type</, replacement: `>{t("common.type")}<` },
    { pattern: />Description</, replacement: `>{t("common.description")}<` },
    
    // Placeholders
    { pattern: /placeholder="Search ([^"]+)\.\.\."/g, replacement: `placeholder={t("$1.searchPlaceholder")}` },
    { pattern: /placeholder="([^"]+)"/g, replacement: `placeholder={t("common.$1")}` }
  ]
};

function translateFile(filePath) {
  try {
    console.log(`Translating ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if not present
    if (!content.includes('useTranslation')) {
      const importIndex = content.indexOf('import type');
      if (importIndex !== -1) {
        content = content.slice(0, importIndex) + 
                 commonTranslations.importTranslation + '\n' +
                 content.slice(importIndex);
      }
    }
    
    // Add hook declaration if not present
    if (!content.includes('const { t } = useTranslation()')) {
      const componentStart = content.indexOf('const ' + path.basename(filePath, '.tsx'));
      if (componentStart !== -1) {
        const nextLine = content.indexOf('\n', componentStart);
        if (nextLine !== -1) {
          content = content.slice(0, nextLine + 1) +
                   commonTranslations.hookDeclaration + '\n' +
                   content.slice(nextLine + 1);
        }
      }
    }
    
    // Apply common replacements
    commonTranslations.replacements.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });
    
    // Write back to file
    fs.writeFileSync(filePath, content);
    console.log(`✅ Translated ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error translating ${filePath}:`, error.message);
  }
}

function main() {
  const pagesDir = path.join(__dirname, 'src', 'pages');
  
  console.log('🌐 Starting batch translation of React pages...\n');
  
  pagesToTranslate.forEach(fileName => {
    const filePath = path.join(pagesDir, fileName);
    if (fs.existsSync(filePath)) {
      translateFile(filePath);
    } else {
      console.log(`⚠️  File not found: ${fileName}`);
    }
  });
  
  console.log('\n🎉 Batch translation completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the translated files');
  console.log('2. Test each page in both languages');
  console.log('3. Add missing translation keys to en.json and ar.json');
  console.log('4. Adjust any specific translations as needed');
}

if (require.main === module) {
  main();
}

module.exports = { translateFile, commonTranslations };
