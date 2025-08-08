import { Link, NavLink } from "react-router-dom";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Menu, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/companies", label: "Companies" },
  { to: "/accounts", label: "Chart of Accounts" },
  { to: "/customers", label: "Customers" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/items", label: "Items" },
  { to: "/invoices", label: "Invoices" },
  { to: "/payments", label: "Payments" },
  { to: "/journals", label: "Journal Entries" },
  { to: "/reports", label: "Reports" },
];

export default function AppLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { state, dispatch } = useAccounting();
  const active = useActiveCompany();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary">
      {/* Modern Header with Glass Effect */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-sm">
        <div className="container flex h-16 items-center gap-6">
          {/* Modern Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:text-primary-hover transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              FinanceHub
            </span>
          </Link>

          <Separator orientation="vertical" className="h-8 opacity-50" />

          {/* Modern Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {nav.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => cn(
                  "nav-modern",
                  isActive && "active"
                )}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Company Selector & Actions */}
          <div className="ml-auto flex items-center gap-3">
            {active && (
              <Badge variant="outline" className="hidden sm:flex items-center gap-1 px-3 py-1 bg-primary-light/20 text-primary border-primary/20">
                <Building2 className="w-3 h-3" />
                {active.name}
              </Badge>
            )}
            
            <Select value={state.activeCompanyId} onValueChange={(v) => dispatch({ type: "SET_ACTIVE_COMPANY", id: v })}>
              <SelectTrigger className="w-[200px] bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card transition-colors">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select company" />
                <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 backdrop-blur-xl border-border/50">
                {state.companies.map(c => (
                  <SelectItem 
                    key={c.id} 
                    value={c.id}
                    className="hover:bg-accent/10 focus:bg-accent/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button asChild variant="outline" className="bg-card/50 border-border/50 hover:bg-secondary-hover hover:shadow-sm transition-all">
              <Link to="/companies" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Manage</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Modern Main Content */}
      <main className="container py-8 animate-fade-in">
        {title && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {title}
            </h1>
            <div className="h-1 w-16 bg-gradient-primary rounded-full mt-2"></div>
          </div>
        )}
        <div className="animate-slide-up">
          {children}
        </div>
      </main>
    </div>
  );
}
