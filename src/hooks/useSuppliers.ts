import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatabase } from '@/hooks/useDatabase';
import { useAccounting } from '@/state/accounting';
import type { Database } from '@/lib/supabase';

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();

  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;

  // Fetch suppliers for the active company
  const fetchSuppliers = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('supplier_code');
      
      if (fetchError) throw fetchError;
      
      setSuppliers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  // Generate unique supplier code
  const generateSupplierCode = async () => {
    if (!activeCompany?.id) return 'SUPP-0001';
    
    try {
      const { data, error } = await supabase.rpc('generate_supplier_code', {
        company_uuid: activeCompany.id
      });
      
      if (error) throw error;
      return data || 'SUPP-0001';
    } catch (err) {
      console.error('Error generating supplier code:', err);
      // Fallback: generate a simple code
      const maxCode = Math.max(...suppliers.map(s => {
        const num = parseInt(s.supplier_code.replace('SUPP-', ''));
        return isNaN(num) ? 0 : num;
      }), 0);
      return `SUPP-${String(maxCode + 1).padStart(4, '0')}`;
    }
  };

  // Add a new supplier
  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'supplier_code' | 'is_active'>) => {
    if (!activeCompany?.id) return;
    
    try {
      setError(null);
      
      // Generate supplier code if not provided
      const supplierCode = supplier.supplier_code || await generateSupplierCode();
      
      const { data, error: insertError } = await supabase
        .from('suppliers')
        .insert([{ 
          ...supplier, 
          company_id: activeCompany.id,
          supplier_code: supplierCode,
          is_active: true
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setSuppliers(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add supplier');
      throw err;
    }
  };

  // Update an existing supplier
  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      setError(null);
      
      const { data, error: updateError } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      setSuppliers(prev => prev.map(supp => supp.id === id ? data : supp));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update supplier');
      throw err;
    }
  };

  // Delete a supplier (soft delete by setting is_active to false)
  const deleteSupplier = async (id: string) => {
    try {
      console.log('[deleteSupplier] Starting soft delete for supplier:', id);
      setError(null);
      
      const { data: updatedSupplier, error: deleteError } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
      
      if (deleteError) {
        console.error('[deleteSupplier] Database error:', deleteError);
        throw deleteError;
      }
      
      console.log('[deleteSupplier] Supplier soft deleted successfully:', updatedSupplier);
      
      // Update local state - remove from suppliers array since we filter by is_active: true
      setSuppliers(prev => prev.filter(supp => supp.id !== id));
      
      return updatedSupplier;
    } catch (err) {
      console.error('[deleteSupplier] Exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete supplier';
      setError(errorMessage);
      throw err;
    }
  };

  // Fetch inactive suppliers (for admin purposes)
  const fetchInactiveSuppliers = async () => {
    if (!activeCompany?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', false)
        .order('supplier_code');
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[fetchInactiveSuppliers] Error:', err);
      return [];
    }
  };

  // Reactivate an inactive supplier
  const reactivateSupplier = async (id: string) => {
    try {
      console.log('[reactivateSupplier] Reactivating supplier:', id);
      
      const { data: updatedSupplier, error } = await supabase
        .from('suppliers')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[reactivateSupplier] Supplier reactivated:', updatedSupplier);
      
      // Refresh suppliers to include the reactivated one
      await fetchSuppliers();
      
      return updatedSupplier;
    } catch (err) {
      console.error('[reactivateSupplier] Error:', err);
      throw err;
    }
  };

  // Search suppliers by name, email, or supplier code
  const searchSuppliers = async (searchTerm: string) => {
    if (!activeCompany?.id || !searchTerm.trim()) return [];
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,supplier_code.ilike.%${searchTerm}%`)
        .order('supplier_code');
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[searchSuppliers] Error:', err);
      return [];
    }
  };

  // Get suppliers by type
  const getSuppliersByType = (type: string) => {
    return suppliers.filter(supp => supp.supplier_type === type);
  };

  // Get supplier by code
  const getSupplierByCode = (code: string) => {
    return suppliers.find(supp => supp.supplier_code === code);
  };

  // Get supplier by email
  const getSupplierByEmail = (email: string) => {
    return suppliers.find(supp => supp.email === email);
  };

  // Fetch companies when component mounts
  useEffect(() => {
    console.log('[useSuppliers] Component mounted, fetching companies...');
    fetchCompanies();
  }, [fetchCompanies]);

  // Debug companies data
  useEffect(() => {
    console.log('[useSuppliers] Companies data changed:', companies);
    console.log('[useSuppliers] Active company:', activeCompany);
  }, [companies, activeCompany]);

  // Initialize suppliers when company changes
  useEffect(() => {
    if (activeCompany?.id) {
      console.log('[useSuppliers] Company changed, fetching suppliers for:', activeCompany.id);
      fetchSuppliers();
    } else {
      console.log('[useSuppliers] No active company, clearing suppliers');
      setSuppliers([]);
    }
  }, [activeCompany?.id]);

  return {
    suppliers,
    loading,
    error,
    activeCompany,
    companies,
    fetchSuppliers,
    fetchInactiveSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    reactivateSupplier,
    searchSuppliers,
    generateSupplierCode,
    getSuppliersByType,
    getSupplierByCode,
    getSupplierByEmail,
  };
}




