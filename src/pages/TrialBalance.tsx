import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import { Calculator, Scale } from "lucide-react";

type TrialBalanceRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit_total: number;
  credit_total: number;
  balance: number;
};

const money = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);

const TrialBalance = () => {
  const { t, i18n } = useTranslation();
  const { supabase } = useDatabaseContext();
  const { data: companies } = useDatabase("companies");
  const { state } = useAccounting();
  const locale = i18n.language === "ar" ? "ar" : "en-US";

  const activeCompany = useMemo(
    () => companies?.find((company) => company.id === state.activeCompanyId) || null,
    [companies, state.activeCompanyId],
  );

  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);

  const loadTrialBalance = async () => {
    if (!activeCompany?.id) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase.rpc("get_company_trial_balance", {
        company_uuid: activeCompany.id,
        start_date: "2023-01-01",
        end_date: asOfDate,
      });
      setRows((data || []) as TrialBalanceRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTrialBalance();
  }, [activeCompany?.id]);

  const totals = rows.reduce(
    (acc, row) => ({
      debits: acc.debits + Number(row.debit_total || 0),
      credits: acc.credits + Number(row.credit_total || 0),
    }),
    { debits: 0, credits: 0 },
  );
  const isBalanced = Math.abs(totals.debits - totals.credits) < 0.01;

  return (
    <AppLayout title={t("modules.trialBalance")}>
      <SEO title={`${t("modules.trialBalance")} - FinanceHub`} description={t("trialBalancePage.description")} />

      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{activeCompany?.name || t("company.selectCompany")}</Badge>
                <Badge variant={isBalanced ? "outline" : "destructive"}>
                  {isBalanced ? t("trialBalancePage.balanced") : t("trialBalancePage.outOfBalance")}
                </Badge>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{t("trialBalancePage.heroTitle")}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("trialBalancePage.heroDescription")}</p>
            </div>

            <div className="flex gap-3">
              <div>
                <Label>{t("trialBalancePage.asOfDate")}</Label>
                <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={() => void loadTrialBalance()} disabled={!activeCompany || loading}>
                  {loading ? t("common.loading") : t("common.refresh")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard title={t("trialBalancePage.totalDebits")} value={money(totals.debits, locale)} />
          <SummaryCard title={t("trialBalancePage.totalCredits")} value={money(totals.credits, locale)} />
          <SummaryCard title={t("trialBalancePage.difference")} value={money(totals.debits - totals.credits, locale)} danger={!isBalanced} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t("trialBalancePage.rowsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("trialBalancePage.accountCode")}</TableHead>
                  <TableHead>{t("trialBalancePage.accountName")}</TableHead>
                  <TableHead>{t("common.type")}</TableHead>
                  <TableHead className="text-right">{t("ledger.debit")}</TableHead>
                  <TableHead className="text-right">{t("ledger.credit")}</TableHead>
                  <TableHead className="text-right">{t("trialBalancePage.difference")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!activeCompany ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {t("trialBalancePage.selectCompany")}
                    </TableCell>
                  </TableRow>
                ) : loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {t("trialBalancePage.loadingBalances")}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {t("trialBalancePage.noActivity")}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {rows.map((row) => (
                      <TableRow key={row.account_id}>
                        <TableCell className="font-mono">{row.account_code}</TableCell>
                        <TableCell>{row.account_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.account_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{money(Number(row.debit_total || 0), locale)}</TableCell>
                        <TableCell className="text-right">{money(Number(row.credit_total || 0), locale)}</TableCell>
                        <TableCell className="text-right font-semibold">{money(Number(row.balance || 0), locale)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 bg-muted/30 font-semibold">
                      <TableCell colSpan={3}>{t("trialBalancePage.totals")}</TableCell>
                      <TableCell className="text-right">{money(totals.debits, locale)}</TableCell>
                      <TableCell className="text-right">{money(totals.credits, locale)}</TableCell>
                      <TableCell className="text-right">{money(totals.debits - totals.credits, locale)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

function SummaryCard({ title, value, danger = false }: { title: string; value: string; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <p className={`mt-3 text-3xl font-semibold tracking-[-0.03em] ${danger ? "text-red-600" : ""}`}>{value}</p>
          </div>
          <div className="metric-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
            <Scale className={`h-5 w-5 ${danger ? "text-red-600" : "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TrialBalance;
