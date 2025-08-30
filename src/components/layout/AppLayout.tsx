import { Link, useLocation } from "react-router-dom";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { useDatabase } from "@/hooks/useDatabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { badgeVariants } from "@/components/ui/badge";
import { Building2, Settings, ChevronDown } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AppLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { state, dispatch } = useAccounting();
  const { data: companies, fetchAll } = useDatabase('companies');
  const active = useActiveCompany();
  const location = useLocation();
  const hasMounted = useRef(false);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  // Fetch companies when component mounts (only once)
  useEffect(() => {
    if (!hasMounted.current) {
      console.log('[AppLayout] Fetching companies for dropdown...');
      fetchAll();
      hasMounted.current = true;
    }
  }, []); // Empty dependency array to run only once

  const segments = location.pathname.split("/").filter(Boolean);
  
  // Route translation mapping
  const routeTranslations: { [key: string]: string } = {
    'companies': t('modules.companies'),
    'accounts': t('modules.chartOfAccounts'),
    'account-mappings': t('modules.accountMappings'),
    'customers': t('modules.customers'),
    'suppliers': t('modules.suppliers'),
    'items': t('modules.items'),
    'categories': t('modules.categories'),
    'units-of-measure': t('modules.unitsOfMeasure'),
    'invoices': t('modules.salesInvoices'),
    'purchase-invoices': t('modules.purchaseInvoices'),
    'payments': t('modules.payments'),
    'inventory': t('modules.inventoryManagement'),
    'stock-balance': t('modules.stockBalance'),
    'stock-reconciliation': t('modules.stockReconciliation'),
    'journals': t('modules.journalEntries'),
    'ledger': t('modules.generalLedger'),
    'reports': t('modules.financialReports'),
    'trial-balance': t('modules.trialBalance')
  };

  const breadcrumbItems = [
    { name: t("common.home"), path: "/" },
    ...segments.map((seg, idx) => {
      const path = "/" + segments.slice(0, idx + 1).join("/");
      const translatedName = routeTranslations[seg];
      const label = translatedName || seg
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
      return { name: label, path };
    }),
  ];

  return (
    <SidebarProvider>
      <div className={cn(
        "min-h-screen w-full bg-background flex transition-all duration-300",
        isRTL ? "flex-row-reverse" : "flex-row"
      )}>
        <div className={cn(
          "sidebar-container",
          isRTL && "rtl-sidebar-container"
        )}>
          <AppSidebar />
        </div>
        
        <div className={cn(
          "flex flex-col min-w-0 flex-1",
          "transition-all duration-300",
          isRTL && "rtl-content"
        )}>
          {/* Header */}
          <header className="sticky top-0 z-40 bg-background border-b border-border">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              
              {/* Company Info & Actions */}
              <div className={cn(
                "flex items-center gap-3",
                isRTL ? "mr-auto" : "ml-auto"
              )}>
                {active && (
                  <div className={cn(
                    badgeVariants({ variant: "outline" }),
                    "hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground border-transparent rounded-md"
                  )}>
                    {active.logo ? (
                      <img 
                        src={active.logo} 
                        alt={`${active.name} Logo`}
                        className="w-4 h-4 rounded object-cover"
                      />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                    <span className="font-medium">{active.name}</span>
                  </div>
                )}
                
                <Select value={state.activeCompanyId} onValueChange={(v) => dispatch({ type: "SET_ACTIVE_COMPANY", id: v })}>
                  <SelectTrigger className="w-[220px] bg-background border-border hover:bg-muted transition-colors">
                    {active?.logo ? (
                      <img 
                        src={active.logo} 
                        alt={`${active.name} Logo`}
                        className={cn(
                          "w-5 h-5 rounded object-cover",
                          isRTL ? "ml-3" : "mr-3"
                        )}
                      />
                    ) : (
                      <Building2 className={cn(
                        "w-5 h-5 text-muted-foreground",
                        isRTL ? "ml-3" : "mr-3"
                      )} />
                    )}
                    <SelectValue placeholder={t("company.selectCompany")} />
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground",
                      isRTL ? "mr-auto" : "ml-auto"
                    )} />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {companies?.map(c => (
                      <SelectItem 
                        key={c.id} 
                        value={c.id}
                        className="hover:bg-muted focus:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {c.logo ? (
                            <img 
                              src={c.logo} 
                              alt={`${c.name} Logo`}
                              className="w-5 h-5 rounded object-cover"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          )}
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <LanguageSwitcher variant="compact" />
                
                <Link
                  to="/companies"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "bg-background border-border hover:bg-muted transition-colors flex items-center gap-2"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("common.manage")}</span>
                </Link>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {title && (
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
              </div>
            )}
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex items-center gap-3 text-sm text-muted-foreground">
                {breadcrumbItems.map((b, i) => (
                  <li key={b.path} className="flex items-center gap-3">
                    {i > 0 && <span className="opacity-40 text-xs">•</span>}
                    {i === breadcrumbItems.length - 1 ? (
                      <span className="text-foreground font-medium px-2 py-1 bg-muted rounded-md">{b.name}</span>
                    ) : (
                      <Link className="hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-muted" to={b.path}>{b.name}</Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
