import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { useAccounting } from "@/state/accounting";
import { useDatabase } from "@/hooks/useDatabase";
import { Building2, Calendar, FileText, RefreshCw, Wallet } from "lucide-react";

type SupplierPayable = {
  supplier_id: string;
  supplier_name: string;
  email?: string;
  account_code?: string;
  account_name?: string;
  entry_date: string;
  due_date?: string;
  reference?: string;
  balance: number;
  aging_bucket: string;
  days_overdue?: number;
};

type SupplierPayableAging = {
  supplier_id: string;
  supplier_name: string;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90_days: number;
  total_balance: number;
};

const money = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);

const AccountsPayable = () => {
  const { t, i18n } = useTranslation();
  const { supabase } = useDatabaseContext();
  const { data: companies } = useDatabase("companies");
  const { state } = useAccounting();
  const locale = i18n.language === "ar" ? "ar" : "en-US";

  const activeCompany = useMemo(
    () => companies?.find((company) => company.id === state.activeCompanyId) || null,
    [companies, state.activeCompanyId],
  );

  const [view, setView] = useState<"aging" | "detail">("aging");
  const [loading, setLoading] = useState(false);
  const [payables, setPayables] = useState<SupplierPayable[]>([]);
  const [agingSummary, setAgingSummary] = useState<SupplierPayableAging[]>([]);

  const loadData = async () => {
    if (!activeCompany?.id) {
      setPayables([]);
      setAgingSummary([]);
      return;
    }

    setLoading(true);
    try {
      const [detailResult, agingResult] = await Promise.all([
        supabase.from("supplier_payables").select("*").eq("company_id", activeCompany.id).order("days_overdue", { ascending: false }),
        supabase.from("supplier_payables_aging").select("*").eq("company_id", activeCompany.id).order("total_balance", { ascending: false }),
      ]);

      setPayables((detailResult.data || []) as SupplierPayable[]);
      setAgingSummary((agingResult.data || []) as SupplierPayableAging[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeCompany?.id]);

  const totalPayables = agingSummary.reduce((sum, row) => sum + Number(row.total_balance || 0), 0);
  const overduePayables = agingSummary.reduce(
    (sum, row) => sum + Number(row.days_1_30 || 0) + Number(row.days_31_60 || 0) + Number(row.days_61_90 || 0) + Number(row.over_90_days || 0),
    0,
  );

  return (
    <AppLayout title={t("accountsPayable.title")}>
      <SEO title={`${t("accountsPayable.title")} - FinanceHub`} description={t("accountsPayable.description")} />

      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{activeCompany?.name || t("company.selectCompany")}</Badge>
                <Badge variant="outline">{t("accountsPayable.badge")}</Badge>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{t("accountsPayable.heroTitle")}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("accountsPayable.heroDescription")}</p>
            </div>

            <div className="flex gap-2">
              <Button variant={view === "aging" ? "default" : "outline"} onClick={() => setView("aging")}>
                <Calendar className="mr-2 h-4 w-4" />
                {t("accountsPayable.aging")}
              </Button>
              <Button variant={view === "detail" ? "default" : "outline"} onClick={() => setView("detail")}>
                <FileText className="mr-2 h-4 w-4" />
                {t("accountsPayable.detail")}
              </Button>
              <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("common.refresh")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard title={t("accountsPayable.totalPayables")} value={money(totalPayables, locale)} icon={Wallet} />
          <SummaryCard title={t("accountsPayable.overdueBalance")} value={money(overduePayables, locale)} icon={Calendar} />
          <SummaryCard title={t("accountsPayable.openSuppliers")} value={String(agingSummary.length)} icon={Building2} />
        </div>

        {view === "aging" ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("accountsPayable.agingSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">{t("accountsPayable.supplier")}</th>
                    <th className="p-2 text-right font-medium">{t("accountsPayable.current")}</th>
                    <th className="p-2 text-right font-medium">1-30</th>
                    <th className="p-2 text-right font-medium">31-60</th>
                    <th className="p-2 text-right font-medium">61-90</th>
                    <th className="p-2 text-right font-medium">90+</th>
                    <th className="p-2 text-right font-medium">{t("common.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {!activeCompany ? (
                    <EmptyRow colSpan={7} text={t("accountsPayable.selectCompany")} />
                  ) : loading ? (
                    <EmptyRow colSpan={7} text={t("accountsPayable.loadingSummary")} />
                  ) : agingSummary.length === 0 ? (
                    <EmptyRow colSpan={7} text={t("accountsPayable.noSummary")} />
                  ) : (
                    agingSummary.map((row) => (
                      <tr key={row.supplier_id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{row.supplier_name}</td>
                        <td className="p-2 text-right">{money(row.current_amount, locale)}</td>
                        <td className="p-2 text-right">{money(row.days_1_30, locale)}</td>
                        <td className="p-2 text-right">{money(row.days_31_60, locale)}</td>
                        <td className="p-2 text-right">{money(row.days_61_90, locale)}</td>
                        <td className="p-2 text-right">{money(row.over_90_days, locale)}</td>
                        <td className="p-2 text-right font-semibold">{money(row.total_balance, locale)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("accountsPayable.openPayableDetail")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">{t("accountsPayable.supplier")}</th>
                    <th className="p-2 text-left font-medium">{t("accountsPayable.reference")}</th>
                    <th className="p-2 text-left font-medium">{t("accountsPayable.dates")}</th>
                    <th className="p-2 text-left font-medium">{t("accountsPayable.aging")}</th>
                    <th className="p-2 text-right font-medium">{t("accountsPayable.balance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {!activeCompany ? (
                    <EmptyRow colSpan={5} text={t("accountsPayable.selectDetail")} />
                  ) : loading ? (
                    <EmptyRow colSpan={5} text={t("accountsPayable.loadingDetail")} />
                  ) : payables.length === 0 ? (
                    <EmptyRow colSpan={5} text={t("accountsPayable.noDetail")} />
                  ) : (
                    payables.map((row, index) => (
                      <tr key={`${row.supplier_id}-${row.reference}-${index}`} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div className="font-medium">{row.supplier_name}</div>
                          {row.email && <div className="text-sm text-muted-foreground">{row.email}</div>}
                        </td>
                        <td className="p-2">
                          <div className="text-sm">{row.reference || t("accountsPayable.openItem")}</div>
                          {row.account_code && (
                            <div className="text-xs text-muted-foreground">
                              {row.account_code} · {row.account_name}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-sm">
                          <div>{t("accountsPayable.entryDate", { date: new Date(row.entry_date).toLocaleDateString(locale) })}</div>
                          <div className="text-muted-foreground">
                            {t("accountsPayable.dueDate", {
                              date: row.due_date ? new Date(row.due_date).toLocaleDateString(locale) : t("accountsPayable.notAvailable"),
                            })}
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant={row.days_overdue && row.days_overdue > 0 ? "destructive" : "outline"}>
                            {row.aging_bucket}
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-semibold">{money(row.balance, locale)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

function SummaryCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Wallet }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
          </div>
          <div className="metric-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-sm text-muted-foreground">
        {text}
      </td>
    </tr>
  );
}

export default AccountsPayable;
