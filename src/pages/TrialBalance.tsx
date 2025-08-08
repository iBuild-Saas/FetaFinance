import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Calculator, Scale } from "lucide-react";

const TrialBalance = () => {
  const { state } = useAccounting();
  const company = useActiveCompany();

  const accounts = state.accounts.filter(a => a.companyId === state.activeCompanyId);
  const journalEntries = state.journals.filter(j => j.companyId === state.activeCompanyId);

  const getAccountBalance = (accountId: string) => {
    let debitTotal = 0;
    let creditTotal = 0;

    journalEntries.forEach(je => {
      je.lines.forEach(line => {
        if (line.accountId === accountId) {
          debitTotal += line.debit || 0;
          creditTotal += line.credit || 0;
        }
      });
    });

    return { debitTotal, creditTotal, balance: debitTotal - creditTotal };
  };

  const trialBalanceData = accounts.map(account => ({
    ...account,
    ...getAccountBalance(account.id)
  })).filter(account => account.debitTotal > 0 || account.creditTotal > 0);

  const totalDebits = trialBalanceData.reduce((sum, account) => sum + account.debitTotal, 0);
  const totalCredits = trialBalanceData.reduce((sum, account) => sum + account.creditTotal, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <AppLayout title="Trial Balance">
      <SEO title="Trial Balance — FinanceHub" description="View trial balance to verify accounting equation" />
      
      <div className="flex items-center gap-3 mb-6">
        <Scale className="w-6 h-6 text-primary" />
        <span className="text-lg font-medium">Trial Balance</span>
        {isBalanced ? (
          <Badge className="bg-success-light text-success">Balanced</Badge>
        ) : (
          <Badge variant="destructive">Out of Balance</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Trial Balance - {company?.name || 'No Company Selected'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            As of {new Date().toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalanceData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <div>
                      <h3 className="font-medium mb-2">No transactions yet</h3>
                      <p className="text-sm">Record some transactions to see the trial balance</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {trialBalanceData.map((account) => (
                    <TableRow key={account.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono">{account.number}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{account.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {account.debitTotal > 0 ? `$${account.debitTotal.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {account.creditTotal > 0 ? `$${account.creditTotal.toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold bg-muted/30">
                    <TableCell colSpan={3}>TOTALS</TableCell>
                    <TableCell className="text-right">${totalDebits.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${totalCredits.toFixed(2)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default TrialBalance;