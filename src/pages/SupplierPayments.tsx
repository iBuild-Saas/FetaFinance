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
        
        <Card className="max-w-2xl card-gradient">
          <CardHeader className="flex flex-row items-center gap-4">
            <Button variant="ghost" onClick={() => setView('list')} className="p-2 hover:bg-accent/20 rounded-xl">
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="date" className="text-sm font-medium">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="supplier" className="text-sm font-medium">Supplier</Label>
                  <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                    <SelectTrigger className="input-modern">
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
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="amount" className="text-sm font-medium">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="account" className="text-sm font-medium">Payment Account</Label>
                  <Select value={formData.accountId} onValueChange={(v) => setFormData({ ...formData, accountId: v })}>
                    <SelectTrigger className="input-modern">
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
                <Label htmlFor="mode" className="text-sm font-medium">Payment Mode</Label>
                <Select value={formData.mode} onValueChange={(v) => setFormData({ ...formData, mode: v })}>
                  <SelectTrigger className="input-modern">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4 pt-6">
                <Button type="submit" variant="gradient" className="flex-1 btn-gradient">
                  Record Payment
                </Button>
                <Button type="button" variant="outline" onClick={() => setView('list')} className="btn-glass">
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
      
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Supplier Payments</h2>
            <p className="text-sm text-muted-foreground">Manage outgoing payments to suppliers</p>
          </div>
        </div>
        <Button onClick={() => setView('create')} variant="gradient" className="flex items-center gap-2 btn-gradient">
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      <Card className="card-modern">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Supplier</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Mode</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center">
                        <CreditCard className="w-8 h-8 text-rose-500 opacity-60" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">No supplier payments yet</h3>
                        <p className="text-sm text-muted-foreground">Record your first supplier payment to get started</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                supplierPayments.map((payment) => {
                  const supplier = state.suppliers.find(s => s.id === payment.partyId);
                  return (
                    <TableRow key={payment.id} className="hover:bg-gradient-to-r hover:from-muted/20 hover:to-transparent transition-all duration-200">
                      <TableCell className="font-medium">{payment.date}</TableCell>
                      <TableCell>{supplier?.name || 'Unknown'}</TableCell>
                      <TableCell className="font-bold text-lg">${payment.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-background/50">{payment.mode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-gradient-warning text-warning-foreground border-0">Paid</Badge>
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