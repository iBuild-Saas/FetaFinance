# Master Data Management System

This document describes the Categories and Units of Measure management system that has been added to the FMS application.

## Overview

The Master Data system provides comprehensive management of:
- **Item Categories**: Hierarchical classification system for inventory items
- **Units of Measure**: Standardized measurement units for items

## Features

### Categories Management
- ✅ Create, edit, and delete categories
- ✅ Hierarchical structure with parent-child relationships
- ✅ Company-specific categories
- ✅ Soft delete (deactivate instead of hard delete)
- ✅ Validation for unique names within company

### Units of Measure Management
- ✅ Create, edit, and delete units
- ✅ Short codes (PCS, KG, L, M, BOX)
- ✅ Full names (Pieces, Kilograms, Liters, Meters, Boxes)
- ✅ Company-specific units
- ✅ Validation for unique codes and names within company

## Database Setup

### 1. Run the Migration Script

Execute the `MASTER_DATA_MIGRATION.sql` script in your Supabase database:

```sql
-- Connect to your Supabase database and run:
\i MASTER_DATA_MIGRATION.sql
```

### 2. What Gets Created

The migration script creates:

**Tables:**
- `item_categories` - Stores item categories with hierarchical support
- `item_units_of_measure` - Stores measurement units

**Views:**
- `active_categories_view` - Active categories with parent information
- `active_units_view` - Active units of measure

**Indexes:**
- Performance optimization for company_id, parent_id, and active status
- Unique constraints for data integrity

**Triggers:**
- Automatic `updated_at` timestamp updates
- Validation for unique names/codes within company

**Default Data:**
- Pre-populated categories: General, Electronics, Office Supplies, Raw Materials
- Pre-populated units: PCS, KG, L, M, BOX

## Application Usage

### Navigation

The new pages are accessible through:
- **Master Data** section in the sidebar
- Direct routes: `/categories` and `/units-of-measure`

### Categories Page (`/categories`)

**Features:**
- View all categories for the current company
- Create new categories with optional parent category
- Edit existing categories
- Delete categories (soft delete)
- Hierarchical display showing parent-child relationships

**Form Fields:**
- **Category Name** (required): Unique name within company
- **Description**: Optional detailed description
- **Parent Category**: Optional hierarchical parent

### Units of Measure Page (`/units-of-measure`)

**Features:**
- View all units for the current company
- Create new units with code and name
- Edit existing units
- Delete units (soft delete)

**Form Fields:**
- **Unit Code** (required): Short 2-10 character code (e.g., PCS, KG)
- **Unit Name** (required): Full descriptive name (e.g., Pieces, Kilograms)
- **Description**: Optional detailed description

## Integration with Items

### Items Form Integration

The Items page now properly displays:
- **Categories**: Dropdown populated from `item_categories` table
- **Units of Measure**: Dropdown populated from `item_units_of_measure` table

### Data Flow

1. **Categories** and **Units** are managed in their respective pages
2. **Items** reference these master data records
3. Changes in master data are immediately reflected in item forms
4. Validation ensures data integrity across the system

## Security Features

### Row Level Security (RLS)
- Users can only access data from their assigned companies
- Automatic company isolation through RLS policies
- Secure data access patterns

### Validation
- Unique category names per company
- Unique unit codes per company
- Unique unit names per company
- Referential integrity with foreign keys

## Troubleshooting

### Common Issues

**1. Categories/Units not showing in Items form:**
- Check if `selectedCompanyId` is set in localStorage
- Verify database tables exist and contain data
- Check browser console for errors

**2. Permission denied errors:**
- Ensure RLS policies are properly configured
- Verify user has access to the company
- Check if `user_companies` table exists and has correct data

**3. Validation errors:**
- Category names must be unique within company
- Unit codes must be unique within company
- Unit names must be unique within company

### Database Verification

Use the `DatabaseCheck` component on the Items page to verify:
- Tables exist and are accessible
- Data is being fetched correctly
- Company isolation is working

## Best Practices

### Categories
- Use descriptive, clear names
- Keep hierarchy simple (max 2-3 levels)
- Use consistent naming conventions
- Document category purposes in descriptions

### Units of Measure
- Use standard industry codes (PCS, KG, L, M)
- Keep codes short but meaningful
- Provide clear, descriptive names
- Use consistent formatting (uppercase codes)

### Data Management
- Regularly review and clean up unused categories/units
- Maintain consistent naming across the organization
- Document any company-specific standards
- Train users on proper data entry procedures

## API Endpoints

The system uses these Supabase tables directly:

- `item_categories` - CRUD operations for categories
- `item_units_of_measure` - CRUD operations for units
- `active_categories_view` - Read-only view for active categories
- `active_units_view` - Read-only view for active units

## Future Enhancements

Potential improvements:
- Bulk import/export functionality
- Category templates for different industries
- Unit conversion capabilities
- Audit trail for changes
- Advanced search and filtering
- Category and unit usage analytics

## Support

For technical issues:
1. Check browser console for errors
2. Verify database setup with migration script
3. Check RLS policies and permissions
4. Review company ID configuration

For feature requests or bugs, please create an issue in the project repository.



