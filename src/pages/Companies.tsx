import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

const Companies = () => {
  const { state, dispatch } = useAccounting();
  const [name, setName] = useState("");

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: "ADD_COMPANY", company: { id: `${Date.now()}`, name: trimmed } });
    setName("");
  };

  const remove = (id: string) => {
    dispatch({ type: "DELETE_COMPANY", id });
  };

  return (
    <AppLayout title="Companies">
      <SEO title="Companies — FMS" description="Add and manage companies for multi-company accounting." canonical={window.location.href} />
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Add Company</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="Company name" value={name} onChange={e => setName(e.target.value)} />
            <Button onClick={add}>Add</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Existing Companies</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {state.companies.map(c => (
                <li key={c.id} className="flex items-center justify-between rounded-md border p-3">
                  <span>{c.name}</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => dispatch({ type: "SET_ACTIVE_COMPANY", id: c.id })}>Set Active</Button>
                    <Button variant="destructive" onClick={() => remove(c.id)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Companies;
