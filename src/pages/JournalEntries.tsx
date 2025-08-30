import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, Calendar, Calculator, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import type { Database } from "@/lib/supabase";

type ViewMode = "list" | "add" | "detail";

// Types from database
type JournalEntry = {
  id: string;
  company_id: string;
  journal_number: string;
  entry_date?: string;
  description: string;
  reference?: string;
  memo?: string;
  status?: 'DRAFT' | 'POSTED' | 'VOID';
  total_debit?: number;
  total_credit?: number;
  is_balanced?: boolean;
  posted_by?: string;
  posted_at?: string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
};

type JournalEntryLine = {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  created_at: string;
};

type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];

interface JournalEntryFormData {
  entry_date: string;
  reference: string;
  memo: string;
  status: 'DRAFT' | 'POSTED' | 'VOID';
}

interface JournalEntryLineFormData {
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

const JournalEntries = () => {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();
  
  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedEntryLines, setSelectedEntryLines] = useState<JournalEntryLine[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  
  // Form data
  const [formData, setFormData] = useState<JournalEntryFormData>({
    entry_date: new Date().toISOString().slice(0, 10),
    reference: "",
    memo: "",
    status: "POSTED"
  });
  
  const [lines, setLines] = useState<JournalEntryLineFormData[]>([
    { account_id: "", description: "", debit_amount: 0, credit_amount: 0 }
  ]);

  // Fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchJournalEntries();
      fetchAccounts();
    }
  }, [activeCompany]);

  // Fetch journal entries
  const fetchJournalEntries = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching journal entries for company:', activeCompany.id);
      
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching journal entries:', error);
        if (error.code === '42P01') {
          toast({
            title: "Database Setup Required",
            description: "The journal_entries table doesn't exist. Please run the CREATE_JOURNAL_ENTRIES_TABLE.sql script first.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      console.log('✅ Journal entries fetched successfully:', data);
      console.log('📊 Number of entries:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🔍 First entry sample:', data[0]);
      }
      
      setJournalEntries(data || []);
    } catch (err) {
      console.error('❌ Error fetching journal entries:', err);
      toast({
        title: "Error",
        description: "Failed to fetch journal entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts (only detail accounts, not group accounts)
  const fetchAccounts = async () => {
    if (!activeCompany?.id) return;
    
    try {
      console.log('🔍 Fetching accounts for company:', activeCompany.id);
      
      // First, let's see what accounts exist without filters
      const { data: allAccounts, error: allError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', activeCompany.id);
      
      if (allError) {
        console.error('❌ Error fetching all accounts:', allError);
      } else {
        console.log('📊 All accounts in company:', allAccounts);
        console.log('🔍 Account fields available:', allAccounts?.[0] ? Object.keys(allAccounts[0]) : 'No accounts');
      }
      
      // Now try with minimal filter - just company_id
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('account_name');

      if (error) {
        console.error('❌ Error fetching accounts:', error);
        if (error.code === '42P01') {
          toast({
            title: "Database Setup Required",
            description: "The chart_of_accounts table doesn't exist. Please run the SETUP_JOURNAL_ENTRIES_SYSTEM.sql script first.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      console.log('✅ Accounts fetched successfully:', data);
      console.log('📊 Number of accounts:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🔍 First account sample:', data[0]);
      }
      
      setAccounts(data || []);
    } catch (err) {
      console.error('❌ Account fetch error:', err);
      toast({
        title: "Error",
        description: "Failed to fetch accounts",
        variant: "destructive",
      });
    }
  };

  // Find account by ID (simple and direct)
  const findAccountById = (accountId: string) => {
    if (!accountId) return null;
    
    const account = accounts.find(acc => acc.id === accountId);
    console.log('🔍 Looking up account by ID:');
    console.log('   Account ID:', accountId);
    console.log('   Found Account:', account);
    console.log('   Account Name:', account?.account_name || 'NOT FOUND');
    console.log('   Total Accounts Loaded:', accounts.length);
    
    return account;
  };

  // Calculate totals from journal entry lines
  const calculateTotals = (lines: JournalEntryLine[]) => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01; // Allow for small rounding differences
    
    // Debug: Show account lookup results
    if (lines.length > 0) {
      console.log('🔍 Account lookup results:');
      lines.forEach((line, index) => {
        const account = findAccountById(line.account_id);
        console.log(`  Line ${index + 1}:`, {
          description: line.description,
          foundAccount: account?.account_name || 'Not found',
          accountType: account?.account_type || 'Unknown'
        });
      });
    }
    
    return { totalDebit, totalCredit, isBalanced };
  };

  // Fetch journal entry lines
  const fetchJournalEntryLines = async (entryId: string) => {
    try {
      console.log('🔍 Fetching journal entry lines for entry:', entryId);
      
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select('*')
        .eq('journal_entry_id', entryId)
        .order('created_at');

      if (error) throw error;
      
      console.log('✅ Journal entry lines fetched successfully:', data);
      console.log('📊 Number of lines:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🔍 First line sample:', data[0]);
        console.log('🔍 Account IDs in lines:', data.map(line => line.account_id));
        console.log('🔍 Available account IDs:', accounts.map(acc => acc.id));
        
        // Test if any account IDs match
        data.forEach((line, index) => {
          const foundAccount = accounts.find(acc => acc.id === line.account_id);
          console.log(`🔍 Line ${index + 1} account lookup:`, {
            lineAccountId: line.account_id,
            foundAccount: foundAccount ? foundAccount.account_name : 'NOT FOUND'
          });
        });
      }
      
      setSelectedEntryLines(data || []);
    } catch (err) {
      console.error('❌ Error fetching journal entry lines:', err);
      toast({
        title: "Error",
        description: "Failed to fetch journal entry lines",
        variant: "destructive",
      });
    }
  };

  // Add line
  const addLine = () => {
    setLines(prev => [...prev, { account_id: "", description: "", debit_amount: 0, credit_amount: 0 }]);
  };

  // Remove line
  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Update line
  const updateLine = (index: number, field: keyof JournalEntryLineFormData, value: any) => {
    setLines(prev => prev.map((line, i) => 
      i === index ? { ...line, [field]: value } : line
    ));
  };

  // Calculate totals
  const totalDebit = useMemo(() => 
    lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0), [lines]
  );
  
  const totalCredit = useMemo(() => 
    lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0), [lines]
  );
  
  const isBalanced = useMemo(() => 
    Math.abs(totalDebit - totalCredit) < 0.01, [totalDebit, totalCredit]
  );

  // Save journal entry
  const saveJournalEntry = async () => {
    if (!activeCompany?.id) {
      toast({
        title: "Error",
        description: "Please select a company",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    if (!formData.entry_date || !formData.memo.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate lines
    if (lines.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }

    // Check if all lines have accounts selected
    const invalidLines = lines.filter(line => !line.account_id);
    if (invalidLines.length > 0) {
      toast({
        title: "Error",
        description: "Please select accounts for all line items",
        variant: "destructive",
      });
      return;
    }

    // Check if any selected accounts are group accounts (which shouldn't happen with our filter, but just in case)
    const groupAccountLines = lines.filter(line => {
      const selectedAccount = accounts.find(a => a.id === line.account_id);
      return selectedAccount && selectedAccount.is_group;
    });
    
    if (groupAccountLines.length > 0) {
      toast({
        title: "Error",
        description: "Group accounts cannot accept journal entries. Please select detail accounts only.",
        variant: "destructive",
      });
      return;
    }

    // Check if entry is balanced
    if (!isBalanced) {
      toast({
        title: "Error",
        description: "Journal entry must be balanced (total debits = total credits)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate entry number
      const entryNumber = `JE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
      
      // Create journal entry
      console.log('Saving journal entry with status:', formData.status);
      const entryData = {
        company_id: activeCompany.id,
        journal_number: entryNumber,
        entry_date: formData.entry_date,
        reference: formData.reference || null,
        memo: formData.memo,
        status: formData.status,
        total_debit: totalDebit,
        total_credit: totalCredit,
        is_balanced: isBalanced
      };

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert([entryData])
        .select()
        .single();

      if (entryError) {
        console.error('Journal entry creation error:', entryError);
        throw entryError;
      }

      // Create journal entry lines
      const linesData = lines.map((line, index) => ({
        journal_entry_id: entry.id,
        account_id: line.account_id,
        description: line.description || null,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesData);

      if (linesError) {
        console.error('Journal entry lines creation error:', linesError);
        throw linesError;
      }

      toast({
        title: "Success",
        description: "Journal entry created successfully",
      });

      // Reset form and go back to list
      resetForm();
      setView("list");
      fetchJournalEntries();
    } catch (err) {
      console.error('Journal entry creation error:', err);
      let errorMessage = 'Unknown error occurred';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('details' in err) {
          errorMessage = String(err.details);
        }
      }
      
      toast({
        title: "Error",
        description: `Failed to create journal entry: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    console.log('Resetting form, setting status to POSTED');
    setFormData({
      entry_date: new Date().toISOString().slice(0, 10),
      reference: "",
      memo: "",
      status: "POSTED"
    });
    setLines([{ account_id: "", description: "", debit_amount: 0, credit_amount: 0 }]);
    console.log('Form reset complete, status is now:', formData.status);
  };

  // Navigation functions
  const startAdd = () => { 
    console.log('Starting add mode, resetting form...');
    resetForm(); 
    console.log('Form reset, status should be:', formData.status);
    setView("add"); 
  };
  const startDetail = async (entry: JournalEntry) => { 
    setSelectedEntry(entry); 
    await fetchJournalEntryLines(entry.id);
    setView("detail"); 
  };
  const backToList = () => { setSelectedEntry(null); setSelectedEntryLines([]); setView("list"); };

  if (view === 'add') {
  return (
      <AppLayout title="New Journal Entry">
        <SEO title="New Journal Entry — FinanceHub" description="Create new accounting journal entry" />
        
        <div className="space-y-6">
          <Card className="mb-4">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>New Journal Entry</CardTitle>
                <Badge variant="outline">{formData.status}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={backToList}>Cancel</Button>
                <Button onClick={saveJournalEntry} disabled={loading || !isBalanced}>
                  {loading ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {/* Entry Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Entry Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                    <Label>Entry Date *</Label>
                    <Input 
                      type="date" 
                      value={formData.entry_date} 
                      onChange={e => setFormData({...formData, entry_date: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Reference</Label>
                    <Input 
                      placeholder="Reference number or document" 
                      value={formData.reference} 
                      onChange={e => setFormData({...formData, reference: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select 
                      key={`status-${formData.status}`}
                      value={formData.status} 
                      onValueChange={(value: 'DRAFT' | 'POSTED' | 'VOID') => setFormData({...formData, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft (won't appear in General Ledger)</SelectItem>
                        <SelectItem value="POSTED">Posted (appears in General Ledger)</SelectItem>
                        <SelectItem value="VOID">Void (won't appear in General Ledger)</SelectItem>
                      </SelectContent>
                    </Select>

                  </div>
                  <div className="md:col-span-3">
                    <Label>Memo *</Label>
                    <Input 
                      placeholder="Description of the journal entry" 
                      value={formData.memo} 
                      onChange={e => setFormData({...formData, memo: e.target.value})} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Journal Lines */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg">Journal Lines</CardTitle>
                <Button variant="outline" onClick={addLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Column Headers */}
                  <div className="grid grid-cols-12 gap-4 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                    <div className="col-span-4">Account</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-2">Debit</div>
                    <div className="col-span-2">Credit</div>
                    <div className="col-span-1">Action</div>
                  </div>
                  
                  {lines.map((line, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4">
                          <Select value={line.account_id} onValueChange={(value) => updateLine(index, 'account_id', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select detail account" />
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
                        <div className="col-span-3">
                          <Input
                            placeholder="Line description"
                            value={line.description}
                            onChange={e => updateLine(index, 'description', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={line.debit_amount || ''}
                            onChange={e => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={line.credit_amount || ''}
                            onChange={e => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-1">
                          {lines.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLine(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Entry Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Debits:</span>
                    <span className="font-medium">${totalDebit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Credits:</span>
                    <span className="font-medium">${totalCredit.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span>Balance:</span>
                    <div className="flex items-center gap-2">
                      {isBalanced ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        {isBalanced ? 'Balanced' : `Difference: $${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Detail view
  if (view === 'detail' && selectedEntry) {
    const { totalDebit: calculatedTotalDebit, totalCredit: calculatedTotalCredit, isBalanced: calculatedIsBalanced } = calculateTotals(selectedEntryLines);

    return (
      <AppLayout title={`Journal Entry #${selectedEntry.journal_number}`}>
        <SEO title={`Journal Entry #${selectedEntry.journal_number} — FinanceHub`} description="View journal entry details" />
        
        <div className="space-y-6">
          <Card className="mb-4">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={backToList} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to List
                </Button>
                <CardTitle>Journal Entry #{selectedEntry.journal_number}</CardTitle>
                <Badge variant="outline">{selectedEntry.status || 'UNKNOWN'}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Print</Button>
                <Button variant="outline">Export</Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Entry Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Entry Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Entry Date</Label>
                    <p>{selectedEntry.entry_date ? new Date(selectedEntry.entry_date).toLocaleDateString() : 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
                    <p>{selectedEntry.reference || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant="outline">{selectedEntry.status || 'UNKNOWN'}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Balance</Label>
                    <Badge variant={calculatedIsBalanced ? "default" : "destructive"}>
                      {calculatedIsBalanced ? 'Balanced' : 'Unbalanced'}
                    </Badge>
                  </div>
                </div>
                {selectedEntry.memo && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Memo</Label>
                    <p className="text-sm">{selectedEntry.memo}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Entry Totals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Debits:</span>
                    <span className="font-medium">${calculatedTotalDebit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Credits:</span>
                    <span className="font-medium">${calculatedTotalCredit.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Difference:</span>
                    <span className={calculatedIsBalanced ? 'text-green-600' : 'text-red-600'}>
                      ${Math.abs(calculatedTotalDebit - calculatedTotalCredit).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Journal Lines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Journal Lines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedEntryLines.map((line) => (
                  <div key={line.id} className="border rounded-lg p-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Account</Label>
                        <p>{(() => {
                          console.log('🔍 Rendering account for line:');
                          console.log('   Line ID:', line.id);
                          console.log('   Account ID:', line.account_id);
                          console.log('   Description:', line.description);
                          console.log('   Debit Amount:', line.debit_amount);
                          console.log('   Credit Amount:', line.credit_amount);
                          
                          console.log('📊 Available accounts (first 5):');
                          accounts.slice(0, 5).forEach((acc, index) => {
                            console.log(`   ${index + 1}. ID: ${acc.id}, Name: ${acc.account_name}, Type: ${acc.account_type}`);
                          });
                          
                          const account = findAccountById(line.account_id);
                          console.log('🔍 Looking up account by ID:', { 
                            lineDescription: line.description, 
                            accountId: line.account_id,
                            foundAccount: account,
                            totalAccountsAvailable: accounts.length
                          });
                          
                          if (account) {
                            return account.account_name;
                          } else {
                            return `Unknown Account (ID: ${line.account_id?.substring(0, 8)}...)`;
                          }
                        })()}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                        <p className="text-sm">{line.description || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Debit</Label>
                        <p className={line.debit_amount > 0 ? 'font-medium' : 'text-muted-foreground'}>
                          {line.debit_amount > 0 ? `$${line.debit_amount.toFixed(2)}` : '—'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Credit</Label>
                        <p className={line.credit_amount > 0 ? 'font-medium' : 'text-muted-foreground'}>
                          {line.credit_amount > 0 ? `$${line.credit_amount.toFixed(2)}` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Journal Entries">
      <SEO title="Journal Entries — FinanceHub" description="Manage accounting journal entries" />
      {!activeCompany ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Company</h3>
          <p className="text-muted-foreground">Please select a company to manage journal entries</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {view === "list" && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Journal Entries</CardTitle>
                <Button onClick={startAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Entry
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading journal entries...</p>
                  </div>
                ) : journalEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No journal entries found</h3>
                    <p className="text-muted-foreground">Get started by creating your first journal entry</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => { console.log('🔍 Rendering journal entries:', journalEntries); return null; })()}
                    {journalEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Calculator className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{entry.journal_number}</h3>
                            <p className="text-sm text-muted-foreground">
                              {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : 'No date'} • {entry.description || 'No description'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{entry.status || 'UNKNOWN'}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startDetail(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default JournalEntries;
