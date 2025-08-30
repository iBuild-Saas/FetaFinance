import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { useAccounting } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Eye, MoreHorizontal, ChevronRight, ChevronDown, Building2 } from "lucide-react";
import type { Database } from "@/lib/supabase";

type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];
type ChartOfAccountWithChildren = ChartOfAccount & { children: ChartOfAccountWithChildren[] };
type ViewMode = "list" | "add" | "detail" | "edit";

const ChartOfAccounts = () => {
  const { 
    accounts, 
    loading, 
    error, 
    activeCompany,
    companies,
    addAccount, 
    updateAccount, 
    deleteAccount, 
    getAccountHierarchy,
    createAccountsForCompany,
    fetchInactiveAccounts,
    reactivateAccount,
    canAcceptSubAccounts,
    getGroupAccounts
  } = useChartOfAccounts();
  
  const { state } = useAccounting();
  
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
  const [inactiveAccounts, setInactiveAccounts] = useState<ChartOfAccount[]>([]);
  
  // Form state
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<string>("Asset");
  const [normalBalance, setNormalBalance] = useState<string>("DEBIT");
  const [description, setDescription] = useState("");
  const [parentAccountId, setParentAccountId] = useState<string | undefined>(undefined);
  const [isGroup, setIsGroup] = useState(false);

  const accountHierarchy = useMemo(() => getAccountHierarchy() as ChartOfAccountWithChildren[], [accounts, getAccountHierarchy]);
  
  const accountTypes = [
    { value: "Asset", label: "Asset", balance: "DEBIT" },
    { value: "Liability", label: "Liability", balance: "CREDIT" },
    { value: "Equity", label: "Equity", balance: "CREDIT" },
    { value: "Revenue", label: "Revenue", balance: "CREDIT" },
    { value: "Expense", label: "Expense", balance: "DEBIT" }
  ];

  const toggleExpanded = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const startAdd = (parentAccount?: ChartOfAccount) => {
    setAccountCode("");
    setAccountName("");
    setAccountType(parentAccount?.account_type || "Asset");
    setNormalBalance(parentAccount?.normal_balance || "DEBIT");
    setDescription("");
    setParentAccountId(parentAccount?.id);
    setIsGroup(false); // Default to non-group account
    setView("add");
  };

  // Update account type and normal balance when parent account changes
  useEffect(() => {
    if (parentAccountId) {
      const parentAccount = accounts.find(a => a.id === parentAccountId);
      if (parentAccount) {
        setAccountType(parentAccount.account_type);
        setNormalBalance(parentAccount.normal_balance);
      }
    }
  }, [parentAccountId, accounts]);

  const startDetail = (id: string) => {
    setSelectedId(id);
    setView("detail");
  };

  const startEdit = (id: string) => {
    const account = accounts.find(a => a.id === id);
    if (account) {
      setAccountCode(account.account_code);
      setAccountName(account.account_name);
      setAccountType(account.account_type);
      setNormalBalance(account.normal_balance);
      setDescription(account.description || "");
      setParentAccountId(account.parent_account_id || undefined);
      setIsGroup(account.is_group);
      setSelectedId(id);
      setView("edit");
    }
  };

  const backToList = () => {
    setSelectedId(undefined);
    setParentAccountId(undefined);
    setView("list");
  };

  const handleSubmit = async () => {
    if (!accountCode.trim() || !accountName.trim()) return;

    // Validate that parent account is a group account if specified
    if (parentAccountId && parentAccountId !== "ROOT") {
      const parentAccount = accounts.find(a => a.id === parentAccountId);
      if (parentAccount && !parentAccount.is_group) {
        alert('Error: Parent account must be a group account to accept sub-accounts.');
        return;
      }
    }

    try {
      if (view === "add") {
        await addAccount({
          account_code: accountCode.trim(),
          account_name: accountName.trim(),
          account_type: accountType,
          parent_account_id: parentAccountId || null,
          is_active: true,
          normal_balance: normalBalance,
          description: description.trim() || null,
          is_group: isGroup,
          company_id: "" // This will be set by the hook
        });
      } else if (view === "edit" && selectedId) {
        await updateAccount(selectedId, {
          account_code: accountCode.trim(),
          account_name: accountName.trim(),
          account_type: accountType,
          parent_account_id: parentAccountId || null,
          normal_balance: normalBalance,
          description: description.trim() || null,
          is_group: isGroup,
        });
      }
      backToList();
    } catch (error) {
      console.error("Failed to save account:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const accountToDelete = accounts.find(acc => acc.id === id);
    if (!accountToDelete) return;
    
    const confirmMessage = `Are you sure you want to delete "${accountToDelete.account_name}" (${accountToDelete.account_code})?\n\nThis will:\n• Mark the account as inactive\n• Remove it from the chart of accounts view\n• Preserve any historical data\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteAccount(id);
        // Show success message (you can add a toast notification here)
        console.log("Account deleted successfully");
      } catch (error) {
        console.error("Failed to delete account:", error);
        // The error is already set in the hook, so it will show in the UI
      }
    }
  };

  const selected = accounts.find(a => a.id === selectedId);

  const renderAccountTree = (accounts: ChartOfAccountWithChildren[], level = 0) => {
    return accounts.map((account) => {
      const hasChildren = account.children && account.children.length > 0;
      const isExpanded = expandedAccounts.has(account.id);
      
      return (
        <div key={account.id} className="space-y-1 group">
          <div 
            className={`
              flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors
              ${level === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}
            `}
            style={{ paddingLeft: `${level * 20 + 16}px` }}
          >
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(account.id)}
                className="p-1 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            
            <div className="flex-1 flex items-center gap-3">
              <span className="font-mono text-sm">{account.account_code}</span>
              <span className="flex-1">{account.account_name}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                {account.account_type}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                {account.normal_balance}
              </span>
              {account.is_group && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  Group
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startDetail(account.id)}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(account.id)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              {/* Only show add button for group accounts */}
              {account.is_group && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startAdd(account)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {/* Only show delete button for sub-accounts (level > 0) and accounts without children */}
              {level > 0 && !account.children?.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(account.id)}
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  title="Delete account"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {hasChildren && isExpanded && (
            <div className="ml-4">
              {renderAccountTree(account.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const renderView = () => {
    if (view === "add" || view === "edit") {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{view === "add" ? "Add New Account" : "Edit Account"}</CardTitle>
              <Button variant="outline" onClick={backToList}>
                ← Back to Accounts
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-md">
              {parentAccountId && parentAccountId !== "ROOT" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Parent Account:</strong> {accounts.find(a => a.id === parentAccountId)?.account_name}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    This account will inherit the type and normal balance from the parent.
                  </p>
                  {!accounts.find(a => a.id === parentAccountId)?.is_group && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Warning: Parent account is not a group account and cannot have sub-accounts.
                    </p>
                  )}
                </div>
              )}
              
              <div>
                <label htmlFor="parent-account" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Account (Optional)
                </label>
                <Select value={parentAccountId || "ROOT"} onValueChange={(value) => setParentAccountId(value === "ROOT" ? undefined : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent account (group accounts only)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROOT">No parent (root account)</SelectItem>
                    {getGroupAccounts().map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Only group accounts can have sub-accounts. Select a parent to create a hierarchical structure.
                </p>
              </div>
              
              <div>
                <label htmlFor="account-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Account Code
                </label>
                <Input
                  id="account-code"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  placeholder="e.g., 1000"
                  className="w-full"
                />
              </div>
              
              <div>
                <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <Input
                  id="account-name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g., Cash"
                  className="w-full"
                />
              </div>
              
              <div>
                <label htmlFor="account-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label htmlFor="normal-balance" className="block text-sm font-medium text-gray-700 mb-1">
                  Normal Balance
                </label>
                <Select value={normalBalance} onValueChange={setNormalBalance}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">Debit</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Account description"
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-group"
                  checked={isGroup}
                  onChange={(e) => setIsGroup(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is-group" className="text-sm font-medium text-gray-700">
                  This is a group account (can contain sub-accounts)
                </label>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button onClick={handleSubmit} disabled={!accountCode.trim() || !accountName.trim()}>
                  {view === "add" ? "Create Account" : "Update Account"}
                </Button>
                <Button variant="outline" onClick={backToList}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (view === "detail" && selected) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Account Details</CardTitle>
              <Button variant="outline" onClick={backToList}>
                ← Back to Accounts
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Code</label>
                  <p className="text-lg font-semibold font-mono">{selected.account_code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Name</label>
                  <p className="text-lg font-semibold">{selected.account_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Type</label>
                  <p className="text-lg">{selected.account_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Normal Balance</label>
                  <p className="text-lg">{selected.normal_balance}</p>
                </div>
                {selected.description && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-lg">{selected.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Type</label>
                  <p className="text-lg">
                    {selected.is_group ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Group Account
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Detail Account
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex space-x-3">
                <Button onClick={() => startEdit(selected.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Account
                </Button>
                {/* Only show Add Sub Account button for group accounts */}
                {selected.is_group && (
                  <Button variant="outline" onClick={() => startAdd(selected)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sub Account
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Default list view
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
          <div className="space-y-4">
            {/* Company Info */}
            {activeCompany && (
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                <Building2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Active Company: {activeCompany.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Chart of Accounts for {activeCompany.name}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Click on account types to expand/collapse. Hover over accounts to see action buttons.
              </p>
              <div className="flex gap-2">
                {activeCompany && (
                  <Button 
                    variant="outline" 
                    onClick={() => createAccountsForCompany(activeCompany.id)}
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Default Accounts'}
                  </Button>
                )}
                <Button onClick={() => startAdd()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!activeCompany ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No company selected.</p>
              <p className="text-sm text-muted-foreground mb-4">
                Please select a company from the dropdown in the navigation bar above.
              </p>
              {companies && companies.length === 0 && (
                <p className="text-sm text-muted-foreground">No companies found. Please create a company first.</p>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading accounts...</div>
            </div>
          ) : error ? (
            <div className="text-destructive p-4 border border-destructive/20 rounded-lg">
              <p className="font-medium mb-2">Error:</p>
              <p>{error}</p>
              {activeCompany && (
                <div className="mt-3 space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => createAccountsForCompany(activeCompany.id)}
                  >
                    Try Creating Default Accounts
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                    className="ml-2"
                  >
                    Refresh Page
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Make sure you have selected a company from the navigation bar above.
              </p>
            </div>
          ) : accountHierarchy.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No accounts found for {activeCompany.name}.</p>
              <Button 
                onClick={() => createAccountsForCompany(activeCompany.id)}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Default Chart of Accounts'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {renderAccountTree(accountHierarchy)}
            </div>
          )}
          
          {/* Inactive Accounts Section */}
          {activeCompany && (
            <div className="mt-6">
              <Button 
                variant="outline" 
                onClick={async () => {
                  const inactiveAccounts = await fetchInactiveAccounts();
                  if (inactiveAccounts.length > 0) {
                    setShowInactiveAccounts(true);
                    setInactiveAccounts(inactiveAccounts);
                  } else {
                    alert('No inactive accounts found.');
                  }
                }}
                className="w-full"
              >
                Show Inactive Accounts ({inactiveAccounts.length || 0})
              </Button>
              
              {showInactiveAccounts && inactiveAccounts.length > 0 && (
                <div className="mt-4 p-4 border border-muted rounded-lg">
                  <h3 className="font-medium mb-3">Inactive Accounts</h3>
                  <div className="space-y-2">
                    {inactiveAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div>
                          <span className="font-mono text-sm">{account.account_code}</span>
                          <span className="ml-2">{account.account_name}</span>
                          <span className="ml-2 text-xs px-2 py-1 rounded bg-muted">
                            {account.account_type}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await reactivateAccount(account.id);
                              setInactiveAccounts(prev => prev.filter(acc => acc.id !== account.id));
                              if (inactiveAccounts.length === 1) {
                                setShowInactiveAccounts(false);
                              }
                            } catch (error) {
                              console.error('Failed to reactivate account:', error);
                            }
                          }}
                        >
                          Reactivate
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInactiveAccounts(false)}
                    className="mt-3"
                  >
                    Hide Inactive Accounts
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout title="Chart of Accounts">
      <SEO title="Chart of Accounts — FMS" description="Manage your company's chart of accounts with proper hierarchy and account types." />
      

      
      {renderView()}
    </AppLayout>
  );
};

export default ChartOfAccounts;
