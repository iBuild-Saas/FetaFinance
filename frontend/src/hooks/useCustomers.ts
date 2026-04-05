import { useState, useEffect } from 'react';
import { db } from '@/lib/database-client';
import { useDatabase } from '@/hooks/useDatabase';
import { useAccounting } from '@/state/accounting';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  email: string;
  phone: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

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
      
      const { data, error: fetchError } = await db.from('customers').eq('company_id', activeCompany.id).select('*');
      
      if (fetchError) throw fetchError;
      
      // Filter active customers
      const activeCustomers = (data || []).filter((c: Customer) => c.is_active !== false);
      setCustomers(activeCustomers);
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
      // Simple fallback: generate code based on existing customers
      const maxCode = Math.max(...customers.map(c => {
        const num = parseInt(c.customer_code?.replace('CUST-', '') || '0');
        return isNaN(num) ? 0 : num;
      }), 0);
      return `CUST-${String(maxCode + 1).padStart(4, '0')}`;
    } catch {
      return 'CUST-0001';
    }
  };

  // Add a new customer
  const addCustomer = async (customer: any) => {
    if (!activeCompany?.id) return;
    
    try {
      setError(null);
      
      // Generate customer code if not provided
      const customerCode = customer.customer_code || await generateCustomerCode();
      
      const { data, error: insertError } = await db.from('customers').insert({
        ...customer, 
        company_id: activeCompany.id,
        customer_code: customerCode,
        is_active: true
      });
      
      if (insertError) throw insertError;
      
      if (data) {
        setCustomers(prev => [...prev, data as Customer]);
      }
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
      
      const { data, error: updateError } = await db.from('customers').update(id, updates);
      
      if (updateError) throw updateError;
      
      if (data) {
        setCustomers(prev => prev.map(cust => cust.id === id ? data as Customer : cust));
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
      throw err;
    }
  };

  // Delete a customer (soft delete by setting is_active to false)
  const deleteCustomer = async (id: string) => {
    try {
      setError(null);
      
      const { data: updatedCustomer, error: deleteError } = await db.from('customers').update(id, { is_active: false });
      
      if (deleteError) throw deleteError;
      setCustomers(prev => prev.filter(cust => cust.id !== id));
      
      return updatedCustomer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete customer';
      setError(errorMessage);
      throw err;
    }
  };

  // Fetch inactive customers (for admin purposes)
  const fetchInactiveCustomers = async () => {
    if (!activeCompany?.id) return [];
    
    try {
      const { data, error } = await db.from('customers').eq('company_id', activeCompany.id).select('*');
      
      if (error) throw error;
      // Filter inactive customers
      const inactiveCustomers = (data || []).filter((c: Customer) => c.is_active === false);
      return inactiveCustomers;
    } catch {
      return [];
    }
  };

  // Reactivate an inactive customer
  const reactivateCustomer = async (id: string) => {
    try {
      const { data: updatedCustomer, error } = await db.from('customers').update(id, { is_active: true });
      
      if (error) throw error;
      await fetchCustomers();
      
      return updatedCustomer;
    } catch (err) {
      throw err;
    }
  };

  // Search customers by name, email, or customer code
  const searchCustomers = async (searchTerm: string) => {
    if (!activeCompany?.id || !searchTerm.trim()) return [];
    
    try {
      const { data, error } = await db.from('customers').eq('company_id', activeCompany.id).select('*');
      
      if (error) throw error;
      
      // Filter active customers and search
      const filtered = (data || [])
        .filter((c: Customer) => c.is_active !== false)
        .filter((c: Customer) => 
          c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.customer_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return filtered;
    } catch {
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
    void fetchCompanies();
  }, [fetchCompanies]);

  // Initialize customers when company changes
  useEffect(() => {
    if (activeCompany?.id) {
      void fetchCustomers();
    } else {
      setCustomers([]);
      setLoading(false);
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
