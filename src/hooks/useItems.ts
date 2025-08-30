import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '@/contexts/SupabaseContext'
import { useDatabase } from './useDatabase'
import { useAccounting } from '@/state/accounting'

export interface Item {
  id: string
  item_code: string
  name: string
  description?: string
  category?: string | "none"
  subcategory?: string
  unit_of_measure: string | "none"
  unit_price: number
  cost_price?: number
  selling_price?: number
  tax_rate?: number
  min_stock_level?: number
  max_stock_level?: number
  current_stock?: number
  reorder_point?: number
  supplier_id?: string
  company_id: string
  is_active: boolean
  is_taxable: boolean
  is_inventory_item: boolean
  barcode?: string
  sku?: string
  weight?: number
  dimensions?: string
  image_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface ItemCategory {
  id: string
  name: string
  description?: string
  parent_category_id?: string
  company_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ItemUnitOfMeasure {
  id: string
  code: string
  name: string
  description?: string
  company_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ItemFormData {
  item_code?: string
  name: string
  description?: string
  category?: string | "none"
  subcategory?: string
  unit_of_measure: string | "none"
  unit_price: number
  cost_price?: number
  selling_price?: number
  tax_rate?: number
  min_stock_level?: number
  max_stock_level?: number
  current_stock?: number
  reorder_point?: number
  supplier_id?: string
  is_taxable: boolean
  is_inventory_item: boolean
  barcode?: string
  sku?: string
  weight?: number
  dimensions?: string
  image_url?: string
  notes?: string
}

export function useItems() {
  const { supabase, user } = useSupabase()
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies')
  const { state } = useAccounting()
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<ItemUnitOfMeasure[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get the active company from the navbar selection (same as Customers page)
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null

  // Get company ID from active company
  const getCompanyId = useCallback(() => {
    console.log('Getting company ID:', { 
      activeCompany, 
      companies, 
      stateActiveCompanyId: state.activeCompanyId,
      foundCompany: companies?.find(c => c.id === state.activeCompanyId)
    })
    return activeCompany?.id
  }, [activeCompany, companies, state.activeCompanyId])

  // Fetch companies first
  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Fetch all items for the current company
  const fetchItems = useCallback(async () => {
    if (!getCompanyId()) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('company_id', getCompanyId())
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }, [supabase, getCompanyId])

  // Fetch item categories
  const fetchCategories = useCallback(async () => {
    if (!getCompanyId()) return

    try {
      console.log('Fetching categories for company:', getCompanyId())
      const { data, error } = await supabase
        .from('item_categories')
        .select('*')
        .eq('company_id', getCompanyId())
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      console.log('Categories fetched:', data)
      setCategories(data || [])
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [supabase, getCompanyId])

  // Fetch units of measure
  const fetchUnitsOfMeasure = useCallback(async () => {
    if (!getCompanyId()) return

    try {
      console.log('Fetching units of measure for company:', getCompanyId())
      const { data, error } = await supabase
        .from('item_units_of_measure')
        .select('*')
        .eq('company_id', getCompanyId())
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      console.log('Units of measure fetched:', data)
      setUnitsOfMeasure(data || [])
    } catch (err) {
      console.error('Failed to fetch units of measure:', err)
    }
  }, [supabase, getCompanyId])

  // Create a new item
  const createItem = useCallback(async (itemData: ItemFormData): Promise<Item | null> => {
    console.log('🔍 [DEBUG] ===== createItem FUNCTION STARTED =====')
    console.log('🔍 [DEBUG] itemData received:', itemData)
    
    const companyId = getCompanyId()
    console.log('🔍 [DEBUG] createItem called with companyId:', companyId)
    
    if (!companyId) {
      console.error('🔍 [DEBUG] No company ID found, cannot create item')
      setError('No company selected. Please select a company first.')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // TEMPORARILY DISABLE: Generate item code if not provided
      // This RPC function might not exist in your database yet
      /*
      if (!itemData.item_code) {
        const { data: generatedCode, error: codeError } = await supabase
          .rpc('generate_item_code', {
            company_uuid: getCompanyId(),
            category_name: itemData.category || 'General'
          })

        if (codeError) throw codeError
        itemData.item_code = generatedCode
      }
      */
      
      // For now, just use a simple item code
      if (!itemData.item_code) {
        itemData.item_code = `ITEM-${Date.now()}`
      }

      // TEMPORARY FIX: Only send fields that currently exist in the database
      // Note: item_code and unit_of_measure columns need to be added to the database first
      const insertData = {
        name: itemData.name,
        description: itemData.description || '',
        unit_price: itemData.unit_price,
        company_id: getCompanyId()
      }
      
      // Add these fields only if the columns exist in the database
      if (itemData.item_code) {
        (insertData as any).item_code = itemData.item_code
      }
      if (itemData.unit_of_measure && itemData.unit_of_measure !== 'none') {
        (insertData as any).unit_of_measure = itemData.unit_of_measure
      }
      
      console.log('🔍 [DEBUG] ===== ABOUT TO INSERT =====')
      console.log('🔍 [DEBUG] Attempting to insert item:', insertData)
      console.log('🔍 [DEBUG] Company ID:', getCompanyId())
      console.log('🔍 [DEBUG] Supabase client:', supabase)
      
      const { data, error } = await supabase
        .from('items')
        .insert([insertData])
        .select()
        .single()
        
      console.log('🔍 [DEBUG] Insert result:', { data, error })
      
      if (error) {
        console.error('🔍 [DEBUG] ===== SUPABASE ERROR DETAILS =====')
        console.error('🔍 [DEBUG] Error object:', error)
        console.error('🔍 [DEBUG] Error message:', error.message)
        console.error('🔍 [DEBUG] Error code:', error.code)
        console.error('🔍 [DEBUG] Error details:', error.details)
        console.error('🔍 [DEBUG] Error hint:', error.hint)
      }

      if (error) throw error

      // Refresh items list
      await fetchItems()
      return data
    } catch (err) {
      console.error('🔍 [DEBUG] Error in createItem:', err)
      if (err instanceof Error) {
        console.error('🔍 [DEBUG] Error message:', err.message)
        console.error('🔍 [DEBUG] Error stack:', err.stack)
      }
      setError(err instanceof Error ? err.message : 'Failed to create item')
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase, getCompanyId, fetchItems])

  // Update an existing item
  const updateItem = useCallback(async (id: string, updates: Partial<ItemFormData>): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      // Handle "none" values for category and unit_of_measure
      const processedUpdates = {
        ...updates,
        category: updates.category === "none" ? null : updates.category,
        unit_of_measure: updates.unit_of_measure === "none" ? null : updates.unit_of_measure
      }
      
      const { error } = await supabase
        .from('items')
        .update(processedUpdates)
        .eq('id', id)

      if (error) throw error

      // Refresh items list
      await fetchItems()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item')
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase, fetchItems])

  // Delete an item (soft delete by setting is_active to false)
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('items')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      // Refresh items list
      await fetchItems()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase, fetchItems])

  // Update stock level
  const updateStock = useCallback(async (id: string, quantityChange: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .rpc('update_item_stock', {
          item_uuid: id,
          quantity_change: quantityChange
        })

      if (error) throw error

      // Refresh items list
      await fetchItems()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock')
      return false
    }
  }, [supabase, fetchItems])

  // Search items
  const searchItems = useCallback(async (query: string): Promise<Item[]> => {
    if (!getCompanyId() || !query.trim()) return []

    try {
      const { data, error } = await supabase
        .from('active_items_view')
        .select('*')
        .eq('company_id', getCompanyId())
        .or(`name.ilike.%${query}%,item_code.ilike.%${query}%,barcode.ilike.%${query}%,sku.ilike.%${query}%`)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Failed to search items:', err)
      return []
    }
  }, [supabase, getCompanyId])

  // Get items by category
  const getItemsByCategory = useCallback((category: string): Item[] => {
    if (category === "none") {
      return items.filter(item => !item.category || item.category === "none")
    }
    return items.filter(item => item.category === category)
  }, [items])

  // Get low stock items
  const getLowStockItems = useCallback((): Item[] => {
    return items.filter(item => 
      item.is_inventory_item && 
      item.current_stock !== undefined && 
      item.min_stock_level !== undefined &&
      item.current_stock <= item.min_stock_level
    )
  }, [items])

  // Fetch data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchItems()
      fetchCategories()
      fetchUnitsOfMeasure()
    }
  }, [activeCompany, fetchItems, fetchCategories, fetchUnitsOfMeasure])

  return {
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
    refreshItems: fetchItems,
    refreshCategories: fetchCategories,
    refreshUnitsOfMeasure: fetchUnitsOfMeasure
  }
}
