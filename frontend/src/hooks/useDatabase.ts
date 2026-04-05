import { useState, useEffect, useCallback } from 'react'
import { db, DatabaseTable } from '@/lib/database-client'

export function useDatabase<T extends DatabaseTable>(tableName: T) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper to ensure unique IDs in the data array
  const ensureUniqueData = useCallback((records: any[]) => {
    const seenIds = new Set<string>();
    const filtered = records.filter(record => {
      if (seenIds.has(record.id)) {
        console.warn(`[useDatabase] Duplicate ID found for table ${String(tableName)}: ${record.id}. Filtering out duplicate.`);
        return false;
      }
      seenIds.add(record.id);
      return true;
    });

    return filtered;
  }, [tableName]);

  // Internal fetch function (doesn't set loading state)
  const internalFetch = useCallback(async () => {
    try {
      const { data: result, error: fetchError } = await db.from(tableName).select('*')

      if (fetchError) throw fetchError
      
      const uniqueData = ensureUniqueData(result || []);
      setData(uniqueData)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    }
  }, [tableName, ensureUniqueData]);

  // Fetch all records
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await internalFetch()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [tableName, internalFetch])

  // Fetch by ID
  const fetchById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data: result, error: fetchError } = await db.from(tableName).eq('id', id).select('*')

      if (fetchError) throw fetchError
      return result?.[0] || null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [tableName])

  // Create new record
  const create = useCallback(async (record: any) => {
    setLoading(true)
    setError(null)
    try {
      const { data: result, error: createError } = await db.from(tableName).insert(record)

      if (createError) throw createError
      
      // Refresh data to ensure consistency
      await internalFetch()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [tableName, internalFetch])

  // Update record
  const update = useCallback(async (id: string, updates: any) => {
    setLoading(true)
    setError(null)
    try {
      const { data: result, error: updateError } = await db.from(tableName).update(id, updates)

      if (updateError) throw updateError
      
      // Refresh data to ensure consistency
      await internalFetch()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [tableName, internalFetch])

  // Delete record
  const remove = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error: deleteError } = await db.from(tableName).delete(id)

      if (deleteError) throw deleteError
      
      // Refresh data to ensure consistency
      await internalFetch()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return false
    } finally {
      setLoading(false)
    }
  }, [tableName, internalFetch])

  // Fetch with filters
  const fetchWithFilters = useCallback(async (filters: Record<string, any>) => {
    setLoading(true)
    setError(null)
    try {
      let query = db.from(tableName).select('*')
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })

      const { data: result, error: fetchError } = await query

      if (fetchError) throw fetchError
      setData(ensureUniqueData(result || []))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [tableName, ensureUniqueData])

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  return {
    data,
    loading,
    error,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
    fetchWithFilters,
    clearError,
  }
}
