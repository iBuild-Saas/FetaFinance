import { useState, useEffect } from 'react';
import { db } from '@/lib/database-client';
import { useDatabase } from '@/hooks/useDatabase';
import { useAccounting } from '@/state/accounting';

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  company_id: string;
  is_active: boolean;
  [key: string]: any;
}

export function useChartOfAccounts() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();
  
  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;

  // Fetch accounts for the active company
  const fetchAccounts = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await db.from('chart_of_accounts').eq('company_id', activeCompany.id).select('*');
      
      if (fetchError) throw fetchError;
      
      // Filter active accounts and sort by account_code
      const activeAccounts = (data || [])
        .filter((a: ChartOfAccount) => a.is_active !== false)
        .sort((a: ChartOfAccount, b: ChartOfAccount) => a.account_code.localeCompare(b.account_code));
      
      setAccounts(activeAccounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  // Create default chart of accounts for a new company
  const createDefaultAccounts = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check if accounts already exist
      const { data: existingAccounts, error: checkError } = await db.from('chart_of_accounts').eq('company_id', activeCompany.id).select('*');
      
      if (checkError) {
        throw checkError;
      }
      
      if (existingAccounts && existingAccounts.length > 0) {
        await fetchAccounts();
        return;
      }
      
      const defaultAccounts = buildDefaultAccounts(activeCompany.id);
      for (const account of defaultAccounts) {
        const { error: createError } = await db.from('chart_of_accounts').insert(account);
        if (createError) {
          throw createError;
        }
      }
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create default accounts');
    } finally {
      setLoading(false);
    }
  };

  // Add a new account
  const addAccount = async (account: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at'>) => {
    if (!activeCompany?.id) return;
    
    try {
      setError(null);
      
      const { data, error: insertError } = await db.from('chart_of_accounts').insert({ ...account, company_id: activeCompany.id });
      
      if (insertError) throw insertError;
      
      if (data) {
        setAccounts(prev => [...prev, data as ChartOfAccount]);
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
      throw err;
    }
  };

  // Update an existing account
  const updateAccount = async (id: string, updates: Partial<ChartOfAccount>) => {
    try {
      setError(null);
      
      const { data, error: updateError } = await db.from('chart_of_accounts').update(id, updates);
      
      if (updateError) throw updateError;
      
      if (data) {
        setAccounts(prev => prev.map(acc => acc.id === id ? data as ChartOfAccount : acc));
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
      throw err;
    }
  };

  // Delete an account (soft delete by setting is_active to false)
  const deleteAccount = async (id: string) => {
    try {
      setError(null);
      
      // First, check if the account exists and can be deleted
      const accountToDelete = accounts.find(acc => acc.id === id);
      if (!accountToDelete) {
        throw new Error('Account not found');
      }
      
      // Check if it's a root account (parent_account_id is null)
      if (!accountToDelete.parent_account_id) {
        throw new Error('Cannot delete root accounts (Assets, Liabilities, Equity, Revenue, Expenses)');
      }
      
      // Check if it's a group account
      if (accountToDelete.is_group) {
        throw new Error('Cannot delete group accounts. Please delete all sub-accounts first.');
      }
      
      // Check if it has child accounts
      const hasChildren = accounts.some(acc => acc.parent_account_id === id);
      if (hasChildren) {
        throw new Error('Cannot delete account with sub-accounts. Please delete sub-accounts first.');
      }
      
      const { data: updatedAccount, error: deleteError } = await db.from('chart_of_accounts').update(id, { is_active: false });
      
      if (deleteError) {
        throw deleteError;
      }
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      
      return updatedAccount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
      throw err;
    }
  };

  // Get account hierarchy (parent-child relationships)
  const getAccountHierarchy = () => {
    const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
    const rootAccounts: (ChartOfAccount & { children: ChartOfAccount[] })[] = [];
    
    // Helper function to recursively build the tree
    const buildTree = (accountId: string): (ChartOfAccount & { children: ChartOfAccount[] }) | null => {
      const account = accountMap.get(accountId);
      if (!account) return null;
      
      const children = accounts
        .filter(acc => acc.parent_account_id === accountId)
        .map(child => buildTree(child.id))
        .filter((child): child is ChartOfAccount & { children: ChartOfAccount[] } => child !== null);
      
      return { ...account, children };
    };
    
    // Build the complete tree starting from root accounts
    accounts.forEach(account => {
      if (!account.parent_account_id) {
        // Root account - build the complete subtree
        const tree = buildTree(account.id);
        if (tree) {
          rootAccounts.push(tree);
        }
      }
    });
    
    return rootAccounts;
  };

  // Get accounts by type
  const getAccountsByType = (type: string) => {
    return accounts.filter(acc => acc.account_type === type);
  };

  // Get account by code
  const getAccountByCode = (code: string) => {
    return accounts.find(acc => acc.account_code === code);
  };

  // Check if an account can accept sub-accounts
  const canAcceptSubAccounts = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.is_group === true;
  };

  // Get all group accounts (accounts that can have sub-accounts)
  const getGroupAccounts = () => {
    return accounts.filter(acc => acc.is_group === true);
  };

  // Get all non-group accounts (accounts that cannot have sub-accounts)
  const getNonGroupAccounts = () => {
    return accounts.filter(acc => acc.is_group === false);
  };

  // Fetch companies when component mounts
  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  // Initialize accounts when company changes
  useEffect(() => {
    if (activeCompany?.id) {
      void createDefaultAccounts();
    } else {
      setAccounts([]);
      setLoading(false);
    }
  }, [activeCompany?.id, state.activeCompanyId]);

  // Fetch inactive accounts (for admin purposes)
  const fetchInactiveAccounts = async () => {
    if (!activeCompany?.id) return [];
    
    try {
      const { data, error } = await db.from('chart_of_accounts').eq('company_id', activeCompany.id).select('*');
      
      if (error) throw error;
      return (data || [])
        .filter((account: ChartOfAccount) => account.is_active === false)
        .sort((a: ChartOfAccount, b: ChartOfAccount) => a.account_code.localeCompare(b.account_code));
    } catch (err) {
      return [];
    }
  };

  // Reactivate an inactive account
  const reactivateAccount = async (id: string) => {
    try {
      const { data: updatedAccount, error } = await db.from('chart_of_accounts').update(id, { is_active: true });
      
      if (error) throw error;
      await fetchAccounts();
      
      return updatedAccount;
    } catch (err) {
      throw err;
    }
  };

  // Manual trigger to create accounts for a specific company
  const createAccountsForCompany = async (companyId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const existingAccounts = await db.from('chart_of_accounts').eq('company_id', companyId).select('*');
      if (existingAccounts.error) {
        throw existingAccounts.error;
      }
      if ((existingAccounts.data || []).length === 0) {
        for (const account of buildDefaultAccounts(companyId)) {
          const result = await db.from('chart_of_accounts').insert(account);
          if (result.error) {
            throw result.error;
          }
        }
      }
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create accounts');
    } finally {
      setLoading(false);
    }
  };

  return {
    accounts,
    loading,
    error,
    activeCompany,
    companies,
    fetchAccounts,
    fetchInactiveAccounts,
    createDefaultAccounts,
    createAccountsForCompany,
    addAccount,
    updateAccount,
    deleteAccount,
    reactivateAccount,
    getAccountHierarchy,
    getAccountsByType,
    getAccountByCode,
    canAcceptSubAccounts,
    getGroupAccounts,
    getNonGroupAccounts,
  };
}

