import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";

const Customers = () => {
  const { state, dispatch } = useAccounting();
  const company = useActiveCompany();
  const [name, setName] = useState("");
  const [arId, setArId] = useState<string>("");

  const receivableAccounts = useMemo(() => state.accounts.filter(a => a.companyId === company?.id && a.name.toLowerCase().includes("receivable")), [state.accounts, company?.id]);
  const customers = useMemo(() => state.customers.filter(c => c.companyId === company?.id), [state.customers, company?.id]);

  const add = () => {
    if (!company || !name || !arId) return;
    dispatch({ type: "UPSERT_CUSTOMER", customer: { id: `${Date.now()}`, companyId: company.id, name, receivableAccountId: arId } });
    setName("");
  };

  return (
    <AppLayout title="Customers">
      <SEO title="Customers — FMS" description="Maintain customer master and link to receivable accounts." canonical={window.location.href} />
      {!company ? <p className="text-muted-foreground">Select a company.</p> : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Add Customer</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Input placeholder="Customer name" value={name} onChange={e => setName(e.target.value)} />
              <Select value={arId} onValueChange={setArId}>
                <SelectTrigger><SelectValue placeholder="Receivable account" /></SelectTrigger>
                <SelectContent>
                  {receivableAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.number} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={add}>Add</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Customers</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {customers.map(c => (
                  <li key={c.id} className="flex items-center justify-between rounded-md border p-3">
                    <span>{c.name}</span>
                    <Button variant="destructive" size="sm" onClick={() => dispatch({ type: "DELETE_CUSTOMER", id: c.id })}>Delete</Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};

export default Customers;
