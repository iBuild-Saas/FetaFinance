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
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "Chart of Accounts",
      description: "Maintain and organize your accounts",
      icon: Calculator,
      path: "/accounts",
      gradient: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "Customers",
      description: "Manage customer information",
      icon: Users,
      path: "/customers",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      title: "Suppliers",
      description: "Track supplier details",
      icon: Building2,
      path: "/suppliers",
      gradient: "from-orange-500/20 to-red-500/20",
      iconColor: "text-orange-600 dark:text-orange-400"
    },
    {
      title: "Invoices",
      description: "Record and manage sales invoices",
      icon: FileText,
      path: "/invoices",
      gradient: "from-indigo-500/20 to-blue-500/20",
      iconColor: "text-indigo-600 dark:text-indigo-400"
    },
    {
      title: "Payments",
      description: "Track receipts and payouts",
      icon: CreditCard,
      path: "/payments",
      gradient: "from-teal-500/20 to-green-500/20",
      iconColor: "text-teal-600 dark:text-teal-400"
    },
    {
      title: "Journal Entries",
      description: "Record manual accounting entries",
      icon: BookOpen,
      path: "/journals",
      gradient: "from-amber-500/20 to-yellow-500/20",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
      title: "Financial Reports",
      description: "Generate income statements and balance sheets",
      icon: BarChart3,
      path: "/reports",
      gradient: "from-rose-500/20 to-pink-500/20",
      iconColor: "text-rose-600 dark:text-rose-400"
    }
  ];

  return (
    <AppLayout title="Dashboard">
      <SEO title="FinanceHub Dashboard — Multi-Company Accounting" description="Modern financial management system for multiple companies. Manage invoices, payments, accounts, and generate comprehensive reports." canonical={window.location.href} />
      
      {/* Welcome Section */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-hero border border-border/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome to FinanceHub
          </h2>
        </div>
        <p className="text-muted-foreground text-lg">
          Your comprehensive financial management solution for multiple companies
        </p>
      </div>

      {/* Module Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Card key={module.path} className={`group hover:scale-105 bg-gradient-to-br ${module.gradient} hover:shadow-colored`}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                    <IconComponent className={`w-5 h-5 ${module.iconColor}`} />
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {module.description}
                </p>
                <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                  <Link to={module.path} className="flex items-center gap-2">
                    <span>Open Module</span>
                    <IconComponent className="w-4 h-4" />
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
