import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";

const Suppliers = () => {
  const { state, dispatch } = useAccounting();
  const company = useActiveCompany();
  const [name, setName] = useState("");
  const [apId, setApId] = useState<string>("");

  const payableAccounts = useMemo(() => state.accounts.filter(a => a.companyId === company?.id && a.name.toLowerCase().includes("payable")), [state.accounts, company?.id]);
  const suppliers = useMemo(() => state.suppliers.filter(s => s.companyId === company?.id), [state.suppliers, company?.id]);

  const add = () => {
    if (!company || !name || !apId) return;
    dispatch({ type: "UPSERT_SUPPLIER", supplier: { id: `${Date.now()}`, companyId: company.id, name, payableAccountId: apId } });
    setName("");
  };

  return (
    <AppLayout title="Suppliers">
      <SEO title="Suppliers — FMS" description="Maintain supplier master and link to payable accounts." canonical={window.location.href} />
      {!company ? <p className="text-muted-foreground">Select a company.</p> : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Add Supplier</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Input placeholder="Supplier name" value={name} onChange={e => setName(e.target.value)} />
              <Select value={apId} onValueChange={setApId}>
                <SelectTrigger><SelectValue placeholder="Payable account" /></SelectTrigger>
                <SelectContent>
                  {payableAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.number} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={add}>Add</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Suppliers</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {suppliers.map(s => (
                  <li key={s.id} className="flex items-center justify-between rounded-md border p-3">
                    <span>{s.name}</span>
                    <Button variant="destructive" size="sm" onClick={() => dispatch({ type: "DELETE_SUPPLIER", id: s.id })}>Delete</Button>
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

export default Suppliers;
