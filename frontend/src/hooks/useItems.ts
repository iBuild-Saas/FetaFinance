import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/database-client'
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
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies')
  const { state } = useAccounting()
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<ItemUnitOfMeasure[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null

  const getCompanyId = useCallback(() => activeCompany?.id, [activeCompany?.id])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const fetchItems = useCallback(async () => {
    const companyId = getCompanyId()
    if (!companyId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await db.from('items').eq('company_id', companyId).select('*')
      if (error) throw error

      setItems(
        (data || [])
          .filter((item: Item) => item.is_active !== false)
          .sort((a: Item, b: Item) => a.name.localeCompare(b.name))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }, [getCompanyId])

  const fetchCategories = useCallback(async () => {
    const companyId = getCompanyId()
    if (!companyId) return

    try {
      const { data, error } = await db.from('item_categories').eq('company_id', companyId).select('*')
      if (error) throw error

      setCategories(
        (data || [])
          .filter((category: ItemCategory) => category.is_active !== false)
          .sort((a: ItemCategory, b: ItemCategory) => a.name.localeCompare(b.name))
      )
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      setCategories([])
    }
  }, [getCompanyId])

  const fetchUnitsOfMeasure = useCallback(async () => {
    const companyId = getCompanyId()
    if (!companyId) return

    try {
      const { data, error } = await db.from('item_units_of_measure').eq('company_id', companyId).select('*')
      if (error) throw error

      setUnitsOfMeasure(
        (data || [])
          .filter((unit: ItemUnitOfMeasure) => unit.is_active !== false)
          .sort((a: ItemUnitOfMeasure, b: ItemUnitOfMeasure) => a.name.localeCompare(b.name))
      )
    } catch (err) {
      console.error('Failed to fetch units of measure:', err)
      setUnitsOfMeasure([])
    }
  }, [getCompanyId])

  const createItem = useCallback(async (itemData: ItemFormData): Promise<Item | null> => {
    const companyId = getCompanyId()
    if (!companyId) {
      setError('No company selected. Please select a company first.')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const insertData = {
        item_code: itemData.item_code || `ITEM-${Date.now()}`,
        name: itemData.name,
        description: itemData.description || '',
        category: itemData.category === 'none' ? null : itemData.category,
        subcategory: itemData.subcategory || null,
        unit_of_measure: itemData.unit_of_measure === 'none' ? null : itemData.unit_of_measure,
        unit_price: itemData.unit_price,
        cost_price: itemData.cost_price ?? null,
        selling_price: itemData.selling_price ?? null,
        tax_rate: itemData.tax_rate ?? null,
        min_stock_level: itemData.min_stock_level ?? null,
        max_stock_level: itemData.max_stock_level ?? null,
        current_stock: itemData.current_stock ?? 0,
        reorder_point: itemData.reorder_point ?? null,
        supplier_id: itemData.supplier_id || null,
        company_id: companyId,
        is_taxable: itemData.is_taxable,
        is_inventory_item: itemData.is_inventory_item,
        barcode: itemData.barcode || null,
        sku: itemData.sku || null,
        weight: itemData.weight ?? null,
        dimensions: itemData.dimensions || null,
        image_url: itemData.image_url || null,
        notes: itemData.notes || null,
        is_active: true
      }

      const { data, error } = await db.from('items').insert(insertData)
      if (error) throw error

      await fetchItems()
      return (data as Item) || null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
      return null
    } finally {
      setLoading(false)
    }
  }, [getCompanyId, fetchItems])

  const updateItem = useCallback(async (id: string, updates: Partial<ItemFormData>): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const processedUpdates = {
        ...updates,
        category: updates.category === "none" ? null : updates.category,
        unit_of_measure: updates.unit_of_measure === "none" ? null : updates.unit_of_measure
      }

      const { error } = await db.from('items').update(id, processedUpdates)
      if (error) throw error

      await fetchItems()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item')
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchItems])

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await db.from('items').update(id, { is_active: false })
      if (error) throw error

      await fetchItems()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchItems])

  const updateStock = useCallback(async (id: string, quantityChange: number): Promise<boolean> => {
    try {
      const existingItem = items.find(item => item.id === id)
      if (!existingItem) {
        throw new Error('Item not found')
      }

      const { error } = await db.from('items').update(id, {
        current_stock: Number(existingItem.current_stock || 0) + quantityChange
      })

      if (error) throw error

      await fetchItems()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock')
      return false
    }
  }, [items, fetchItems])

  const searchItems = useCallback(async (query: string): Promise<Item[]> => {
    const companyId = getCompanyId()
    if (!companyId || !query.trim()) return []

    try {
      const { data, error } = await db.from('items').eq('company_id', companyId).select('*')
      if (error) throw error

      const normalizedQuery = query.trim().toLowerCase()
      return (data || [])
        .filter((item: Item) => item.is_active !== false)
        .filter((item: Item) =>
          item.name?.toLowerCase().includes(normalizedQuery) ||
          item.item_code?.toLowerCase().includes(normalizedQuery) ||
          item.barcode?.toLowerCase().includes(normalizedQuery) ||
          item.sku?.toLowerCase().includes(normalizedQuery)
        )
        .sort((a: Item, b: Item) => a.name.localeCompare(b.name))
    } catch (err) {
      console.error('Failed to search items:', err)
      return []
    }
  }, [getCompanyId])

  const getItemsByCategory = useCallback((category: string): Item[] => {
    if (category === "none") {
      return items.filter(item => !item.category || item.category === "none")
    }
    return items.filter(item => item.category === category)
  }, [items])

  const getLowStockItems = useCallback((): Item[] => {
    return items.filter(item =>
      item.is_inventory_item &&
      item.current_stock !== undefined &&
      item.min_stock_level !== undefined &&
      item.current_stock <= item.min_stock_level
    )
  }, [items])

  useEffect(() => {
    if (activeCompany) {
      fetchItems()
      fetchCategories()
      fetchUnitsOfMeasure()
    } else {
      setItems([])
      setCategories([])
      setUnitsOfMeasure([])
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
