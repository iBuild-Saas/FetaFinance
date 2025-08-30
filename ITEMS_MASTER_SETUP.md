# Items Master System Setup Guide

This guide will help you set up and use the comprehensive Items Master system for inventory management.

## Overview

The Items Master system provides a complete solution for managing:
- Inventory items and products
- Service-based items
- Item categories and classifications
- Units of measure
- Pricing and cost management
- Stock level tracking
- Supplier relationships
- Barcode and SKU management

## Database Setup

### 1. Run the SQL Script

Execute the `CREATE_ITEMS_MASTER_TABLE.sql` script in your Supabase database:

```bash
# Connect to your Supabase database and run:
\i CREATE_ITEMS_MASTER_TABLE.sql
```

This script creates:
- `items` - Main items table
- `item_categories` - Item categorization
- `item_units_of_measure` - Units of measurement
- Database views for better data access
- Functions for item code generation and stock updates
- Triggers for automatic timestamp updates

### 2. Default Data

The script automatically creates:
- Common units of measure (PCS, KG, L, M, BOX, PAIR, SET, HOUR, DAY)
- Basic item categories (Raw Materials, Finished Goods, Work in Progress, Services, Supplies, Equipment)

## Features

### Item Management
- **Create Items**: Add new inventory items, products, or services
- **Edit Items**: Update item information and settings
- **Delete Items**: Soft delete (deactivate) items
- **Search & Filter**: Find items by name, code, barcode, or SKU
- **Category Management**: Organize items by categories and subcategories

### Inventory Tracking
- **Stock Levels**: Track current, minimum, and maximum stock levels
- **Reorder Points**: Set automatic reorder notifications
- **Stock Updates**: Add or remove stock quantities
- **Low Stock Alerts**: Visual indicators for items below minimum levels

### Pricing Management
- **Unit Price**: Set base unit pricing
- **Cost Price**: Track item costs
- **Selling Price**: Define retail/selling prices
- **Tax Rates**: Configure item-specific tax rates
- **Taxable Status**: Control which items are taxable

### Advanced Features
- **Barcode Support**: Add barcode information for scanning
- **SKU Management**: Custom stock keeping units
- **Weight & Dimensions**: Physical item specifications
- **Image URLs**: Link to item images
- **Supplier Links**: Connect items to suppliers
- **Notes & Descriptions**: Detailed item information

## Usage

### 1. Access Items Master

Navigate to `/items` in your application or click "Items" in the sidebar under "Master Data" or "Inventory".

### 2. Create New Items

1. Click "Add Item" button
2. Fill in the required fields:
   - **Basic Info**: Name, description, category, unit of measure
   - **Pricing**: Unit price, cost price, selling price, tax rate
   - **Inventory**: Stock levels, reorder points, tracking options
   - **Advanced**: Barcode, SKU, weight, dimensions, image URL
3. Click "Save Item"

### 3. Manage Existing Items

- **Edit**: Click the edit button to modify item details
- **Stock Updates**: Click "Stock" to adjust inventory levels
- **Delete**: Remove items (soft delete - sets is_active to false)

### 4. Search and Filter

- Use the search bar to find items by name, code, barcode, or SKU
- Filter by category using the dropdown
- View statistics in the dashboard cards

## Data Structure

### Items Table Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `item_code` | VARCHAR(50) | Auto-generated item code |
| `name` | VARCHAR(255) | Item name |
| `description` | TEXT | Detailed description |
| `category` | VARCHAR(100) | Item category |
| `subcategory` | VARCHAR(100) | Item subcategory |
| `unit_of_measure` | VARCHAR(20) | Unit of measurement |
| `unit_price` | DECIMAL(15,2) | Base unit price |
| `cost_price` | DECIMAL(15,2) | Item cost |
| `selling_price` | DECIMAL(15,2) | Selling price |
| `tax_rate` | DECIMAL(5,2) | Tax rate percentage |
| `min_stock_level` | DECIMAL(10,3) | Minimum stock level |
| `max_stock_level` | DECIMAL(10,3) | Maximum stock level |
| `current_stock` | DECIMAL(10,3) | Current inventory level |
| `reorder_point` | DECIMAL(10,3) | Reorder trigger level |
| `supplier_id` | UUID | Linked supplier |
| `company_id` | UUID | Company association |
| `is_active` | BOOLEAN | Active status |
| `is_taxable` | BOOLEAN | Taxable status |
| `is_inventory_item` | BOOLEAN | Inventory tracking |
| `barcode` | VARCHAR(100) | Barcode information |
| `sku` | VARCHAR(100) | Stock keeping unit |
| `weight` | DECIMAL(10,3) | Item weight |
| `dimensions` | VARCHAR(100) | Physical dimensions |
| `image_url` | TEXT | Image URL |
| `notes` | TEXT | Additional notes |

### Views

- **`active_items_view`**: All active items with category and supplier information
- **`inventory_items_view`**: Inventory items with stock status indicators

### Functions

- **`generate_item_code(company_uuid, category_name)`**: Auto-generates unique item codes
- **`update_item_stock(item_uuid, quantity_change)`**: Updates stock levels

## Integration

### Sales Invoices
Items can be linked to sales invoice line items through the `invoice_line_items` table.

### Purchase Orders
Items can be linked to purchase order line items (when implemented).

### Chart of Accounts
Items can be associated with income and expense accounts for proper accounting.

## Best Practices

### 1. Item Naming
- Use consistent naming conventions
- Include key specifications in the name
- Avoid abbreviations that may be unclear

### 2. Categorization
- Create logical category hierarchies
- Use subcategories for detailed organization
- Keep categories consistent across the organization

### 3. Stock Management
- Set realistic minimum stock levels
- Use reorder points to prevent stockouts
- Regularly update stock counts

### 4. Pricing
- Keep cost prices updated for accurate profit calculations
- Review selling prices regularly
- Consider bulk pricing for high-volume items

## Troubleshooting

### Common Issues

1. **Item Code Generation Fails**
   - Ensure the `generate_item_code` function exists
   - Check that categories are properly set up

2. **Stock Updates Not Working**
   - Verify the `update_item_stock` function exists
   - Check item permissions and constraints

3. **Search Not Finding Items**
   - Ensure items are marked as `is_active = true`
   - Check that the search query matches item data

### Database Maintenance

- Regularly backup your items data
- Monitor database performance with large item catalogs
- Consider archiving old/inactive items

## Support

For technical support or questions about the Items Master system:
- Check the application logs for error messages
- Verify database permissions and RLS policies
- Ensure all required database functions and triggers are properly installed

## Future Enhancements

Potential improvements for the Items Master system:
- Bulk import/export functionality
- Advanced reporting and analytics
- Integration with external inventory systems
- Mobile app support for stock counts
- Barcode scanning capabilities
- Multi-warehouse support
- Serial number tracking
- Lot/batch tracking
- Expiry date management



