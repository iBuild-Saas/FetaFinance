import React, { useState } from 'react'
import { Plus, Edit, Trash2, FolderOpen } from 'lucide-react'
import { useDatabaseContext } from '@/contexts/DatabaseContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import AppLayout from '@/components/layout/AppLayout'
import SEO from '@/components/SEO'
import { useAccounting } from '@/state/accounting'
import { useDatabase } from '@/hooks/useDatabase'

interface Category {
  id: string
  name: string
  description?: string
  parent_category_id?: string
  company_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CategoryFormData {
  name: string
  description: string
  parent_category_id: string | 'none'
}

export default function Categories() {
  const { supabase } = useDatabaseContext()
  const { toast } = useToast()
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies')
  const { state } = useAccounting()
  
  // Get the active company from the navbar selection (same as Customers page)
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null
  
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parent_category_id: 'none'
  })

  const getCompanyId = () => activeCompany?.id

  // Fetch categories
  const fetchCategories = async () => {
    const companyId = getCompanyId()
    if (!companyId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('item_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Create category
  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const companyId = getCompanyId()
    
    if (!companyId) {
      toast({
        title: "Error",
        description: `No company selected. Please select a company first. Current company: ${activeCompany ? activeCompany.name : 'None'}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('item_categories')
        .insert([{
          ...formData,
          company_id: companyId,
          parent_category_id: formData.parent_category_id === 'none' ? null : formData.parent_category_id
        }])
        .select()

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Category created successfully",
      })
      
      setIsCreateDialogOpen(false)
      resetForm()
      void fetchCategories()
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to create category: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update category
  const updateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('item_categories')
        .update({
          ...formData,
          parent_category_id: formData.parent_category_id === 'none' ? null : formData.parent_category_id
        })
        .eq('id', selectedCategory.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Category updated successfully",
      })
      
      setIsEditDialogOpen(false)
      resetForm()
      void fetchCategories()
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Delete category
  const deleteCategory = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        const { error } = await supabase
          .from('item_categories')
          .update({ is_active: false })
          .eq('id', category.id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Category deleted successfully",
        })
        
        void fetchCategories()
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to delete category",
          variant: "destructive",
        })
      }
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent_category_id: 'none'
    })
    setSelectedCategory(null)
  }

  // Open edit dialog
  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      parent_category_id: category.parent_category_id || 'none'
    })
    setIsEditDialogOpen(true)
  }

  // Get parent category name
  const getParentCategoryName = (parentId: string) => {
    const parent = categories.find(c => c.id === parentId)
    return parent ? parent.name : 'None'
  }

  // Get categories without the current one (for parent selection)
  const getAvailableParentCategories = (excludeId?: string) => {
    return categories.filter(c => c.id !== excludeId && c.is_active)
  }

  React.useEffect(() => {
    void fetchCompanies()
  }, [fetchCompanies])

  React.useEffect(() => {
    if (activeCompany) {
      void fetchCategories()
    }
  }, [activeCompany])

  return (
    <AppLayout title="Categories">
      <SEO title="Categories - FMS" description="Manage item categories and classifications" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">
              Manage item categories and classifications
            </p>
            {!activeCompany && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  Please select a company first to manage categories
                </p>
              </div>
            )}
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} disabled={!activeCompany}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new item category
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createCategory} className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                  />
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
                <div>
                  <Label htmlFor="parent">Parent Category</Label>
                  <Select
                    value={formData.parent_category_id}
                    onValueChange={(value) => setFormData({ ...formData, parent_category_id: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select parent category (optional)" />
                    </SelectTrigger>
                                         <SelectContent>
                       <SelectItem value="none">No Parent</SelectItem>
                       {getAvailableParentCategories().map((category) => (
                         <SelectItem key={category.id} value={category.id}>
                           {category.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Category'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              {categories.length} categories found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {category.description || 'No description'}
                        </p>
                        {category.parent_category_id && (
                          <p className="text-xs text-muted-foreground">
                            Parent: {getParentCategoryName(category.parent_category_id)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCategory(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {categories.length === 0 && (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No categories found</h3>
                  <p className="text-muted-foreground">
                    Get started by creating your first category
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update category information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={updateCategory} className="space-y-4">
              <div>
                <Label htmlFor="editName">Category Name *</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="editParent">Parent Category</Label>
                <Select
                  value={formData.parent_category_id}
                  onValueChange={(value) => setFormData({ ...formData, parent_category_id: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select parent category (optional)" />
                  </SelectTrigger>
                                       <SelectContent>
                       <SelectItem value="none">No Parent</SelectItem>
                       {getAvailableParentCategories(selectedCategory?.id).map((category) => (
                         <SelectItem key={category.id} value={category.id}>
                           {category.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Category'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

