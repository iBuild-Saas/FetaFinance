import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany, computeIncomeStatement, computeBalanceSheet, computeGeneralLedger } from "@/state/accounting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Reports = () => {
  const { state } = useAccounting();
  const company = useActiveCompany();

  if (!company) return (
    <AppLayout title="Reports">
      <SEO title="Reports — FMS" description="Run Income Statement, Balance Sheet, and General Ledger by company." canonical={window.location.href} />
      <p className="text-muted-foreground">Select a company.</p>
    </AppLayout>
  );

  const is = computeIncomeStatement(state, company.id);
  const bs = computeBalanceSheet(state, company.id);
  const gl = computeGeneralLedger(state, company.id);

  return (
    <AppLayout title="Reports">
      <SEO title={`Reports — ${company.name} — FMS`} description="Financial statements generated from posted journal entries." canonical={window.location.href} />
      <Tabs defaultValue="is" className="w-full">
        <TabsList>
          <TabsTrigger value="is">Income Statement</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="gl">General Ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="is">
          <Card>
            <CardHeader><CardTitle>Income Statement</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2"><span>Total Revenue</span><span className="text-right">{is.revenue.toFixed(2)}</span></div>
              <div className="grid grid-cols-2"><span>Total Expenses</span><span className="text-right">{is.expenses.toFixed(2)}</span></div>
              <div className="grid grid-cols-2 font-semibold"><span>Net Income</span><span className="text-right">{is.netIncome.toFixed(2)}</span></div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bs">
          <Card>
            <CardHeader><CardTitle>Balance Sheet</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2"><span>Total Assets</span><span className="text-right">{bs.assets.toFixed(2)}</span></div>
              <div className="grid grid-cols-2"><span>Total Liabilities</span><span className="text-right">{bs.liabilities.toFixed(2)}</span></div>
              <div className="grid grid-cols-2"><span>Total Equity</span><span className="text-right">{bs.equity.toFixed(2)}</span></div>
              <div className="grid grid-cols-2 font-semibold"><span>Balance (should be 0)</span><span className="text-right">{bs.balance.toFixed(2)}</span></div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="gl">
          <Card>
            <CardHeader><CardTitle>General Ledger</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 text-sm font-medium text-muted-foreground">
                <span>Date</span><span>Account</span><span>Memo</span><span>Debit</span><span>Credit</span><span>Balance</span>
              </div>
              <div className="mt-2 space-y-2">
                {gl.map((r, i) => (
                  <div key={i} className="grid grid-cols-6 text-sm rounded-md border p-2">
                    <span>{r.date}</span>
                    <span>{r.accountName}</span>
                    <span>{r.memo ?? ''}</span>
                    <span>{r.debit ? r.debit.toFixed(2) : ''}</span>
                    <span>{r.credit ? r.credit.toFixed(2) : ''}</span>
                    <span>{r.balance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Reports;
