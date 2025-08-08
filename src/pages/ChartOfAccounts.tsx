import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany, Account } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";

const ChartOfAccounts = () => {
  const { state, dispatch } = useAccounting();
  const company = useActiveCompany();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("Asset");
  const [reportType, setReportType] = useState<Account["reportType"]>("Balance Sheet");

  const accounts = useMemo(() => state.accounts.filter(a => a.companyId === company?.id), [state.accounts, company?.id]);

  const add = () => {
    if (!company) return;
    if (!number || !name) return;
    dispatch({ type: "UPSERT_ACCOUNT", account: { id: `${Date.now()}`, companyId: company.id, number, name, type, reportType } });
    setNumber(""); setName("");
  };

  const remove = (id: string) => dispatch({ type: "DELETE_ACCOUNT", id });

  return (
    <AppLayout title="Chart of Accounts">
      <SEO title="Chart of Accounts — FMS" description="Maintain accounts for each company with numbers, names, and report types." canonical={window.location.href} />
      {!company ? (
        <p className="text-muted-foreground">Create and select a company to manage accounts.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Add Account</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Input placeholder="Account number" value={number} onChange={e => setNumber(e.target.value)} />
              <Input placeholder="Account name" value={name} onChange={e => setName(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={type} onValueChange={(v) => setType(v as Account["type"])}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {(["Asset","Liability","Equity","Revenue","Expense"] as const).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={reportType} onValueChange={(v) => setReportType(v as Account["reportType"])}>
                  <SelectTrigger><SelectValue placeholder="Report" /></SelectTrigger>
                  <SelectContent>
                    {(["Balance Sheet","Income Statement"] as const).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={add}>Add</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Accounts</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 text-sm font-medium text-muted-foreground">
                <span>No.</span><span>Name</span><span>Type</span><span></span>
              </div>
              <div className="mt-2 space-y-2">
                {accounts.map(a => (
                  <div key={a.id} className="grid grid-cols-4 items-center rounded-md border p-2">
                    <span>{a.number}</span>
                    <span>{a.name}</span>
                    <span>{a.type}</span>
                    <div className="text-right"><Button variant="destructive" size="sm" onClick={() => remove(a.id)}>Delete</Button></div>
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

export default ChartOfAccounts;
