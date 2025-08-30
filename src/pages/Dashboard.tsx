import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Building2, Users, FileText, CreditCard, BookOpen, BarChart3, Calculator, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { t } = useTranslation();
  
  const modules = [
    {
      title: t("modules.companies"),
      description: "Create and manage multiple companies",
      icon: Building2,
      path: "/companies",
      iconColor: "text-gray-600 dark:text-gray-400"
    },
    {
      title: t("modules.chartOfAccounts"),
      description: "Maintain and organize your accounts",
      icon: Calculator,
      path: "/accounts",
      iconColor: "text-gray-600 dark:text-gray-400"
    },
    {
      title: t("modules.customers"),
      description: "Manage customer information",
      icon: Users,
      path: "/customers",
      iconColor: "text-gray-600 dark:text-gray-400"
    },
    {
      title: t("modules.suppliers"),
      description: "Track supplier details",
      icon: Building2,
      path: "/suppliers",
      iconColor: "text-gray-600 dark:text-gray-400"
    },
    {
      title: t("modules.salesInvoices"),
      description: "Record and manage sales invoices",
      icon: FileText,
      path: "/invoices",
      iconColor: "text-gray-600 dark:text-gray-400"
    },
    {
      title: t("modules.payments"),
      description: "Track receipts and payouts",
      icon: CreditCard,
      path: "/payments",
      iconColor: "text-gray-600 dark:text-gray-400"
    },
    {
      title: t("modules.journalEntries"),
      description: "Record manual accounting entries",
      icon: BookOpen,
      path: "/journals",
      iconColor: "text-gray-600 dark:text-gray-400"
    },
    {
      title: t("modules.financialReports"),
      description: "Generate income statements and balance sheets",
      icon: BarChart3,
      path: "/reports",
      iconColor: "text-gray-600 dark:text-gray-400"
    }
  ];

  return (
    <AppLayout title={t("dashboard.title")}>
      <SEO title={`${t("dashboard.title")} — FinanceHub`} description="Manage your financial operations from one central dashboard" />
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Card 
              key={module.path} 
              className="group hover:shadow-md transition-all duration-200"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <IconComponent className={`w-6 h-6 ${module.iconColor}`} />
                  </div>
                  <CardTitle className="text-lg font-semibold">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                  {module.description}
                </p>
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200"
                >
                  <Link to={module.path} className="flex items-center gap-2 font-medium">
                    <span>{t("common.view")}</span>
                    <IconComponent className="w-4 h-6" />
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
