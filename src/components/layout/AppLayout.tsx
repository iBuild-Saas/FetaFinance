import { Link, useLocation } from "react-router-dom";
import { useAccounting } from "@/state/accounting";
import { useDatabase } from "@/hooks/useDatabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { Building2, Settings } from "lucide-react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BrandLockup } from "./BrandLockup";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";

function AppLayoutShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const { open } = useSidebar();
  const { state, dispatch } = useAccounting();
  const { data: companies, fetchAll } = useDatabase("companies");
  const location = useLocation();
  const hasMounted = useRef(false);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const activeCompany = companies?.find((company) => company.id === state.activeCompanyId) || null;

  useEffect(() => {
    if (!hasMounted.current) {
      void fetchAll();
      hasMounted.current = true;
    }
  }, [fetchAll]);

  useEffect(() => {
    if (!state.activeCompanyId && companies?.length) {
      dispatch({ type: "SET_ACTIVE_COMPANY", id: companies[0].id });
    }
  }, [companies, dispatch, state.activeCompanyId]);

  const segments = location.pathname.split("/").filter(Boolean);

  const routeTranslations: { [key: string]: string } = {
    overview: t("navigation.overview"),
    companies: t("modules.companies"),
    "company-settings": t("company.companySettings"),
    accounts: t("modules.chartOfAccounts"),
    "account-mappings": t("modules.accountMappings"),
    customers: t("modules.customers"),
    suppliers: t("modules.suppliers"),
    items: t("modules.items"),
    categories: t("modules.categories"),
    "units-of-measure": t("modules.unitsOfMeasure"),
    invoices: t("modules.salesInvoices"),
    "purchase-invoices": t("modules.purchaseInvoices"),
    payments: t("modules.payments"),
    inventory: t("modules.inventoryManagement"),
    "stock-balance": t("modules.stockBalance"),
    "stock-reconciliation": t("modules.stockReconciliation"),
    journals: t("modules.journalEntries"),
    ledger: t("modules.generalLedger"),
    reports: t("modules.financialReports"),
    "trial-balance": t("modules.trialBalance"),
    "accounts-receivable": t("modules.accountsReceivable"),
    "accounts-payable": t("modules.accountsPayable"),
    "payment-methods": t("modules.paymentMethods"),
    "audit-log": t("shell.auditLog"),
  };

  const breadcrumbItems = [
    { name: t("common.home"), path: "/" },
    ...segments.map((seg, idx) => {
      const path = "/" + segments.slice(0, idx + 1).join("/");
      const translatedName = routeTranslations[seg];
      const label = translatedName || seg
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      return { name: label, path };
    }),
  ];

  const sidebarWidth = open ? "16rem" : "5rem";

  return (
    <div className={cn("app-shell min-h-screen w-full bg-background", isRTL && "rtl-content")}>
      <header className="app-topbar fixed inset-x-0 top-0 z-40 h-20">
        <div className="relative flex h-full items-center gap-4 px-6">
          <SidebarTrigger className="rounded-lg border border-white/12 bg-white/8 text-sidebar-foreground shadow-none hover:bg-white/12 hover:text-sidebar-foreground transition-colors" />

          <Link
            to="/companies"
            className="topbar-brand absolute top-1/2 hidden items-center gap-3 rounded-full px-4 py-2 text-sidebar-foreground transition-colors hover:bg-white/6 md:flex"
            style={{ left: "50%", transform: "translate(-50%, -50%)" }}
          >
            <div className="sidebar-brand-mark flex h-10 w-10 items-center justify-center rounded-2xl">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <BrandLockup align="center" size="topbar" />
          </Link>

          <div className={cn("flex items-center gap-3", isRTL ? "mr-auto" : "ml-auto")}>
            <Select value={state.activeCompanyId} onValueChange={(value) => dispatch({ type: "SET_ACTIVE_COMPANY", id: value })}>
              <SelectTrigger className="h-11 w-[220px] rounded-full border-white/12 bg-white/8 text-sidebar-foreground shadow-none hover:bg-white/12 focus:ring-white/20">
                {activeCompany?.logo ? (
                  <img
                    src={activeCompany.logo}
                    alt={`${activeCompany.name} Logo`}
                    className={cn("h-5 w-5 rounded object-cover", isRTL ? "ml-3" : "mr-3")}
                  />
                ) : (
                  <Building2 className={cn("h-5 w-5 text-sidebar-foreground", isRTL ? "ml-3" : "mr-3")} />
                )}
                <SelectValue placeholder={t("company.selectCompany")} />
              </SelectTrigger>
              <SelectContent className="border-border/80 bg-background/95 backdrop-blur-md">
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id} className="transition-colors hover:bg-muted focus:bg-muted">
                    <span className="font-medium">{company.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <LanguageSwitcher variant="compact" />

            <Link
              to="/companies"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "flex items-center gap-2 rounded-full border-white/12 bg-white/8 text-sidebar-foreground shadow-none transition-colors hover:bg-white/12 hover:text-sidebar-foreground",
              )}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.manage")}</span>
            </Link>
          </div>
        </div>
      </header>

      <AppSidebar />

      <div className="min-h-screen pt-20" style={{ paddingInlineStart: sidebarWidth }}>
        <main className="p-6 md:p-8">
          {title && (
            <div className="mb-8">
              <h1 className="page-title text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
            </div>
          )}

          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="content-panel flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground">
              {breadcrumbItems.map((item, index) => (
                <li key={`${item.path}-${index}`} className="flex items-center gap-3">
                  {index > 0 && <span className="text-xs opacity-40">/</span>}
                  {index === breadcrumbItems.length - 1 ? (
                    <span className="rounded-full bg-primary-light px-3 py-1 font-medium text-foreground">{item.name}</span>
                  ) : (
                    <Link className="rounded-full px-3 py-1 transition-colors hover:bg-muted hover:text-primary" to={item.path}>
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div>{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <SidebarProvider>
      <AppLayoutShell title={title}>{children}</AppLayoutShell>
    </SidebarProvider>
  );
}