function buildDefaultAccounts(companyId: string) {
  const assetId = crypto.randomUUID();
  const liabilityId = crypto.randomUUID();
  const equityId = crypto.randomUUID();
  const revenueId = crypto.randomUUID();
  const expenseId = crypto.randomUUID();

  return [
    { id: assetId, account_code: '1000', account_name: 'Assets', account_type: 'Asset', parent_account_id: null, company_id: companyId, is_active: true, normal_balance: 'DEBIT', description: 'Root assets account', is_group: true },
    { id: crypto.randomUUID(), account_code: '1100', account_name: 'Cash', account_type: 'Asset', parent_account_id: assetId, company_id: companyId, is_active: true, normal_balance: 'DEBIT', description: 'Cash account', is_group: false },
    { id: crypto.randomUUID(), account_code: '1200', account_name: 'Accounts Receivable', account_type: 'Asset', parent_account_id: assetId, company_id: companyId, is_active: true, normal_balance: 'DEBIT', description: 'Customer receivables', is_group: false },
    { id: crypto.randomUUID(), account_code: '1300', account_name: 'Inventory', account_type: 'Asset', parent_account_id: assetId, company_id: companyId, is_active: true, normal_balance: 'DEBIT', description: 'Inventory on hand', is_group: false },
    { id: liabilityId, account_code: '2000', account_name: 'Liabilities', account_type: 'Liability', parent_account_id: null, company_id: companyId, is_active: true, normal_balance: 'CREDIT', description: 'Root liabilities account', is_group: true },
    { id: crypto.randomUUID(), account_code: '2100', account_name: 'Accounts Payable', account_type: 'Liability', parent_account_id: liabilityId, company_id: companyId, is_active: true, normal_balance: 'CREDIT', description: 'Supplier payables', is_group: false },
    { id: equityId, account_code: '3000', account_name: 'Equity', account_type: 'Equity', parent_account_id: null, company_id: companyId, is_active: true, normal_balance: 'CREDIT', description: 'Root equity account', is_group: true },
    { id: crypto.randomUUID(), account_code: '3100', account_name: 'Owner Equity', account_type: 'Equity', parent_account_id: equityId, company_id: companyId, is_active: true, normal_balance: 'CREDIT', description: 'Owner equity', is_group: false },
    { id: revenueId, account_code: '4000', account_name: 'Revenue', account_type: 'Revenue', parent_account_id: null, company_id: companyId, is_active: true, normal_balance: 'CREDIT', description: 'Root revenue account', is_group: true },
    { id: crypto.randomUUID(), account_code: '4100', account_name: 'Sales Revenue', account_type: 'Revenue', parent_account_id: revenueId, company_id: companyId, is_active: true, normal_balance: 'CREDIT', description: 'Sales income', is_group: false },
    { id: expenseId, account_code: '5000', account_name: 'Expenses', account_type: 'Expense', parent_account_id: null, company_id: companyId, is_active: true, normal_balance: 'DEBIT', description: 'Root expense account', is_group: true },
    { id: crypto.randomUUID(), account_code: '5100', account_name: 'Operating Expenses', account_type: 'Expense', parent_account_id: expenseId, company_id: companyId, is_active: true, normal_balance: 'DEBIT', description: 'Operating costs', is_group: false },
  ];
}
