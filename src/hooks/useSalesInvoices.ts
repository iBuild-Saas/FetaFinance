import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatabase } from '@/hooks/useDatabase';
import { useAccounting } from '@/state/accounting';
import type { Database } from '@/lib/supabase';

type SalesInvoice = Database['public']['Tables']['sales_invoices']['Row'];
type InvoiceLineItem = Database['public']['Tables']['invoice_line_items']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

export function useSalesInvoices() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { data: customers, fetchAll: fetchCustomers } = useDatabase('customers');
  const { state } = useAccounting();

  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;

  // Fetch invoices for the active company
  const fetchInvoices = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('sales_invoices')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('invoice_date', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      setInvoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  // Fetch line items for a specific invoice
  const fetchLineItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at');
      
      if (error) throw error;
      
      setLineItems(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching line items:', err);
      return [];
    }
  };

  // Generate unique invoice number
  const generateInvoiceNumber = async () => {
    if (!activeCompany?.id) return '2024-INV-0001';
    
    try {
      const { data, error } = await supabase.rpc('generate_invoice_number', {
        company_uuid: activeCompany.id
      });
      
      if (error) throw error;
      return data || '2024-INV-0001';
    } catch (err) {
      console.error('Error generating invoice number:', err);
      // Fallback: generate a simple number
      const currentYear = new Date().getFullYear();
      const maxNumber = Math.max(...invoices
        .filter(inv => inv.invoice_number.startsWith(currentYear.toString()))
        .map(inv => {
          const num = parseInt(inv.invoice_number.split('-')[2]);
          return isNaN(num) ? 0 : num;
        }), 0);
      return `${currentYear}-INV-${String(maxNumber + 1).padStart(4, '0')}`;
    }
  };

  // Add a new invoice
  const addInvoice = async (invoice: Omit<SalesInvoice, 'id' | 'created_at' | 'updated_at' | 'invoice_number' | 'is_active' | 'subtotal' | 'tax_amount' | 'discount_amount' | 'total_amount'>) => {
    if (!activeCompany?.id) return;
    
    try {
      setError(null);
      
      // Generate invoice number if not provided
      const invoiceNumber = invoice.invoice_number || await generateInvoiceNumber();
      
      const { data, error: insertError } = await supabase
        .from('sales_invoices')
        .insert([{ 
          ...invoice, 
          company_id: activeCompany.id,
          invoice_number: invoiceNumber,
          is_active: true,
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 0
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setInvoices(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add invoice');
      throw err;
    }
  };

  // Update an existing invoice
  const updateInvoice = async (id: string, updates: Partial<SalesInvoice>) => {
    try {
      setError(null);
      
      const { data, error: updateError } = await supabase
        .from('sales_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      setInvoices(prev => prev.map(inv => inv.id === id ? data : inv));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
      throw err;
    }
  };

  // Delete an invoice (soft delete)
  const deleteInvoice = async (id: string) => {
    try {
      console.log('[deleteInvoice] Starting soft delete for invoice:', id);
      setError(null);
      
      const { data: updatedInvoice, error: deleteError } = await supabase
        .from('sales_invoices')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
      
      if (deleteError) {
        console.error('[deleteInvoice] Database error:', deleteError);
        throw deleteError;
      }
      
      console.log('[deleteInvoice] Invoice soft deleted successfully:', updatedInvoice);
      
      // Update local state - remove from invoices array since we filter by is_active: true
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      
      return updatedInvoice;
    } catch (err) {
      console.error('[deleteInvoice] Exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete invoice';
      setError(errorMessage);
      throw err;
    }
  };

  // Add line item to invoice
  const addLineItem = async (lineItem: Omit<InvoiceLineItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      
      const { data, error: insertError } = await supabase
        .from('invoice_line_items')
        .insert([lineItem])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Refresh line items for this invoice
      await fetchLineItems(lineItem.invoice_id);
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add line item');
      throw err;
    }
  };

  // Update line item
  const updateLineItem = async (id: string, updates: Partial<InvoiceLineItem>) => {
    try {
      setError(null);
      
      const { data, error: updateError } = await supabase
        .from('invoice_line_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Refresh line items for this invoice
      if (data.invoice_id) {
        await fetchLineItems(data.invoice_id);
      }
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update line item');
      throw err;
    }
  };

  // Delete line item
  const deleteLineItem = async (id: string) => {
    try {
      setError(null);
      
      // Get the invoice ID before deleting
      const lineItem = lineItems.find(item => item.id === id);
      if (!lineItem) throw new Error('Line item not found');
      
      const { error: deleteError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      // Refresh line items for this invoice
      await fetchLineItems(lineItem.invoice_id);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete line item');
      throw err;
    }
  };

  // Calculate line item totals
  const calculateLineItemTotals = (quantity: number, unitPrice: number, taxRate: number = 0, discountRate: number = 0) => {
    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = subtotal * (discountRate / 100);
    const lineTotal = subtotal + taxAmount - discountAmount;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100
    };
  };

  // Search invoices
  const searchInvoices = async (searchTerm: string) => {
    if (!activeCompany?.id || !searchTerm.trim()) return [];
    
    try {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .or(`invoice_number.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`)
        .order('invoice_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[searchInvoices] Error:', err);
      return [];
    }
  };

  // Get invoices by status
  const getInvoicesByStatus = (status: string) => {
    return invoices.filter(inv => inv.status === status);
  };

  // Get overdue invoices
  const getOverdueInvoices = () => {
    const today = new Date();
    return invoices.filter(inv => {
      const dueDate = new Date(inv.due_date);
      return dueDate < today && inv.status !== 'PAID' && inv.status !== 'CANCELLED';
    });
  };

  // Get invoice by number
  const getInvoiceByNumber = (number: string) => {
    return invoices.find(inv => inv.invoice_number === number);
  };

  // Fetch companies and customers when component mounts
  useEffect(() => {
    console.log('[useSalesInvoices] Component mounted, fetching companies and customers...');
    fetchCompanies();
    fetchCustomers();
  }, [fetchCompanies, fetchCustomers]);

  // Debug companies and customers data
  useEffect(() => {
    console.log('[useSalesInvoices] Companies data changed:', companies);
    console.log('[useSalesInvoices] Customers data changed:', customers);
    console.log('[useSalesInvoices] Active company:', activeCompany);
  }, [companies, customers, activeCompany]);

  // Initialize invoices when company changes
  useEffect(() => {
    if (activeCompany?.id) {
      console.log('[useSalesInvoices] Company changed, fetching invoices for:', activeCompany.id);
      fetchInvoices();
    } else {
      console.log('[useSalesInvoices] No active company, clearing invoices');
      setInvoices([]);
    }
  }, [activeCompany?.id]);

  return {
    invoices,
    lineItems,
    loading,
    error,
    activeCompany,
    companies,
    customers,
    fetchInvoices,
    fetchLineItems,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addLineItem,
    updateLineItem,
    deleteLineItem,
    generateInvoiceNumber,
    calculateLineItemTotals,
    searchInvoices,
    getInvoicesByStatus,
    getOverdueInvoices,
    getInvoiceByNumber,
  };
}







