import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Building2, Users, FileText, CreditCard, BookOpen, BarChart3, Calculator, DollarSign } from "lucide-react";

const Dashboard = () => {
  const modules = [
    {
      title: "Companies",
      description: "Create and manage multiple companies",
      icon: Building2,
      path: "/companies",
      gradient: "from-cyan-400/30 via-blue-500/20 to-indigo-600/30",
      iconColor: "text-cyan-600 dark:text-cyan-400"
    },
    {
      title: "Chart of Accounts",
      description: "Maintain and organize your accounts",
      icon: Calculator,
      path: "/accounts",
      gradient: "from-emerald-400/30 via-green-500/20 to-teal-600/30",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    },
    {
      title: "Customers",
      description: "Manage customer information",
      icon: Users,
      path: "/customers",
      gradient: "from-violet-400/30 via-purple-500/20 to-indigo-600/30",
      iconColor: "text-violet-600 dark:text-violet-400"
    },
    {
      title: "Suppliers",
      description: "Track supplier details",
      icon: Building2,
      path: "/suppliers",
      gradient: "from-rose-400/30 via-pink-500/20 to-red-600/30",
      iconColor: "text-rose-600 dark:text-rose-400"
    },
    {
      title: "Invoices",
      description: "Record and manage sales invoices",
      icon: FileText,
      path: "/invoices",
      gradient: "from-blue-400/30 via-indigo-500/20 to-purple-600/30",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "Payments",
      description: "Track receipts and payouts",
      icon: CreditCard,
      path: "/payments",
      gradient: "from-teal-400/30 via-cyan-500/20 to-blue-600/30",
      iconColor: "text-teal-600 dark:text-teal-400"
    },
    {
      title: "Journal Entries",
      description: "Record manual accounting entries",
      icon: BookOpen,
      path: "/journals",
      gradient: "from-amber-400/30 via-orange-500/20 to-red-600/30",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
      title: "Financial Reports",
      description: "Generate income statements and balance sheets",
      icon: BarChart3,
      path: "/reports",
      gradient: "from-pink-400/30 via-rose-500/20 to-red-600/30",
      iconColor: "text-pink-600 dark:text-pink-400"
    }
  ];

  return (
    <AppLayout title="Dashboard">
      <SEO title="FinanceHub Dashboard — Multi-Company Accounting" description="Modern financial management system for multiple companies. Manage invoices, payments, accounts, and generate comprehensive reports." canonical={window.location.href} />
      
      {/* Enhanced Welcome Section */}
      <div className="mb-10 p-8 rounded-3xl bg-gradient-hero border border-primary/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 animate-pulse"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-colored">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Welcome to FinanceHub
            </h2>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Your comprehensive financial management solution with modern design and powerful features
          </p>
        </div>
      </div>

      {/* Enhanced Module Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Card key={module.path} className={`group hover:scale-105 transition-all duration-300 bg-gradient-to-br ${module.gradient} hover:shadow-purple border-border/30`}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className={`w-6 h-6 ${module.iconColor}`} />
                  </div>
                  <CardTitle className="text-lg font-semibold">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                  {module.description}
                </p>
                <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary/50 group-hover:shadow-md transition-all duration-300">
                  <Link to={module.path} className="flex items-center gap-2 font-medium">
                    <span>Open Module</span>
                    <IconComponent className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
