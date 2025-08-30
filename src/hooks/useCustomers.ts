import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatabase } from '@/hooks/useDatabase';
import { useAccounting } from '@/state/accounting';
import type { Database } from '@/lib/supabase';

type Customer = Database['public']['Tables']['customers']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();

  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;

  // Fetch customers for the active company
  const fetchCustomers = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('customer_code');
      
      if (fetchError) throw fetchError;
      
      setCustomers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  // Generate unique customer code
  const generateCustomerCode = async () => {
    if (!activeCompany?.id) return 'CUST-0001';
    
    try {
      const { data, error } = await supabase.rpc('generate_customer_code', {
        company_uuid: activeCompany.id
      });
      
      if (error) throw error;
      return data || 'CUST-0001';
    } catch (err) {
      console.error('Error generating customer code:', err);
      // Fallback: generate a simple code
      const maxCode = Math.max(...customers.map(c => {
        const num = parseInt(c.customer_code.replace('CUST-', ''));
        return isNaN(num) ? 0 : num;
      }), 0);
      return `CUST-${String(maxCode + 1).padStart(4, '0')}`;
    }
  };

  // Add a new customer
  const addCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'customer_code' | 'is_active'>) => {
    if (!activeCompany?.id) return;
    
    try {
      setError(null);
      
      // Generate customer code if not provided
      const customerCode = customer.customer_code || await generateCustomerCode();
      
      const { data, error: insertError } = await supabase
        .from('customers')
        .insert([{ 
          ...customer, 
          company_id: activeCompany.id,
          customer_code: customerCode,
          is_active: true
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setCustomers(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add customer');
      throw err;
    }
  };

  // Update an existing customer
  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      setError(null);
      
      const { data, error: updateError } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      setCustomers(prev => prev.map(cust => cust.id === id ? data : cust));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
      throw err;
    }
  };

  // Delete a customer (soft delete by setting is_active to false)
  const deleteCustomer = async (id: string) => {
    try {
      console.log('[deleteCustomer] Starting soft delete for customer:', id);
      setError(null);
      
      const { data: updatedCustomer, error: deleteError } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
      
      if (deleteError) {
        console.error('[deleteCustomer] Database error:', deleteError);
        throw deleteError;
      }
      
      console.log('[deleteCustomer] Customer soft deleted successfully:', updatedCustomer);
      
      // Update local state - remove from customers array since we filter by is_active: true
      setCustomers(prev => prev.filter(cust => cust.id !== id));
      
      return updatedCustomer;
    } catch (err) {
      console.error('[deleteCustomer] Exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete customer';
      setError(errorMessage);
      throw err;
    }
  };

  // Fetch inactive customers (for admin purposes)
  const fetchInactiveCustomers = async () => {
    if (!activeCompany?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', false)
        .order('customer_code');
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[fetchInactiveCustomers] Error:', err);
      return [];
    }
  };

  // Reactivate an inactive customer
  const reactivateCustomer = async (id: string) => {
    try {
      console.log('[reactivateCustomer] Reactivating customer:', id);
      
      const { data: updatedCustomer, error } = await supabase
        .from('customers')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[reactivateCustomer] Customer reactivated:', updatedCustomer);
      
      // Refresh customers to include the reactivated one
      await fetchCustomers();
      
      return updatedCustomer;
    } catch (err) {
      console.error('[reactivateCustomer] Error:', err);
      throw err;
    }
  };

  // Search customers by name, email, or customer code
  const searchCustomers = async (searchTerm: string) => {
    if (!activeCompany?.id || !searchTerm.trim()) return [];
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%`)
        .order('customer_code');
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[searchCustomers] Error:', err);
      return [];
    }
  };

  // Get customers by type
  const getCustomersByType = (type: string) => {
    return customers.filter(cust => cust.customer_type === type);
  };

  // Get customer by code
  const getCustomerByCode = (code: string) => {
    return customers.find(cust => cust.customer_code === code);
  };

  // Get customer by email
  const getCustomerByEmail = (email: string) => {
    return customers.find(cust => cust.email === email);
  };

  // Fetch companies when component mounts
  useEffect(() => {
    console.log('[useCustomers] Component mounted, fetching companies...');
    fetchCompanies();
  }, [fetchCompanies]);

  // Debug companies data
  useEffect(() => {
    console.log('[useCustomers] Companies data changed:', companies);
    console.log('[useCustomers] Active company:', activeCompany);
  }, [companies, activeCompany]);

  // Initialize customers when company changes
  useEffect(() => {
    if (activeCompany?.id) {
      console.log('[useCustomers] Company changed, fetching customers for:', activeCompany.id);
      fetchCustomers();
    } else {
      console.log('[useCustomers] No active company, clearing customers');
      setCustomers([]);
    }
  }, [activeCompany?.id]);

  return {
    customers,
    loading,
    error,
    activeCompany,
    companies,
    fetchCustomers,
    fetchInactiveCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    reactivateCustomer,
    searchCustomers,
    generateCustomerCode,
    getCustomersByType,
    getCustomerByCode,
    getCustomerByEmail,
  };
}
