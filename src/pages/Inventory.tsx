import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, DollarSign, Package, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface StockItem {
  item_id: string;
  item_code: string;
  item_name: string;
  description?: string;
  current_quantity: number;
  available_quantity: number;
  average_cost: number;
  total_value: number;
  reorder_level?: number;
}

interface StockMovement {
  id: string;
  item_id: string;
  company_id: string;
  movement_type: string;
  movement_source: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type: string;
  reference_id: string;
  reference_number: string;
  movement_date: string;
  description?: string | null;
  created_at: string;
  item_code?: string;
  item_name?: string;
}

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const Inventory = () => {
  const { supabase } = useDatabaseContext();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase("companies");
  const { state } = useAccounting();

  const activeCompany = companies?.find((company) => company.id === state.activeCompanyId) || null;

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("stock-levels");
  const [inventorySetupIssue, setInventorySetupIssue] = useState<string | null>(null);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (activeCompany) {
      void refreshInventoryData();
    } else {
      setStockItems([]);
      setStockMovements([]);
      setInventorySetupIssue(null);
    }
  }, [activeCompany]);

  const refreshInventoryData = async () => {
    await Promise.all([fetchStockLevels(), fetchStockMovements()]);
  };

  const fetchStockLevels = async () => {
    if (!activeCompany?.id) return;

    try {
      setLoading(true);
      setInventorySetupIssue(null);

      const { data: stockData, error: stockError } = await supabase
        .from("stock_items")
        .select("*")
        .eq("company_id", activeCompany.id)
        .eq("is_active", true);

      if (stockError) {
        console.error("Error fetching stock levels:", stockError);
        setStockItems([]);
        setInventorySetupIssue("Inventory tables are not available yet for this company workspace.");
        toast({
          title: "Inventory setup needed",
          description: "Stock levels are unavailable right now, so the page loaded with empty totals.",
          variant: "destructive",
        });
        return;
      }

      const itemIds = Array.from(new Set((stockData || []).map((item) => item.item_id).filter(Boolean)));
      let itemMap = new Map<string, { item_code?: string; name?: string; description?: string }>();

      if (itemIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("id, item_code, name, description")
          .in("id", itemIds);

        if (itemsError) {
          console.warn("Unable to enrich stock levels with item metadata:", itemsError);
        } else {
          itemMap = new Map((itemsData || []).map((item) => [item.id, item]));
        }
      }

      const transformedData = (stockData || []).map((item) => {
        const itemDetails = itemMap.get(item.item_id);
        const currentQuantity = toNumber(item.current_quantity ?? item.quantity_on_hand);
        const availableQuantity = toNumber(item.available_quantity ?? currentQuantity);
        const averageCost = toNumber(item.average_cost);

        return {
          item_id: String(item.item_id),
          item_code: itemDetails?.item_code || `ITEM-${item.item_id}`,
          item_name: itemDetails?.name || `Item ${item.item_id}`,
          description: itemDetails?.description || "",
          current_quantity: currentQuantity,
          available_quantity: availableQuantity,
          average_cost: averageCost,
          total_value: currentQuantity * averageCost,
          reorder_level: toNumber(item.reorder_level),
        };
      });

      setStockItems(transformedData);
    } catch (err) {
      console.error("Stock levels fetch error:", err);
      toast({
        title: "Error",
        description: "Failed to fetch stock levels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStockMovements = async () => {
    if (!activeCompany?.id) return;

    try {
      const { data: movementData, error: movementError } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("company_id", activeCompany.id)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (movementError) {
        console.error("Error fetching stock movements:", movementError);
        setStockMovements([]);
        setInventorySetupIssue((current) => current || "Stock movement history is unavailable until inventory setup is complete.");
        return;
      }

      const itemIds = Array.from(new Set((movementData || []).map((movement) => movement.item_id).filter(Boolean)));
      let itemMap = new Map<string, { item_code?: string; name?: string }>();

      if (itemIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("id, item_code, name")
          .in("id", itemIds);

        if (itemsError) {
          console.warn("Unable to enrich stock movements with item metadata:", itemsError);
        } else {
          itemMap = new Map((itemsData || []).map((item) => [item.id, item]));
        }
      }

      const transformedData = (movementData || []).map((movement) => {
        const itemDetails = itemMap.get(movement.item_id);

        return {
          ...movement,
          id: String(movement.id),
          item_id: String(movement.item_id),
          quantity: toNumber(movement.quantity),
          unit_cost: toNumber(movement.unit_cost),
          total_cost: toNumber(movement.total_cost),
          movement_date: movement.movement_date || movement.created_at,
          item_code: itemDetails?.item_code || `ITEM-${movement.item_id}`,
          item_name: itemDetails?.name || `Item ${movement.item_id}`,
        };
      });

      setStockMovements(transformedData);
    } catch (err) {
      console.error("Stock movements fetch error:", err);
      toast({
        title: "Error",
        description: "Failed to fetch stock movements",
        variant: "destructive",
      });
    }
  };

  const totalStockValue = stockItems.reduce((sum, item) => sum + item.total_value, 0);
  const lowStockItems = stockItems.filter((item) => item.reorder_level && item.current_quantity <= item.reorder_level).length;
  const outOfStockItems = stockItems.filter((item) => item.current_quantity <= 0).length;

  if (!activeCompany) {
    return (
      <AppLayout title="Inventory Management">
        <SEO title="Inventory Management - FinanceHub" description="Track inventory levels, stock movements, and valuations" />
        <div className="py-8 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Select a Company</h3>
          <p className="text-muted-foreground">Please select a company to view inventory.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Inventory Management">
      <SEO title="Inventory Management - FinanceHub" description="Track inventory levels, stock movements, and valuations" />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Inventory Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {activeCompany.name}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => void refreshInventoryData()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalStockValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Across {stockItems.length} items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Below reorder level</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">Zero quantity items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Movements</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stockMovements.length}</div>
              <p className="text-xs text-muted-foreground">Last 100 movements</p>
            </CardContent>
          </Card>
        </div>

        {inventorySetupIssue && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {inventorySetupIssue}
            </CardContent>
          </Card>
        )}

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
            <TabsTrigger value="valuation">Valuation Report</TabsTrigger>
          </TabsList>

          <TabsContent value="stock-levels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Current Stock Levels
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading stock levels...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Current Qty</TableHead>
                        <TableHead className="text-right">Available Qty</TableHead>
                        <TableHead className="text-right">Avg Cost</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                            No inventory items found. Stock will be created automatically when processing invoices.
                          </TableCell>
                        </TableRow>
                      ) : (
                        stockItems.map((item) => (
                          <TableRow key={item.item_id} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell className="text-right">{item.current_quantity.toFixed(3)}</TableCell>
                            <TableCell className="text-right">{item.available_quantity.toFixed(3)}</TableCell>
                            <TableCell className="text-right">${item.average_cost.toFixed(4)}</TableCell>
                            <TableCell className="text-right font-medium">${item.total_value.toFixed(2)}</TableCell>
                            <TableCell>
                              {item.current_quantity <= 0 ? (
                                <Badge variant="destructive">Out of Stock</Badge>
                              ) : item.reorder_level && item.current_quantity <= item.reorder_level ? (
                                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                  Low Stock
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-500 text-green-600">
                                  In Stock
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Stock Movement History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Movement</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No stock movements found. Movements will be created automatically when processing invoices.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockMovements.map((movement) => (
                        <TableRow key={movement.id} className="hover:bg-muted/50">
                          <TableCell>{new Date(movement.movement_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-mono text-sm">{movement.item_code || movement.item_id}</div>
                              <div className="text-sm text-muted-foreground">{movement.item_name || `Item ${movement.item_id}`}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {movement.movement_type === "IN" ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <Badge variant={movement.movement_type === "IN" ? "outline" : "secondary"}>
                                {movement.movement_type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{movement.movement_source}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{movement.quantity.toFixed(3)}</TableCell>
                          <TableCell className="text-right">${movement.unit_cost.toFixed(4)}</TableCell>
                          <TableCell className="text-right font-medium">${movement.total_cost.toFixed(2)}</TableCell>
                          <TableCell className="font-mono text-sm">{movement.reference_number || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="valuation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Inventory Valuation Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-muted/30 p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{stockItems.length}</div>
                      <div className="text-sm text-muted-foreground">Total Items</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {stockItems.reduce((sum, item) => sum + item.current_quantity, 0).toFixed(0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Quantity</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">${totalStockValue.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Total Value</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-lg font-semibold">Top 10 Items by Value</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Avg Cost</TableHead>
                          <TableHead className="text-right">Total Value</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockItems
                          .slice()
                          .sort((a, b) => b.total_value - a.total_value)
                          .slice(0, 10)
                          .map((item, index) => (
                            <TableRow key={item.item_id}>
                              <TableCell className="font-medium">#{index + 1}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-mono text-sm">{item.item_code}</div>
                                  <div className="text-sm text-muted-foreground">{item.item_name}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.current_quantity.toFixed(3)}</TableCell>
                              <TableCell className="text-right">${item.average_cost.toFixed(4)}</TableCell>
                              <TableCell className="text-right font-medium">${item.total_value.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                {totalStockValue > 0 ? ((item.total_value / totalStockValue) * 100).toFixed(1) : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Inventory;
