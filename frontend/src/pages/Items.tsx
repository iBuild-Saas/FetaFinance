import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Edit, Trash2, Eye, Package, BarChart3, AlertTriangle } from 'lucide-react'
import { useItems, Item, ItemFormData } from '@/hooks/useItems'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useSuppliers } from '@/hooks/useSuppliers'
import AppLayout from '@/components/layout/AppLayout'
import SEO from '@/components/SEO'
import { useTranslation } from "react-i18next"


export default function Items() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    items,
    categories,
    unitsOfMeasure,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    updateStock,
    searchItems,
    getItemsByCategory,
    getLowStockItems,
    refreshItems
  } = useItems()
  
  const { suppliers } = useSuppliers()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [stockChange, setStockChange] = useState<number>(0)
  const [formData, setFormData] = useState<ItemFormData>({
    item_code: '',
    name: '',
    description: '',
    category: "none",
    subcategory: '',
    unit_of_measure: 'none',
    unit_price: 0,
    cost_price: 0,
    selling_price: 0,
    tax_rate: 0,
    min_stock_level: 0,
    max_stock_level: 0,
    current_stock: 0,
    reorder_point: 0,
    supplier_id: '',
    is_taxable: true,
    is_inventory_item: true,
    barcode: '',
    sku: '',
    weight: 0,
    dimensions: '',
    image_url: '',
    notes: ''
  })

  // Filter items based on search and category
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Handle form submission for creating/editing items
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (selectedItem) {
        // Update existing item
        const success = await updateItem(selectedItem.id, formData)
        if (success) {
          toast({
            title: "Item Updated",
            description: "Item has been updated successfully.",
          })
          setIsEditDialogOpen(false)
          resetForm()
        }
      } else {
        // Create new item
        const newItem = await createItem(formData)
        
        if (newItem) {
          toast({
            title: "Item Created",
            description: "New item has been created successfully.",
          })
          setIsCreateDialogOpen(false)
          resetForm()
        } else {
          // Handle the case when createItem returns null
          toast({
            title: "Error",
            description: "Failed to create item. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save item. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle stock update
  const handleStockUpdate = async () => {
    if (!selectedItem || stockChange === 0) return
    
    try {
      const success = await updateStock(selectedItem.id, stockChange)
      if (success) {
        toast({
          title: "Stock Updated",
          description: `Stock level updated by ${stockChange > 0 ? '+' : ''}${stockChange}`,
        })
        setIsStockDialogOpen(false)
        setStockChange(0)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Reset form data
  const resetForm = () => {
    setFormData({
      item_code: '',
      name: '',
      description: '',
      category: "none",
      subcategory: '',
      unit_of_measure: 'none',
      unit_price: 0,
      cost_price: 0,
      selling_price: 0,
      tax_rate: 0,
      min_stock_level: 0,
      max_stock_level: 0,
      current_stock: 0,
      reorder_point: 0,
      supplier_id: '',
      is_taxable: true,
      is_inventory_item: true,
      barcode: '',
      sku: '',
      weight: 0,
      dimensions: '',
      image_url: '',
      notes: ''
    })
    setSelectedItem(null)
  }

  // Navigate to item details
  const viewItemDetails = (item: Item) => {
    navigate(`/items/${item.id}`)
  }

  // Open edit dialog
  const openEditDialog = (item: Item) => {
    setSelectedItem(item)
    setFormData({
      item_code: item.item_code,
      name: item.name,
      description: item.description || '',
      category: item.category || "none",
      subcategory: item.subcategory || '',
      unit_of_measure: item.unit_of_measure || "none",
      unit_price: item.unit_price,
      cost_price: item.cost_price || 0,
      selling_price: item.selling_price || 0,
      tax_rate: item.tax_rate || 0,
      min_stock_level: item.min_stock_level || 0,
      max_stock_level: item.max_stock_level || 0,
      current_stock: item.current_stock || 0,
      reorder_point: item.reorder_point || 0,
      supplier_id: item.supplier_id || '',
      is_taxable: item.is_taxable,
      is_inventory_item: item.is_inventory_item,
      barcode: item.barcode || '',
      sku: item.sku || '',
      weight: item.weight || 0,
      dimensions: item.dimensions || '',
      image_url: item.image_url || '',
      notes: item.notes || ''
    })
    setIsEditDialogOpen(true)
  }

  // Open stock update dialog
  const openStockDialog = (item: Item) => {
    setSelectedItem(item)
    setStockChange(0)
    setIsStockDialogOpen(true)
  }

  // Handle item deletion
  const handleDelete = async (item: Item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        const success = await deleteItem(item.id)
        if (success) {
          toast({
            title: "Item Deleted",
            description: "Item has been deleted successfully.",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete item. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  // Get stock status badge
  const getStockStatusBadge = (item: Item) => {
    if (!item.is_inventory_item || item.current_stock === undefined || item.min_stock_level === undefined) {
      return <Badge variant="secondary">N/A</Badge>
    }
    
    if (item.current_stock <= item.min_stock_level) {
      return <Badge variant="destructive">Low Stock</Badge>
    } else if (item.current_stock <= (item.reorder_point || 0)) {
      return <Badge variant="secondary">Reorder</Badge>
    } else {
      return <Badge variant="default">In Stock</Badge>
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading items...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout title={t("items.title")}>
      <SEO title={`${t("items.title")} — FMS`} description="Manage your inventory items, products, and services" />
      <div className="space-y-6">
        {/* Database Check */}

        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("items.title")}</h1>
            <p className="text-muted-foreground">
              Manage your inventory items, products, and services
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                {t("items.addItem")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>
                  Create a new inventory item, product, or service
                </DialogDescription>
              </DialogHeader>
              <ItemForm
                formData={formData}
                setFormData={setFormData}
                categories={categories}
                unitsOfMeasure={unitsOfMeasure}
                suppliers={suppliers}
                onSubmit={handleSubmit}
                loading={loading}
              />
            </DialogContent>
          </Dialog>
        </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">
              Active items in inventory
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Item categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getLowStockItems().length}</div>
            <p className="text-xs text-muted-foreground">
              Items below minimum level
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.cost_price || 0)), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items by name, code, barcode, or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refreshItems()}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            {filteredItems.length} items found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.item_code} • {item.category || 'Uncategorized'}
                      </p>
                    </div>
                    {getStockStatusBadge(item)}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Price: ${item.unit_price}</span>
                    {item.current_stock !== undefined && (
                      <span>Stock: {item.current_stock} {item.unit_of_measure}</span>
                    )}
                    {item.supplier_id && (
                      <span>Supplier: {suppliers.find(s => s.id === item.supplier_id)?.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewItemDetails(item)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openStockDialog(item)}
                  >
                    Stock
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredItems.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first item'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update item information and settings
            </DialogDescription>
          </DialogHeader>
          <ItemForm
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            unitsOfMeasure={unitsOfMeasure}
            suppliers={suppliers}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Stock Update Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock Level</DialogTitle>
            <DialogDescription>
              Adjust the current stock level for {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentStock">Current Stock</Label>
              <Input
                id="currentStock"
                value={selectedItem?.current_stock || 0}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="stockChange">Stock Change (+/-)</Label>
              <Input
                id="stockChange"
                type="number"
                value={stockChange}
                onChange={(e) => setStockChange(Number(e.target.value))}
                placeholder="Enter positive or negative value"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Use positive values to add stock, negative to remove
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsStockDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleStockUpdate} disabled={stockChange === 0}>
                Update Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AppLayout>
  )
}

// Item Form Component
interface ItemFormProps {
  formData: ItemFormData
  setFormData: React.Dispatch<React.SetStateAction<ItemFormData>>
  categories: any[]
  unitsOfMeasure: any[]
  suppliers: any[]
  onSubmit: (e: React.FormEvent) => Promise<void>
  loading: boolean
}

function ItemForm({
  formData,
  setFormData,
  categories,
  unitsOfMeasure,
  suppliers,
  onSubmit,
  loading
}: ItemFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="itemCode">Item Code</Label>
              <Input
                id="itemCode"
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                placeholder="Auto-generated if left empty"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category || "none"}
                onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? undefined : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      {loading ? 'Loading categories...' : 'No categories found'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {categories.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground mt-1">
                  No categories found for this company. Please create categories first in the Categories page.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="Optional subcategory"
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
              <Select
                value={formData.unit_of_measure || "none"}
                onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value === "none" ? undefined : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select unit of measure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Unit</SelectItem>
                  {unitsOfMeasure.length > 0 ? (
                    unitsOfMeasure.map((unit) => (
                      <SelectItem key={unit.id} value={unit.code}>
                        {unit.name} ({unit.code})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      {loading ? 'Loading units...' : 'No units found'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {unitsOfMeasure.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground mt-1">
                  No units of measure found for this company. Please create units first in the Units of Measure page.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="costPrice">Cost Price</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isTaxable"
              checked={formData.is_taxable}
              onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked })}
            />
            <Label htmlFor="isTaxable">Item is taxable</Label>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="isInventoryItem"
              checked={formData.is_inventory_item}
              onCheckedChange={(checked) => setFormData({ ...formData, is_inventory_item: checked })}
            />
            <Label htmlFor="isInventoryItem">Track inventory for this item</Label>
          </div>

          {formData.is_inventory_item && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  step="0.001"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="minStockLevel">Minimum Stock Level</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  step="0.001"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {formData.is_inventory_item && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxStockLevel">Maximum Stock Level</Label>
                <Input
                  id="maxStockLevel"
                  type="number"
                  step="0.001"
                  value={formData.max_stock_level}
                  onChange={(e) => setFormData({ ...formData, max_stock_level: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  step="0.001"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                step="0.001"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dimensions">Dimensions (LxWxH cm)</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                placeholder="10x5x2"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Item'}
        </Button>
      </div>
    </form>
  )
}


