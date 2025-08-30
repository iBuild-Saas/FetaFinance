# Supabase Integration Setup Guide

## Overview
This application is now integrated with Supabase for database operations. Supabase provides a PostgreSQL database with real-time subscriptions, authentication, and a powerful API.

## Database URL
- **URL**: https://kkrgyvbbqbnwbvujfgps.supabase.co

## Setup Steps

### 1. Environment Variables
Create a `.env.local` file in your project root with the following variables:

```bash
VITE_SUPABASE_URL=https://kkrgyvbbqbnwbvujfgps.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important**: Replace `your_anon_key_here` with your actual Supabase anon key from your Supabase dashboard.

### 2. Get Your Supabase Anon Key
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "anon public" key
4. Paste it in your `.env.local` file

### 3. Database Schema
The application expects the following tables to exist in your Supabase database:

#### Companies Table
```sql
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT, -- Base64 encoded logo or URL
  description TEXT,
  industry TEXT,
  company_size TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  currency TEXT,
  fiscal_year_start TEXT,
  tax_id TEXT,
  multi_currency BOOLEAN DEFAULT false,
  inventory_tracking BOOLEAN DEFAULT true,
  auto_backup BOOLEAN DEFAULT true,
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Customers Table
```sql
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Suppliers Table
```sql
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Items Table
```sql
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Chart of Accounts Table
```sql
CREATE TABLE chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Journal Entries Table
```sql
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Journal Entry Lines Table
```sql
CREATE TABLE journal_entry_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID REFERENCES journal_entries(id),
  account_id UUID REFERENCES chart_of_accounts(id),
  debit_amount DECIMAL(10,2) DEFAULT 0,
  credit_amount DECIMAL(10,2) DEFAULT 0,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Row Level Security (RLS)
Enable RLS on your tables and create policies as needed. For development, you can temporarily disable RLS:

```sql
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines DISABLE ROW LEVEL SECURITY;
```

## Usage Examples

### Using the useDatabase Hook
```tsx
import { useDatabase } from '@/hooks/useDatabase'

function MyComponent() {
  const { data, loading, error, create, update, remove } = useDatabase('companies')
  
  // Fetch all companies
  React.useEffect(() => {
    fetchAll()
  }, [])
  
  // Create a new company
  const handleCreate = async () => {
    await create({ name: 'New Company' })
  }
  
  // Update a company
  const handleUpdate = async (id: string) => {
    await update(id, { name: 'Updated Company' })
  }
  
  // Delete a company
  const handleDelete = async (id: string) => {
    await remove(id)
  }
}
```

### Using the Supabase Context
```tsx
import { useSupabase } from '@/contexts/SupabaseContext'

function AuthComponent() {
  const { user, signIn, signOut } = useSupabase()
  
  const handleSignIn = async () => {
    try {
      await signIn('user@example.com', 'password')
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }
  
  const handleSignOut = async () => {
    await signOut()
  }
}
```

## Features

### Real-time Subscriptions
Supabase provides real-time subscriptions for live updates:

```tsx
import { supabase } from '@/lib/supabase'

// Subscribe to changes in the companies table
const subscription = supabase
  .channel('companies_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'companies' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()
```

### File Storage
For handling company logos and other files:

```tsx
// Upload a file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('public/avatar1.png', file)

// Download a file
const { data } = supabase.storage
  .from('avatars')
  .download('public/avatar1.png')
```

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that your `.env.local` file has the correct anon key
   - Ensure the key is copied exactly from your Supabase dashboard

2. **"Table doesn't exist" error**
   - Run the SQL commands above to create the required tables
   - Check that table names match exactly (case-sensitive)

3. **CORS errors**
   - Ensure your Supabase project allows requests from your development domain
   - Check the allowed origins in your Supabase dashboard

4. **RLS policy errors**
   - For development, you can disable RLS temporarily
   - For production, create appropriate policies for your use case

### Getting Help
- Check the [Supabase documentation](https://supabase.com/docs)
- Review the [Supabase JavaScript client docs](https://supabase.com/docs/reference/javascript)
- Check the browser console for detailed error messages

## Next Steps
1. Set up your environment variables
2. Create the database tables
3. Test the integration with the example component
4. Implement authentication if needed
5. Add real-time subscriptions for live updates
6. Set up proper RLS policies for production
