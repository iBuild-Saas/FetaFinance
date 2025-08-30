-- Create comprehensive items master table for inventory management
-- This script creates a new items table with all necessary fields for item management

-- Create the items table
CREATE TABLE IF NOT EXISTS items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'PCS', -- PCS, KG, L, M, etc.
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(15,2) DEFAULT 0.00,
    selling_price DECIMAL(15,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    min_stock_level DECIMAL(10,3) DEFAULT 0,
    max_stock_level DECIMAL(10,3) DEFAULT 0,
    current_stock DECIMAL(10,3) DEFAULT 0,
    reorder_point DECIMAL(10,3) DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id),
    company_id UUID REFERENCES companies(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_taxable BOOLEAN DEFAULT true,
    is_inventory_item BOOLEAN DEFAULT true,
    barcode VARCHAR(100),
    sku VARCHAR(100),
    weight DECIMAL(10,3) DEFAULT 0,
    dimensions VARCHAR(100), -- Format: LxWxH in cm
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on item_code per company
ALTER TABLE items 
ADD CONSTRAINT unique_item_code_per_company 
UNIQUE (item_code, company_id);

-- Create unique constraint on barcode per company
ALTER TABLE items 
ADD CONSTRAINT unique_barcode_per_company 
UNIQUE (barcode, company_id);

-- Create unique constraint on sku per company
ALTER TABLE items 
ADD CONSTRAINT unique_sku_per_company 
UNIQUE (sku, company_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_items_supplier_id ON items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_item_code ON items(item_code);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_is_inventory_item ON items(is_inventory_item);

-- Create item categories table for better organization
CREATE TABLE IF NOT EXISTS item_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES item_categories(id),
    company_id UUID REFERENCES companies(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on category name per company
ALTER TABLE item_categories 
ADD CONSTRAINT unique_category_name_per_company 
UNIQUE (name, company_id);

-- Create indexes for item categories
CREATE INDEX IF NOT EXISTS idx_item_categories_company_id ON item_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_item_categories_parent_id ON item_categories(parent_category_id);

-- Create item units of measure table
CREATE TABLE IF NOT EXISTS item_units_of_measure (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    company_id UUID REFERENCES companies(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on unit code per company
ALTER TABLE item_units_of_measure 
ADD CONSTRAINT unique_unit_code_per_company 
UNIQUE (code, company_id);

-- Create indexes for units of measure
CREATE INDEX IF NOT EXISTS idx_item_units_company_id ON item_units_of_measure(company_id);

-- Create a function to generate unique item codes
CREATE OR REPLACE FUNCTION generate_item_code(company_uuid UUID, category_name VARCHAR(100))
RETURNS VARCHAR(50) AS $$
DECLARE
    next_number INTEGER;
    new_code VARCHAR(50);
    category_prefix VARCHAR(10);
BEGIN
    -- Get category prefix (first 3 characters)
    category_prefix := UPPER(SUBSTRING(category_name FROM 1 FOR 3));
    
    -- Get the next available number for this company and category
    SELECT COALESCE(MAX(CAST(SUBSTRING(item_code FROM LENGTH(category_prefix) + 2) AS INTEGER)), 0) + 1
    INTO next_number
    FROM items 
    WHERE company_id = company_uuid 
    AND item_code LIKE category_prefix || '-%';
    
    -- Generate the new item code
    new_code := category_prefix || '-' || LPAD(CAST(next_number AS TEXT), 4, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update stock levels
CREATE OR REPLACE FUNCTION update_item_stock(item_uuid UUID, quantity_change DECIMAL(10,3))
RETURNS VOID AS $$
BEGIN
    -- Update the current stock level
    UPDATE items
    SET 
        current_stock = current_stock + quantity_change,
        updated_at = NOW()
    WHERE id = item_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically set updated_at
CREATE OR REPLACE FUNCTION update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_item_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_item_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the triggers
CREATE TRIGGER trigger_update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_items_updated_at();

CREATE TRIGGER trigger_update_item_categories_updated_at
    BEFORE UPDATE ON item_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_item_categories_updated_at();

CREATE TRIGGER trigger_update_item_units_updated_at
    BEFORE UPDATE ON item_units_of_measure
    FOR EACH ROW
    EXECUTE FUNCTION update_item_units_updated_at();

-- Grant permissions
GRANT ALL ON items TO authenticated;
GRANT ALL ON item_categories TO authenticated;
GRANT ALL ON item_units_of_measure TO authenticated;

-- Create views for better data access
CREATE OR REPLACE VIEW active_items_view AS
SELECT 
    i.*,
    ic.name as category_name,
    ic.description as category_description,
    s.name as supplier_name,
    s.supplier_code as supplier_code,
    comp.name as company_name
FROM items i
LEFT JOIN item_categories ic ON i.category = ic.name AND i.company_id = ic.company_id
LEFT JOIN suppliers s ON i.supplier_id = s.id
JOIN companies comp ON i.company_id = comp.id
WHERE i.is_active = true
ORDER BY i.category, i.name;

CREATE OR REPLACE VIEW inventory_items_view AS
SELECT 
    i.*,
    ic.name as category_name,
    s.name as supplier_name,
    comp.name as company_name,
    CASE 
        WHEN i.current_stock <= i.min_stock_level THEN 'LOW_STOCK'
        WHEN i.current_stock <= i.reorder_point THEN 'REORDER'
        ELSE 'NORMAL'
    END as stock_status
FROM items i
LEFT JOIN item_categories ic ON i.category = ic.name AND i.company_id = ic.company_id
LEFT JOIN suppliers s ON i.supplier_id = s.id
JOIN companies comp ON i.company_id = comp.id
WHERE i.is_active = true AND i.is_inventory_item = true
ORDER BY i.current_stock ASC, i.name;

-- Grant permissions on the views
GRANT SELECT ON active_items_view TO authenticated;
GRANT SELECT ON inventory_items_view TO authenticated;

-- Insert default units of measure
INSERT INTO item_units_of_measure (code, name, description, company_id) VALUES
    ('PCS', 'Pieces', 'Individual units', (SELECT id FROM companies LIMIT 1)),
    ('KG', 'Kilograms', 'Weight in kilograms', (SELECT id FROM companies LIMIT 1)),
    ('L', 'Liters', 'Volume in liters', (SELECT id FROM companies LIMIT 1)),
    ('M', 'Meters', 'Length in meters', (SELECT id FROM companies LIMIT 1)),
    ('BOX', 'Boxes', 'Box units', (SELECT id FROM companies LIMIT 1)),
    ('PAIR', 'Pairs', 'Pair units', (SELECT id FROM companies LIMIT 1)),
    ('SET', 'Sets', 'Set units', (SELECT id FROM companies LIMIT 1)),
    ('HOUR', 'Hours', 'Time in hours', (SELECT id FROM companies LIMIT 1)),
    ('DAY', 'Days', 'Time in days', (SELECT id FROM companies LIMIT 1))
ON CONFLICT DO NOTHING;

-- Insert default categories
INSERT INTO item_categories (name, description, company_id) VALUES
    ('Raw Materials', 'Basic materials used in production', (SELECT id FROM companies LIMIT 1)),
    ('Finished Goods', 'Completed products ready for sale', (SELECT id FROM companies LIMIT 1)),
    ('Work in Progress', 'Items in production process', (SELECT id FROM companies LIMIT 1)),
    ('Services', 'Service-based items', (SELECT id FROM companies LIMIT 1)),
    ('Supplies', 'Office and operational supplies', (SELECT id FROM companies LIMIT 1)),
    ('Equipment', 'Machinery and equipment', (SELECT id FROM companies LIMIT 1))
ON CONFLICT DO NOTHING;
