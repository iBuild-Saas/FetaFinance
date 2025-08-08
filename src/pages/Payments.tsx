import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany, PartyType } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";

const Payments = () => {
  const { state, dispatch } = useAccounting();
  const company = useActiveCompany();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [mode, setMode] = useState<string>("Bank");
  const [partyType, setPartyType] = useState<PartyType>("Customer");
  const [partyId, setPartyId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const bankCashAccounts = useMemo(() => state.accounts.filter(a => a.companyId === company?.id && (a.name.toLowerCase().includes("bank") || a.name.toLowerCase().includes("cash"))), [state.accounts, company?.id]);
  const customers = useMemo(() => state.customers.filter(c => c.companyId === company?.id), [state.customers, company?.id]);
  const suppliers = useMemo(() => state.suppliers.filter(s => s.companyId === company?.id), [state.suppliers, company?.id]);
  const payments = useMemo(() => state.payments.filter(p => p.companyId === company?.id), [state.payments, company?.id]);

  const save = () => {
    if (!company || !partyId || !accountId || !amount) return;
    const id = `${Date.now()}`;
    dispatch({ type: "ADD_PAYMENT", payment: { id, companyId: company.id, date, mode, partyType, partyId, accountId, amount: parseFloat(amount) } });
    setAmount("");
  };

  return (
    <AppLayout title="Payments">
      <SEO title="Payments — FMS" description="Record customer receipts and supplier payments with automatic journal entries." canonical={window.location.href} />
      {!company ? <p className="text-muted-foreground">Select a company.</p> : (
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle>New Payment</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                <SelectContent>
                  {['Bank','Cash','Card','Transfer'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={partyType} onValueChange={(v) => setPartyType(v as PartyType)}>
                <SelectTrigger><SelectValue placeholder="Party Type" /></SelectTrigger>
                <SelectContent>
                  {(['Customer','Supplier'] as const).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger><SelectValue placeholder={partyType === 'Customer' ? 'Customer' : 'Supplier'} /></SelectTrigger>
                <SelectContent>
                  {(partyType === 'Customer' ? customers : suppliers).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Bank/Cash Account" /></SelectTrigger>
                <SelectContent>
                  {bankCashAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.number} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
              <div className="md:col-span-3 text-right"><Button onClick={save}>Save Payment</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 text-sm font-medium text-muted-foreground">
                <span>Date</span><span>ID</span><span>Party</span><span>Type</span><span>Account</span><span>Amount</span>
              </div>
              <div className="mt-2 space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="grid grid-cols-6 items-center rounded-md border p-2">
                    <span>{p.date}</span>
                    <span>{p.id}</span>
                    <span>{(p.partyType === 'Customer' ? state.customers.find(c => c.id === p.partyId)?.name : state.suppliers.find(s => s.id === p.partyId)?.name) ?? ''}</span>
                    <span>{p.partyType}</span>
                    <span>{state.accounts.find(a => a.id === p.accountId)?.name ?? ''}</span>
                    <span>{p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};

export default Payments;
