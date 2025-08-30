-- Updated Companies Table with all fields from the Company interface
-- Run this in your Supabase SQL Editor

-- Drop the existing table if it exists
DROP TABLE IF EXISTS companies CASCADE;

-- Create the updated companies table
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

-- Disable Row Level Security for development
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for development only)
CREATE POLICY "Allow all operations for companies" ON companies
  FOR ALL USING (true) WITH CHECK (true);

-- Insert a sample company to test
INSERT INTO companies (
  name, 
  description, 
  industry, 
  
  company_size, 
  email, 
  phone, 
  currency, 
  fiscal_year_start,
  multi_currency,
  inventory_tracking,
  auto_backup
) VALUES (
  'Sample Company',
  'A sample company for testing',
  'Technology',
  'Small',
  'info@samplecompany.com',
  '+1-555-0123',
  'USD',
  'January',
  false,
  true,
  true
);

-- Verify the table was created correctly
SELECT * FROM companies;
