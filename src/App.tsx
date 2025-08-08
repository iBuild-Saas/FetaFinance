import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Companies from "./pages/Companies";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Items from "./pages/Items";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import CustomerPayments from "./pages/CustomerPayments";
import SupplierPayments from "./pages/SupplierPayments";
import PurchaseOrders from "./pages/PurchaseOrders";
import JournalEntries from "./pages/JournalEntries";
import Ledger from "./pages/Ledger";
import TrialBalance from "./pages/TrialBalance";
import Reports from "./pages/Reports";
import { AccountingProvider } from "@/state/accounting";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AccountingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/accounts" element={<ChartOfAccounts />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/items" element={<Items />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/customer-payments" element={<CustomerPayments />} />
            <Route path="/supplier-payments" element={<SupplierPayments />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/journals" element={<JournalEntries />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/trial-balance" element={<TrialBalance />} />
            <Route path="/reports" element={<Reports />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AccountingProvider>
  </QueryClientProvider>
);

export default App;
