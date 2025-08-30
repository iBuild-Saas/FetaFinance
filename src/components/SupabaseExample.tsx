import React from 'react'
import { useDatabase } from '@/hooks/useDatabase'
import { useToast } from '@/hooks/use-toast'

export const SupabaseExample: React.FC = () => {
  const { toast } = useToast()
  const { data: companies, loading, error, create, fetchAll } = useDatabase('companies')
  const [newCompanyName, setNewCompanyName] = React.useState('')

  React.useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      })
      return
    }

    try {
      console.log('Attempting to create company:', newCompanyName.trim())
      const result = await create({
        name: newCompanyName.trim(),
        description: 'Sample company description',
        industry: 'Technology',
        company_size: 'Small',
        email: 'info@samplecompany.com',
        phone: '+1-555-0123',
        currency: 'LYD',
        fiscal_year_start: 'January',
        multi_currency: false,
        inventory_tracking: true,
        auto_backup: true,
        timezone: 'UTC'
      })
      console.log('Company created successfully:', result)
      setNewCompanyName('')
      toast({
        title: "Success",
        description: "Company created successfully",
      })
    } catch (error) {
      console.error('Error creating company:', error)
      toast({
        title: "Error",
        description: `Failed to create company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-600">
        Loading companies...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600 mb-2">Error: {error}</div>
        <button 
          onClick={fetchAll}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add New Company Section */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New Company</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              id="company-name"
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Enter company name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button 
            onClick={handleCreateCompany} 
            disabled={!newCompanyName.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Create Company
          </button>
        </div>
      </div>

      {/* Companies List Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Companies ({companies.length})
        </h3>
        {companies.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No companies found. Create your first company above.
          </div>
        ) : (
          <div className="space-y-2">
            {companies.map((company) => (
              <div
                key={company.id}
                className="p-3 border border-gray-200 rounded-md bg-white"
              >
                <div className="font-medium text-gray-900">{company.name}</div>
                {company.description && (
                  <div className="text-sm text-gray-600 mt-1">{company.description}</div>
                )}
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  {company.industry && <span>Industry: {company.industry}</span>}
                  {company.company_size && <span>Size: {company.company_size}</span>}
                  {company.currency && <span>Currency: {company.currency}</span>}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Created: {new Date(company.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
