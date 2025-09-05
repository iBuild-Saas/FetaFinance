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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, Calendar, Building2, DollarSign, ArrowLeft, ArrowUpRight, ArrowDownLeft, CreditCard, Banknote } from "lucide-react";
import type { Database } from "@/lib/supabase";

type ViewMode = "list" | "add" | "detail";
type PaymentType = "receive" | "pay";

// Types from database
type Payment = {
  id: string;
  payment_type: 'RECEIVE' | 'PAY';
  customer_id?: string;
  supplier_id?: string;
  invoice_id?: string;
  company_id: string;
  payment_date: string;
  payment_method: string;
  payment_method_id?: string;
  reference_number: string;
  amount: number;
  notes?: string;
  status: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type PaymentMethod = {
  id: string;
  name: string;
  account_id: string;
  account_code: string;
  account_name: string;
};

type Customer = Database['public']['Tables']['customers']['Row'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];
type SalesInvoice = {
  id: string;
  invoice_number: string;
  total_amount: number;
  customer_id: string;
  status: string;
};
type PurchaseInvoice = {
  id: string;
  invoice_number: string;
  total_amount: number;
  supplier_id: string;
  status: string;
};

interface PaymentFormData {
  payment_type: PaymentType;
  customer_id?: string;
  supplier_id?: string;
  invoice_id?: string;
  payment_date: string;
  payment_method: string;
  payment_method_id?: string;
  reference_number: string;
  amount: number;
  notes: string;
  status: string;
  currency: string;
}

const Payments = () => {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();
  
  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentType>("receive");
  
  // Form data
  const [formData, setFormData] = useState<PaymentFormData>({
    payment_type: "receive",
    customer_id: "",
    supplier_id: "",
    invoice_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "",
    payment_method_id: "",
    reference_number: "",
    amount: 0,
    notes: "",
    status: "COMPLETED",
    currency: "USD"
  });

  // Fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchPayments();
      fetchCustomers();
      fetchSuppliers();
      fetchSalesInvoices();
      fetchPurchaseInvoices();
      fetchPaymentMethods();
    }
  }, [activeCompany]);

  // Fetch payments
  const fetchPayments = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      // First, fetch basic payment data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        throw paymentsError;
      }

      // Set the payments data
      console.log('Fetched payments:', paymentsData);
      setPayments(paymentsData || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
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

  // Fetch sales invoices
  const fetchSalesInvoices = async () => {
    if (!activeCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, total_amount, customer_id, status')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .eq('status', 'SUBMITTED')
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      setSalesInvoices(data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch sales invoices",
        variant: "destructive",
      });
    }
  };

  // Fetch purchase invoices
  const fetchPurchaseInvoices = async () => {
    if (!activeCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('id, invoice_number, total_amount, supplier_id, status')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('invoice_number');

      if (error) throw error;
      setPurchaseInvoices(data || []);
    } catch (err) {
      console.error('Error fetching purchase invoices:', err);
      toast({
        title: "Error",
        description: "Failed to fetch purchase invoices",
        variant: "destructive",
      });
    }
  };

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    if (!activeCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('payment_methods_view')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('name');

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    }
  };

  // Handle payment type change
  const handlePaymentTypeChange = (type: PaymentType) => {
    setActiveTab(type);
    setFormData(prev => ({
      ...prev,
      payment_type: type,
      customer_id: type === 'receive' ? "" : undefined,
      supplier_id: type === 'pay' ? "" : undefined,
      invoice_id: ""
    }));
  };

  // Handle customer/supplier selection
  const handleEntitySelection = (entityId: string) => {
    if (activeTab === 'receive') {
      setFormData(prev => ({ ...prev, customer_id: entityId }));
    } else {
      setFormData(prev => ({ ...prev, supplier_id: entityId }));
    }
    setFormData(prev => ({ ...prev, invoice_id: "" }));
  };

  // Handle invoice selection
  const handleInvoiceSelection = (invoiceId: string) => {
    setFormData(prev => ({ ...prev, invoice_id: invoiceId }));
    
    // Auto-populate amount if invoice is selected
    let selectedInvoice;
    if (activeTab === 'receive') {
      selectedInvoice = salesInvoices.find(inv => inv.id === invoiceId);
    } else {
      selectedInvoice = purchaseInvoices.find(inv => inv.id === invoiceId);
    }
    
    if (selectedInvoice) {
      setFormData(prev => ({ ...prev, amount: selectedInvoice.total_amount || 0 }));
    }
  };

  // Save payment
  const savePayment = async () => {
    if (!activeCompany?.id || !formData.amount || formData.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === 'receive' && !formData.customer_id) {
      toast({
        title: "Error",
        description: "Please select a customer for receiving payment",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === 'pay' && !formData.supplier_id) {
      toast({
        title: "Error",
        description: "Please select a supplier for making payment",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        payment_type: activeTab.toUpperCase(),
        customer_id: activeTab === 'receive' ? formData.customer_id : null,
        supplier_id: activeTab === 'pay' ? formData.supplier_id : null,
        invoice_id: formData.invoice_id || null,
        company_id: activeCompany.id,
        payment_date: formData.payment_date,
        payment_method: paymentMethods.find(pm => pm.id === formData.payment_method)?.name || '',
        payment_method_id: formData.payment_method,
        reference_number: formData.reference_number || `REF-${Date.now()}`,
        amount: formData.amount,
        notes: formData.notes,
        status: formData.status,
        currency: 'LYD'
      };
      
             console.log('Saving payment data:', paymentData);
       const { data: payment, error: paymentError } = await supabase
         .from('payments')
         .insert([paymentData])
         .select()
         .single();

      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        throw paymentError;
      }

      toast({
        title: "Success",
        description: `Payment ${activeTab === 'receive' ? 'received' : 'made'} successfully`,
      });

      // Reset form and go back to list
      resetForm();
      setView("list");
      fetchPayments();
    } catch (err) {
      console.error('Payment creation error:', err);
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
        description: `Failed to ${activeTab === 'receive' ? 'receive' : 'make'} payment: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      payment_type: activeTab,
      customer_id: "",
      supplier_id: "",
      invoice_id: "",
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: "BANK_TRANSFER",
      reference_number: "",
      amount: 0,
      notes: "",
      status: "COMPLETED"
    });
  };

  // Navigation functions
  const startAdd = () => { resetForm(); setView("add"); };
  const startDetail = (payment: Payment) => { 
    setSelectedPayment(payment); 
    setView("detail"); 
  };
  const backToList = () => { setSelectedPayment(null); setView("list"); };

  // Filter payments by type
  const receivedPayments = payments.filter(p => p.payment_type === 'RECEIVE');
  const madePayments = payments.filter(p => p.payment_type === 'PAY');

  if (view === 'add') {
  return (
      <AppLayout title={`${activeTab === 'receive' ? 'Receive' : 'Make'} Payment`}>
        <SEO title={`${activeTab === 'receive' ? 'Receive' : 'Make'} Payment — FinanceHub`} description={`${activeTab === 'receive' ? 'Receive payment from customer' : 'Make payment to supplier'}`} />
        
        <div className="space-y-6">
          <Card className="mb-4">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>{activeTab === 'receive' ? 'Receive Payment' : 'Make Payment'}</CardTitle>
                <Badge variant="outline">{activeTab === 'receive' ? 'Customer Payment' : 'Supplier Payment'}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setView("list")}>Cancel</Button>
                <Button onClick={savePayment} disabled={loading}>
                  {loading ? 'Saving...' : `Save Payment`}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {/* Payment Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => handlePaymentTypeChange(value as PaymentType)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="receive" className="flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4" />
                      Receive Payment
                    </TabsTrigger>
                    <TabsTrigger value="pay" className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" />
                      Make Payment
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Payment Details */}
          <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Date *</Label>
                    <Input 
                      type="date" 
                      value={formData.payment_date} 
                      onChange={e => setFormData({...formData, payment_date: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>{activeTab === 'receive' ? 'Customer' : 'Supplier'} *</Label>
                    <Select 
                      value={activeTab === 'receive' ? formData.customer_id : formData.supplier_id} 
                      onValueChange={handleEntitySelection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${activeTab === 'receive' ? 'customer' : 'supplier'}`} />
                      </SelectTrigger>
                <SelectContent>
                        {(activeTab === 'receive' ? customers : suppliers).map(entity => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.name} ({activeTab === 'receive' ? entity.customer_code : entity.supplier_code})
                          </SelectItem>
                        ))}
                </SelectContent>
              </Select>
                  </div>
                  <div>
                    <Label>Invoice (Optional)</Label>
                    <Select value={formData.invoice_id} onValueChange={handleInvoiceSelection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select invoice" />
                      </SelectTrigger>
                <SelectContent>
                                                 {(activeTab === 'receive' ? salesInvoices : purchaseInvoices)
                           .filter(inv => {
                             if (activeTab === 'receive') {
                               return (inv as SalesInvoice).customer_id === formData.customer_id;
                             } else {
                               return (inv as PurchaseInvoice).supplier_id === formData.supplier_id;
                             }
                           })
                           .map(inv => (
                             <SelectItem key={inv.id} value={inv.id}>
                               {inv.invoice_number} - ${inv.total_amount?.toFixed(2)}
                             </SelectItem>
                           ))}
                </SelectContent>
              </Select>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name}
                          </SelectItem>
                        ))}
                </SelectContent>
              </Select>
                  </div>
                  <div>
                    <Label>Reference Number</Label>
                    <Input 
                      placeholder="Payment reference number" 
                      value={formData.reference_number} 
                      onChange={e => setFormData({...formData, reference_number: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Amount *</Label>
                    <Input 
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                <SelectContent>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Input 
                      placeholder="Additional notes about the payment" 
                      value={formData.notes} 
                      onChange={e => setFormData({...formData, notes: e.target.value})} 
                    />
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
  if (view === 'detail' && selectedPayment) {
    return (
      <AppLayout title={`Payment #${selectedPayment.reference_number}`}>
        <SEO title={`Payment #${selectedPayment.reference_number} — FinanceHub`} description="View payment details" />
        
        <div className="space-y-6">
          <Card className="mb-4">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={backToList}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to List
                </Button>
                <CardTitle>Payment #{selectedPayment.reference_number}</CardTitle>
                <Badge variant="outline">{selectedPayment.status}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Print</Button>
                <Button variant="outline">Export</Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Payment Date</Label>
                    <p>{new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                    <Badge variant="outline">
                      {selectedPayment.payment_type === 'RECEIVE' ? 'Receive' : 'Pay'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Method</Label>
                    <p>{selectedPayment.payment_method}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant="outline">{selectedPayment.status}</Badge>
                  </div>
                </div>
                {selectedPayment.notes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                    <p className="text-sm">{selectedPayment.notes}</p>
                  </div>
                )}
            </CardContent>
          </Card>

                         {/* Entity Information */}
          <Card>
               <CardHeader>
                 <CardTitle className="text-lg">
                   {selectedPayment.payment_type === 'RECEIVE' ? 'Customer' : 'Supplier'} Information
                 </CardTitle>
               </CardHeader>
            <CardContent>
                 <div className="space-y-2">
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                     <p>
                       {selectedPayment.payment_type === 'RECEIVE' 
                         ? customers.find(c => c.id === selectedPayment.customer_id)?.name || 'Unknown Customer'
                         : suppliers.find(s => s.id === selectedPayment.supplier_id)?.name || 'Unknown Supplier'}
                     </p>
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Code</Label>
                     <p>
                       {selectedPayment.payment_type === 'RECEIVE' 
                         ? customers.find(c => c.id === selectedPayment.customer_id)?.customer_code || 'N/A'
                         : suppliers.find(s => s.id === selectedPayment.supplier_id)?.supplier_code || 'N/A'}
                     </p>
                   </div>
                 </div>
               </CardContent>
             </Card>
              </div>

          {/* Amount */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  ${selectedPayment.amount?.toFixed(2) || '0.00'}
                  </div>
                <p className="text-muted-foreground mt-2">
                  {selectedPayment.payment_type === 'RECEIVE' ? 'Received from customer' : 'Paid to supplier'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Payments">
      <SEO title="Payments — FinanceHub" description="Manage customer and supplier payments" />
      {!activeCompany ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Company</h3>
          <p className="text-muted-foreground">Please select a company to manage payments</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {view === "list" && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Payments</CardTitle>
                <Button onClick={() => setView("add")}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Payment
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PaymentType)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="receive" className="flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4" />
                      Received Payments ({receivedPayments.length})
                    </TabsTrigger>
                    <TabsTrigger value="pay" className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" />
                      Made Payments ({madePayments.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="receive">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading payments...</p>
                      </div>
                    ) : receivedPayments.length === 0 ? (
                      <div className="text-center py-8">
                        <ArrowDownLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No received payments found</h3>
                        <p className="text-muted-foreground">Get started by recording your first customer payment</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {receivedPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <ArrowDownLeft className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">Payment #{payment.reference_number}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">+${payment.amount?.toFixed(2) || '0.00'}</div>
                              <p className="text-sm text-muted-foreground">
                                {customers.find(c => c.id === payment.customer_id)?.name || 'Unknown Customer'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startDetail(payment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="pay">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading payments...</p>
                      </div>
                    ) : madePayments.length === 0 ? (
                      <div className="text-center py-8">
                        <ArrowUpRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No made payments found</h3>
                        <p className="text-muted-foreground">Get started by recording your first supplier payment</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {madePayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <ArrowUpRight className="h-5 w-5 text-red-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">Payment #{payment.reference_number}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-red-600">-${payment.amount?.toFixed(2) || '0.00'}</div>
                              <p className="text-sm text-muted-foreground">
                                {suppliers.find(s => s.id === payment.supplier_id)?.name || 'Unknown Supplier'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startDetail(payment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default Payments;
