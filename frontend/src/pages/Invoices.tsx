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
import { DataTable } from "@/components/ui/basic-data-table";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, Calendar, User, DollarSign } from "lucide-react";
import type { Database } from "@/lib/database-types";

type ViewMode = "list" | "add" | "detail";

// Types from database
type Invoice = Database['public']['Tables']['sales_invoices']['Row'];
type InvoiceLineItem = Database['public']['Tables']['invoice_line_items']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Item = Database['public']['Tables']['items']['Row'];

interface InvoiceFormData {
  invoice_number?: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  status: string;
  delivery_status?: string;
  payment_terms: string;
  notes: string;
  terms_and_conditions: string;
  invoice_discount_rate: number;
  invoice_discount_type: 'percentage' | 'amount';
}

interface InvoiceLineItemFormData {
  item_id: string;
  item_name: string;
  description: string;
  quantity: number;
  uom: string;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
  discount_amount: number;
  line_total?: number; // Optional field for database values
}

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeInvoice = (invoice: Invoice): Invoice => ({
  ...invoice,
  subtotal: toNumber(invoice.subtotal),
  tax_amount: toNumber(invoice.tax_amount),
  discount_amount: toNumber(invoice.discount_amount),
  total_amount: toNumber(invoice.total_amount),
});

const toDateInputValue = (value: unknown) => {
  if (!value) return "";
  const text = String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

const formatDisplayDate = (value: unknown) => {
  if (!value) return "N/A";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
};

const Invoices = () => {
  const { supabase } = useDatabaseContext();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();
  
  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<InvoiceFormData>({
    customer_id: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "SUBMITTED", // Use 'SUBMITTED' for simplified status system
    delivery_status: "PENDING",
    payment_terms: "NET_30",
    notes: "",
    terms_and_conditions: "",
    invoice_discount_rate: 0,
    invoice_discount_type: 'percentage'
  });
  
  const [lineItems, setLineItems] = useState<InvoiceLineItemFormData[]>([
    { item_id: "", item_name: "", description: "", quantity: 1, uom: "", unit_price: 0, tax_rate: 0, discount_rate: 0, discount_amount: 0 }
  ]);

  // Fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchInvoices();
      fetchCustomers();
      fetchItems();
    }
  }, [activeCompany]);

  // Fetch invoices
  const fetchInvoices = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('invoice_date', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        if (error.code === '42P01') {
          // Table doesn't exist
          toast({
            title: "Database Setup Required",
            description: "The sales_invoices table doesn't exist. Please run the CREATE_SALES_INVOICES_TABLE.sql script first.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      setInvoices(((data || []) as Invoice[]).map(normalizeInvoice));
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    if (!activeCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    }
  };

  // Fetch items
  const fetchItems = async () => {
    if (!activeCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch items",
        variant: "destructive",
      });
    }
  };

  // Fetch invoice line items for detail view
  const fetchInvoiceLineItems = async (invoiceId: string) => {
    try {
      
      const { data, error } = await supabase
        .from('sales_invoice_line_items')
        .select('*')
        .eq('sales_invoice_id', invoiceId)
        .order('created_at');

      if (error) {
        console.error('Error fetching line items:', error);
        throw error;
      }
      
      
      // Transform to match our form structure
      const transformedItems: InvoiceLineItemFormData[] = (data || []).map((item, index) => {
        return {
          item_id: item.item_id || "", // Read from database if available (after migration)
          item_name: item.item_name || `Item ${index + 1}`,
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          uom: item.uom || "PCS", // Read from database if available (after migration)
          unit_price: Number(item.unit_price) || 0,
          tax_rate: Number(item.tax_rate) || 0,
          discount_rate: Number(item.discount_rate) || 0,
          discount_amount: Number(item.discount_amount) || 0,
          line_total: Number(item.line_total) || 0 // Preserve database line total
        };
      });
      
      
      if (transformedItems.length > 0) {
        setLineItems(transformedItems);
      } else {
        setLineItems([
          { item_id: "", item_name: "", description: "", quantity: 1, uom: "PCS", unit_price: 0, tax_rate: 0, discount_rate: 0, discount_amount: 0 }
        ]);
      }
    } catch (err) {
      console.error('Error loading invoice line items:', err);
      // Set default empty line item on error
      setLineItems([
        { item_id: "", item_name: "", description: "", quantity: 1, uom: "PCS", unit_price: 0, tax_rate: 0, discount_rate: 0, discount_amount: 0 }
      ]);
    }
  };

  // Add line item
  const addLineItem = () => {
    setLineItems(prev => [...prev, { item_id: "", item_name: "", description: "", quantity: 1, uom: "", unit_price: 0, tax_rate: 0, discount_rate: 0, discount_amount: 0 }]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof InvoiceLineItemFormData, value: any) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate discount amount when discount percentage changes
        if (field === 'discount_rate') {
          const quantity = updatedItem.quantity || 0;
          const unitPrice = updatedItem.unit_price || 0;
          const discountRate = value || 0;
          updatedItem.discount_amount = (quantity * unitPrice * discountRate / 100);
        }
        
        // Auto-calculate discount amount when quantity or unit price changes
        if (field === 'quantity' || field === 'unit_price') {
          const quantity = field === 'quantity' ? value : (updatedItem.quantity || 0);
          const unitPrice = field === 'unit_price' ? value : (updatedItem.unit_price || 0);
          const discountRate = updatedItem.discount_rate || 0;
          updatedItem.discount_amount = (quantity * unitPrice * discountRate / 100);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Handle item selection and auto-populate details
  const handleItemSelection = (index: number, itemId: string) => {
    const selectedItem = items.find(item => item.id === itemId);
    if (selectedItem) {
      setLineItems(prev => prev.map((lineItem, i) => 
        i === index ? {
          ...lineItem,
          item_id: selectedItem.id,
          item_name: selectedItem.name,
          description: selectedItem.description || "",
          uom: selectedItem.unit_of_measure || "PCS", // Use UOM from item master, fallback to PCS
          unit_price: selectedItem.unit_price || 0,
          discount_amount: 0 // Reset discount amount when item changes
        } : lineItem
      ));
    }
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    return sum + (quantity * unitPrice);
  }, 0);
  
  const totalTax = lineItems.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const taxRate = item.tax_rate || 0;
    return sum + (quantity * unitPrice * (taxRate / 100));
  }, 0);
  
  const totalLineItemDiscount = lineItems.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const discountRate = item.discount_rate || 0;
    
    // Only calculate percentage discount, not fixed amount
    const percentageDiscount = quantity * unitPrice * (discountRate / 100);
    return sum + percentageDiscount;
  }, 0);
  
  // Calculate whole invoice discount based on line totals (after line item discounts)
  const lineTotalsSum = lineItems.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const discountRate = item.discount_rate || 0;
    const taxRate = item.tax_rate || 0;
    
    const lineSubtotal = quantity * unitPrice;
    const lineDiscount = lineSubtotal * (discountRate / 100);
    const lineTax = lineSubtotal * (taxRate / 100);
    
    return sum + (lineSubtotal - lineDiscount + lineTax);
  }, 0);
  
  const wholeInvoiceDiscount = formData.invoice_discount_type === 'percentage' 
    ? (lineTotalsSum * (formData.invoice_discount_rate || 0) / 100)
    : (formData.invoice_discount_rate || 0);
  
  const total = lineTotalsSum - wholeInvoiceDiscount;

  // Calculate line item total with discounts
  const calculateLineItemTotal = (item: InvoiceLineItemFormData) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const taxRate = item.tax_rate || 0;
    const discountRate = item.discount_rate || 0;
    
    const lineSubtotal = quantity * unitPrice;
    const percentageDiscount = lineSubtotal * (discountRate / 100);
    const lineTax = lineSubtotal * (taxRate / 100);
    
    // Only apply percentage discount, not both percentage and fixed amount
    const total = lineSubtotal - percentageDiscount + lineTax;
    return isNaN(total) ? 0 : total;
  };

  // Save invoice
  const saveInvoice = async () => {
    if (!activeCompany?.id || !formData.customer_id || lineItems.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one line item",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.invoice_date || !formData.due_date) {
      toast({
        title: "Error",
        description: "Please fill in invoice date and due date",
        variant: "destructive",
      });
      return;
    }

    // Validate UUID fields
    if (!formData.customer_id || formData.customer_id.trim() === '') {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    if (!activeCompany?.id || activeCompany.id.trim() === '') {
      toast({
        title: "Error",
        description: "No active company selected",
        variant: "destructive",
      });
      return;
    }

    // Validate line items
    const invalidLineItems = lineItems.filter(item => 
      !item.item_name || item.quantity <= 0 || item.unit_price <= 0
    );

    if (invalidLineItems.length > 0) {
      toast({
        title: "Error",
        description: "Please ensure all line items have valid item name, quantity, and unit price",
        variant: "destructive",
      });
      return;
    }

    // Validate calculated amounts
    if (subtotal <= 0) {
      toast({
        title: "Error",
        description: "Invoice subtotal must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (total <= 0) {
      toast({
        title: "Error",
        description: "Invoice total must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      
      // Check if sales_invoices table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('sales_invoices')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('Table check error:', tableError);
        if (tableError.code === '42P01') {
          toast({
            title: "Database Setup Required",
            description: "The sales_invoices table doesn't exist. Please run the CREATE_SALES_INVOICES_TABLE.sql script first.",
            variant: "destructive",
          });
          return;
        }
      }

              // Create invoice - map form fields to database fields
        const invoiceData = {
          customer_id: formData.customer_id,
          company_id: activeCompany.id,
          invoice_number: `INV-${Date.now().toString().slice(-8)}`, // Required field - 12 chars total
          invoice_date: formData.invoice_date || new Date().toISOString().split('T')[0], // Required field
          due_date: formData.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Required field (30 days from now)
          status: formData.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
          delivery_status: formData.delivery_status || 'PENDING',
          subtotal: subtotal || 0, // Required field
          tax_amount: totalTax || 0, // Required field
          discount_amount: (totalLineItemDiscount + wholeInvoiceDiscount) || 0, // Required field
          total_amount: total || 0, // Required field
          currency: 'LYD',
          payment_terms: formData.payment_terms || 'NET_30',
          notes: formData.notes || '',
          terms_and_conditions: formData.terms_and_conditions || '',
          is_active: true
        };
      
      
      // Test table access first
      const { data: testData, error: testError } = await supabase
        .from('sales_invoices')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('Table access test failed:', testError);
        toast({
          title: "Database Error",
          description: `Cannot access sales_invoices table: ${testError.message}`,
          variant: "destructive",
        });
        return;
      }
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('sales_invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        console.error('Error details:', {
          message: invoiceError.message,
          code: invoiceError.code,
          details: invoiceError.details,
          hint: invoiceError.hint
        });
        console.error('Invoice data that failed:', invoiceData);
        console.error('Invoice data JSON:', JSON.stringify(invoiceData, null, 2));
        
        // Show more specific error message to user
        let errorMessage = 'Failed to create invoice';
        if (invoiceError.message) {
          errorMessage += `: ${invoiceError.message}`;
        } else if (invoiceError.details) {
          errorMessage += `: ${invoiceError.details}`;
        } else {
          errorMessage += ': Unknown error occurred';
        }
        
        if (invoiceError.hint) {
          errorMessage += ` (Hint: ${invoiceError.hint})`;
        }
        
        toast({
          title: "Invoice Creation Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        throw invoiceError;
      }


      // Create line items - map to database fields correctly
      const lineItemsWithInvoiceId = lineItems.map(item => ({
        sales_invoice_id: invoice.id,
        item_id: item.item_id || null, // Include item_id for stock movements
        item_name: item.item_name || 'Unknown Item',
        description: item.description || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        tax_rate: item.tax_rate || 0,
        tax_amount: ((item.quantity || 1) * (item.unit_price || 0) * (item.tax_rate || 0)) / 100,
        discount_rate: item.discount_rate || 0,
        discount_amount: ((item.quantity || 1) * (item.unit_price || 0) * (item.discount_rate || 0)) / 100,
        line_total: ((item.quantity || 1) * (item.unit_price || 0)) + 
                   (((item.quantity || 1) * (item.unit_price || 0) * (item.tax_rate || 0)) / 100) - 
                   (((item.quantity || 1) * (item.unit_price || 0) * (item.discount_rate || 0)) / 100)
      }));


      const { error: lineItemsError } = await supabase
        .from('sales_invoice_line_items')
        .insert(lineItemsWithInvoiceId);

      if (lineItemsError) {
        console.error('Line items creation error:', lineItemsError);
        throw lineItemsError;
      }


      toast({
        title: "Success",
        description: `Invoice created successfully. ${formData.status === 'SUBMITTED' ? 'Auto journal entry created.' : 'Change status to SUBMITTED to create journal entry.'}`,
      });

      // Reset form and go back to list
      resetForm();
      setView("list");
      fetchInvoices();
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to create invoice: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      customer_id: "",
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "SUBMITTED", // Use 'SUBMITTED' for simplified status system
      payment_terms: "NET_30",
      notes: "",
      terms_and_conditions: "",
      invoice_discount_rate: 0,
      invoice_discount_type: 'percentage'
    });
    setLineItems([{ item_id: "", item_name: "", description: "", quantity: 1, uom: "", unit_price: 0, tax_rate: 0, discount_rate: 0, discount_amount: 0 }]);
  };

  // Update invoice status
  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('sales_invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Invoice status updated to ${newStatus}. ${newStatus === 'SUBMITTED' ? 'Auto journal entry created.' : ''}`,
      });

      // Refresh the invoices list
      fetchInvoices();
      
      // If we're in detail view, update the selected invoice
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(normalizeInvoice({ ...selectedInvoice, status: newStatus }));
      }
    } catch (err) {
      console.error('Status update error:', err);
      
      let errorMessage = 'Unknown error occurred';
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as any).message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      toast({
        title: "Error",
        description: `Failed to update invoice status: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update delivery status
  const updateDeliveryStatus = async (invoiceId: string, newDeliveryStatus: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('sales_invoices')
        .update({ delivery_status: newDeliveryStatus })
        .eq('id', invoiceId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Delivery status updated to ${newDeliveryStatus}. ${newDeliveryStatus === 'DELIVERED' ? 'Stock movements created.' : ''}`,
      });

      // Refresh the invoices list
      fetchInvoices();
      
      // If we're in detail view, update the selected invoice
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(normalizeInvoice({ ...selectedInvoice, delivery_status: newDeliveryStatus }));
      }
    } catch (err) {
      console.error('Delivery status update error:', err);
      
      let errorMessage = 'Unknown error occurred';
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as any).message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      toast({
        title: "Error",
        description: `Failed to update delivery status: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const startAdd = () => { resetForm(); setView("add"); };
  const startDetail = (invoice: Invoice) => { 
    const normalizedInvoice = normalizeInvoice(invoice);

    setSelectedInvoice(normalizedInvoice); 
    setView("detail"); 
    
    // Populate form with invoice data for read-only view
    const populatedFormData = {
      customer_id: normalizedInvoice.customer_id || "",
      invoice_date: toDateInputValue(normalizedInvoice.invoice_date) || new Date().toISOString().slice(0, 10),
      due_date: toDateInputValue(normalizedInvoice.due_date) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: normalizedInvoice.status || "DRAFT",
      payment_terms: normalizedInvoice.payment_terms || "NET_30",
      notes: normalizedInvoice.notes || "",
      terms_and_conditions: normalizedInvoice.terms_and_conditions || "",
      invoice_discount_rate: 0, // Not stored in database, only used for calculations
      invoice_discount_type: 'amount' as const // Default to amount since we store the actual discount amount
    };
    
    setFormData(populatedFormData);
    
    // Fetch and populate line items for this invoice
    fetchInvoiceLineItems(normalizedInvoice.id);
  };
  const backToList = () => { setSelectedInvoice(null); setView("list"); };

  return (
    <AppLayout title="Sales Invoices">
      <SEO title="Sales Invoices - FMS" description="Create and manage sales invoices with line items, taxes, and discounts." />
      {!activeCompany ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Company</h3>
          <p className="text-muted-foreground">Please select a company to manage sales invoices</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {view === "list" && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Sales Invoices</CardTitle>
                  {activeCompany && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {activeCompany.currency?.toUpperCase() || 'LYD'}
                    </Badge>
                  )}
                </div>
                <Button onClick={startAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Invoice
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading invoices...</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                    <p className="text-muted-foreground">Get started by creating your first sales invoice</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Invoice #{invoice.invoice_number}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDisplayDate(invoice.invoice_date)} - {invoice.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {activeCompany?.currency === 'lyd' ? 'LYD ' : activeCompany?.currency === 'usd' ? '$' : activeCompany?.currency?.toUpperCase() + ' '}
                            {toNumber(invoice.total_amount).toFixed(2)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {customers.find(c => c.id === invoice.customer_id)?.name || 'Unknown Customer'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status Change Button - Only show for DRAFT invoices */}
                          {invoice.status === 'DRAFT' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => updateInvoiceStatus(invoice.id, 'SUBMITTED')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Submit
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startDetail(invoice)}
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

          {view === "add" && (
            <div className="space-y-6">
                <Card className="mb-4">
                  <CardHeader className="flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>Sales Invoice</CardTitle>
                      <Badge variant="outline">Submitted</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={backToList}>Cancel</Button>
                      <Button onClick={saveInvoice} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Invoice'}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

              <div className="space-y-6">
                {/* Invoice Details Section */}
                    <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Company Currency Display */}
                    {activeCompany && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            Company Currency: {activeCompany.currency?.toUpperCase() || 'LYD'} (Libyan Dinar)
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          All amounts in this invoice will be in {activeCompany.currency?.toUpperCase() || 'LYD'}
                        </p>
                      </div>
                    )}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                        <Label>Invoice Date *</Label>
                        <Input 
                          type="date" 
                          value={formData.invoice_date} 
                          onChange={e => setFormData({...formData, invoice_date: e.target.value})} 
                        />
                      </div>
                      <div>
                        <Label>Customer *</Label>
                        <Select value={formData.customer_id} onValueChange={(value) => setFormData({...formData, customer_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} ({c.customer_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Due Date *</Label>
                        <Input 
                          type="date" 
                          value={formData.due_date} 
                          onChange={e => setFormData({...formData, due_date: e.target.value})} 
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SUBMITTED">Submitted</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                          </SelectContent>
                        </Select>
                          </div>
                          <div>
                        <Label>Payment Terms</Label>
                        <Select value={formData.payment_terms} onValueChange={(value) => setFormData({...formData, payment_terms: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                              <SelectContent>
                            <SelectItem value="NET_30">Net 30</SelectItem>
                            <SelectItem value="NET_15">Net 15</SelectItem>
                            <SelectItem value="NET_60">Net 60</SelectItem>
                            <SelectItem value="DUE_ON_RECEIPT">Due on Receipt</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                          <Label>Notes</Label>
                          <Input 
                            placeholder="Additional notes" 
                            value={formData.notes} 
                            onChange={e => setFormData({...formData, notes: e.target.value})} 
                          />
                          </div>
                        
                        </div>
                      </CardContent>
                    </Card>

                {/* Line Items Section */}
                    <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Line Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Add the products or services for this invoice</p>
                          <p className="text-xs text-muted-foreground mt-1">Select items from the master catalog - UOM and pricing will be automatically populated</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={addLineItem}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Item
                        </Button>
                      </div>
                      
                        <div className="rounded-md border overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="text-left p-3 text-sm font-semibold text-gray-700 col-span-2">Item *</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Qty</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">UOM</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700 col-span-2">Unit Price</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Tax Rate %</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Discount %</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Discount $</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Line Total</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                                                    {lineItems.map((item, index) => (
                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="p-3">
                                    <Select value={item.item_id} onValueChange={(value) => handleItemSelection(index, value)}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select item" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {items.map(item => (
                                          <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      type="number"
                                      placeholder="Qty"
                                      value={item.quantity}
                                      onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      placeholder="UOM"
                                      value={item.uom}
                                      disabled
                                      title="UOM is automatically set from item master"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Price"
                                      value={item.unit_price}
                                      onChange={e => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Tax %"
                                      value={item.tax_rate}
                                      onChange={e => updateLineItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Discount %"
                                      value={item.discount_rate}
                                      onChange={e => updateLineItem(index, 'discount_rate', parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Discount $"
                                      value={item.discount_amount}
                                      disabled
                                      title="Shows the calculated discount amount from the percentage"
                                      className="bg-gray-50 text-gray-600"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center justify-center px-2 py-1 text-sm font-semibold text-gray-700">
                                      ${calculateLineItemTotal(item).toFixed(2)}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeLineItem(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                    </Card>

                {/* Invoice Discounts Section */}
                    <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Discounts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Apply discounts to the entire invoice</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Discount Type</Label>
                          <Select value={formData.invoice_discount_type} onValueChange={(value: 'percentage' | 'amount') => setFormData({...formData, invoice_discount_type: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Discount Value {formData.invoice_discount_type === 'percentage' ? '(%)' : '($)'}</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder={formData.invoice_discount_type === 'percentage' ? "0.00" : "0.00"}
                            value={formData.invoice_discount_rate}
                            onChange={e => setFormData({...formData, invoice_discount_rate: parseFloat(e.target.value) || 0})} 
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setFormData({...formData, invoice_discount_rate: 0})}
                        >
                          Clear Discount
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                    </Card>

                {/* Invoice Summary Section */}
                    <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-medium text-lg">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Tax Amount:</span>
                          <span className="font-medium">${totalTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Line Item Discounts:</span>
                          <span className="font-medium">${totalLineItemDiscount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Line Totals Sum:</span>
                          <span className="font-medium">${lineTotalsSum.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Invoice Discount:</span>
                          <span className="font-medium">${wholeInvoiceDiscount.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center text-xl font-semibold">
                          <span>Total Amount:</span>
                          <span className="text-primary">${total.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium mb-2">Quick Actions</h4>
                          <div className="space-y-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full justify-start"
                              onClick={() => setFormData({...formData, payment_terms: 'NET_30'})}
                            >
                              Set Net 30 Terms
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full justify-start"
                              onClick={() => setFormData({...formData, status: 'SUBMITTED'})}
                            >
                              Mark as Submitted
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full justify-start"
                              onClick={() => setFormData({...formData, delivery_status: 'DELIVERED'})}
                            >
                              Mark as Delivered
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full justify-start"
                              onClick={() => setFormData({...formData, due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)})}
                            >
                              Set Due Date +30 Days
                            </Button>

                          </div>
                        </div>
                      </div>
                    </div>
                      </CardContent>
                    </Card>
              </div>
            </div>
          )}

          {view === "detail" && selectedInvoice && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Invoice #{selectedInvoice.invoice_number}</CardTitle>
                  {activeCompany && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {activeCompany.currency?.toUpperCase() || 'LYD'}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Status Change Button - Only show for DRAFT invoices */}
                  {selectedInvoice.status === 'DRAFT' && (
                    <Button
                      variant="default"
                      onClick={() => updateInvoiceStatus(selectedInvoice.id, 'SUBMITTED')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Submit Invoice
                    </Button>
                  )}
                  {/* Delivery Status Button - Only show for SUBMITTED invoices with PENDING delivery */}
                  {selectedInvoice.status === 'SUBMITTED' && (selectedInvoice as any).delivery_status === 'PENDING' && (
                    <Button
                      variant="default"
                      onClick={() => updateDeliveryStatus(selectedInvoice.id, 'DELIVERED')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Mark as Delivered
                    </Button>
                  )}
                  <Button variant="secondary" onClick={backToList}>Back to List</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={formData.customer_id} disabled>
                    <SelectTrigger className="bg-gray-50">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.customer_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">Invoice Date *</Label>
                    <Input
                      type="date"
                      value={formData.invoice_date}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} disabled>
                      <SelectTrigger className="bg-gray-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUBMITTED">Submitted</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment_terms">Payment Terms</Label>
                    <Select value={formData.payment_terms} disabled>
                      <SelectTrigger className="bg-gray-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NET_30">Net 30</SelectItem>
                        <SelectItem value="NET_15">Net 15</SelectItem>
                        <SelectItem value="NET_60">Net 60</SelectItem>
                        <SelectItem value="COD">Cash on Delivery</SelectItem>
                        <SelectItem value="PREPAID">Prepaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Line Items</Label>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Item</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Description</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Qty</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">UOM</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Unit Price</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Tax %</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Discount %</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Discount $</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <Input
                                value={item.item_name}
                                disabled
                                className="bg-gray-50 border-0"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={item.description}
                                disabled
                                className="bg-gray-50 border-0"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={item.quantity}
                                disabled
                                className="bg-gray-50 border-0 w-20"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={item.uom}
                                disabled
                                className="bg-gray-50 border-0 w-20"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={item.unit_price}
                                disabled
                                className="bg-gray-50 border-0 w-24"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={item.tax_rate}
                                disabled
                                className="bg-gray-50 border-0 w-20"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={item.discount_rate}
                                disabled
                                className="bg-gray-50 border-0 w-20"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                value={item.discount_amount.toFixed(2)}
                                disabled
                                className="bg-gray-50 border-0 w-24"
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-700">
                                ${(item.line_total || calculateLineItemTotal(item)).toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoice Discount Section */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Invoice Discount</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="invoice_discount_type">Discount Type</Label>
                      <Select value={formData.invoice_discount_type} disabled>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoice_discount_amount">Discount Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={toNumber(selectedInvoice?.discount_amount).toFixed(2)}
                        disabled
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Invoice Summary */}
                <div className="space-y-4">
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        value={formData.notes}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Subtotal:</span>
                        <span>${toNumber(selectedInvoice?.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Tax Amount:</span>
                        <span>${toNumber(selectedInvoice?.tax_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Discount:</span>
                        <span>${toNumber(selectedInvoice?.discount_amount).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Amount:</span>
                        <span>${toNumber(selectedInvoice?.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default Invoices;




