import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import { useToast } from "@/hooks/use-toast";
import { Calculator, BookOpen, FileText, TrendingUp, Calendar, Filter, Eye } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import type { Database } from "@/lib/supabase";

type ViewMode = "account" | "all" | "trial";

// Types from database
type GeneralLedgerEntry = {
  line_id: string;
  journal_entry_id: string;
  entry_number: string;
  entry_date: string;
  reference?: string;
  journal_memo?: string;
  line_description?: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  line_number: number;
  debit_amount: number;
  credit_amount: number;
  balance_effect: number;
  running_balance?: number;
};

type TrialBalanceEntry = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  debit_total: number;
  credit_total: number;
  balance: number;
};

type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];

const Ledger = () => {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();
  
  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<GeneralLedgerEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceEntry[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("account");
  
  // Filters
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear() - 1, 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchAccounts();
    }
  }, [activeCompany]);

  // Fetch accounts
  const fetchAccounts = async () => {
    if (!activeCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('account_code');

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch accounts",
        variant: "destructive",
      });
    }
  };

  // Fetch account ledger
  const fetchAccountLedger = async () => {
    if (!activeCompany?.id || !selectedAccount) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_account_ledger', {
          p_account_id: selectedAccount,
          p_company_id: activeCompany.id,
          p_start_date: startDate || null,
          p_end_date: endDate || null
        });

      if (error) {
        console.error('Error fetching account ledger:', error);
        if (error.message.includes('function get_account_ledger')) {
          toast({
            title: "Database Setup Required",
            description: "Please run the FIX_ACCOUNT_LEDGER_FUNCTION.sql script first.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      setLedgerEntries(data || []);
    } catch (err) {
      console.error('Account ledger fetch error:', err);
      toast({
        title: "Error",
        description: "Failed to fetch account ledger",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch trial balance
  const fetchTrialBalance = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_company_trial_balance', {
          company_uuid: activeCompany.id,
          start_date: '2023-01-01',
          end_date: asOfDate
        });

      if (error) {
        console.error('Error fetching trial balance:', error);
        if (error.message.includes('function get_company_trial_balance')) {
          toast({
            title: "Database Setup Required",
            description: "Please run the SIMPLE_TRIAL_BALANCE_QUERY.sql script first.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      setTrialBalance(data || []);
    } catch (err) {
      console.error('Trial balance fetch error:', err);
      toast({
        title: "Error",
        description: "Failed to fetch trial balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch opening balance for an account as of a specific date
  const fetchOpeningBalance = async (accountId: string, asOfDate: string) => {
    if (!activeCompany?.id) return 0;
    
    try {
      const { data, error } = await supabase
        .rpc('get_account_balance', {
          p_account_id: accountId,
          p_company_id: activeCompany.id,
          p_as_of_date: asOfDate
        });

      if (error) {
        console.error('Error fetching opening balance:', error);
        return 0;
      }
      
      return data || 0;
    } catch (err) {
      console.error('Opening balance fetch error:', err);
      return 0;
    }
  };

  // Fetch all general ledger entries
  const fetchAllLedgerEntries = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      console.log('Fetching general ledger for company:', activeCompany.id);
      console.log('Date range:', startDate, 'to', endDate);
      
      const { data, error } = await supabase
        .from('general_ledger_view')
        .select('*')
        .eq('company_id', activeCompany.id)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .eq('entry_status', 'POSTED')
        .order('entry_date', { ascending: true })
        .order('entry_number', { ascending: true })
        .order('line_number', { ascending: true });

      if (error) {
        console.error('Error fetching general ledger:', error);
        if (error.code === '42P01') {
          toast({
            title: "Database Setup Required",
            description: "Please run the CREATE_GENERAL_LEDGER_VIEWS.sql script first.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      console.log('General ledger data fetched:', data?.length || 0, 'entries');
      setLedgerEntries(data || []);
      
      // Always calculate opening balance for all accounts as of start date
      // This ensures accurate balance reporting even if no transactions in current range
      const allAccounts = accounts.filter(acc => acc.is_active);
      let totalOpeningBalance = 0;
      
      for (const account of allAccounts) {
        const balance = await fetchOpeningBalance(account.id, startDate);
        totalOpeningBalance += balance;
      }
      
      console.log('Opening balance calculated:', totalOpeningBalance, 'for', allAccounts.length, 'accounts');
      setOpeningBalance(totalOpeningBalance);
    } catch (err) {
      console.error('General ledger fetch error:', err);
      toast({
        title: "Error",
        description: "Failed to fetch general ledger entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle view changes
  useEffect(() => {
    if (view === 'account' && selectedAccount) {
      fetchAccountLedger();
    } else if (view === 'all') {
      fetchAllLedgerEntries();
    } else if (view === 'trial') {
      fetchTrialBalance();
    }
  }, [view, selectedAccount, startDate, endDate, asOfDate]);

  // Fetch opening balance whenever date range changes
  useEffect(() => {
    if (view === 'all' && activeCompany && accounts.length > 0) {
      const fetchOpeningBalanceForDateRange = async () => {
        const allAccounts = accounts.filter(acc => acc.is_active);
        let totalOpeningBalance = 0;
        
        for (const account of allAccounts) {
          const balance = await fetchOpeningBalance(account.id, startDate);
          totalOpeningBalance += balance;
        }
        
        console.log('Opening balance updated for date range:', totalOpeningBalance);
        setOpeningBalance(totalOpeningBalance);
      };
      
      fetchOpeningBalanceForDateRange();
    }
  }, [startDate, activeCompany, accounts, view]);

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);

  // Calculate totals for trial balance
  const trialBalanceTotals = useMemo(() => {
    return trialBalance.reduce((acc, entry) => ({
      totalDebits: acc.totalDebits + entry.debit_total,
      totalCredits: acc.totalCredits + entry.credit_total
    }), { totalDebits: 0, totalCredits: 0 });
  }, [trialBalance]);

  if (!activeCompany) {
    return (
      <AppLayout title="General Ledger">
        <SEO title="General Ledger — FinanceHub" description="View detailed account activity and balances" />
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Company</h3>
          <p className="text-muted-foreground">Please select a company to view the general ledger</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="General Ledger">
      <SEO title="General Ledger — FinanceHub" description="View detailed account activity and balances" />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold">General Ledger</h1>
          </div>
          <Badge variant="outline" className="text-sm">
            {activeCompany.name}
          </Badge>
        </div>

        {/* Tabs for different views */}
        <Tabs value={view} onValueChange={(value) => setView(value as ViewMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Account Ledger
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              All Entries
            </TabsTrigger>
            <TabsTrigger value="trial" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trial Balance
            </TabsTrigger>
          </TabsList>

          {/* Account Ledger Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Account Selection & Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Account</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} — {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={fetchAccountLedger} disabled={!selectedAccount || loading}>
                      {loading ? 'Loading...' : 'View Ledger'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedAccount && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      Account Ledger: {selectedAccountData?.account_code} — {selectedAccountData?.account_name}
                    </span>
                    <Badge variant="outline">
                      {selectedAccountData?.account_type} ({selectedAccountData?.normal_balance})
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading ledger entries...</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Entry #</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No transactions found for this account in the selected date range
                            </TableCell>
                          </TableRow>
                        ) : (
                          ledgerEntries.map((entry) => (
                            <TableRow key={`${entry.entry_number}-${entry.line_number || Math.random()}`} className="hover:bg-muted/50">
                              <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                              <TableCell className="font-mono text-sm">{entry.entry_number}</TableCell>
                              <TableCell className="text-sm">{entry.reference || '—'}</TableCell>
                              <TableCell className="text-sm">
                                {entry.line_description || entry.journal_memo || '—'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {entry.debit_amount > 0 ? `$${entry.debit_amount.toFixed(2)}` : '—'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {entry.credit_amount > 0 ? `$${entry.credit_amount.toFixed(2)}` : '—'}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                ${entry.running_balance?.toFixed(2) || '0.00'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* All Entries Tab */}
          <TabsContent value="all" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Date Range Filter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={fetchAllLedgerEntries} disabled={loading}>
                      {loading ? 'Loading...' : 'View All Entries'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All General Ledger Entries</CardTitle>
                {openingBalance !== 0 && (
                  <div className="text-sm text-muted-foreground">
                    Opening Balance as of {new Date(startDate).toLocaleDateString()}: 
                    <span className={`font-medium ml-1 ${openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {openingBalance >= 0 ? '+' : ''}${openingBalance.toFixed(2)}
                    </span>
                  </div>
                )}
                {ledgerEntries.length === 0 && openingBalance !== 0 && (
                  <div className="text-sm text-blue-600">
                    No transactions in selected date range, but opening balance is shown for accurate reporting
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading all entries...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Entry #</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Opening Balance Row - Always show if there's a balance */}
                      {openingBalance !== 0 && (
                        <TableRow className="bg-muted/30 border-t-2 border-primary">
                          <TableCell className="font-medium text-primary">
                            {new Date(startDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium text-primary">—</TableCell>
                          <TableCell className="font-medium text-primary">Opening Balance</TableCell>
                          <TableCell className="font-medium text-primary">—</TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            {openingBalance > 0 ? `$${openingBalance.toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            {openingBalance < 0 ? `$${Math.abs(openingBalance).toFixed(2)}` : '—'}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {ledgerEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No journal entries found in the selected date range
                          </TableCell>
                        </TableRow>
                      ) : (
                        ledgerEntries.map((entry, index) => (
                          <TableRow key={`ledger-${entry.entry_number}-${index}`} className="hover:bg-muted/50">
                            <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                            <TableCell className="font-mono text-sm">{entry.entry_number}</TableCell>
                            <TableCell className="text-sm">
                              {entry.account_code} — {entry.account_name}
                            </TableCell>
                            <TableCell className="text-sm">
                              {entry.line_description || entry.journal_memo || '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {entry.debit_amount > 0 ? `$${entry.debit_amount.toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {entry.credit_amount > 0 ? `$${entry.credit_amount.toFixed(2)}` : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trial Balance Tab */}
          <TabsContent value="trial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  As Of Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>As Of Date</Label>
                    <Input
                      type="date"
                      value={asOfDate}
                      onChange={(e) => setAsOfDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={fetchTrialBalance} disabled={loading}>
                      {loading ? 'Loading...' : 'Generate Trial Balance'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trial Balance - {new Date(asOfDate).toLocaleDateString()}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Calculating trial balance...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Code</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Debit Total</TableHead>
                        <TableHead className="text-right">Credit Total</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No account balances found as of the selected date
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {trialBalance.map((account) => (
                            <TableRow key={account.account_id} className="hover:bg-muted/50">
                              <TableCell className="font-mono">{account.account_code}</TableCell>
                              <TableCell>{account.account_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {account.account_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${account.debit_total.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${account.credit_total.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                ${account.balance.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 font-bold bg-muted/30">
                            <TableCell colSpan={3} className="text-right">TOTALS:</TableCell>
                            <TableCell className="text-right font-bold text-lg">
                              ${trialBalanceTotals.totalDebits.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg">
                              ${trialBalanceTotals.totalCredits.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg">
                              ${(trialBalanceTotals.totalDebits - trialBalanceTotals.totalCredits).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Ledger;