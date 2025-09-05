import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting } from "@/state/accounting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useToast } from "@/hooks/use-toast";
import { useDatabase } from "@/hooks/useDatabase";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Calculator } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaymentMethod {
  id: string;
  name: string;
  account_id: string;
  account_code: string;
  account_name: string;
  description: string;
  is_active: boolean;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

const PaymentMethods = () => {
  const { state } = useAccounting();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Get active company from companies data - same pattern as useCustomers hook
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    account_id: '',
    description: ''
  });

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_methods_view')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('name');

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      toast({
        title: "Error",
        description: "Failed to fetch payment methods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts for dropdown
  const fetchAccounts = async () => {
    if (!activeCompany?.id) return;
    
    try {
      // Map frontend company ID to database UUID (same pattern as Reports page)
      const idMapping = {
        '1754730703821': '33105b2a-b01f-49f3-9b44-a15632da7435',
        '1754731842426': 'c2c05a4e-2368-4c1d-a0e4-92f567930926', 
        '1754731848904': 'c6ad1436-6474-43a8-b2e8-f1d078cd0cab',
        '1754731853398': '6e0641dd-87d3-4a47-b109-786538dc58f0'
      };
      const actualCompanyId = idMapping[activeCompany.id] || activeCompany.id;
      
      console.log('PaymentMethods - Fetching accounts for company:', actualCompanyId);
      
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('company_id', actualCompanyId)
        .eq('is_active', true)
        .eq('is_group', false) // Only leaf accounts, not group accounts
        .order('account_code');

      if (error) throw error;
      console.log('PaymentMethods - Accounts fetched:', data);
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  // Fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchPaymentMethods();
      fetchAccounts();
    }
  }, [activeCompany?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany?.id) return;

    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        company_id: activeCompany.id
      };

      let result;
      if (editingMethod) {
        result = await supabase
          .from('payment_methods')
          .update(payload)
          .eq('id', editingMethod.id);
      } else {
        result = await supabase
          .from('payment_methods')
          .insert([payload]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Payment method ${editingMethod ? 'updated' : 'created'} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      fetchPaymentMethods();
    } catch (err) {
      console.error('Error saving payment method:', err);
      toast({
        title: "Error",
        description: "Failed to save payment method",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      account_id: method.account_id,
      description: method.description || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method deleted successfully",
      });

      fetchPaymentMethods();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      toast({
        title: "Error",
        description: "Failed to delete payment method",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      account_id: '',
      description: ''
    });
    setEditingMethod(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  if (!activeCompany) {
    return (
      <AppLayout>
        <SEO title="Payment Methods" />
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please select a company to manage payment methods.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title="Payment Methods" />
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Payment Methods</h1>
            <p className="text-muted-foreground">
              Manage payment methods and link them to chart of accounts
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingMethod ? 'Edit Payment Method' : 'Create Payment Method'}
                </DialogTitle>
                <DialogDescription>
                  {editingMethod ? 'Update the payment method details.' : 'Add a new payment method and link it to an account.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Cash, Bank Transfer, Credit Card"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="account">Linked Account</Label>
                    <Select
                      value={formData.account_id}
                      onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingMethod ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No payment methods found</p>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Payment Method
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Linked Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethods.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-medium">{method.name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{method.account_code} - {method.account_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{method.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(method)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(method.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PaymentMethods;
