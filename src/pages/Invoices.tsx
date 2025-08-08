import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany, InvoiceItem } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";

const Invoices = () => {
  const { state, dispatch } = useAccounting();
  const company = useActiveCompany();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [customerId, setCustomerId] = useState<string>("");
  const [discount, setDiscount] = useState<string>("0");
  const [rows, setRows] = useState<InvoiceItem[]>([]);

  const customers = useMemo(() => state.customers.filter(c => c.companyId === company?.id), [state.customers, company?.id]);
  const items = useMemo(() => state.items.filter(i => i.companyId === company?.id), [state.items, company?.id]);

  const addRow = () => setRows(r => [...r, { itemId: "", itemCode: "", itemName: "", qty: 1, rate: 0, amount: 0, incomeAccountId: "" }]);
  const removeRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));

  const handleItemChange = (idx: number, itemId: string) => {
    const it = items.find(i => i.id === itemId);
    setRows(prev => prev.map((row, i) => i !== idx ? row : (
      it ? { ...row, itemId, itemCode: it.code, itemName: it.name, rate: it.rate, incomeAccountId: it.incomeAccountId, amount: row.qty * it.rate } : row
    )));
  };

  const handleQtyRate = (idx: number, field: "qty" | "rate", value: number) => {
    setRows(prev => prev.map((row, i) => i !== idx ? row : ({ ...row, [field]: value, amount: (field === "qty" ? value : row.qty) * (field === "rate" ? value : row.rate) })));
  };

  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const discountNum = parseFloat(discount || "0") || 0;
  const total = Math.max(0, subtotal - discountNum);

  const save = () => {
    if (!company || !customerId || rows.length === 0) return;
    const invId = `${Date.now()}`;
    dispatch({ type: "ADD_INVOICE", invoice: { id: invId, companyId: company.id, date, customerId, items: rows, subtotal, discount: discountNum, total } });
    // reset
    setRows([]); setDiscount("0");
  };

  const invoices = useMemo(() => state.invoices.filter(i => i.companyId === company?.id), [state.invoices, company?.id]);

  return (
    <AppLayout title="Sales Invoices">
      <SEO title="Invoices — FMS" description="Enter sales invoices with items, discounts, and automatic journal posting." canonical={window.location.href} />
      {!company ? <p className="text-muted-foreground">Select a company.</p> : (
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle>New Invoice</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid md:grid-cols-3 gap-3">
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Discount" />
              </div>
              <div className="rounded-md border">
                <div className="grid grid-cols-12 gap-2 p-2 text-sm font-medium text-muted-foreground">
                  <span className="col-span-4">Item</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-3">Rate</span>
                  <span className="col-span-2">Amount</span>
                  <span className="col-span-1"></span>
                </div>
                <div className="p-2 space-y-2">
                  {rows.map((r, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <Select value={r.itemId} onValueChange={(v) => handleItemChange(idx, v)}>
                        <SelectTrigger className="col-span-4"><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {items.map(i => <SelectItem key={i.id} value={i.id}>{i.code} — {i.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="number" className="col-span-2" value={r.qty} onChange={e => handleQtyRate(idx, "qty", parseFloat(e.target.value))} />
                      <Input type="number" className="col-span-3" value={r.rate} onChange={e => handleQtyRate(idx, "rate", parseFloat(e.target.value))} />
                      <div className="col-span-2">{r.amount.toFixed(2)}</div>
                      <div className="col-span-1 text-right"><Button variant="destructive" size="sm" onClick={() => removeRow(idx)}>X</Button></div>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={addRow}>Add Row</Button>
                </div>
              </div>
              <div className="flex justify-end gap-6 text-sm">
                <div>Subtotal: <span className="font-medium">{subtotal.toFixed(2)}</span></div>
                <div>Total: <span className="font-semibold">{total.toFixed(2)}</span></div>
              </div>
              <div className="flex justify-end"><Button onClick={save}>Save Invoice</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Invoices</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 text-sm font-medium text-muted-foreground">
                <span>Date</span><span>ID</span><span>Customer</span><span>Total</span><span></span>
              </div>
              <div className="mt-2 space-y-2">
                {invoices.map(inv => (
                  <div key={inv.id} className="grid grid-cols-5 items-center rounded-md border p-2">
                    <span>{inv.date}</span>
                    <span>{inv.id}</span>
                    <span>{state.customers.find(c => c.id === inv.customerId)?.name ?? ""}</span>
                    <span>{inv.total.toFixed(2)}</span>
                    <span></span>
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

export default Invoices;
