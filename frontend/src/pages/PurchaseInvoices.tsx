import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/basic-data-table";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, Calendar, Building2, DollarSign, ArrowLeft } from "lucide-react";
import type { Database } from "@/lib/database-types";

type ViewMode = "list" | "add" | "detail";

// Types from database
type PurchaseInvoice = Database['public']['Tables']['purchase_invoices']['Row'];
type PurchaseInvoiceLineItem = Database['public']['Tables']['purchase_invoice_line_items']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];
type Item = Database['public']['Tables']['items']['Row'];

// Extended types for joined data
interface PurchaseInvoiceWithDetails extends PurchaseInvoice {
  suppliers?: {
    name: string;
    supplier_code?: string;
    email?: string;
  };
  purchase_invoice_line_items?: PurchaseInvoiceLineItem[];
}

interface PurchaseInvoiceFormData {
  invoice_number?: string;
  supplier_id: string;
  invoice_date: string;
  due_date: string;
  status: string;
  payment_terms: string;
  notes: string;
  terms_and_conditions: string;
  invoice_discount_rate: number;
  invoice_discount_type: 'percentage' | 'amount';
}

interface PurchaseInvoiceLineItemFormData {
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

const normalizePurchaseInvoice = (invoice: PurchaseInvoiceWithDetails): PurchaseInvoiceWithDetails => ({
  ...invoice,
  invoice_date: toDateInputValue(invoice.invoice_date),
  due_date: toDateInputValue(invoice.due_date),
  subtotal: toNumber(invoice.subtotal),
  tax_amount: toNumber(invoice.tax_amount),
  discount_amount: toNumber(invoice.discount_amount),
  total_amount: toNumber(invoice.total_amount),
});

const normalizePurchaseInvoiceLineItem = (item: PurchaseInvoiceLineItem): PurchaseInvoiceLineItem => ({
  ...item,
  quantity: toNumber(item.quantity),
  unit_price: toNumber(item.unit_price),
  tax_amount: toNumber(item.tax_amount),
  discount_amount: toNumber(item.discount_amount),
  line_total: toNumber(item.line_total),
});

const PurchaseInvoices = () => {
  const { t } = useTranslation();
  const { supabase } = useDatabaseContext();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();
  
  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  
  const [invoices, setInvoices] = useState<PurchaseInvoiceWithDetails[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoiceWithDetails | null>(null);
  const [selectedInvoiceLineItems, setSelectedInvoiceLineItems] = useState<PurchaseInvoiceLineItem[]>([]);
  
  // Form data
  const [formData, setFormData] = useState<PurchaseInvoiceFormData>({
    supplier_id: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "SUBMITTED",
    payment_terms: "NET_30",
    notes: "",
    terms_and_conditions: "",
    invoice_discount_rate: 0,
    invoice_discount_type: 'percentage'
  });
  
  const [lineItems, setLineItems] = useState<PurchaseInvoiceLineItemFormData[]>([
    { item_id: "", item_name: "", description: "", quantity: 1, uom: "PCS", unit_price: 0, tax_rate: 0, discount_rate: 0, discount_amount: 0 }
  ]);

  // Fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchInvoices();
      fetchSuppliers();
      fetchItems();
    }
  }, [activeCompany]);

  // Fetch invoices
  const fetchInvoices = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('invoice_date', { ascending: false });

      if (error) {
        console.error('Error fetching purchase invoices:', error);
        if (error.code === '42P01') {
          toast({
            title: "Database Setup Required",
            description: "The purchase_invoices table doesn't exist. Please run the CREATE_PURCHASE_INVOICES_TABLE.sql script first.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      setInvoices(((data || []) as PurchaseInvoiceWithDetails[]).map(normalizePurchaseInvoice));
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch purchase invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    if (!activeCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch suppliers",
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

  const fetchPurchaseInvoiceLineItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at');

      if (error) throw error;
      setSelectedInvoiceLineItems(((data || []) as PurchaseInvoiceLineItem[]).map(normalizePurchaseInvoiceLineItem));
    } catch (err) {
      console.error('Error fetching purchase invoice line items:', err);
      setSelectedInvoiceLineItems([]);
      toast({
        title: "Error",
        description: "Failed to fetch purchase invoice line items",
        variant: "destructive",
      });
    }
  };

  // Add line item
  const addLineItem = () => {
    setLineItems(prev => [...prev, { item_id: "", item_name: "", description: "", quantity: 1, uom: "PCS", unit_price: 0, tax_rate: 0, discount_rate: 0, discount_amount: 0 }]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof PurchaseInvoiceLineItemFormData, value: any) => {
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
    const percentageDiscount = quantity * unitPrice * (discountRate / 100);
    return sum + percentageDiscount;
  }, 0);
  
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
  const calculateLineItemTotal = (item: PurchaseInvoiceLineItemFormData) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const taxRate = item.tax_rate || 0;
    const discountRate = item.discount_rate || 0;
    
    const lineSubtotal = quantity * unitPrice;
    const percentageDiscount = lineSubtotal * (discountRate / 100);
    const lineTax = lineSubtotal * (taxRate / 100);
    
    const total = lineSubtotal - percentageDiscount + lineTax;
    return isNaN(total) ? 0 : total;
  };

  // Save invoice
  const saveInvoice = async () => {
    if (!activeCompany?.id || !formData.supplier_id || lineItems.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one line item",
        variant: "destructive",
      });
      return;
    }

    // Validate line items
    const invalidLineItems = lineItems.filter(item => 
      !item.item_id || !item.item_name || item.quantity <= 0 || item.unit_price <= 0
    );

    if (invalidLineItems.length > 0) {
      toast({
        title: "Error",
        description: "Please ensure all line items have valid item selection, quantity, and unit price",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create invoice - only include fields that exist in the database
      const invoiceData = {
        supplier_id: formData.supplier_id,
        company_id: activeCompany.id,
        invoice_number: `PINV-${Date.now()}`,
        invoice_date: formData.invoice_date || new Date().toISOString().split('T')[0],
        due_date: formData.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: formData.status,
        subtotal: subtotal || 0,
        tax_amount: totalTax || 0,
        discount_amount: (totalLineItemDiscount + wholeInvoiceDiscount) || 0,
        total_amount: total || 0,
        currency: 'LYD',
        payment_terms: formData.payment_terms,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions
      };
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('purchase_invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        throw invoiceError;
      }

      // Create line items
      const lineItemsWithInvoiceId = lineItems.map(item => ({
        invoice_id: invoice.id,
        item_id: item.item_id || null,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        uom: item.uom || 'PCS',
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: (item.quantity * item.unit_price * item.tax_rate) / 100,
        discount_rate: item.discount_rate,
        discount_amount: (item.quantity * item.unit_price * item.discount_rate) / 100,
        line_total: (item.quantity * item.unit_price) + 
                   ((item.quantity * item.unit_price * item.tax_rate) / 100) - 
                   ((item.quantity * item.unit_price * item.discount_rate) / 100)
      }));

      const { error: lineItemsError } = await supabase
        .from('purchase_invoice_line_items')
        .insert(lineItemsWithInvoiceId);

      if (lineItemsError) {
        console.error('Line items creation error:', lineItemsError);
        throw lineItemsError;
      }

      toast({
        title: "Success",
        description: `Purchase invoice created successfully. ${formData.status === 'RECEIVED' || formData.status === 'PAID' ? 'Auto journal entry and stock movement created successfully!' : 'Change status to RECEIVED to trigger auto journal entry and stock update.'}`,
      });

      // Reset form and go back to list
      resetForm();
      setView("list");
      fetchInvoices();
    } catch (err) {
      console.error('Purchase invoice creation error:', err);
      let errorMessage = 'Unknown error occurred';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Handle Supabase errors
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('details' in err) {
          errorMessage = String(err.details);
        }
      }
      
      toast({
        title: "Error",
        description: `Failed to create purchase invoice: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      supplier_id: "",
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "SUBMITTED",
      payment_terms: "NET_30",
      notes: "",
      terms_and_conditions: "",
      invoice_discount_rate: 0,
      invoice_discount_type: 'percentage'
    });
    setLineItems([{ item_id: "", item_name: "", description: "", quantity: 1, uom: "PCS", unit_price: 0, tax_rate: 0, discount_rate: 0, discount_amount: 0 }]);
  };

  // Update invoice status
  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      setLoading(true);
      
      
      const { error } = await supabase
        .from('purchase_invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }


      // Wait a moment for triggers to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if stock movements were created
      if (newStatus === 'RECEIVED') {
        const { error: stockError } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('reference_type', 'purchase_invoice')
          .eq('reference_id', invoiceId);
        
        if (stockError) {
          console.warn('Could not check stock movements:', stockError);
        }
        // Check if journal entries were created
        const { error: journalError } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('reference_type', 'purchase_invoice')
          .eq('reference_id', invoiceId);
        
        if (journalError) {
          console.warn('Could not check journal entries:', journalError);
        }
      }

      toast({
        title: "Success",
        description: `Invoice status updated to ${newStatus}. ${newStatus === 'RECEIVED' ? 'Stock quantities updated and movements recorded.' : newStatus === 'SUBMITTED' ? 'Journal entry created automatically.' : ''}`,
      });

      // Refresh the invoices list
      fetchInvoices();
      
      // If we're in detail view, update the selected invoice
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(normalizePurchaseInvoice({ ...selectedInvoice, status: newStatus }));
      }
    } catch (err) {
      console.error('Status update error:', err);
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
        description: `Failed to update invoice status: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const startAdd = () => { resetForm(); setView("add"); };
  const startDetail = (invoice: PurchaseInvoiceWithDetails) => { 
    const normalizedInvoice = normalizePurchaseInvoice(invoice);
    setSelectedInvoice(normalizedInvoice); 
    void fetchPurchaseInvoiceLineItems(normalizedInvoice.id);
    setView("detail"); 
  };
  const backToList = () => {
    setSelectedInvoice(null);
    setSelectedInvoiceLineItems([]);
    setView("list");
  };

  if (view === 'add') {
    return (
      <AppLayout title={t("purchaseInvoice.title")}>
        <SEO title={`${t("purchaseInvoice.title")} - FinanceHub`} description="Create new purchase invoice for supplier purchases" />
        
        <div className="space-y-6">
          <Card className="mb-4">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>{t("purchaseInvoice.purchaseInvoice")}</CardTitle>
                <Badge variant="outline">{t("purchaseInvoice.submitted")}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setView("list")}>{t("purchaseInvoice.cancel")}</Button>
                <Button onClick={saveInvoice} disabled={loading}>
                  {loading ? t("purchaseInvoice.saving") : t("purchaseInvoice.saveInvoice")}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {/* Invoice Details Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("purchaseInvoice.invoiceDetails")}</CardTitle>
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
                
                {/* Auto Journal Entry Info */}
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Auto Journal Entry System
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    - <strong>SUBMITTED:</strong> Invoice created, no journal entry yet
                    - <strong>RECEIVED:</strong> Auto journal entry created + stock updated
                    - <strong>PAID:</strong> Auto journal entry created + stock updated
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t("purchaseInvoice.invoiceDate")} *</Label>
                    <Input 
                      type="date" 
                      value={formData.invoice_date} 
                      onChange={e => setFormData({...formData, invoice_date: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>{t("purchaseInvoice.supplier")} *</Label>
                    <Select value={formData.supplier_id} onValueChange={(value) => setFormData({...formData, supplier_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("purchaseInvoice.selectSupplier")} />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.supplier_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("purchaseInvoice.dueDate")} *</Label>
                    <Input 
                      type="date" 
                      value={formData.due_date} 
                      onChange={e => setFormData({...formData, due_date: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>{t("purchaseInvoice.status")}</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUBMITTED">{t("purchaseInvoice.submitted")}</SelectItem>
                        <SelectItem value="RECEIVED">{t("purchaseInvoice.received")}</SelectItem>
                        <SelectItem value="PAID">{t("purchaseInvoice.paid")}</SelectItem>
                        <SelectItem value="OVERDUE">{t("purchaseInvoice.overdue")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.status === 'RECEIVED' && (
                      <p className="text-xs text-green-600 mt-1">
                        - Stock quantities will be updated and movements recorded
                      </p>
                    )}
                    {formData.status === 'SUBMITTED' && (
                      <p className="text-xs text-blue-600 mt-1">
                        - Journal entry will be created automatically
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>{t("purchaseInvoice.paymentTerms")}</Label>
                    <Select value={formData.payment_terms} onValueChange={(value) => setFormData({...formData, payment_terms: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NET_30">{t("purchaseInvoice.net30")}</SelectItem>
                        <SelectItem value="NET_15">Net 15</SelectItem>
                        <SelectItem value="NET_60">Net 60</SelectItem>
                        <SelectItem value="DUE_ON_RECEIPT">Due on Receipt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("purchaseInvoice.notes")}</Label>
                    <Input 
                      placeholder={t("purchaseInvoice.additionalNotes")} 
                      value={formData.notes} 
                      onChange={e => setFormData({...formData, notes: e.target.value})} 
                    />
                  </div>
                </div>
                                            </CardContent>
             </Card>

                                          {/* Line Items Section */}
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-lg">{t("purchaseInvoice.lineItems")}</CardTitle>
                  <Button variant="outline" onClick={addLineItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("purchaseInvoice.addItem")}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Column Headers */}
                    <div className="grid grid-cols-12 gap-4 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                      <div className="col-span-3">Item</div>
                      <div className="col-span-2">Description</div>
                      <div className="col-span-1">Qty</div>
                      <div className="col-span-1">UOM</div>
                      <div className="col-span-2">Unit Price</div>
                      <div className="col-span-1">Tax %</div>
                      <div className="col-span-1">Disc %</div>
                      <div className="col-span-1 text-right">Total</div>
                    </div>
                    {lineItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-3">
                            <Select value={item.item_id} onValueChange={(value) => handleItemSelection(index, value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map(i => (
                                  <SelectItem key={i.id} value={i.id}>
                                    {i.name} ({i.item_code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Input
                              placeholder="Description"
                              value={item.description}
                              onChange={e => updateLineItem(index, 'description', e.target.value)}
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              min="0.001"
                              step="0.001"
                              placeholder="1"
                              value={item.quantity}
                              onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              placeholder="PCS"
                              value={item.uom}
                              onChange={e => updateLineItem(index, 'uom', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="0.00"
                              value={item.unit_price}
                              onChange={e => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              value={item.tax_rate}
                              onChange={e => updateLineItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              value={item.discount_rate}
                              onChange={e => updateLineItem(index, 'discount_rate', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-span-1 text-right font-medium">
                            ${(item.line_total || calculateLineItemTotal(item)).toFixed(2)}
                          </div>
                        </div>
                        {lineItems.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            className="ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                                 </CardContent>
               </Card>

               {/* Invoice Discount Section */}
               <Card>
                 <CardHeader>
                   <CardTitle className="text-lg">Invoice Discount</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="grid md:grid-cols-3 gap-4">
                     <div>
                       <Label>Discount Type</Label>
                       <Select 
                         value={formData.invoice_discount_type} 
                         onValueChange={(value: 'percentage' | 'amount') => setFormData({...formData, invoice_discount_type: value})}
                       >
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
                       <Label>Discount Value</Label>
                       <Input
                         type="number"
                         min="0"
                         step="0.01"
                         placeholder={formData.invoice_discount_type === 'percentage' ? "0.00" : "0.00"}
                         value={formData.invoice_discount_rate}
                         onChange={e => setFormData({...formData, invoice_discount_rate: parseFloat(e.target.value) || 0})}
                       />
                     </div>
                     <div>
                       <Label>Discount Amount</Label>
                       <Input
                         value={`$${wholeInvoiceDiscount.toFixed(2)}`}
                         disabled
                         className="bg-muted"
                       />
                     </div>
                   </div>
                 </CardContent>
               </Card>

                                                        {/* Totals Section */}
               <Card>
                 <CardHeader>
                   <CardTitle className="text-lg">Invoice Summary</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     <div className="flex justify-between">
                       <span>Subtotal:</span>
                       <span>${subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Tax Amount:</span>
                       <span>${totalTax.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Line Item Discounts:</span>
                       <span>${totalLineItemDiscount.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Line Totals Sum:</span>
                       <span>${lineTotalsSum.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Invoice Discount:</span>
                       <span>${wholeInvoiceDiscount.toFixed(2)}</span>
                     </div>
                     <Separator />
                     <div className="flex justify-between font-semibold text-lg">
                       <span>Total Amount:</span>
                       <span>${total.toFixed(2)}</span>
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
   if (view === 'detail' && selectedInvoice) {
     return (
       <AppLayout title={`Purchase Invoice #${selectedInvoice.invoice_number}`}>
         <SEO title={`Purchase Invoice #${selectedInvoice.invoice_number} - FinanceHub`} description="View purchase invoice details" />
         
         <div className="space-y-6">
           <Card className="mb-4">
             <CardHeader className="flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                   <Button variant="ghost" onClick={backToList}>
                     <ArrowLeft className="mr-2 h-4 w-4" />
                     Back to List
                   </Button>
                   <CardTitle>Purchase Invoice #{selectedInvoice.invoice_number}</CardTitle>
                   <Badge variant="outline">{selectedInvoice.status}</Badge>
                   {activeCompany && (
                     <Badge variant="outline" className="flex items-center gap-1">
                       <DollarSign className="h-3 w-3" />
                       {activeCompany.currency?.toUpperCase() || 'LYD'}
                     </Badge>
                   )}
                 </div>
               <div className="flex gap-2">
                 {/* Status Change Button - Only show for SUBMITTED invoices */}
                 {selectedInvoice.status === 'SUBMITTED' && (
                   <Button
                     variant="default"
                     onClick={() => updateInvoiceStatus(selectedInvoice.id, 'RECEIVED')}
                     className="bg-green-600 hover:bg-green-700"
                   >
                     Mark as Received
                   </Button>
                 )}
                 <Button variant="outline">Print</Button>
                 <Button variant="outline">Export</Button>
               </div>
             </CardHeader>
           </Card>

           <div className="grid md:grid-cols-2 gap-6">
             {/* Invoice Details */}
             <Card>
               <CardHeader>
                 <CardTitle className="text-lg">Invoice Details</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Invoice Date</Label>
                      <p>{formatDisplayDate(selectedInvoice.invoice_date)}</p>
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                      <p>{formatDisplayDate(selectedInvoice.due_date)}</p>
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                     <Badge variant="outline">{selectedInvoice.status}</Badge>
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Payment Terms</Label>
                     <p>{selectedInvoice.payment_terms}</p>
                   </div>
                 </div>
                 {selectedInvoice.notes && (
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                     <p className="text-sm">{selectedInvoice.notes}</p>
                   </div>
                 )}
               </CardContent>
             </Card>

             {/* Supplier Information */}
             <Card>
               <CardHeader>
                 <CardTitle className="text-lg">Supplier Information</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2">
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Supplier</Label>
                     <p>{suppliers.find(s => s.id === selectedInvoice.supplier_id)?.name || 'Unknown Supplier'}</p>
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Supplier Code</Label>
                     <p>{suppliers.find(s => s.id === selectedInvoice.supplier_id)?.supplier_code || 'N/A'}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </div>

           {/* Line Items */}
           <Card>
             <CardHeader>
               <CardTitle className="text-lg">Line Items</CardTitle>
             </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedInvoiceLineItems.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No line items found for this purchase invoice.
                    </div>
                  )}
                  {selectedInvoiceLineItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                     <div className="grid md:grid-cols-4 gap-4">
                       <div>
                         <Label className="text-sm font-medium text-muted-foreground">Item</Label>
                         <p>{item.item_name}</p>
                       </div>
                       <div>
                         <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                         <p className="text-sm">{item.description || 'N/A'}</p>
                       </div>
                       <div>
                         <Label className="text-sm font-medium text-muted-foreground">Qty - Price</Label>
                         <p>{item.quantity} - {activeCompany?.currency === 'lyd' ? 'LYD ' : activeCompany?.currency === 'usd' ? '$' : activeCompany?.currency?.toUpperCase() + ' '}{item.unit_price?.toFixed(2)}</p>
                       </div>
                       <div>
                         <Label className="text-sm font-medium text-muted-foreground">Line Total</Label>
                         <p className="font-medium">${(item.line_total || 0).toFixed(2)}</p>
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
               <CardTitle className="text-lg">Invoice Totals</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-3">
                 <div className="flex justify-between">
                   <span>Subtotal:</span>
                   <span>${toNumber(selectedInvoice.subtotal).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Tax:</span>
                   <span>${toNumber(selectedInvoice.tax_amount).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Discount:</span>
                   <span>-${toNumber(selectedInvoice.discount_amount).toFixed(2)}</span>
                 </div>
                 <Separator />
                 <div className="flex justify-between font-semibold text-lg">
                   <span>Total:</span>
                                            <span>{activeCompany?.currency === 'lyd' ? 'LYD ' : activeCompany?.currency === 'usd' ? '$' : activeCompany?.currency?.toUpperCase() + ' '}{toNumber(selectedInvoice.total_amount).toFixed(2)}</span>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
       </AppLayout>
     );
   }

   return (
    <AppLayout title="Purchase Invoices">
      <SEO title="Purchase Invoices - FinanceHub" description="Manage purchase invoices and supplier procurement" />
      {!activeCompany ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Company</h3>
          <p className="text-muted-foreground">Please select a company to manage purchase invoices</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {view === "list" && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Purchase Invoices</CardTitle>
                  {activeCompany && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {activeCompany.currency?.toUpperCase() || 'LYD'}
                    </Badge>
                  )}
                </div>
                <Button onClick={() => setView("add")}>
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
                    <h3 className="text-lg font-semibold mb-2">No purchase invoices found</h3>
                    <p className="text-muted-foreground">Get started by creating your first purchase invoice</p>
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
                              {new Date(invoice.invoice_date).toLocaleDateString()} - {invoice.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {activeCompany?.currency === 'lyd' ? 'LYD ' : activeCompany?.currency === 'usd' ? '$' : activeCompany?.currency?.toUpperCase() + ' '}
                            {toNumber(invoice.total_amount).toFixed(2)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {suppliers.find(s => s.id === invoice.supplier_id)?.name || 'Unknown Supplier'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status Change Button - Only show for SUBMITTED invoices */}
                          {invoice.status === 'SUBMITTED' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => updateInvoiceStatus(invoice.id, 'RECEIVED')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Mark as Received
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
        </div>
      )}
    </AppLayout>
  );
};

export default PurchaseInvoices;


