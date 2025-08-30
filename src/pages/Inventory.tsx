import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import { useToast } from "@/hooks/use-toast";
import { Package, TrendingUp, TrendingDown, AlertTriangle, Eye, Filter, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";

// Types
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
  items?: {
    item_code: string;
    name: string;
  } | null;
}

const Inventory = () => {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();
  
  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("stock-levels");

  // Fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchStockLevels();
      fetchStockMovements();
    }
  }, [activeCompany]);

  // Fetch current stock levels with item details
  const fetchStockLevels = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      
      // First try to fetch stock items with join
      let { data, error } = await supabase
        .from('stock_items')
        .select(`
          *,
          items (
            id,
            item_code,
            name,
            description
          )
        `)
        .eq('company_id', activeCompany.id);

      // If join fails, try without join and fetch items separately
      if (error) {
        console.log('Join failed, trying without join:', error);
        const { data: stockData, error: stockError } = await supabase
          .from('stock_items')
          .select('*')
          .eq('company_id', activeCompany.id);

        if (stockError) {
          console.error('Error fetching stock levels:', stockError);
          if (stockError.code === '42P01') {
            toast({
              title: "Database Setup Required",
              description: "The stock_items table doesn't exist. Please check your database setup.",
              variant: "destructive",
            });
          } else {
            throw stockError;
          }
          return;
        }

        // Fetch items separately if we have stock data
        const itemIds = stockData?.map(item => item.item_id).filter(Boolean) || [];
        let itemsData = [];
        
        if (itemIds.length > 0) {
          const { data: items } = await supabase
            .from('items')
            .select('id, item_code, name, description')
            .in('id', itemIds);
          itemsData = items || [];
        }

        // Combine the data
        data = stockData?.map(stockItem => ({
          ...stockItem,
          items: itemsData.find(item => item.id === stockItem.item_id) || null
        })) || [];
      }
      
      // Transform the data to match the StockItem interface
      const transformedData = (data || []).map(item => ({
        item_id: item.item_id,
        item_code: item.items?.item_code || `ITEM-${item.item_id}`,
        item_name: item.items?.name || `Item ${item.item_id}`,
        description: item.items?.description || '',
        current_quantity: item.current_quantity || 0,
        available_quantity: item.available_quantity || 0,
        average_cost: item.average_cost || 0,
        total_value: (item.current_quantity || 0) * (item.average_cost || 0),
        reorder_level: item.reorder_level || 0
      }));
      
      setStockItems(transformedData);
    } catch (err) {
      console.error('Stock levels fetch error:', err);
      toast({
        title: "Error",
        description: "Failed to fetch stock levels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch stock movements history with item details
  const fetchStockMovements = async () => {
    if (!activeCompany?.id) return;
    
    try {
      // First try to fetch stock movements with join
      let { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          items (
            id,
            item_code,
            name
          )
        `)
        .eq('company_id', activeCompany.id)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      // If join fails, try without join and fetch items separately
      if (error) {
        console.log('Movements join failed, trying without join:', error);
        const { data: movementData, error: movementError } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('company_id', activeCompany.id)
          .order('movement_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100);

        if (movementError) {
          console.error('Error fetching stock movements:', movementError);
          if (movementError.code === '42P01') {
            toast({
              title: "Database Setup Required",
              description: "Please run COMPLETE_STOCK_SYSTEM_WITH_TRIGGERS.sql first.",
              variant: "destructive",
            });
          } else {
            throw movementError;
          }
          return;
        }

        // Fetch items separately if we have movement data
        const itemIds = movementData?.map(movement => movement.item_id).filter(Boolean) || [];
        let itemsData = [];
        
        if (itemIds.length > 0) {
          const { data: items } = await supabase
            .from('items')
            .select('id, item_code, name')
            .in('id', itemIds);
          itemsData = items || [];
        }

        // Combine the data
        data = movementData?.map(movement => ({
          ...movement,
          items: itemsData.find(item => item.id === movement.item_id) || null
        })) || [];
      }
      
      // Transform the data to include item details
      const transformedData = (data || []).map(movement => ({
        ...movement,
        item_code: movement.items?.item_code || `ITEM-${movement.item_id}`,
        item_name: movement.items?.name || `Item ${movement.item_id}`,
      }));
      
      setStockMovements(transformedData);
    } catch (err) {
      console.error('Stock movements fetch error:', err);
      toast({
        title: "Error",
        description: "Failed to fetch stock movements",
        variant: "destructive",
      });
    }
  };

  // Calculate summary statistics
  const totalStockValue = stockItems.reduce((sum, item) => sum + (item.total_value || 0), 0);
  const lowStockItems = stockItems.filter(item => 
    item.reorder_level && item.current_quantity <= item.reorder_level
  ).length;
  const outOfStockItems = stockItems.filter(item => item.current_quantity <= 0).length;

  if (!activeCompany) {
    return (
      <AppLayout title="Inventory Management">
        <SEO title="Inventory Management — FinanceHub" description="Track inventory levels, stock movements, and valuations" />
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Company</h3>
          <p className="text-muted-foreground">Please select a company to view inventory</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Inventory Management">
      <SEO title="Inventory Management — FinanceHub" description="Track inventory levels, stock movements, and valuations" />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold">Inventory Management</h1>
          </div>
          <Badge variant="outline" className="text-sm">
            {activeCompany.name}
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalStockValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Across {stockItems.length} items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{lowStockItems}</div>
              <p className="text-xs text-muted-foreground">
                Below reorder level
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">
                Zero quantity items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Movements</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stockMovements.length}</div>
              <p className="text-xs text-muted-foreground">
                Last 100 movements
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
            <TabsTrigger value="valuation">Valuation Report</TabsTrigger>
          </TabsList>

          {/* Stock Levels Tab */}
          <TabsContent value="stock-levels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Current Stock Levels
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
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
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                                <Badge variant="outline" className="border-yellow-500 text-yellow-600">Low Stock</Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-500 text-green-600">In Stock</Badge>
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

          {/* Stock Movements Tab */}
          <TabsContent value="movements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
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
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No stock movements found. Movements will be created automatically when processing invoices.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockMovements.map((movement) => (
                        <TableRow key={movement.id} className="hover:bg-muted/50">
                          <TableCell>{new Date(movement.movement_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-mono text-sm">{movement.item_id}</div>
                              <div className="text-sm text-muted-foreground">Item {movement.item_id}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {movement.movement_type === 'IN' ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <Badge variant={movement.movement_type === 'IN' ? 'outline' : 'secondary'}>
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
                          <TableCell className="font-mono text-sm">
                            {movement.reference_number || '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Valuation Report Tab */}
          <TabsContent value="valuation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Inventory Valuation Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Summary Statistics */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{stockItems.length}</div>
                      <div className="text-sm text-muted-foreground">Total Items</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {stockItems.reduce((sum, item) => sum + item.current_quantity, 0).toFixed(0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Quantity</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">${totalStockValue.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Total Value</div>
                    </div>
                  </div>

                  {/* Top Value Items */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Top 10 Items by Value</h3>
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
