import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

// Types
export type ID = string;

export type ReportType = "Balance Sheet" | "Income Statement";
export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export interface Company { 
  id: ID; 
  name: string; 
  logo?: string; // Base64 encoded logo or URL
  description?: string;
  industry?: string;
  companySize?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  currency?: string;
  fiscalYearStart?: string;
  taxId?: string;
  multiCurrency?: boolean;
  inventoryTracking?: boolean;
  autoBackup?: boolean;
  timezone?: string;
}

export interface Account {
  id: ID;
  companyId: ID;
  number: string;
  name: string;
  type: AccountType;
  reportType: ReportType;
}

export interface Customer { id: ID; companyId: ID; name: string; receivableAccountId: ID; }
export interface Supplier { id: ID; companyId: ID; name: string; payableAccountId: ID; }

export interface Item { id: ID; companyId: ID; code: string; name: string; rate: number; incomeAccountId: ID; }

export interface InvoiceItem { itemId: ID; itemCode: string; itemName: string; qty: number; rate: number; amount: number; incomeAccountId: ID; }
export interface Invoice { id: ID; companyId: ID; date: string; customerId: ID; items: InvoiceItem[]; subtotal: number; discount: number; total: number; }

export type PartyType = "Customer" | "Supplier";

export interface Payment { id: ID; companyId: ID; date: string; mode: string; partyType: PartyType; partyId: ID; accountId: ID; amount: number; }

export interface JournalLine { id: ID; accountId: ID; description?: string; debit: number; credit: number; }
export interface JournalEntry { id: ID; companyId: ID; date: string; memo?: string; lines: JournalLine[]; source?: string; sourceId?: ID; }

// Helpers
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// State
interface AccountingState {
  activeCompanyId?: ID;
  companies: Company[];
  accounts: Account[];
  customers: Customer[];
  suppliers: Supplier[];
  items: Item[];
  invoices: Invoice[];
  payments: Payment[];
  journals: JournalEntry[];
}

const initialState: AccountingState = {
  activeCompanyId: undefined,
  companies: [],
  accounts: [],
  customers: [],
  suppliers: [],
  items: [],
  invoices: [],
  payments: [],
  journals: [],
};

// Actions
type Action =
  | { type: "SET_ACTIVE_COMPANY"; id?: ID }
  | { type: "ADD_COMPANY"; company: Company }
  | { type: "UPDATE_COMPANY"; id: ID; updates: Partial<Company> }
  | { type: "DELETE_COMPANY"; id: ID }
  | { type: "UPSERT_ACCOUNT"; account: Account }
  | { type: "DELETE_ACCOUNT"; id: ID }
  | { type: "UPSERT_CUSTOMER"; customer: Customer }
  | { type: "DELETE_CUSTOMER"; id: ID }
  | { type: "UPSERT_SUPPLIER"; supplier: Supplier }
  | { type: "DELETE_SUPPLIER"; id: ID }
  | { type: "UPSERT_ITEM"; item: Item }
  | { type: "DELETE_ITEM"; id: ID }
  | { type: "ADD_INVOICE"; invoice: Invoice }
  | { type: "ADD_PAYMENT"; payment: Payment }
  | { type: "ADD_JOURNAL"; journal: JournalEntry };

const STORAGE_KEY = "lovable_fms_v1";

// Clean state before persistence to reduce size
function prepareStateForStorage(state: AccountingState): AccountingState {
  return {
    ...state,
    companies: state.companies.map(company => ({
      ...company,
      // Remove logo from storage to prevent quota issues
      // Logo will be stored separately or not at all for now
      logo: undefined
    }))
  };
}

