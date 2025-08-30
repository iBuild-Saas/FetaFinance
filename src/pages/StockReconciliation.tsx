import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { RefreshCw, BarChart3, Package, CheckCircle, AlertTriangle, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StockReconciliation = () => {
  const { state } = useAccounting();
  const company = useActiveCompany();
  const navigate = useNavigate();

  const items = useMemo(
    () => state.items.filter(i => i.companyId === company?.id),
    [state.items, company?.id]
  );

  // Mock stock data with reconciliation fields
  const [reconciliationData, setReconciliationData] = useState(() => {
    return items.map(item => ({
      ...item,
      systemStock: Math.floor(Math.random() * 100),
      physicalCount: Math.floor(Math.random() * 100),
      notes: ""
    }));
  });

  const updatePhysicalCount = (itemId: string, count: string) => {
    setReconciliationData(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, physicalCount: parseInt(count) || 0 }
          : item
      )
    );
  };

  const updateNotes = (itemId: string, notes: string) => {
    setReconciliationData(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, notes }
          : item
      )
    );
  };

  const resetToSystemValues = () => {
    setReconciliationData(prev => 
      prev.map(item => ({
        ...item,
        physicalCount: item.systemStock,
        notes: ""
      }))
    );
  };

  const saveReconciliation = () => {
    // In real app, this would save to database
    alert("Stock reconciliation saved successfully!");
    navigate("/stock-balance");
  };

  const getDifference = (systemStock: number, physicalCount: number) => {
    return physicalCount - systemStock;
  };

  const getStatusBadge = (difference: number) => {
    if (difference === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Match
        </span>
      );
    } else if (difference > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          +{difference}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          {difference}
        </span>
      );
    }
  };

  return (
    <AppLayout title="Stock Reconciliation">
      <SEO title="Stock Reconciliation — FMS" description="Reconcile physical inventory counts with system records." />
      {!company ? (
        <p className="text-muted-foreground">Select a company.</p>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                <CardTitle>Stock Reconciliation Tool</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/stock-balance")}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Stock Balance
                </Button>
                <Button variant="outline" onClick={() => navigate("/items")}>
                  <Package className="w-4 h-4 mr-2" />
                  Manage Items
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Reconciliation Instructions */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Stock Reconciliation Process</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Use this tool to reconcile your physical inventory counts with the system records. 
                          Update quantities for each item based on your physical count. Add notes for any discrepancies.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reconciliation Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{items.length}</div>
                      <div className="text-sm text-muted-foreground">Total Items</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {reconciliationData.filter(item => getDifference(item.systemStock, item.physicalCount) === 0).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Matched</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {reconciliationData.filter(item => getDifference(item.systemStock, item.physicalCount) !== 0).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Discrepancies</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Reconciliation Table */}
                <div className="rounded-md border overflow-hidden">
                  <div className="grid grid-cols-12 bg-secondary px-3 py-2 text-xs text-muted-foreground font-medium">
                    <span className="col-span-2">Code</span>
                    <span className="col-span-3">Name</span>
                    <span className="col-span-1">System</span>
                    <span className="col-span-1">Physical</span>
                    <span className="col-span-1">Diff</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-2">Notes</span>
                  </div>
                  <div className="divide-y">
                    {reconciliationData.map(item => {
                      const difference = getDifference(item.systemStock, item.physicalCount);
                      return (
                        <div key={item.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-secondary/60">
                          <span className="col-span-2 font-mono text-sm">{item.code}</span>
                          <span className="col-span-3 font-medium truncate">{item.name}</span>
                          <span className="col-span-1 text-center">
                            <span className="font-mono text-sm">{item.systemStock}</span>
                          </span>
                          <div className="col-span-1 text-center">
                            <Input
                              type="number"
                              placeholder="Count"
                              className="w-16 text-center text-sm"
                              value={item.physicalCount}
                              onChange={(e) => updatePhysicalCount(item.id, e.target.value)}
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <span className="font-mono text-sm">{difference}</span>
                          </div>
                          <div className="col-span-2 text-center">
                            {getStatusBadge(difference)}
                          </div>
                          <div className="col-span-2">
                            <Input
                              placeholder="Notes"
                              className="text-xs"
                              value={item.notes}
                              onChange={(e) => updateNotes(item.id, e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reconciliation Actions */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Review all discrepancies before saving
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={resetToSystemValues}>
                      Reset to System Values
                    </Button>
                    <Button onClick={saveReconciliation}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Reconciliation
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};

export default StockReconciliation;






