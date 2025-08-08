import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <AppLayout title="Financial Management Dashboard">
      <SEO title="FMS Dashboard — Multi-Company Accounting" description="Manage companies, invoices, payments, chart of accounts, and financial reports." canonical={window.location.href} />
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Companies</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-muted-foreground">Create and switch companies</p>
            <Button asChild><Link to="/companies">Open</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Chart of Accounts</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-muted-foreground">Maintain your accounts</p>
            <Button asChild><Link to="/accounts">Open</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-muted-foreground">Record sales invoices</p>
            <Button asChild><Link to="/invoices">Open</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-muted-foreground">Record receipts and payouts</p>
            <Button asChild><Link to="/payments">Open</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Journal</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-muted-foreground">Manual entries</p>
            <Button asChild><Link to="/journals">Open</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-muted-foreground">IS, BS, and Ledger</p>
            <Button asChild><Link to="/reports">Open</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
