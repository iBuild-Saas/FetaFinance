import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingCart, ArrowLeft } from "lucide-react";
import { useState } from "react";

const PurchaseOrders = () => {
  const [view, setView] = useState<'list' | 'create'>('list');

  if (view === 'create') {
    return (
      <AppLayout title="Create Purchase Order">
        <SEO title="New Purchase Order — FinanceHub" description="Create new purchase order for supplier purchases" />
        
        <Card className="max-w-4xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <Button variant="ghost" onClick={() => setView('list')} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                New Purchase Order
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Purchase Orders Coming Soon</h3>
              <p>Purchase order functionality will be added in a future update.</p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Purchase Orders">
      <SEO title="Purchase Orders — FinanceHub" description="Manage purchase orders and supplier procurement" />
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-primary" />
          <span className="text-lg font-medium">Purchase Orders</span>
        </div>
        <Button onClick={() => setView('create')} variant="gradient" className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Order
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div>
                    <h3 className="font-medium mb-2">No purchase orders yet</h3>
                    <p className="text-sm">Create your first purchase order to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default PurchaseOrders;