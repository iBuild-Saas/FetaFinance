import { Building2, ShoppingCart, TrendingUp, Package, Users, FileText, Calculator, BarChart3, Plus, BookOpen, ChevronRight } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
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

const modules = [
  {
    id: "setup",
    title: "Setup",
    icon: Building2,
    docs: [
      { title: "Companies", path: "/companies", icon: Building2 },
      { title: "Chart of Accounts", path: "/accounts", icon: Calculator },
    ]
  },
  {
    id: "master-data",
    title: "Master Data", 
    icon: Users,
    docs: [
      { title: "Customers", path: "/customers", icon: Users },
      { title: "Suppliers", path: "/suppliers", icon: Building2 },
      { title: "Items", path: "/items", icon: Package },
    ]
  },
  {
    id: "sales",
    title: "Selling",
    icon: TrendingUp,
    docs: [
      { title: "Sales Invoices", path: "/invoices", icon: FileText },
      { title: "Customer Payments", path: "/customer-payments", icon: TrendingUp },
    ]
  },
  {
    id: "purchase",
    title: "Buying", 
    icon: ShoppingCart,
    docs: [
      { title: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart },
      { title: "Supplier Payments", path: "/supplier-payments", icon: ShoppingCart },
    ]
  },
  {
    id: "accounting",
    title: "Accounting",
    icon: Calculator,
    docs: [
      { title: "Journal Entries", path: "/journals", icon: BookOpen },
      { title: "General Ledger", path: "/ledger", icon: Calculator },
    ]
  },
  {
    id: "reports",
    title: "Reports",
    icon: BarChart3,
    docs: [
      { title: "Financial Reports", path: "/reports", icon: BarChart3 },
      { title: "Trial Balance", path: "/trial-balance", icon: Calculator },
    ]
  }
];

export function AppSidebar() {
  const { open: sidebarOpen } = useSidebar();
  const location = useLocation();
  const [openModules, setOpenModules] = useState<string[]>(["setup"]);

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
    <Sidebar className="border-r border-border/50 bg-card/30 backdrop-blur-xl">
      <SidebarContent className="p-2">
        {/* Logo Section */}
        <div className="px-4 py-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {!sidebarOpen && (
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                FinanceHub
              </span>
            )}
          </div>
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
                      "group flex items-center gap-3 px-3 py-3 mb-1 rounded-lg cursor-pointer transition-all duration-200 hover:bg-secondary/80",
                      moduleActive && "bg-primary/10 text-primary border border-primary/20"
                    )}
                  >
                    <IconComponent className="w-5 h-5" />
                    {sidebarOpen && (
                      <>
                        <span className="font-medium">{module.title}</span>
                        <ChevronRight 
                          className={cn(
                            "w-4 h-4 ml-auto transition-transform duration-200",
                            isExpanded && "rotate-90"
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
                                    "flex items-center gap-3 px-3 py-2 ml-4 rounded-lg text-sm transition-all duration-200 hover:bg-secondary/60",
                                    active && "bg-primary/20 text-primary font-medium border-l-2 border-primary"
                                  )}
                                >
                                  <DocIcon className="w-4 h-4" />
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