function persist(state: AccountingState) {
  try {
    // Try to persist without logos first
    const cleanState = prepareStateForStorage(state);
    const serialized = JSON.stringify(cleanState);
    
    // Check if we're approaching quota limit
    if (serialized.length > 4 * 1024 * 1024) { // 4MB warning
      console.warn('State size is large, consider removing some data');
    }
    
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('LocalStorage quota exceeded. Attempting to clear old data...');
      
      // Try to clear some old data and retry
      try {
        // Remove old companies and related data to free space
        const cleanedState = {
          ...state,
          companies: state.companies.slice(-2), // Keep only last 2 companies
          accounts: state.accounts.filter(acc => 
            state.companies.slice(-2).some(c => c.id === acc.companyId)
          ),
          customers: state.customers.filter(cust => 
            state.companies.slice(-2).some(c => c.id === cust.companyId)
          ),
          suppliers: state.suppliers.filter(supp => 
            state.companies.slice(-2).some(c => c.id === supp.companyId)
          ),
          items: state.items.filter(item => 
            state.companies.slice(-2).some(c => c.id === item.companyId)
          ),
          invoices: state.invoices.filter(inv => 
            state.companies.slice(-2).some(c => c.id === inv.companyId)
          ),
          payments: state.payments.filter(pay => 
            state.companies.slice(-2).some(c => c.id === pay.companyId)
          ),
          journals: state.journals.filter(jour => 
            state.companies.slice(-2).some(c => c.id === jour.companyId)
          )
        };
        
        const cleanState = prepareStateForStorage(cleanedState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
        console.warn('Successfully cleared old data and saved state');
      } catch (retryError) {
        console.error('Failed to save state even after clearing data:', retryError);
        // As a last resort, try to save just the essential data
        try {
          const minimalState = {
            companies: state.companies.slice(-1).map(c => ({ id: c.id, name: c.name })),
            accounts: [],
            customers: [],
            suppliers: [],
            items: [],
            invoices: [],
            payments: [],
            journals: [],
            activeCompanyId: state.activeCompanyId
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState));
          console.warn('Saved minimal state due to storage constraints');
        } catch (finalError) {
          console.error('Failed to save even minimal state:', finalError);
        }
      }
    } else {
      console.error('Error persisting state:', error);
    }
  }
}

function load(): AccountingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as AccountingState;
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
  }
}

// Default accounts for a new company
function seedAccounts(companyId: ID): Account[] {
  const mk = (number: string, name: string, type: AccountType, reportType: ReportType): Account => ({ id: uid(), companyId, number, name, type, reportType });
  return [
    mk("1000", "Cash", "Asset", "Balance Sheet"),
    mk("1010", "Bank", "Asset", "Balance Sheet"),
    mk("1100", "Accounts Receivable", "Asset", "Balance Sheet"),
    mk("2000", "Accounts Payable", "Liability", "Balance Sheet"),
    mk("3000", "Owner's Equity", "Equity", "Balance Sheet"),
    mk("4000", "Sales Revenue", "Revenue", "Income Statement"),
    mk("4010", "Sales Discounts", "Expense", "Income Statement"),
    mk("5000", "Cost of Goods Sold", "Expense", "Income Statement"),
  ];
}

