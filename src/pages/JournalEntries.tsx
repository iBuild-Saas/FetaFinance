import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";

const JournalEntries = () => {
  const { state, dispatch } = useAccounting();
  const company = useActiveCompany();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [memo, setMemo] = useState<string>("");
  const [lines, setLines] = useState<{ accountId: string; debit: string; credit: string; description?: string }[]>([{ accountId: "", debit: "", credit: "" }]);

  const accounts = useMemo(() => state.accounts.filter(a => a.companyId === company?.id), [state.accounts, company?.id]);
  const journals = useMemo(() => state.journals.filter(j => j.companyId === company?.id), [state.journals, company?.id]);

  const addLine = () => setLines(ls => [...ls, { accountId: "", debit: "", credit: "" }]);
  const removeLine = (idx: number) => setLines(ls => ls.filter((_, i) => i !== idx));

  const save = () => {
    if (!company) return;
    const prepared = lines.map(l => ({ id: `${Date.now()}-${Math.random()}`, accountId: l.accountId, debit: parseFloat(l.debit || "0"), credit: parseFloat(l.credit || "0"), description: l.description }));
    const totalD = prepared.reduce((s, l) => s + l.debit, 0);
    const totalC = prepared.reduce((s, l) => s + l.credit, 0);
    if (totalD <= 0 || Math.abs(totalD - totalC) > 0.0001) return;
    dispatch({ type: "ADD_JOURNAL", journal: { id: `${Date.now()}`, companyId: company.id, date, memo, lines: prepared } });
    setLines([{ accountId: "", debit: "", credit: "" }]); setMemo("");
  };

  return (
    <AppLayout title="Journal Entries">
      <SEO title="Journal — FMS" description="Record manual accounting journal entries for each company." canonical={window.location.href} />
      {!company ? <p className="text-muted-foreground">Select a company.</p> : (
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle>New Entry</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid md:grid-cols-3 gap-3">
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                <Input placeholder="Memo" value={memo} onChange={e => setMemo(e.target.value)} />
              </div>
              <div className="rounded-md border p-2 space-y-2">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Select value={l.accountId} onValueChange={(v) => setLines(prev => prev.map((x,i) => i===idx?{...x, accountId:v}:x))}>
                      <SelectTrigger className="col-span-6"><SelectValue placeholder="Account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.number} — {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="col-span-2" type="number" placeholder="Debit" value={l.debit} onChange={e => setLines(prev => prev.map((x,i) => i===idx?{...x, debit: e.target.value}:x))} />
                    <Input className="col-span-2" type="number" placeholder="Credit" value={l.credit} onChange={e => setLines(prev => prev.map((x,i) => i===idx?{...x, credit: e.target.value}:x))} />
                    <Button variant="destructive" size="sm" className="col-span-2" onClick={() => removeLine(idx)}>Remove</Button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" onClick={addLine}>Add Line</Button>
              </div>
              <div className="text-right"><Button onClick={save}>Post Entry</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {journals.slice(-10).reverse().map(j => (
                  <div key={j.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{j.date}</span><span>{j.memo}</span></div>
                    <div className="mt-2 grid grid-cols-5 text-sm font-medium text-muted-foreground"><span>Account</span><span>Description</span><span>Debit</span><span>Credit</span><span></span></div>
                    {j.lines.map(l => (
                      <div key={l.id} className="grid grid-cols-5 text-sm">
                        <span>{state.accounts.find(a => a.id === l.accountId)?.name ?? ''}</span>
                        <span>{l.description ?? ''}</span>
                        <span>{l.debit ? l.debit.toFixed(2) : ''}</span>
                        <span>{l.credit ? l.credit.toFixed(2) : ''}</span>
                        <span></span>
                      </div>
                    ))}
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

export default JournalEntries;
