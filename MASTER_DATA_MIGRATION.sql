-- =====================================================
-- MASTER DATA MIGRATION SCRIPT
-- Categories and Units of Measure Management
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ITEM CATEGORIES TABLE
-- =====================================================

-- Create item_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS item_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES item_categories(id),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_item_categories_company_id ON item_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_item_categories_parent_id ON item_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_item_categories_active ON item_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_item_categories_name ON item_categories(name);

-- Create unique constraint for category name per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_categories_company_name 
ON item_categories(company_id, name) 
WHERE is_active = true;

-- =====================================================
-- ITEM UNITS OF MEASURE TABLE
-- =====================================================

-- Create item_units_of_measure table if it doesn't exist
CREATE TABLE IF NOT EXISTS item_units_of_measure (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_item_units_company_id ON item_units_of_measure(company_id);
CREATE INDEX IF NOT EXISTS idx_item_units_active ON item_units_of_measure(is_active);
CREATE INDEX IF NOT EXISTS idx_item_units_code ON item_units_of_measure(code);
CREATE INDEX IF NOT EXISTS idx_item_units_name ON item_units_of_measure(name);

-- Create unique constraint for unit code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_units_company_code 
ON item_units_of_measure(company_id, code) 
WHERE is_active = true;

-- Create unique constraint for unit name per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_units_company_name 
ON item_units_of_measure(company_id, name) 
WHERE is_active = true;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_item_categories_updated_at ON item_categories;
CREATE TRIGGER update_item_categories_updated_at
    BEFORE UPDATE ON item_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_item_units_updated_at ON item_units_of_measure;
CREATE TRIGGER update_item_units_updated_at
    BEFORE UPDATE ON item_units_of_measure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA INSERTION
-- =====================================================

-- Insert default categories (only if they don't exist)
INSERT INTO item_categories (name, description, company_id, is_active) 
SELECT 'General', 'General items and products', c.id, true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM item_categories 
    WHERE name = 'General' AND company_id = c.id
);

INSERT INTO item_categories (name, description, company_id, is_active) 
SELECT 'Electronics', 'Electronic devices and components', c.id, true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM item_categories 
    WHERE name = 'Electronics' AND company_id = c.id
);

INSERT INTO item_categories (name, description, company_id, is_active) 
SELECT 'Office Supplies', 'Office and stationery items', c.id, true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM item_categories 
    WHERE name = 'Office Supplies' AND company_id = c.id
);

INSERT INTO item_categories (name, description, company_id, is_active) 
SELECT 'Raw Materials', 'Raw materials and components', c.id, true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM item_categories 
    WHERE name = 'Raw Materials' AND company_id = c.id
);

-- Insert default units of measure (only if they don't exist)
INSERT INTO item_units_of_measure (code, name, description, company_id, is_active) 
SELECT 'PCS', 'Pieces', 'Individual units or pieces', c.id, true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM item_units_of_measure 
    WHERE code = 'PCS' AND company_id = c.id
);

INSERT INTO item_units_of_measure (code, name, description, company_id, is_active) 
SELECT 'KG', 'Kilograms', 'Weight in kilograms', c.id, true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM item_units_of_measure 
    WHERE code = 'KG' AND company_id = c.id
);

INSERT INTO item_units_of_measure (code, name, description, company_id, is_active) 
SELECT 'L', 'Liters', 'Volume in liters', c.id, true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM item_units_of_measure 
    WHERE code = 'L' AND company_id = c.id
);

INSERT INTO item_units_of_measure (code, name, description, company_id, is_active) 
SELECT 'M', 'Meters', 'Length in meters', c.id, true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM item_units_of_measure 
    WHERE code = 'M' AND company_id = c.id
);

INSERT INTO item_units_of_measure (code, name, description, company_id, is_active) 
SELECT 'BOX', 'Boxes', 'Items packaged in boxes', c.id, true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM item_units_of_measure 
    WHERE code = 'BOX' AND company_id = c.id
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_units_of_measure ENABLE ROW LEVEL SECURITY;

-- Create policies for item_categories
DROP POLICY IF EXISTS "Users can view categories from their company" ON item_categories;
CREATE POLICY "Users can view categories from their company" ON item_categories
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert categories in their company" ON item_categories;
CREATE POLICY "Users can insert categories in their company" ON item_categories
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update categories in their company" ON item_categories;
CREATE POLICY "Users can update categories in their company" ON item_categories
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- Create policies for item_units_of_measure
DROP POLICY IF EXISTS "Users can view units from their company" ON item_units_of_measure;
CREATE POLICY "Users can view units from their company" ON item_units_of_measure
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert units in their company" ON item_units_of_measure;
CREATE POLICY "Users can insert units in their company" ON item_units_of_measure
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update units in their company" ON item_units_of_measure;
CREATE POLICY "Users can update units in their company" ON item_units_of_measure
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM user_companies 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- VIEWS FOR SIMPLIFIED DATA ACCESS
-- =====================================================

-- Create view for active categories with parent information
CREATE OR REPLACE VIEW active_categories_view AS
SELECT 
    c.id,
    c.name,
    c.description,
    c.parent_category_id,
    p.name as parent_category_name,
    c.company_id,
    c.is_active,
    c.created_at,
    c.updated_at
FROM item_categories c
LEFT JOIN item_categories p ON c.parent_category_id = p.id
WHERE c.is_active = true;

-- Create view for active units of measure
CREATE OR REPLACE VIEW active_units_view AS
SELECT 
    id,
    code,
    name,
    description,
    company_id,
    is_active,
    created_at,
    updated_at
FROM item_units_of_measure
WHERE is_active = true;

-- =====================================================
-- VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate category name uniqueness within company
CREATE OR REPLACE FUNCTION validate_category_name_unique()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM item_categories 
        WHERE name = NEW.name 
        AND company_id = NEW.company_id 
        AND id != NEW.id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Category name must be unique within the company';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate unit code uniqueness within company
CREATE OR REPLACE FUNCTION validate_unit_code_unique()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM item_units_of_measure 
        WHERE code = NEW.code 
        AND company_id = NEW.company_id 
        AND id != NEW.id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unit code must be unique within the company';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for validation
DROP TRIGGER IF EXISTS validate_category_name_trigger ON item_categories;
CREATE TRIGGER validate_category_name_trigger
    BEFORE INSERT OR UPDATE ON item_categories
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_name_unique();

DROP TRIGGER IF EXISTS validate_unit_code_trigger ON item_units_of_measure;
CREATE TRIGGER validate_unit_code_trigger
    BEFORE INSERT OR UPDATE ON item_units_of_measure
    FOR EACH ROW
    EXECUTE FUNCTION validate_unit_code_unique();

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON item_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON item_units_of_measure TO authenticated;
GRANT SELECT ON active_categories_view TO authenticated;
GRANT SELECT ON active_units_view TO authenticated;

-- Output completion message
DO $$
BEGIN
    RAISE NOTICE 'Master Data Migration completed successfully!';
    RAISE NOTICE 'Tables created: item_categories, item_units_of_measure';
    RAISE NOTICE 'Views created: active_categories_view, active_units_view';
    RAISE NOTICE 'Default data inserted for categories and units of measure';
    RAISE NOTICE 'RLS policies and validation triggers configured';
END $$;