function reducer(state: AccountingState, action: Action): AccountingState {
  switch (action.type) {
    case "SET_ACTIVE_COMPANY":
      return { ...state, activeCompanyId: action.id };
    case "ADD_COMPANY": {
      const companies = [...state.companies, action.company];
      const accounts = [...state.accounts, ...seedAccounts(action.company.id)];
      const activeCompanyId = state.activeCompanyId ?? action.company.id;
      return { ...state, companies, accounts, activeCompanyId };
    }
    case "UPDATE_COMPANY": {
      const companies = state.companies.map(c => 
        c.id === action.id ? { ...c, ...action.updates } : c
      );
      return { ...state, companies };
    }
    case "DELETE_COMPANY": {
      const companies = state.companies.filter(c => c.id !== action.id);
      const filterByCompany = (cid: ID) => (x: { companyId: ID }) => x.companyId !== cid;
      return {
        ...state,
        companies,
        accounts: state.accounts.filter(filterByCompany(action.id)),
        customers: state.customers.filter(filterByCompany(action.id)),
        suppliers: state.suppliers.filter(filterByCompany(action.id)),
        items: state.items.filter(filterByCompany(action.id)),
        invoices: state.invoices.filter(filterByCompany(action.id)),
        payments: state.payments.filter(filterByCompany(action.id)),
        journals: state.journals.filter(filterByCompany(action.id)),
        activeCompanyId: companies[0]?.id,
      };
    }
    case "UPSERT_ACCOUNT": {
      const exists = state.accounts.some(a => a.id === action.account.id);
      const accounts = exists
        ? state.accounts.map(a => (a.id === action.account.id ? action.account : a))
        : [...state.accounts, action.account];
      return { ...state, accounts };
    }
    case "DELETE_ACCOUNT":
      return { ...state, accounts: state.accounts.filter(a => a.id !== action.id) };
    case "UPSERT_CUSTOMER": {
      const exists = state.customers.some(c => c.id === action.customer.id);
      const customers = exists
        ? state.customers.map(c => (c.id === action.customer.id ? action.customer : c))
        : [...state.customers, action.customer];
      return { ...state, customers };
    }
    case "DELETE_CUSTOMER":
      return { ...state, customers: state.customers.filter(c => c.id !== action.id) };
    case "UPSERT_SUPPLIER": {
      const exists = state.suppliers.some(s => s.id === action.supplier.id);
      const suppliers = exists
        ? state.suppliers.map(s => (s.id === action.supplier.id ? action.supplier : s))
        : [...state.suppliers, action.supplier];
      return { ...state, suppliers };
    }
    case "DELETE_SUPPLIER":
      return { ...state, suppliers: state.suppliers.filter(s => s.id !== action.id) };
    case "UPSERT_ITEM": {
      const exists = state.items.some(i => i.id === action.item.id);
      const items = exists ? state.items.map(i => (i.id === action.item.id ? action.item : i)) : [...state.items, action.item];
      return { ...state, items };
    }
    case "DELETE_ITEM":
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case "ADD_INVOICE": {
      const invoices = [...state.invoices, action.invoice];
      // Auto-post journal
      const customer = state.customers.find(c => c.id === action.invoice.customerId);
      const arAccountId = customer?.receivableAccountId;
      if (!arAccountId) return { ...state, invoices };

      const totalRevenue = action.invoice.items.reduce((sum, it) => sum + it.amount, 0);
      const discount = action.invoice.discount || 0;
      const lines: JournalLine[] = [];

      // Credit revenue by line's income account
      action.invoice.items.forEach((it) => {
        if (it.amount > 0)
          lines.push({ id: uid(), accountId: it.incomeAccountId, credit: it.amount, debit: 0, description: `${it.qty} x ${it.itemName}` });
      });
      // Debit Sales Discounts (expense) if any
      if (discount > 0) {
        const discountAccount = state.accounts.find(a => a.companyId === action.invoice.companyId && a.name === "Sales Discounts");
        if (discountAccount) lines.push({ id: uid(), accountId: discountAccount.id, debit: discount, credit: 0, description: "Invoice discount" });
      }
      // Debit AR with total
      const total = action.invoice.total;
      lines.push({ id: uid(), accountId: arAccountId, debit: total, credit: 0, description: "Accounts Receivable" });

      const journal: JournalEntry = { id: uid(), companyId: action.invoice.companyId, date: action.invoice.date, memo: `Invoice ${action.invoice.id}`, lines, source: "invoice", sourceId: action.invoice.id };
      const journals = [...state.journals, journal];
      return { ...state, invoices, journals };
    }
    case "ADD_PAYMENT": {
      const payments = [...state.payments, action.payment];
      const lines: JournalLine[] = [];
      const amt = action.payment.amount;

      if (action.payment.partyType === "Customer") {
        const customer = state.customers.find(c => c.id === action.payment.partyId);
        if (!customer) return { ...state, payments };
        // Dr Bank/Cash, Cr AR
        lines.push({ id: uid(), accountId: action.payment.accountId, debit: amt, credit: 0, description: action.payment.mode });
        lines.push({ id: uid(), accountId: customer.receivableAccountId, debit: 0, credit: amt, description: "Customer payment" });
      } else {
        const supplier = state.suppliers.find(s => s.id === action.payment.partyId);
        if (!supplier) return { ...state, payments };
        // Dr AP, Cr Bank/Cash
        lines.push({ id: uid(), accountId: supplier.payableAccountId, debit: amt, credit: 0, description: "Supplier payment" });
        lines.push({ id: uid(), accountId: action.payment.accountId, debit: 0, credit: amt, description: action.payment.mode });
      }

      const journal: JournalEntry = { id: uid(), companyId: action.payment.companyId, date: action.payment.date, memo: `Payment ${action.payment.id}` , lines, source: "payment", sourceId: action.payment.id };
      const journals = [...state.journals, journal];
      return { ...state, payments, journals };
    }
    case "ADD_JOURNAL": {
      const journals = [...state.journals, action.journal];
      return { ...state, journals };
    }
    default:
      return state;
  }
}

const AccountingContext = createContext<{ state: AccountingState; dispatch: React.Dispatch<Action>; } | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => { persist(state); }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
};

export const useAccounting = () => {
  const ctx = useContext(AccountingContext);
  if (!ctx) throw new Error("useAccounting must be used within AccountingProvider");
  return ctx;
};
