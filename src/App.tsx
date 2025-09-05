import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "@/i18n";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Companies from "./pages/Companies";
import CompanySettings from "./pages/CompanySettings";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Items from "./pages/Items";
import ItemDetails from "./pages/ItemDetails";
import Categories from "./pages/Categories";
import UnitsOfMeasure from "./pages/UnitsOfMeasure";
import PaymentMethods from "./pages/PaymentMethods";
import Dashboard from "./pages/Dashboard";
import StockReconciliation from "./pages/StockReconciliation";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import PurchaseInvoices from "./pages/PurchaseInvoices";
import JournalEntries from "./pages/JournalEntries";
import Ledger from "./pages/Ledger";
import TrialBalance from "./pages/TrialBalance";
import Reports from "./pages/Reports";
import Inventory from "./pages/Inventory";
import AccountMappings from "./pages/AccountMappings";
import AccountsReceivable from "./pages/AccountsReceivable";
import AccountsPayable from "./pages/AccountsPayable";
// import TestPage from "./pages/TestPage"; // No longer needed
import { AccountingProvider } from "@/state/accounting";
import { SupabaseProvider } from "@/contexts/SupabaseContext";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  // On route change, scroll to top for better UX
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [pathname]);
  return null;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.error("App error boundary caught:", error); }
  render() {
    if (this.state.hasError) {
      return <div className="p-6 text-sm text-red-600">Something went wrong. Please refresh.</div>;
    }
    return this.props.children;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseProvider>
      <AccountingProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <AppErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/company-settings" element={<CompanySettings />} />
                <Route path="/accounts" element={<ChartOfAccounts />} />
                <Route path="/account-mappings" element={<AccountMappings />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/items" element={<Items />} />
                <Route path="/items/:id" element={<ItemDetails />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/units-of-measure" element={<UnitsOfMeasure />} />
                <Route path="/payment-methods" element={<PaymentMethods />} />
                <Route path="/stock-balance" element={<Dashboard />} />
                <Route path="/stock-reconciliation" element={<StockReconciliation />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/purchase-invoices" element={<PurchaseInvoices />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/journals" element={<JournalEntries />} />
                <Route path="/ledger" element={<Ledger />} />
                <Route path="/trial-balance" element={<TrialBalance />} />
                <Route path="/accounts-receivable" element={<AccountsReceivable />} />
                <Route path="/accounts-payable" element={<AccountsPayable />} />
                <Route path="/reports" element={<Reports />} />
                {/* <Route path="/test" element={<TestPage />} /> */}
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </AppErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AccountingProvider>
    </SupabaseProvider>
  </QueryClientProvider>
);

export default App;
