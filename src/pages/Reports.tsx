import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  CreditCard,
  Package,
  Scale,
  TrendingUp,
} from "lucide-react";

type StatementRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
  category: string;
};

const money = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);

const Reports = () => {
  const { t, i18n } = useTranslation();
  const { supabase } = useDatabaseContext();
  const { data: companies } = useDatabase("companies");
  const { state } = useAccounting();
  const locale = i18n.language === "ar" ? "ar" : "en-US";

  const activeCompany = useMemo(
    () => companies?.find((company) => company.id === state.activeCompanyId) || null,
    [companies, state.activeCompanyId],
  );

  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [incomeStatement, setIncomeStatement] = useState<StatementRow[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<StatementRow[]>([]);

  const loadStatements = async () => {
    if (!activeCompany?.id) {
      setIncomeStatement([]);
      setBalanceSheet([]);
      return;
    }

    setLoading(true);
    try {
      const [incomeResult, balanceResult] = await Promise.all([
        supabase.rpc("get_hierarchical_income_statement", {
          p_company_id: activeCompany.id,
          p_start_date: startDate,
          p_end_date: endDate,
        }),
        supabase.rpc("get_hierarchical_balance_sheet", {
          p_company_id: activeCompany.id,
          p_as_of_date: endDate,
        }),
      ]);

      setIncomeStatement((incomeResult.data || []) as StatementRow[]);
      setBalanceSheet((balanceResult.data || []) as StatementRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatements();
  }, [activeCompany?.id]);

  const totalIncome = incomeStatement.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalBalance = balanceSheet.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const reportCards = [
    {
      title: t("reportsHub.generalLedger"),
      description: t("reportsHub.generalLedgerDescription"),
      path: "/ledger",
      icon: BookOpen,
    },
    {
      title: t("reportsHub.trialBalance"),
      description: t("reportsHub.trialBalanceDescription"),
      path: "/trial-balance",
      icon: Scale,
    },
    {
      title: t("reportsHub.receivablesAging"),
      description: t("reportsHub.receivablesAgingDescription"),
      path: "/accounts-receivable",
      icon: CreditCard,
    },
    {
      title: t("reportsHub.payablesAging"),
      description: t("reportsHub.payablesAgingDescription"),
      path: "/accounts-payable",
      icon: ClipboardList,
    },
    {
      title: t("reportsHub.inventoryMovement"),
      description: t("reportsHub.inventoryMovementDescription"),
      path: "/inventory",
      icon: Package,
    },
    {
      title: t("reportsHub.auditLog"),
      description: t("reportsHub.auditLogDescription"),
      path: "/audit-log",
      icon: TrendingUp,
    },
  ];

  return (
    <AppLayout title={t("reportsHub.title")}>
      <SEO title={`${t("reportsHub.title")} - FinanceHub`} description={t("reportsHub.description")} />

      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{activeCompany?.name || t("company.selectCompany")}</Badge>
                <Badge variant="outline">{t("reportsHub.badge")}</Badge>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{t("reportsHub.heroTitle")}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("reportsHub.heroDescription")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("reportsHub.startDate")}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>{t("reportsHub.endDate")}</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <Button onClick={() => void loadStatements()} disabled={!activeCompany || loading}>
              {loading ? t("reportsHub.refreshingStatements") : t("reportsHub.refreshStatements")}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title={t("reportsHub.incomeStatementTotal")} value={money(totalIncome, locale)} />
          <MetricCard title={t("reportsHub.balanceSheetTotal")} value={money(totalBalance, locale)} />
          <MetricCard title={t("reportsHub.incomeRows")} value={String(incomeStatement.length)} />
          <MetricCard title={t("reportsHub.balanceRows")} value={String(balanceSheet.length)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("reportsHub.reportsAndDrilldown")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reportCards.map((card) => {
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
                  <p className="mt-4 text-base font-semibold text-foreground">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <StatementPreview
            title={t("reportsHub.incomeStatementTitle", { start: startDate, end: endDate })}
            rows={incomeStatement}
            loading={loading}
            emptyText={t("reportsHub.emptyIncome")}
            locale={locale}
            loadingText={t("reportsHub.loadingStatement")}
          />
          <StatementPreview
            title={t("reportsHub.balanceSheetTitle", { date: endDate })}
            rows={balanceSheet}
            loading={loading}
            emptyText={t("reportsHub.emptyBalance")}
            locale={locale}
            loadingText={t("reportsHub.loadingStatement")}
          />
        </div>
      </div>
    </AppLayout>
  );
};

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatementPreview({
  title,
  rows,
  loading,
  emptyText,
  locale,
  loadingText,
}: {
  title: string;
  rows: StatementRow[];
  loading: boolean;
  emptyText: string;
  locale: string;
  loadingText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">{loadingText}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background-secondary p-6 text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          rows.slice(0, 10).map((row) => (
            <div key={row.account_id} className="flex items-center justify-between rounded-2xl bg-background-secondary px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {row.account_name} <span className="text-muted-foreground">({row.account_code})</span>
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{row.category}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{money(Number(row.amount || 0), locale)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default Reports;
