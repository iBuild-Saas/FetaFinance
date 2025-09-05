import { Building2, ShoppingCart, TrendingUp, Package, Users, FileText, Calculator, BarChart3, Plus, BookOpen, ChevronRight, FolderOpen, Ruler, Settings, DollarSign, CreditCard } from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useActiveCompany } from "@/state/accounting";

const getModules = (t: any) => [
  {
    id: "setup",
    title: t("navigation.setup"),
    icon: Building2,
    docs: [
      { title: t("modules.companies"), path: "/companies", icon: Building2 },
      { title: t("modules.chartOfAccounts"), path: "/accounts", icon: Calculator },
      { title: t("modules.accountMappings"), path: "/account-mappings", icon: Settings },
    ]
  },
  {
    id: "master-data",
    title: t("navigation.masterData"), 
    icon: Users,
    docs: [
      { title: t("modules.customers"), path: "/customers", icon: Users },
      { title: t("modules.suppliers"), path: "/suppliers", icon: Building2 },
      { title: t("modules.items"), path: "/items", icon: Package },
      { title: t("modules.categories"), path: "/categories", icon: FolderOpen },
      { title: t("modules.unitsOfMeasure"), path: "/units-of-measure", icon: Ruler },
      { title: t("modules.paymentMethods"), path: "/payment-methods", icon: Calculator },
    ]
  },
  {
    id: "sales",
    title: t("navigation.selling"),
    icon: TrendingUp,
    docs: [
      { title: t("modules.salesInvoices"), path: "/invoices", icon: FileText },
    ]
  },
  {
    id: "purchase",
    title: t("navigation.buying"), 
    icon: ShoppingCart,
    docs: [
      { title: t("modules.purchaseInvoices"), path: "/purchase-invoices", icon: ShoppingCart },
    ]
  },
  {
    id: "payments",
    title: t("navigation.payments"),
    icon: TrendingUp,
    docs: [
      { title: t("modules.payments"), path: "/payments", icon: TrendingUp },
    ]
  },
  {
    id: "inventory",
    title: t("navigation.inventory"),
    icon: Package,
    docs: [
      { title: t("modules.items"), path: "/items", icon: Package },
      { title: t("modules.inventoryManagement"), path: "/inventory", icon: Package },
      { title: t("modules.stockBalance"), path: "/stock-balance", icon: BarChart3 },
      { title: t("modules.stockReconciliation"), path: "/stock-reconciliation", icon: TrendingUp },
    ]
  },
  {
    id: "accounting",
    title: t("navigation.accounting"),
    icon: Calculator,
    docs: [
      { title: t("modules.journalEntries"), path: "/journals", icon: BookOpen },
      { title: t("modules.generalLedger"), path: "/ledger", icon: Calculator },
    ]
  },
  {
    id: "reports",
    title: t("navigation.reports"),
    icon: BarChart3,
    docs: [
      { title: t("modules.financialReports"), path: "/reports", icon: BarChart3 },
      { title: t("modules.trialBalance"), path: "/trial-balance", icon: Calculator },
      { title: "Accounts Receivable", path: "/accounts-receivable", icon: DollarSign },
      { title: "Accounts Payable", path: "/accounts-payable", icon: CreditCard },
    ]
  }
];

export function AppSidebar() {
  const { open: sidebarOpen } = useSidebar();
  const location = useLocation();
  const activeCompany = useActiveCompany();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [openModules, setOpenModules] = useState<string[]>(["setup"]);
  
  const modules = getModules(t);

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isModuleActive = (moduleId: string) => 
    modules.find(m => m.id === moduleId)?.docs.some(doc => isActive(doc.path));

  return (
    <Sidebar 
      variant="inset"
      collapsible="none"
      className={cn(
        "bg-background transition-all duration-300 relative",
        isRTL ? "border-l border-border" : "border-r border-border"
      )}
    >
      <SidebarContent className="p-4">
        {/* Logo Section */}
        <div className="px-2 py-4 mb-6">
          <Link to="/" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-2 hover:bg-muted transition-colors">
            {activeCompany?.logo ? (
              <img 
                src={activeCompany.logo} 
                alt={`${activeCompany.name} Logo`}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            {sidebarOpen && (
              <div>
                <span className="font-semibold text-lg text-foreground">
                  {activeCompany?.name || "FinanceHub"}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Modules */}
        {modules.map((module) => {
          const IconComponent = module.icon;
          const isExpanded = openModules.includes(module.id);
          const moduleActive = isModuleActive(module.id);

          return (
            <SidebarGroup key={module.id}>
              <Collapsible 
                open={isExpanded} 
                onOpenChange={() => toggleModule(module.id)}
              >
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel 
                    className={cn(
                      "group flex items-center gap-3 px-3 py-3 mb-1 rounded-lg cursor-pointer transition-colors hover:bg-muted",
                      moduleActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center",
                      moduleActive ? "bg-primary-foreground/20" : "bg-muted"
                    )}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    {sidebarOpen && (
                      <>
                        <span className="font-medium text-sm">{module.title}</span>
                        <ChevronRight 
                          className={cn(
                            "w-4 h-4 transition-transform",
                            isRTL ? "mr-auto" : "ml-auto",
                            isExpanded && "rotate-90",
                            isRTL && "rotate-180"
                          )} 
                        />
                      </>
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>

                {sidebarOpen && (
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {module.docs.map((doc) => {
                          const DocIcon = doc.icon;
                          const active = isActive(doc.path);
                          
                          return (
                            <SidebarMenuItem key={doc.path}>
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={doc.path}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted",
                                    isRTL ? "mr-4" : "ml-4",
                                    active && cn(
                                      "bg-primary/10 text-primary font-medium",
                                      isRTL ? "border-r-2 border-primary" : "border-l-2 border-primary"
                                    )
                                  )}
                                >
                                  <div className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center",
                                    active ? "bg-primary/20" : "bg-muted"
                                  )}>
                                    <DocIcon className="w-3 h-3" />
                                  </div>
                                  <span>{doc.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                )}
              </Collapsible>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}