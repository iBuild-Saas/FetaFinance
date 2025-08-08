import { Link } from "react-router-dom";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Settings, ChevronDown } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";


export default function AppLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { state, dispatch } = useAccounting();
  const active = useActiveCompany();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background to-background-secondary">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Modern Header */}
          <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-sm">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              
              {/* Company Info & Actions */}
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
          <main className="flex-1 p-6 animate-fade-in">
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
      </div>
    </SidebarProvider>
  );
}
