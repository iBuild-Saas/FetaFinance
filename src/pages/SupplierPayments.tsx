import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Plus, CreditCard, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const SupplierPayments = () => {
  const { state, dispatch } = useAccounting();
  const company = useActiveCompany();
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'create'>('list');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    accountId: '',
    amount: '',
    mode: '',
  });

  const supplierPayments = state.payments.filter(p => 
    p.companyId === state.activeCompanyId && p.partyType === 'Supplier'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    const payment = {
      id: Date.now().toString(),
      companyId: company.id,
      date: formData.date,
      mode: formData.mode,
      partyType: 'Supplier' as const,
      partyId: formData.supplierId,
      accountId: formData.accountId,
      amount: parseFloat(formData.amount),
    };

    dispatch({ type: 'ADD_PAYMENT', payment });
    toast({ title: "Success", description: "Supplier payment recorded successfully" });
    setView('list');
    setFormData({ date: new Date().toISOString().split('T')[0], supplierId: '', accountId: '', amount: '', mode: '' });
  };

  if (view === 'create') {
    return (
      <AppLayout title="Record Supplier Payment">
        <SEO title="New Supplier Payment — FinanceHub" description="Record supplier payment" />
        
        <Card className="max-w-2xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <Button variant="ghost" onClick={() => setView('list')} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                New Supplier Payment
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
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.suppliers.filter(s => s.companyId === state.activeCompanyId).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
                  <Label htmlFor="mode">Payment Mode</Label>
                  <Select value={formData.mode} onValueChange={(v) => setFormData({ ...formData, mode: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
    <AppLayout title="Supplier Payments">
      <SEO title="Supplier Payments — FinanceHub" description="Manage supplier payments and track payables" />
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-primary" />
          <span className="text-lg font-medium">Supplier Payments</span>
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
                <TableHead>Supplier</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <div>
                      <h3 className="font-medium mb-2">No supplier payments yet</h3>
                      <p className="text-sm">Record your first supplier payment to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                supplierPayments.map((payment) => {
                  const supplier = state.suppliers.find(s => s.id === payment.partyId);
                  return (
                    <TableRow key={payment.id} className="hover:bg-muted/50">
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>{supplier?.name || 'Unknown'}</TableCell>
                      <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.mode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-warning-light text-warning">Paid</Badge>
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

export default SupplierPayments;