import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatabase } from '@/hooks/useDatabase';
import { useAccounting } from '@/state/accounting';
import type { Database } from '@/lib/supabase';

type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

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
      
      const { data, error: fetchError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)  // Only fetch active accounts
        .order('account_code');
      
      if (fetchError) throw fetchError;
      
      setAccounts(data || []);
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
      console.log('[createDefaultAccounts] Starting for company:', activeCompany.id);
      setLoading(true);
      setError(null);
      
      // Check if accounts already exist
      const { data: existingAccounts, error: checkError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', activeCompany.id)
        .limit(1);
      
      if (checkError) {
        console.error('[createDefaultAccounts] Error checking existing accounts:', checkError);
      }
      
      console.log('[createDefaultAccounts] Existing accounts found:', existingAccounts?.length || 0);
      
      if (existingAccounts && existingAccounts.length > 0) {
        // Accounts already exist, just fetch them
        console.log('[createDefaultAccounts] Accounts already exist, fetching...');
        await fetchAccounts();
        return;
      }
      
      // Call the database function to create default accounts
      console.log('[createDefaultAccounts] Calling create_default_chart_of_accounts function...');
      const { error: createError } = await supabase.rpc(
        'create_default_chart_of_accounts',
        { company_uuid: activeCompany.id }
      );
      
      if (createError) {
        console.error('[createDefaultAccounts] Error creating default accounts:', createError);
        throw createError;
      }
      
      console.log('[createDefaultAccounts] Default accounts created successfully');
      
      // Fetch the newly created accounts
      await fetchAccounts();
    } catch (err) {
      console.error('[createDefaultAccounts] Exception:', err);
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
      
      const { data, error: insertError } = await supabase
        .from('chart_of_accounts')
        .insert([{ ...account, company_id: activeCompany.id }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setAccounts(prev => [...prev, data]);
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
      
      const { data, error: updateError } = await supabase
        .from('chart_of_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      setAccounts(prev => prev.map(acc => acc.id === id ? data : acc));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
      throw err;
    }
  };

  // Delete an account (soft delete by setting is_active to false)
  const deleteAccount = async (id: string) => {
    try {
      console.log('[deleteAccount] Starting soft delete for account:', id);
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
      
      console.log('[deleteAccount] Proceeding with soft delete...');
      
      const { data: updatedAccount, error: deleteError } = await supabase
        .from('chart_of_accounts')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
      
      if (deleteError) {
        console.error('[deleteAccount] Database error:', deleteError);
        throw deleteError;
      }
      
      console.log('[deleteAccount] Account soft deleted successfully:', updatedAccount);
      console.log('[deleteAccount] Account is now inactive in database but preserved for history');
      
      // Update local state - remove from accounts array since we filter by is_active: true
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      
      return updatedAccount;
    } catch (err) {
      console.error('[deleteAccount] Exception:', err);
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
    
    // Debug logging
    console.log('[getAccountHierarchy] Total accounts:', accounts.length);
    console.log('[getAccountHierarchy] Root accounts found:', rootAccounts.length);
    rootAccounts.forEach(root => {
      console.log(`[getAccountHierarchy] Root: ${root.account_code} - ${root.account_name} (${root.children.length} children)`);
      root.children.forEach(child => {
        console.log(`  - Child: ${child.account_code} - ${child.account_name} (${child.children.length} children)`);
        child.children.forEach(grandchild => {
          console.log(`    - Grandchild: ${grandchild.account_code} - ${grandchild.account_name}`);
        });
      });
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
    console.log('[useChartOfAccounts] Component mounted, fetching companies...');
    fetchCompanies();
  }, [fetchCompanies]);

  // Debug companies data
  useEffect(() => {
    console.log('[useChartOfAccounts] Companies data changed:', companies);
    console.log('[useChartOfAccounts] Active company:', activeCompany);
  }, [companies, activeCompany]);

  // Initialize accounts when company changes
  useEffect(() => {
    console.log('[useChartOfAccounts] Company changed:', activeCompany);
    console.log('[useChartOfAccounts] Active company ID from state:', state.activeCompanyId);
    if (activeCompany?.id) {
      console.log('[useChartOfAccounts] Creating default accounts for company:', activeCompany.id);
      createDefaultAccounts();
    } else {
      console.log('[useChartOfAccounts] No active company or company ID');
    }
  }, [activeCompany?.id, state.activeCompanyId]);

  // Fetch inactive accounts (for admin purposes)
  const fetchInactiveAccounts = async () => {
    if (!activeCompany?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', false)
        .order('account_code');
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[fetchInactiveAccounts] Error:', err);
      return [];
    }
  };

  // Reactivate an inactive account
  const reactivateAccount = async (id: string) => {
    try {
      console.log('[reactivateAccount] Reactivating account:', id);
      
      const { data: updatedAccount, error } = await supabase
        .from('chart_of_accounts')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[reactivateAccount] Account reactivated:', updatedAccount);
      
      // Refresh accounts to include the reactivated one
      await fetchAccounts();
      
      return updatedAccount;
    } catch (err) {
      console.error('[reactivateAccount] Error:', err);
      throw err;
    }
  };

  // Manual trigger to create accounts for a specific company
  const createAccountsForCompany = async (companyId: string) => {
    try {
      console.log('[createAccountsForCompany] Creating accounts for company:', companyId);
      setLoading(true);
      setError(null);
      
      const { error: createError } = await supabase.rpc(
        'create_default_chart_of_accounts',
        { company_uuid: companyId }
      );
      
      if (createError) {
        console.error('[createAccountsForCompany] Error:', createError);
        throw createError;
      }
      
      console.log('[createAccountsForCompany] Success!');
      await fetchAccounts();
    } catch (err) {
      console.error('[createAccountsForCompany] Exception:', err);
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
