import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardList,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BrandLockup } from "./BrandLockup";

const getModules = (t: TFunction) => [
  {
    id: "overview",
    title: t("navigation.overview"),
    icon: Building2,
    docs: [
      { title: t("shell.controlCenter"), path: "/overview" },
      { title: t("shell.auditLog"), path: "/audit-log" },
    ],
  },
  {
    id: "sales",
    title: t("navigation.sales"),
    icon: TrendingUp,
    docs: [
      { title: t("modules.salesInvoices"), path: "/invoices" },
      { title: t("modules.accountsReceivable"), path: "/accounts-receivable" },
      { title: t("modules.customers"), path: "/customers" },
    ],
  },
  {
    id: "purchasing",
    title: t("navigation.purchasing"),
    icon: ShoppingCart,
    docs: [
      { title: t("modules.purchaseInvoices"), path: "/purchase-invoices" },
      { title: t("modules.accountsPayable"), path: "/accounts-payable" },
      { title: t("modules.suppliers"), path: "/suppliers" },
    ],
  },
  {
    id: "inventory",
    title: t("navigation.inventory"),
    icon: Package,
    docs: [
      { title: t("modules.items"), path: "/items" },
      { title: t("modules.inventoryManagement"), path: "/inventory" },
      { title: t("modules.stockBalance"), path: "/stock-balance" },
      { title: t("modules.stockReconciliation"), path: "/stock-reconciliation" },
    ],
  },
  {
    id: "accounting",
    title: t("navigation.accounting"),
    icon: BookOpen,
    docs: [
      { title: t("modules.journalEntries"), path: "/journals" },
      { title: t("modules.generalLedger"), path: "/ledger" },
      { title: t("modules.payments"), path: "/payments" },
      { title: t("modules.accountMappings"), path: "/account-mappings" },
    ],
  },
  {
    id: "reports",
    title: t("navigation.reports"),
    icon: BarChart3,
    docs: [
      { title: t("shell.reportsHub"), path: "/reports" },
      { title: t("modules.trialBalance"), path: "/trial-balance" },
      { title: t("shell.auditLog"), path: "/audit-log" },
    ],
  },
  {
    id: "settings",
    title: t("common.settings"),
    icon: Settings,
    docs: [
      { title: t("modules.companies"), path: "/companies" },
      { title: t("company.companySettings"), path: "/company-settings" },
      { title: t("modules.chartOfAccounts"), path: "/accounts" },
      { title: t("modules.categories"), path: "/categories" },
      { title: t("modules.unitsOfMeasure"), path: "/units-of-measure" },
      { title: t("modules.paymentMethods"), path: "/payment-methods" },
    ],
  },
];

export function AppSidebar() {
  const { open: sidebarOpen } = useSidebar();
  const location = useLocation();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [openModules, setOpenModules] = useState<string[]>(["overview", "sales"]);

  const modules = getModules(t);
  const sidebarWidth = sidebarOpen ? "16rem" : "5rem";

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]));
  };

  const isActive = (path: string) => location.pathname === path;
  const isModuleActive = (moduleId: string) => modules.find((module) => module.id === moduleId)?.docs.some((doc) => isActive(doc.path));

  return (
    <aside
      className={cn(
        "sidebar-surface fixed bottom-0 top-20 z-30 hidden overflow-hidden md:block",
        isRTL ? "right-0 border-l" : "left-0 border-r",
      )}
      style={{ width: sidebarWidth }}
    >
      <div className="h-full overflow-y-auto overflow-x-hidden px-3 py-4">
        <div className="mb-4 px-1">
          <Link
            to="/companies"
            className={cn(
              "flex items-center rounded-2xl border border-white/10 bg-white/5 p-2.5 text-sidebar-foreground transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sidebar-ring",
              sidebarOpen ? "gap-3" : "justify-center",
            )}
          >
            <div className="sidebar-brand-mark flex h-10 w-10 items-center justify-center rounded-2xl">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>

            {sidebarOpen && (
              <BrandLockup className="min-w-0" />
            )}
          </Link>
        </div>

        <div className="space-y-1">
          {modules.map((module) => {
            const IconComponent = module.icon;
            const isExpanded = openModules.includes(module.id);
            const moduleActive = Boolean(isModuleActive(module.id));

            return (
              <div key={module.id} className="px-1 py-1">
                <Collapsible open={isExpanded} onOpenChange={() => toggleModule(module.id)}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      title={module.title}
                      className={cn(
                        "sidebar-group-button flex w-full items-center rounded-2xl px-3 text-sidebar-foreground transition-colors",
                        sidebarOpen ? "h-12 gap-3" : "h-12 justify-center",
                        moduleActive && "bg-sidebar-primary/90",
                      )}
                    >
                      <IconComponent className="h-4 w-4 shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className={cn("flex-1 truncate text-sm font-medium", isRTL ? "text-right" : "text-left")}>{module.title}</span>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isRTL ? "rotate-180" : "",
                              isExpanded && (isRTL ? "-rotate-90" : "rotate-90"),
                            )}
                          />
                        </>
                      )}
                    </button>
                  </CollapsibleTrigger>

                  {sidebarOpen && (
                    <CollapsibleContent className="pt-2">
                      <div className="space-y-2">
                        {module.docs.map((doc) => {
                          const active = isActive(doc.path);

                          return (
                            <NavLink
                              key={doc.path}
                              to={doc.path}
                              data-active={active}
                              className={cn(
                                "sidebar-subitem flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors",
                                isRTL ? "mr-3" : "ml-3",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full border border-white/20 transition-colors",
                                  active ? "bg-sidebar-primary border-transparent shadow-[0_0_0_4px_rgba(255,255,255,0.05)]" : "bg-white/20",
                                )}
                              />
                              <span className="truncate">{doc.title}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
