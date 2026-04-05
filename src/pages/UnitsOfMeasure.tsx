import React, { useState } from 'react'
import { Plus, Edit, Trash2, Ruler } from 'lucide-react'
import { useDatabaseContext } from '@/contexts/DatabaseContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import AppLayout from '@/components/layout/AppLayout'
import SEO from '@/components/SEO'
import { useAccounting } from '@/state/accounting'
import { useDatabase } from '@/hooks/useDatabase'

interface UnitOfMeasure {
  id: string
  code: string
  name: string
  description?: string
  company_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface UnitFormData {
  code: string
  name: string
  description: string
}

export default function UnitsOfMeasure() {
  const { supabase } = useDatabaseContext()
  const { toast } = useToast()
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies')
  const { state } = useAccounting()
  
  // Get the active company from the navbar selection (same as Categories page)
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null
  
  const [units, setUnits] = useState<UnitOfMeasure[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<UnitOfMeasure | null>(null)
  const [formData, setFormData] = useState<UnitFormData>({
    code: '',
    name: '',
    description: ''
  })

  // Get company ID from active company
  const getCompanyId = () => {
    return activeCompany?.id
  }

  // Fetch companies first
  React.useEffect(() => {
    void fetchCompanies()
  }, [fetchCompanies])

  // Fetch units when active company changes
  React.useEffect(() => {
    if (activeCompany) {
      void fetchUnits()
    }
  }, [activeCompany])

  // Fetch units of measure
  const fetchUnits = async () => {
    const companyId = getCompanyId()
    if (!companyId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('item_units_of_measure')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) throw error
      setUnits(data || [])
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch units of measure",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Create unit
  const createUnit = async (e: React.FormEvent) => {
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
        .from('item_units_of_measure')
        .insert([{
          ...formData,
          company_id: companyId
        }])
        .select()

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Unit of measure created successfully",
      })
      
      setIsCreateDialogOpen(false)
      resetForm()
      void fetchUnits()
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to create unit of measure: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update unit
  const updateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnit) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('item_units_of_measure')
        .update(formData)
        .eq('id', selectedUnit.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Unit of measure updated successfully",
      })
      
      setIsEditDialogOpen(false)
      resetForm()
      void fetchUnits()
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update unit of measure",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Delete unit
  const deleteUnit = async (unit: UnitOfMeasure) => {
    if (window.confirm(`Are you sure you want to delete "${unit.name}"?`)) {
      try {
        const { error } = await supabase
          .from('item_units_of_measure')
          .update({ is_active: false })
          .eq('id', unit.id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Unit of measure deleted successfully",
        })
        
        void fetchUnits()
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to delete unit of measure",
          variant: "destructive",
        })
      }
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: ''
    })
    setSelectedUnit(null)
  }

  // Open edit dialog
  const openEditDialog = (unit: UnitOfMeasure) => {
    setSelectedUnit(unit)
    setFormData({
      code: unit.code,
      name: unit.name,
      description: unit.description || ''
    })
    setIsEditDialogOpen(true)
  }

  return (
    <AppLayout title="Units of Measure">
      <SEO title="Units of Measure â€” FMS" description="Manage units of measurement for items" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Units of Measure</h1>
            <p className="text-muted-foreground">
              Manage units of measurement for inventory items
            </p>
            {!activeCompany && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  Please select a company first to manage units of measure
                </p>
              </div>
            )}
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} disabled={!activeCompany}>
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Unit of Measure</DialogTitle>
                <DialogDescription>
                  Create a new unit of measurement
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createUnit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Unit Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., PCS, KG, L"
                      required
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Short code (2-10 characters)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="name">Unit Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Pieces, Kilograms, Liters"
                      required
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
                    placeholder="Brief description of the unit"
                    className="mt-1"
                    rows={3}
                  />
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
                    {loading ? 'Creating...' : 'Create Unit'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Units List */}
        <Card>
          <CardHeader>
            <CardTitle>Units of Measure</CardTitle>
            <CardDescription>
              {units.length} units found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Ruler className="h-5 w-5 text-green-600" />
                      <div>
                        <h3 className="font-semibold">{unit.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Code: {unit.code}
                        </p>
                        {unit.description && (
                          <p className="text-sm text-muted-foreground">
                            {unit.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(unit)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteUnit(unit)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {units.length === 0 && (
                <div className="text-center py-8">
                  <Ruler className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No units of measure found</h3>
                  <p className="text-muted-foreground">
                    Get started by creating your first unit of measure
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
              <DialogTitle>Edit Unit of Measure</DialogTitle>
              <DialogDescription>
                Update unit information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={updateUnit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCode">Unit Code *</Label>
                  <Input
                    id="editCode"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="editName">Unit Name *</Label>
                  <Input
                    id="editName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
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
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Unit'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}


