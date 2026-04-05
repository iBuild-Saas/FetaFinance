import { useState, useEffect } from 'react';
import { db } from '@/lib/database-client';
import { useDatabase } from '@/hooks/useDatabase';
import { useAccounting } from '@/state/accounting';

interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  email: string;
  phone: string;
  company_id: string;
  is_active: boolean;
  [key: string]: any;
}

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
      
      const { data, error: fetchError } = await db.from('suppliers').eq('company_id', activeCompany.id).select('*');
      
      if (fetchError) throw fetchError;
      
      // Filter active suppliers and sort by supplier_code
      const activeSuppliers = (data || [])
        .filter((s: Supplier) => s.is_active !== false)
        .sort((a: Supplier, b: Supplier) => a.supplier_code.localeCompare(b.supplier_code));
      
      setSuppliers(activeSuppliers);
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
      // Simple fallback: generate code based on existing suppliers
      const maxCode = Math.max(...suppliers.map(s => {
        const num = parseInt(s.supplier_code?.replace('SUPP-', '') || '0');
        return isNaN(num) ? 0 : num;
      }), 0);
      return `SUPP-${String(maxCode + 1).padStart(4, '0')}`;
    } catch {
      return 'SUPP-0001';
    }
  };

  // Add a new supplier
  const addSupplier = async (supplier: any) => {
    if (!activeCompany?.id) return;
    
    try {
      setError(null);
      
      // Generate supplier code if not provided
      const supplierCode = supplier.supplier_code || await generateSupplierCode();
      
      const { data, error: insertError } = await db.from('suppliers').insert({
        ...supplier, 
        company_id: activeCompany.id,
        supplier_code: supplierCode,
        is_active: true
      });
      
      if (insertError) throw insertError;
      
      if (data) {
        setSuppliers(prev => [...prev, data as Supplier]);
      }
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
      
      const { data, error: updateError } = await db.from('suppliers').update(id, updates);
      
      if (updateError) throw updateError;
      
      if (data) {
        setSuppliers(prev => prev.map(supp => supp.id === id ? data as Supplier : supp));
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update supplier');
      throw err;
    }
  };

  // Delete a supplier (soft delete by setting is_active to false)
  const deleteSupplier = async (id: string) => {
    try {
      setError(null);
      
      const { data: updatedSupplier, error: deleteError } = await db.from('suppliers').update(id, { is_active: false });
      
      if (deleteError) throw deleteError;
      setSuppliers(prev => prev.filter(supp => supp.id !== id));
      
      return updatedSupplier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete supplier';
      setError(errorMessage);
      throw err;
    }
  };

  // Fetch inactive suppliers (for admin purposes)
  const fetchInactiveSuppliers = async () => {
    if (!activeCompany?.id) return [];
    
    try {
      const { data, error } = await db.from('suppliers').eq('company_id', activeCompany.id).select('*');
      
      if (error) throw error;
      // Filter inactive suppliers
      const inactiveSuppliers = (data || []).filter((s: Supplier) => s.is_active === false);
      return inactiveSuppliers;
    } catch {
      return [];
    }
  };

  // Reactivate an inactive supplier
  const reactivateSupplier = async (id: string) => {
    try {
      const { data: updatedSupplier, error } = await db.from('suppliers').update(id, { is_active: true });
      
      if (error) throw error;
      await fetchSuppliers();
      
      return updatedSupplier;
    } catch (err) {
      throw err;
    }
  };

  // Search suppliers by name, email, or supplier code
  const searchSuppliers = async (searchTerm: string) => {
    if (!activeCompany?.id || !searchTerm.trim()) return [];
    
    try {
      const { data, error } = await db.from('suppliers').eq('company_id', activeCompany.id).select('*');
      
      if (error) throw error;
      
      // Filter active suppliers and search
      const filtered = (data || [])
        .filter((s: Supplier) => s.is_active !== false)
        .filter((s: Supplier) => 
          s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.supplier_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return filtered;
    } catch {
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
    void fetchCompanies();
  }, [fetchCompanies]);

  // Initialize suppliers when company changes
  useEffect(() => {
    if (activeCompany?.id) {
      void fetchSuppliers();
    } else {
      setSuppliers([]);
      setLoading(false);
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







