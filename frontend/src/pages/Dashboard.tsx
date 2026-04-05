import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CreditCard,
  FileClock,
  Package,
  Receipt,
  Scale,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

type OverviewResponse = {
  company: {
    id: string;
    name: string;
    currency?: string;
  } | null;
  kpis: {
    cashBalance: number;
    receivablesTotal: number;
    payablesTotal: number;
    stockValue: number;
    totalSales: number;
    totalPurchases: number;
    lowStockItems: number;
    negativeStockItems: number;
    overdueReceivableCount: number;
    overduePayableCount: number;
    draftDocuments: number;
    trialBalanceDifference: number;
    missingMappingCount: number;
  };
  workflow: {
    draftSales: number;
    draftPurchases: number;
    draftJournals: number;
    overdueReceivables: number;
    overduePayables: number;
  };
  period: {
    period_code: string;
    period_name: string;
    status: string;
    end_date: string;
  } | null;
  salesTrend: Array<{
    period: string;
    total: number;
  }>;
};

type ExceptionResponse = {
  counts: {
    critical: number;
    warning: number;
    info: number;
  };
  exceptions: Array<{
    severity: "critical" | "warning" | "info";
    code: string;
    title: string;
    description: string;
  }>;
};

type PeriodStatusResponse = {
  currentPeriod: {
    period_code: string;
    period_name: string;
    status: string;
    end_date: string;
  } | null;
  checklist: {
    missingMappings: number;
    negativeStockItems: number;
    openDocuments: number;
    trialBalanceDifference: number;
  };
  closeRuns: Array<{
    run_type: string;
    status: string;
    created_by?: string;
    created_at: string;
  }>;
};

const money = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);

const compactNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { data: companies } = useDatabase("companies");
  const { state } = useAccounting();
  const locale = i18n.language === "ar" ? "ar" : "en-US";

  const activeCompany = useMemo(
    () => companies?.find((company) => company.id === state.activeCompanyId) || null,
    [companies, state.activeCompanyId],
  );

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionResponse | null>(null);
  const [periodStatus, setPeriodStatus] = useState<PeriodStatusResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!activeCompany?.id) {
        setOverview(null);
        setExceptions(null);
        setPeriodStatus(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [overviewRes, exceptionsRes, periodRes] = await Promise.all([
          fetch(`/api/company_overview/${activeCompany.id}`),
          fetch(`/api/company_exceptions/${activeCompany.id}`),
          fetch(`/api/company_period_status/${activeCompany.id}`),
        ]);

        const [overviewData, exceptionData, periodData] = await Promise.all([
          overviewRes.json(),
          exceptionsRes.json(),
          periodRes.json(),
        ]);

        setOverview(overviewData);
        setExceptions(exceptionData);
        setPeriodStatus(periodData);
      } catch (error) {
        console.error("Failed to load company overview", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [activeCompany?.id]);

  const severityLabel = (severity: "critical" | "warning" | "info") => {
    if (i18n.language === "ar") {
      return severity === "critical" ? "حرج" : severity === "warning" ? "تحذير" : "معلومة";
    }

    return severity;
  };

  if (!activeCompany) {
    return (
      <AppLayout title={t("navigation.overview")}>
        <SEO title={`${t("navigation.overview")} - FinanceHub`} description={t("dashboard.heroDescription")} />
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-6 px-6 py-16 text-center">
            <div className="metric-icon-shell flex h-16 w-16 items-center justify-center rounded-3xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("dashboard.emptyTitle")}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("dashboard.emptyDescription")}</p>
            </div>
            <Button asChild>
              <Link to="/companies">
                {t("dashboard.openCompanies")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const metrics = [
    {
      title: t("dashboard.cashPosition"),
      value: money(overview?.kpis.cashBalance || 0, locale),
      hint: t("dashboard.cashPositionHint"),
      icon: Wallet,
    },
    {
      title: t("dashboard.receivables"),
      value: money(overview?.kpis.receivablesTotal || 0, locale),
      hint: t("dashboard.receivablesHint", { count: overview?.kpis.overdueReceivableCount || 0 }),
      icon: CreditCard,
    },
    {
      title: t("dashboard.payables"),
      value: money(overview?.kpis.payablesTotal || 0, locale),
      hint: t("dashboard.payablesHint", { count: overview?.kpis.overduePayableCount || 0 }),
      icon: Receipt,
    },
    {
      title: t("dashboard.inventoryValue"),
      value: money(overview?.kpis.stockValue || 0, locale),
      hint: t("dashboard.inventoryValueHint", { count: overview?.kpis.lowStockItems || 0 }),
      icon: Package,
    },
  ];

  const actionCards = [
    {
      title: t("dashboard.salesTitle"),
      description: t("dashboard.salesDescription"),
      path: "/invoices",
      icon: TrendingUp,
    },
    {
      title: t("dashboard.purchasingTitle"),
      description: t("dashboard.purchasingDescription"),
      path: "/purchase-invoices",
      icon: ShoppingCart,
    },
    {
      title: t("dashboard.inventoryTitle"),
      description: t("dashboard.inventoryDescription"),
      path: "/inventory",
      icon: Package,
    },
    {
      title: t("dashboard.accountingTitle"),
      description: t("dashboard.accountingDescription"),
      path: "/ledger",
      icon: BookOpen,
    },
  ];

  return (
    <AppLayout title={t("navigation.overview")}>
      <SEO title={`${t("navigation.overview")} - ${activeCompany.name}`} description={t("dashboard.heroDescription")} />

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{activeCompany.name}</Badge>
                  {periodStatus?.currentPeriod && (
                    <Badge variant="outline">
                      {periodStatus.currentPeriod.period_name} · {periodStatus.currentPeriod.status}
                    </Badge>
                  )}
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{t("dashboard.heroTitle")}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{t("dashboard.heroDescription")}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to="/reports">{t("dashboard.openReports")}</Link>
                </Button>
                <Button asChild>
                  <Link to="/audit-log">{t("shell.auditLog")}</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{metric.title}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
                        {loading ? "..." : metric.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.hint}</p>
                    </div>
                    <div className="metric-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("dashboard.exceptionsInbox")}</CardTitle>
              <Badge variant="secondary">
                {t("dashboard.openCount", { count: (exceptions?.counts.critical || 0) + (exceptions?.counts.warning || 0) })}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.loadingExceptions")}</p>
              ) : exceptions?.exceptions.length ? (
                exceptions.exceptions.slice(0, 8).map((item) => (
                  <div
                    key={`${item.code}-${item.title}`}
                    className="rounded-2xl border border-border bg-background-secondary p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge
                        variant={item.severity === "critical" ? "destructive" : "outline"}
                        className="shrink-0 capitalize"
                      >
                        {severityLabel(item.severity)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background-secondary p-6 text-sm text-muted-foreground">
                  {t("dashboard.noExceptions")}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.accountingHealth")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <HealthRow
                  icon={Scale}
                  label={t("dashboard.trialBalanceDifference")}
                  value={money(overview?.kpis.trialBalanceDifference || 0, locale)}
                  tone={Math.abs(overview?.kpis.trialBalanceDifference || 0) < 0.01 ? "good" : "danger"}
                />
                <HealthRow
                  icon={ShieldCheck}
                  label={t("dashboard.missingMappings")}
                  value={String(overview?.kpis.missingMappingCount || 0)}
                  tone={(overview?.kpis.missingMappingCount || 0) === 0 ? "good" : "danger"}
                />
                <HealthRow
                  icon={AlertTriangle}
                  label={t("dashboard.negativeStock")}
                  value={String(overview?.kpis.negativeStockItems || 0)}
                  tone={(overview?.kpis.negativeStockItems || 0) === 0 ? "good" : "danger"}
                />
                <HealthRow
                  icon={FileClock}
                  label={t("dashboard.draftDocuments")}
                  value={String(overview?.kpis.draftDocuments || 0)}
                  tone={(overview?.kpis.draftDocuments || 0) === 0 ? "good" : "warning"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.closeChecklist")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ChecklistRow label={t("dashboard.openDocuments")} value={periodStatus?.checklist.openDocuments || 0} />
                <ChecklistRow label={t("dashboard.missingMappings")} value={periodStatus?.checklist.missingMappings || 0} />
                <ChecklistRow label={t("dashboard.negativeStockItems")} value={periodStatus?.checklist.negativeStockItems || 0} />
                <ChecklistRow
                  label={t("dashboard.trialBalanceDifference")}
                  value={Number((periodStatus?.checklist.trialBalanceDifference || 0).toFixed(2))}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.quickAccess")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {actionCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.path}
                    to={card.path}
                    className="rounded-2xl border border-border bg-background-secondary p-4 transition-colors hover:border-primary/25 hover:bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="metric-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-4 text-base font-semibold">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("dashboard.salesTrend")}</CardTitle>
              <Badge variant="outline">{t("dashboard.salesTrendTotal", { count: compactNumber(overview?.kpis.totalSales || 0, locale) })}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.loadingMonthlySales")}</p>
              ) : overview?.salesTrend.length ? (
                overview.salesTrend.map((entry) => {
                  const maxTotal = Math.max(...overview.salesTrend.map((item) => item.total), 1);
                  const width = Math.max((entry.total / maxTotal) * 100, 6);
                  return (
                    <div key={entry.period} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{entry.period}</span>
                        <span className="text-muted-foreground">{money(entry.total, locale)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-primary/60 to-primary"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background-secondary p-6 text-sm text-muted-foreground">
                  {t("dashboard.noSalesActivity")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

function HealthRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  tone: "good" | "warning" | "danger";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="flex items-center justify-between rounded-2xl bg-background-secondary px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${toneClass}`} />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

function ChecklistRow({ label, value }: { label: string; value: number }) {
  const toneClass = value === 0 ? "text-emerald-600" : "text-amber-600";
  return (
    <div className="flex items-center justify-between rounded-2xl bg-background-secondary px-4 py-3">
      <span className="text-sm text-foreground">{label}</span>
      <span className={`text-sm font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

export default Dashboard;
