import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Plus, Receipt, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const CustomerPayments = () => {
  const { state, dispatch } = useAccounting();
  const company = useActiveCompany();
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'create'>('list');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    accountId: '',
    amount: '',
    mode: '',
  });

  const customerPayments = state.payments.filter(p => 
    p.companyId === state.activeCompanyId && p.partyType === 'Customer'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    const payment = {
      id: Date.now().toString(),
      companyId: company.id,
      date: formData.date,
      mode: formData.mode,
      partyType: 'Customer' as const,
      partyId: formData.customerId,
      accountId: formData.accountId,
      amount: parseFloat(formData.amount),
    };

    dispatch({ type: 'ADD_PAYMENT', payment });
    toast({ title: "Success", description: "Customer payment recorded successfully" });
    setView('list');
    setFormData({ date: new Date().toISOString().split('T')[0], customerId: '', accountId: '', amount: '', mode: '' });
  };

  if (view === 'create') {
    return (
      <AppLayout title="Record Customer Payment">
        <SEO title="New Customer Payment — FinanceHub" description="Record customer payment receipt" />
        
        <Card className="max-w-2xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <Button variant="ghost" onClick={() => setView('list')} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                New Customer Payment
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="form-modern">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customer">Customer</Label>
                  <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.customers.filter(c => c.companyId === state.activeCompanyId).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="account">Deposit Account</Label>
                  <Select value={formData.accountId} onValueChange={(v) => setFormData({ ...formData, accountId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.accounts.filter(a => a.companyId === state.activeCompanyId && (a.name.includes('Cash') || a.name.includes('Bank'))).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.number} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="mode">Payment Mode</Label>
                <Select value={formData.mode} onValueChange={(v) => setFormData({ ...formData, mode: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="gradient" className="flex-1">
                  Record Payment
                </Button>
                <Button type="button" variant="outline" onClick={() => setView('list')}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Customer Payments">
      <SEO title="Customer Payments — FinanceHub" description="Manage customer payment receipts and track receivables" />
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-primary" />
          <span className="text-lg font-medium">Customer Payment Receipts</span>
        </div>
        <Button onClick={() => setView('create')} variant="gradient" className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No customer payments recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                customerPayments.map((payment) => {
                  const customer = state.customers.find(c => c.id === payment.partyId);
                  return (
                    <TableRow key={payment.id} className="hover:bg-muted/50">
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>{customer?.name || 'Unknown'}</TableCell>
                      <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.mode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-success-light text-success">Received</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default CustomerPayments;