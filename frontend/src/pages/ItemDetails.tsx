import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Package, BarChart3, AlertTriangle, DollarSign, Tag, Truck, Info, Image, FileText } from 'lucide-react'
import { useItems, Item } from '@/hooks/useItems'
import { useSuppliers } from '@/hooks/useSuppliers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import AppLayout from '@/components/layout/AppLayout'
import SEO from '@/components/SEO'

export default function ItemDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { items, loading, deleteItem } = useItems()
  const { suppliers } = useSuppliers()
  
  const [item, setItem] = useState<Item | null>(null)

  // Find the item by ID
  useEffect(() => {
    if (items && id) {
      const foundItem = items.find(item => item.id === id)
      setItem(foundItem || null)
    }
  }, [items, id])

  // Handle delete item
  const handleDelete = async () => {
    if (!item) return
    
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      const success = await deleteItem(item.id)
      if (success) {
        toast({
          title: "Item Deleted",
          description: "Item has been deleted successfully.",
        })
        navigate('/items')
      } else {
        toast({
          title: "Error",
          description: "Failed to delete item. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  // Handle edit item
  const handleEdit = () => {
    // Navigate back to items page with edit mode
    navigate(`/items?edit=${item?.id}`)
  }

  // Get supplier name
  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return 'N/A'
    const supplier = suppliers.find(s => s.id === supplierId)
    return supplier ? supplier.name : 'Unknown Supplier'
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LYD'
    }).format(amount)
  }

  // Get stock status
  const getStockStatus = (item: Item) => {
    if (!item.is_inventory_item) return { status: 'N/A', variant: 'secondary' as const }
    
    const currentStock = item.current_stock || 0
    const minLevel = item.min_stock_level || 0
    const reorderPoint = item.reorder_point || 0

    if (currentStock <= 0) {
      return { status: 'Out of Stock', variant: 'destructive' as const }
    } else if (currentStock <= reorderPoint) {
      return { status: 'Reorder Required', variant: 'destructive' as const }
    } else if (currentStock <= minLevel) {
      return { status: 'Low Stock', variant: 'outline' as const }
    } else {
      return { status: 'In Stock', variant: 'default' as const }
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <SEO title="Loading Item..." />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading item details...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!item) {
    return (
      <AppLayout>
        <SEO title="Item Not Found" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Item Not Found</h2>
            <p className="text-muted-foreground mb-4">The item you're looking for doesn't exist or has been deleted.</p>
            <Button onClick={() => navigate('/items')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Items
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const stockStatus = getStockStatus(item)

  return (
    <AppLayout>
      <SEO title={`${item.name} - Item Details`} />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/items')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Items
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{item.name}</h1>
              <p className="text-muted-foreground">{item.item_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={item.is_active ? 'default' : 'secondary'}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={stockStatus.variant}>
              {stockStatus.status}
            </Badge>
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Basic Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Item Code</label>
                    <p className="text-sm font-mono">{item.item_code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm">{item.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm">{item.description || 'No description'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Unit of Measure</label>
                    <p className="text-sm">{item.unit_of_measure || 'PCS'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Category Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Category</CardTitle>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="text-sm">{item.category || 'Uncategorized'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subcategory</label>
                    <p className="text-sm">{item.subcategory || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                    <p className="text-sm font-mono">{item.barcode || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">SKU</label>
                    <p className="text-sm font-mono">{item.sku || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Unit Price</label>
                    <p className="text-sm font-bold">{formatCurrency(item.unit_price)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Stock</label>
                    <p className="text-sm">{item.current_stock || 0} {item.unit_of_measure || 'PCS'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stock Status</label>
                    <Badge variant={stockStatus.variant} className="text-xs">
                      {stockStatus.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.is_taxable ? 'default' : 'secondary'} className="text-xs">
                      {item.is_taxable ? 'Taxable' : 'Non-taxable'}
                    </Badge>
                    <Badge variant={item.is_inventory_item ? 'default' : 'secondary'} className="text-xs">
                      {item.is_inventory_item ? 'Inventory' : 'Non-inventory'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pricing Information</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Unit Price</label>
                      <p className="text-lg font-bold">{formatCurrency(item.unit_price)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cost Price</label>
                      <p className="text-lg font-bold">{formatCurrency(item.cost_price || 0)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Selling Price</label>
                      <p className="text-lg font-bold">{formatCurrency(item.selling_price || 0)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tax Rate</label>
                      <p className="text-lg font-bold">{item.tax_rate || 0}%</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Profit Margin</label>
                    <p className="text-sm">
                      {item.selling_price && item.cost_price 
                        ? `${(((item.selling_price - item.cost_price) / item.selling_price) * 100).toFixed(2)}%`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Taxable Item</label>
                    <Badge variant={item.is_taxable ? 'default' : 'secondary'}>
                      {item.is_taxable ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Supplier Information</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Primary Supplier</label>
                    <p className="text-sm">{getSupplierName(item.supplier_id)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Levels</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Current Stock</label>
                      <p className="text-lg font-bold">{item.current_stock || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Unit of Measure</label>
                      <p className="text-lg">{item.unit_of_measure || 'PCS'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Min Stock Level</label>
                      <p className="text-lg">{item.min_stock_level || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Max Stock Level</label>
                      <p className="text-lg">{item.max_stock_level || 0}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reorder Point</label>
                    <p className="text-sm">{item.reorder_point || 0} {item.unit_of_measure || 'PCS'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stock Status</label>
                    <Badge variant={stockStatus.variant}>
                      {stockStatus.status}
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Inventory Item</label>
                    <Badge variant={item.is_inventory_item ? 'default' : 'secondary'}>
                      {item.is_inventory_item ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Alert */}
              {item.is_inventory_item && (item.current_stock || 0) <= (item.reorder_point || 0) && (
                <Card className="border-destructive">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-destructive">Stock Alert</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-destructive">
                      This item is running low on stock and needs to be reordered.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Physical Properties</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Weight</label>
                    <p className="text-sm">{item.weight ? `${item.weight} kg` : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                    <p className="text-sm">{item.dimensions || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Image URL</label>
                    <p className="text-sm break-all">{item.image_url || 'No image'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Additional Information</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm">{item.notes || 'No notes'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                    <p className="text-sm">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm">{new Date(item.updated_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

