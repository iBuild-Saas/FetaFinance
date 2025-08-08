import { Link, NavLink } from "react-router-dom";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container flex h-14 items-center gap-4">
          <Link to="/" className="font-semibold">FMS</Link>
          <Separator orientation="vertical" className="h-6" />
          <nav className="flex items-center gap-2 text-sm">
            {nav.map(n => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn("px-3 py-1 rounded-md hover:bg-secondary", isActive && "bg-secondary")}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Select value={state.activeCompanyId} onValueChange={(v) => dispatch({ type: "SET_ACTIVE_COMPANY", id: v })}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {state.companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="secondary"><Link to="/companies">Manage</Link></Button>
          </div>
        </div>
      </header>
      <main className="container py-8">
        {title && <h1 className="text-2xl font-semibold mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
