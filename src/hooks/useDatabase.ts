import { useState, useEffect, useCallback } from 'react'
import { supabase, Database } from '@/lib/supabase'

type TableName = keyof Database['public']['Tables']

export function useDatabase<T extends TableName>(tableName: T) {
  const [data, setData] = useState<Database['public']['Tables'][T]['Row'][]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper to ensure unique IDs in the data array
  const ensureUniqueData = useCallback((records: Database['public']['Tables'][T]['Row'][]) => {
    const seenIds = new Set<string>();
    const filtered = records.filter(record => {
      if (seenIds.has(record.id)) {
        console.warn(`[useDatabase] Duplicate ID found for table ${tableName}: ${record.id}. Filtering out duplicate.`);
        return false;
      }
      seenIds.add(record.id);
      return true;
    });
    
    if (filtered.length !== records.length) {
      console.log(`[useDatabase] Filtered out ${records.length - filtered.length} duplicate records from ${tableName}`);
    }
    
    return filtered;
  }, [tableName]);

  // Internal fetch function (doesn't set loading state)
  const internalFetch = useCallback(async () => {
    try {
      const { data: result, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      const uniqueData = ensureUniqueData(result || []);
      console.log(`[useDatabase] Internal fetch for ${tableName}: ${uniqueData.length} unique records`);
      setData(uniqueData)
      return result
    } catch (err) {
      console.error(`[useDatabase] Error in internal fetch for ${tableName}:`, err);
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    }
  }, [tableName, ensureUniqueData]);

  // Fetch all records
  const fetchAll = useCallback(async () => {
    console.log(`[useDatabase] Fetching from table: ${tableName}`);
    console.log(`[useDatabase] Supabase client:`, supabase);
    setLoading(true)
    setError(null)
    try {
      const result = await internalFetch()
      console.log(`[useDatabase] Fetch result:`, result);
      return result
    } catch (err) {
      console.error(`[useDatabase] Error fetching ${tableName}:`, err);
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
      const { data: result, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [tableName])

  // Create new record
  const create = useCallback(async (record: Database['public']['Tables'][T]['Insert']) => {
    setLoading(true)
    setError(null)
    try {
      const { data: result, error: createError } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single()

      if (createError) throw createError
      
      console.log(`[useDatabase] Created record in ${tableName}, refreshing data...`);
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
  const update = useCallback(async (id: string, updates: Database['public']['Tables'][T]['Update']) => {
    setLoading(true)
    setError(null)
    try {
      const { data: result, error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      
      console.log(`[useDatabase] Updated record in ${tableName}, refreshing data...`);
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
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      
      console.log(`[useDatabase] Deleted record from ${tableName}, refreshing data...`);
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
      let query = supabase.from(tableName).select('*')
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })

      const { data: result, error: fetchError } = await query.order('created_at', { ascending: false })

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
