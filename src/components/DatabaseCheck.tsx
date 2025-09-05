import React, { useEffect, useState } from 'react'
import { useSupabase } from '@/contexts/SupabaseContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DatabaseCheck() {
  const { supabase } = useSupabase()
  const [checks, setChecks] = useState<{
    items: boolean
    categories: boolean
    units: boolean
    companies: boolean
    suppliers: boolean
  }>({
    items: false,
    categories: false,
    units: false,
    companies: false,
    suppliers: false
  })

  useEffect(() => {
    const checkTables = async () => {
      try {
        // Check if tables exist and have data
        const [itemsResult, categoriesResult, unitsResult, companiesResult, suppliersResult] = await Promise.all([
          supabase.from('items').select('count', { count: 'exact', head: true }),
          supabase.from('item_categories').select('count', { count: 'exact', head: true }),
          supabase.from('item_units_of_measure').select('count', { count: 'exact', head: true }),
          supabase.from('companies').select('count', { count: 'exact', head: true }),
          supabase.from('suppliers').select('count', { count: 'exact', head: true })
        ])

        setChecks({
          items: !itemsResult.error,
          categories: !categoriesResult.error,
          units: !unitsResult.error,
          companies: !companiesResult.error,
          suppliers: !suppliersResult.error
        })

        console.log('Database check results:', {
          items: itemsResult,
          categories: categoriesResult,
          units: unitsResult,
          companies: companiesResult,
          suppliers: suppliersResult
        })
      } catch (error) {
        console.error('Database check failed:', error)
      }
    }

    checkTables()
  }, [supabase])

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Database Status Check</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <Badge variant={checks.companies ? "default" : "destructive"}>
              Companies
            </Badge>
            <p className="text-xs mt-1">{checks.companies ? "✓" : "✗"}</p>
          </div>
          <div className="text-center">
            <Badge variant={checks.suppliers ? "default" : "destructive"}>
              Suppliers
            </Badge>
            <p className="text-xs mt-1">{checks.suppliers ? "✓" : "✗"}</p>
          </div>
          <div className="text-center">
            <Badge variant={checks.items ? "default" : "destructive"}>
              Items
            </Badge>
            <p className="text-xs mt-1">{checks.items ? "✓" : "✗"}</p>
          </div>
          <div className="text-center">
            <Badge variant={checks.categories ? "default" : "destructive"}>
              Categories
            </Badge>
            <p className="text-xs mt-1">{checks.categories ? "✓" : "✗"}</p>
          </div>
          <div className="text-center">
            <Badge variant={checks.units ? "default" : "destructive"}>
              Units
            </Badge>
            <p className="text-xs mt-1">{checks.units ? "✓" : "✗"}</p>
          </div>
        </div>
        {!checks.items || !checks.categories || !checks.units ? (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Some required tables are missing. Please run the CREATE_ITEMS_MASTER_TABLE.sql script in your database.
            </p>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              All required tables are present. Database setup is complete.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}






