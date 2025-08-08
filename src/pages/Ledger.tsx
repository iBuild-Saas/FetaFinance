import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Calculator, BookOpen } from "lucide-react";
import { useState } from "react";

const Ledger = () => {
  const { state } = useAccounting();
  const company = useActiveCompany();
  const [selectedAccount, setSelectedAccount] = useState('');

  const accounts = state.accounts.filter(a => a.companyId === state.activeCompanyId);
  const journalEntries = state.journals.filter(j => j.companyId === state.activeCompanyId);

  const getLedgerEntries = (accountId: string) => {
    const entries: Array<{
      date: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }> = [];

    let runningBalance = 0;

    journalEntries
      .flatMap(je => je.lines.filter(line => line.accountId === accountId).map(line => ({ ...line, entryDate: je.date })))
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
      .forEach(line => {
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        runningBalance += debit - credit;

        entries.push({
          date: line.entryDate,
          description: line.description || '',
          debit,
          credit,
          balance: runningBalance
        });
      });

    return entries;
  };

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);
  const ledgerEntries = selectedAccount ? getLedgerEntries(selectedAccount) : [];

  return (
    <AppLayout title="General Ledger">
      <SEO title="General Ledger — FinanceHub" description="View detailed account activity and balances" />
      
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-primary" />
        <span className="text-lg font-medium">General Ledger</span>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Account Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account to view ledger" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.number} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedAccount && (
          <Card>
            <CardHeader>
              <CardTitle>
                Account Ledger: {selectedAccountData?.number} - {selectedAccountData?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No transactions for this account
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerEntries.map((entry, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${entry.balance.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Ledger;