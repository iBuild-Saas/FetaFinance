import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { RefreshCw, BarChart3, Package, CheckCircle, AlertTriangle, Save, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";

type StockItem = {
  id: string;
  name: string;
  item_code: string;
  current_stock: number;
  cost_price: number;
  unit_of_measure: string;
};

type ReconciliationItem = {
  id: string;
  item_code: string;
  name: string;
  system_qty: number;
  physical_qty: number;
  system_avg_cost: number;
  new_avg_cost: number;
  unit_of_measure: string;
  notes: string;
  variance_qty: number;
  variance_value: number;
};

const StockReconciliation = () => {
  const { supabase } = useDatabaseContext();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();
  const navigate = useNavigate();
  
  // Use the same pattern as other pages - check if we have companies and active company
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  const hasCompanies = companies && companies.length > 0;
  const hasActiveCompany = state.activeCompanyId && activeCompany;
  
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationItem[]>([]);
  const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch stock items
  const fetchStockItems = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('items')
        .select(`
          id,
          item_code,
          name,
          current_stock,
          cost_price,
          unit_of_measure,
          company_id,
          is_active
        `)
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('item_code');

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      setStockItems(data || []);
      
      // Initialize reconciliation data
      const reconciliationItems: ReconciliationItem[] = (data || []).map(item => ({
        id: item.id,
        item_code: item.item_code,
        name: item.name,
        system_qty: item.current_stock || 0,
        physical_qty: item.current_stock || 0,
        system_avg_cost: item.cost_price || 0,
        new_avg_cost: item.cost_price || 0,
        unit_of_measure: item.unit_of_measure || 'PCS',
        notes: '',
        variance_qty: 0,
        variance_value: 0,
      }));
      
      setReconciliationData(reconciliationItems);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      toast({
        title: "Error",
        description: `Failed to fetch stock items: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (hasActiveCompany) {
      void fetchStockItems();
    } else {
      setStockItems([]);
      setReconciliationData([]);
    }
  }, [hasActiveCompany, companies]);

  const updatePhysicalQty = (itemId: string, qty: string) => {
    setReconciliationData(prev => 
      prev.map(item => {
        if (item.id === itemId) {
          const physicalQty = parseFloat(qty) || 0;
          const varianceQty = physicalQty - item.system_qty;
          const varianceValue = varianceQty * item.new_avg_cost;
          return { 
            ...item, 
            physical_qty: physicalQty,
            variance_qty: varianceQty,
            variance_value: varianceValue
          };
        }
        return item;
      })
    );
  };

  const updateAvgCost = (itemId: string, cost: string) => {
    setReconciliationData(prev => 
      prev.map(item => {
        if (item.id === itemId) {
          const newCost = parseFloat(cost) || 0;
          const varianceValue = item.variance_qty * newCost;
          return { 
            ...item, 
            new_avg_cost: newCost,
            variance_value: varianceValue
          };
        }
        return item;
      })
    );
  };

  const updateNotes = (itemId: string, notes: string) => {
    setReconciliationData(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  const resetToSystemValues = () => {
    setReconciliationData(prev => 
      prev.map(item => ({
        ...item,
        physical_qty: item.system_qty,
        new_avg_cost: item.system_avg_cost,
        variance_qty: 0,
        variance_value: 0,
        notes: ""
      }))
    );
  };

  const saveReconciliation = async () => {
    if (!activeCompany?.id) return;
    
    const adjustments = reconciliationData.filter(item => 
      item.variance_qty !== 0 || item.new_avg_cost !== item.system_avg_cost
    );
    
    if (adjustments.length === 0) {
      toast({
        title: "No Changes",
        description: "No stock adjustments to save",
        variant: "default",
      });
      return;
    }
    
    try {
      setSaving(true);
      
      // Create stock movements for each adjustment
      const stockMovements = adjustments.map(item => ({
        company_id: activeCompany.id,
        item_id: item.id,
        movement_type: 'ADJUSTMENT',
        movement_source: 'ADJUSTMENT',
        movement_date: reconciliationDate,
        quantity: item.variance_qty,
        unit_cost: item.new_avg_cost,
        reference_type: 'STOCK_RECONCILIATION',
        reference_number: `RECON-${Date.now()}`,
        description: item.notes || `Stock reconciliation adjustment: ${item.variance_qty > 0 ? 'increase' : 'decrease'} of ${Math.abs(item.variance_qty)} units`,
        is_active: true
      }));
      
      // Insert stock movements
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert(stockMovements);
      
      if (movementError) {
        console.error('Stock movement error details:', {
          message: movementError.message,
          details: movementError.details,
          hint: movementError.hint,
          code: movementError.code
        });
        throw movementError;
      }
      
      // Update item stock levels and average costs
      for (const item of adjustments) {
        const { error: updateError } = await supabase
          .from('items')
          .update({
            current_stock: item.physical_qty,
            cost_price: item.new_avg_cost
          })
          .eq('id', item.id);
        
        if (updateError) throw updateError;
      }
      
      toast({
        title: "Success",
        description: `Stock reconciliation saved successfully. ${adjustments.length} items adjusted.`,
      });
      
      // Refresh data
      fetchStockItems();
      
    } catch (err) {
      console.error('Error saving reconciliation:', err);
      toast({
        title: "Error",
        description: "Failed to save stock reconciliation",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getVarianceBadge = (varianceQty: number, varianceValue: number) => {
    if (varianceQty === 0) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          âœ“ No Change
        </Badge>
      );
    } else if (varianceQty > 0) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          +{varianceQty} (+${varianceValue.toFixed(2)})
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          {varianceQty} (${varianceValue.toFixed(2)})
        </Badge>
      );
    }
  };

  const totalVarianceValue = reconciliationData.reduce((sum, item) => sum + item.variance_value, 0);
  const itemsWithVariance = reconciliationData.filter(item => item.variance_qty !== 0 || item.new_avg_cost !== item.system_avg_cost).length;

  return (
    <AppLayout title="Stock Reconciliation">
      <SEO title="Stock Reconciliation â€” FMS" description="Reconcile physical inventory counts with system records." />
      {!hasActiveCompany ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Company</h3>
          <p className="text-muted-foreground">Please select a company to perform stock reconciliation</p>
          {!hasCompanies && (
            <div className="mt-4">
              <Button onClick={() => navigate('/companies')} variant="outline">
                Create a Company First
              </Button>
            </div>
          )}
          <div className="mt-4 text-xs text-muted-foreground">
            Debug: activeCompanyId = {state.activeCompanyId}, companies = {companies?.length || 0}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                <CardTitle>Stock Reconciliation</CardTitle>
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
              <div className="space-y-4">
                {/* Reconciliation Date */}
                <div className="flex items-center gap-4">
                  <Label htmlFor="reconciliation-date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Reconciliation Date:
                  </Label>
                  <Input
                    id="reconciliation-date"
                    type="date"
                    value={reconciliationDate}
                    onChange={(e) => setReconciliationDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                
                {/* Instructions */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Stock Reconciliation Process</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Adjust physical quantities and average costs based on your physical count. 
                          Changes will create stock movement entries and update item records.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{reconciliationData.length}</div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reconciliationData.filter(item => item.variance_qty === 0 && item.new_avg_cost === item.system_avg_cost).length}
                </div>
                <div className="text-sm text-muted-foreground">No Changes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{itemsWithVariance}</div>
                <div className="text-sm text-muted-foreground">Items to Adjust</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${
                  totalVarianceValue >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${totalVarianceValue.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Variance Value</div>
              </CardContent>
            </Card>
          </div>

          {/* Reconciliation Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Stock Reconciliation Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading stock items...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Item Code</th>
                        <th className="text-left p-2 font-medium">Item Name</th>
                        <th className="text-center p-2 font-medium">UOM</th>
                        <th className="text-center p-2 font-medium">System Qty</th>
                        <th className="text-center p-2 font-medium">Physical Qty</th>
                        <th className="text-center p-2 font-medium">System Cost</th>
                        <th className="text-center p-2 font-medium">New Avg Cost</th>
                        <th className="text-center p-2 font-medium">Variance</th>
                        <th className="text-left p-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationData.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono text-sm">{item.item_code}</td>
                          <td className="p-2 font-medium">{item.name}</td>
                          <td className="p-2 text-center text-sm">{item.unit_of_measure}</td>
                          <td className="p-2 text-center font-mono">{item.system_qty}</td>
                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-20 text-center"
                              value={item.physical_qty}
                              onChange={(e) => updatePhysicalQty(item.id, e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-center font-mono">${item.system_avg_cost.toFixed(2)}</td>
                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24 text-center"
                              value={item.new_avg_cost}
                              onChange={(e) => updateAvgCost(item.id, e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-center">
                            {getVarianceBadge(item.variance_qty, item.variance_value)}
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="Adjustment notes"
                              className="text-sm"
                              value={item.notes}
                              onChange={(e) => updateNotes(item.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Review all adjustments before saving
                  </div>
                  {itemsWithVariance > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {itemsWithVariance} items to adjust
                    </Badge>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetToSystemValues}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset All
                  </Button>
                  <Button 
                    onClick={saveReconciliation} 
                    disabled={saving || itemsWithVariance === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Reconciliation'}
                  </Button>
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












