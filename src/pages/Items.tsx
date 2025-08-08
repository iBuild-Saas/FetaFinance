import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";

const Items = () => {
  const { state, dispatch } = useAccounting();
  const company = useActiveCompany();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [rate, setRate] = useState<string>("");
  const [incomeId, setIncomeId] = useState<string>("");

  const incomeAccounts = useMemo(() => state.accounts.filter(a => a.companyId === company?.id && a.type === "Revenue"), [state.accounts, company?.id]);
  const items = useMemo(() => state.items.filter(i => i.companyId === company?.id), [state.items, company?.id]);

  const add = () => {
    if (!company || !code || !name || !rate || !incomeId) return;
    dispatch({ type: "UPSERT_ITEM", item: { id: `${Date.now()}`, companyId: company.id, code, name, rate: parseFloat(rate), incomeAccountId: incomeId } });
    setCode(""); setName(""); setRate("");
  };

  return (
    <AppLayout title="Items">
      <SEO title="Items — FMS" description="Maintain item master with prices and income accounts." canonical={window.location.href} />
      {!company ? <p className="text-muted-foreground">Select a company.</p> : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Add Item</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Input placeholder="Item code" value={code} onChange={e => setCode(e.target.value)} />
              <Input placeholder="Item name" value={name} onChange={e => setName(e.target.value)} />
              <Input type="number" placeholder="Rate" value={rate} onChange={e => setRate(e.target.value)} />
              <Select value={incomeId} onValueChange={setIncomeId}>
                <SelectTrigger><SelectValue placeholder="Income account" /></SelectTrigger>
                <SelectContent>
                  {incomeAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.number} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={add}>Add</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {items.map(i => (
                  <li key={i.id} className="flex items-center justify-between rounded-md border p-3">
                    <span>{i.code} — {i.name} • {i.rate.toFixed(2)}</span>
                    <Button variant="destructive" size="sm" onClick={() => dispatch({ type: "DELETE_ITEM", id: i.id })}>Delete</Button>
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

export default Items;
