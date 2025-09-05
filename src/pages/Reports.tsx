import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany, computeIncomeStatement, computeBalanceSheet, computeGeneralLedger } from "@/state/accounting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";

const Reports = () => {
  const { state } = useAccounting();
  const activeCompany = useActiveCompany();
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [incomeStatement, setIncomeStatement] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState([]);
  const [financialSummary, setFinancialSummary] = useState([]);
  const [hierarchicalIncomeStatement, setHierarchicalIncomeStatement] = useState([]);
  const [hierarchicalBalanceSheet, setHierarchicalBalanceSheet] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  console.log('Reports - Active Company:', activeCompany);
  console.log('Reports - State:', state);
  console.log('Reports - Active Company ID:', state.activeCompanyId);
  console.log('Reports - Companies:', state.companies);

  // Debug: Check if activeCompanyId matches any company
  const matchingCompany = state.companies.find(c => c.id === state.activeCompanyId);
  console.log('Matching company for ID:', matchingCompany);
  console.log('Company IDs in array:', state.companies.map(c => c.id));

  // Find "feras Co" company specifically or use first company as fallback
  const ferasCompany = state.companies.find(c => c.name?.toLowerCase().includes('feras'));
  const selectedCompany = matchingCompany || activeCompany || ferasCompany || (state.companies.length > 0 ? state.companies[0] : null);
  
  // Map the frontend company ID to the actual database UUID
  const getActualCompanyId = (company) => {
    if (!company) return null;
    // Map known frontend IDs to database UUIDs
    const idMapping = {
      '1754730703821': '33105b2a-b01f-49f3-9b44-a15632da7435',
      '1754731842426': 'c2c05a4e-2368-4c1d-a0e4-92f567930926', 
      '1754731848904': 'c6ad1436-6474-43a8-b2e8-f1d078cd0cab',
      '1754731853398': '6e0641dd-87d3-4a47-b109-786538dc58f0'
    };
    return idMapping[company.id] || company.id;
  };
  
  const actualCompanyId = getActualCompanyId(selectedCompany);
  
  console.log('Selected company:', selectedCompany);
  console.log('Selected company ID:', selectedCompany?.id);
  console.log('Actual company ID (UUID):', actualCompanyId);

  // If no company available, show message
  if (!selectedCompany) return (
    <AppLayout title="Reports">
      <SEO title="Reports — FMS" description="Run Income Statement, Balance Sheet, and General Ledger by company." canonical={window.location.href} />
      <div className="space-y-4">
        <p className="text-muted-foreground">No companies available. Please create a company first.</p>
      </div>
    </AppLayout>
  );

  // Fetch Income Statement
  const fetchIncomeStatement = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_hierarchical_income_statement', {
          p_company_id: actualCompanyId,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) throw error;
      setHierarchicalIncomeStatement(data || []);
    } catch (err) {
      console.error('Error fetching income statement:', err);
      toast({
        title: "Error",
        description: "Failed to fetch income statement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Balance Sheet
  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_hierarchical_balance_sheet', {
          p_company_id: actualCompanyId,
          p_as_of_date: endDate
        });

      if (error) throw error;
      setHierarchicalBalanceSheet(data || []);
    } catch (err) {
      console.error('Error fetching balance sheet:', err);
      toast({
        title: "Error",
        description: "Failed to fetch balance sheet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Financial Summary
  const fetchFinancialSummary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_financial_summary', {
          p_company_id: actualCompanyId,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) throw error;
      setFinancialSummary(data || []);
    } catch (err) {
      console.error('Error fetching financial summary:', err);
      toast({
        title: "Error",
        description: "Failed to fetch financial summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const is = computeIncomeStatement(state, actualCompanyId);
  const bs = computeBalanceSheet(state, actualCompanyId);
  const gl = computeGeneralLedger(state, actualCompanyId);

  // Toggle group collapse/expand
  const toggleGroup = (accountId) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(accountId)) {
      newCollapsed.delete(accountId);
    } else {
      newCollapsed.add(accountId);
    }
    setCollapsedGroups(newCollapsed);
  };

  // Filter accounts based on collapsed state
  const getVisibleAccounts = (accounts) => {
    return accounts.filter(account => {
      // Always show root accounts (level 0)
      if (account.level_depth === 0) return true;
      
      // Check if any parent is collapsed
      let currentAccount = account;
      while (currentAccount.parent_account_id) {
        if (collapsedGroups.has(currentAccount.parent_account_id)) {
          return false;
        }
        // Find parent account
        currentAccount = accounts.find(a => a.account_id === currentAccount.parent_account_id);
        if (!currentAccount) break;
      }
      return true;
    });
  };

  // Render account row with proper indentation and collapse/expand functionality
  const renderAccountRow = (account, index) => {
    const isGroup = account.is_group;
    const isCollapsed = collapsedGroups.has(account.account_id);
    const indent = account.level_depth * 20; // 20px per level
    
    return (
      <TableRow key={index} className={`hover:bg-muted/50 ${isGroup ? 'font-medium bg-muted/20' : ''}`}>
        <TableCell>
          <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
            {isGroup && (
              <button
                onClick={() => toggleGroup(account.account_id)}
                className="mr-2 p-1 hover:bg-muted rounded"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
            <span className={isGroup ? 'font-semibold' : ''}>
              {account.account_name} ({account.account_code})
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className={isGroup ? 'font-semibold' : ''}>
            ${account.amount?.toFixed(2) || '0.00'}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <span className={isGroup ? 'font-semibold' : ''}>
            {account.category}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  // Render balance sheet account row with subcategory
  const renderBalanceSheetAccountRow = (account, index) => {
    const isGroup = account.is_group;
    const isCollapsed = collapsedGroups.has(account.account_id);
    const indent = account.level_depth * 20; // 20px per level
    
    return (
      <TableRow key={index} className={`hover:bg-muted/50 ${isGroup ? 'font-medium bg-muted/20' : ''}`}>
        <TableCell>
          <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
            {isGroup && (
              <button
                onClick={() => toggleGroup(account.account_id)}
                className="mr-2 p-1 hover:bg-muted rounded"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
            <span className={isGroup ? 'font-semibold' : ''}>
              {account.account_name} ({account.account_code})
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className={isGroup ? 'font-semibold' : ''}>
            ${account.amount?.toFixed(2) || '0.00'}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <span className={isGroup ? 'font-semibold' : ''}>
            {account.category} - {account.subcategory}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <AppLayout title="Reports">
      <SEO title={`Reports — ${selectedCompany.name} — FMS`} description="Financial statements generated from posted journal entries." canonical={window.location.href} />
      
      {/* Date Range Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Period
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
            <div className="flex items-end gap-2">
              <Button onClick={fetchIncomeStatement} disabled={loading}>
                Generate Income Statement
              </Button>
              <Button onClick={fetchBalanceSheet} disabled={loading}>
                Generate Balance Sheet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="auto-is" className="w-full">
        <TabsList>
          <TabsTrigger value="auto-is">Auto Income Statement</TabsTrigger>
          <TabsTrigger value="auto-bs">Auto Balance Sheet</TabsTrigger>
          <TabsTrigger value="summary">Financial Summary</TabsTrigger>
          <TabsTrigger value="is">Legacy Income Statement</TabsTrigger>
          <TabsTrigger value="bs">Legacy Balance Sheet</TabsTrigger>
          <TabsTrigger value="gl">General Ledger</TabsTrigger>
        </TabsList>

        {/* Auto Income Statement */}
        <TabsContent value="auto-is">
          <Card>
            <CardHeader>
              <CardTitle>Income Statement - {startDate} to {endDate}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Generating income statement...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getVisibleAccounts(hierarchicalIncomeStatement).map((item, index) => 
                      renderAccountRow(item, index)
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto Balance Sheet */}
        <TabsContent value="auto-bs">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet - As of {endDate}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Generating balance sheet...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getVisibleAccounts(hierarchicalBalanceSheet).map((item, index) => 
                      renderBalanceSheetAccountRow(item, index)
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Summary */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <Button onClick={fetchFinancialSummary} disabled={loading}>
                Generate Summary
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statement</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialSummary.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.statement_type}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">
                        ${item.total_amount?.toFixed(2) || '0.00'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legacy Reports */}
        <TabsContent value="is">
          <Card>
            <CardHeader><CardTitle>Legacy Income Statement</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2"><span>Total Revenue</span><span className="text-right">{is.revenue.toFixed(2)}</span></div>
              <div className="grid grid-cols-2"><span>Total Expenses</span><span className="text-right">{is.expenses.toFixed(2)}</span></div>
              <div className="grid grid-cols-2 font-semibold"><span>Net Income</span><span className="text-right">{is.netIncome.toFixed(2)}</span></div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bs">
          <Card>
            <CardHeader><CardTitle>Legacy Balance Sheet</CardTitle></CardHeader>
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
