import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kkrgyvbbqbnwbvujfgps.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (you can generate these from your Supabase dashboard)
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          logo?: string
          description?: string
          industry?: string
          company_size?: string
          email?: string
          phone?: string
          address?: string
          city?: string
          state?: string
          zip?: string
          country?: string
          currency?: string
          fiscal_year_start?: string
          tax_id?: string
          multi_currency?: boolean
          inventory_tracking?: boolean
          auto_backup?: boolean
          timezone?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo?: string
          description?: string
          industry?: string
          company_size?: string
          email?: string
          phone?: string
          address?: string
          city?: string
          state?: string
          zip?: string
          country?: string
          currency?: string
          fiscal_year_start?: string
          tax_id?: string
          multi_currency?: boolean
          inventory_tracking?: boolean
          auto_backup?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo?: string
          description?: string
          industry?: string
          company_size?: string
          email?: string
          phone?: string
          address?: string
          city?: string
          state?: string
          zip?: string
          country?: string
          currency?: string
          fiscal_year_start?: string
          tax_id?: string
          multi_currency?: boolean
          inventory_tracking?: boolean
          auto_backup?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          supplier_code: string
          name: string
          email: string
          phone: string
          contact_person: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          tax_id: string | null
          credit_limit: number | null
          payment_terms: string | null
          notes: string | null
          website: string | null
          industry: string | null
          supplier_type: string
          default_currency: string
          discount_percentage: number | null
          company_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_code: string
          name: string
          email: string
          phone: string
          contact_person?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          credit_limit?: number | null
          payment_terms?: string | null
          notes?: string | null
          website?: string | null
          industry?: string | null
          supplier_type?: string
          default_currency?: string
          discount_percentage?: number | null
          company_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_code?: string
          name?: string
          email?: string
          phone?: string
          contact_person?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          credit_limit?: number | null
          payment_terms?: string | null
          notes?: string | null
          website?: string | null
          industry?: string | null
          supplier_type?: string
          default_currency?: string
          discount_percentage?: number | null
          company_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          customer_code: string
          name: string
          email: string
          phone: string
          contact_person: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          tax_id: string | null
          credit_limit: number | null
          payment_terms: string | null
          is_active: boolean
          notes: string | null
          website: string | null
          industry: string | null
          customer_type: string
          default_currency: string
          discount_percentage: number | null
          company_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_code?: string
          name: string
          email: string
          phone: string
          contact_person?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          credit_limit?: number | null
          payment_terms?: string | null
          is_active?: boolean
          notes?: string | null
          website?: string | null
          industry?: string | null
          customer_type?: string
          default_currency?: string
          discount_percentage?: number | null
          company_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_code?: string
          name?: string
          email?: string
          phone?: string
          contact_person?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          credit_limit?: number | null
          payment_terms?: string | null
          is_active?: boolean
          notes?: string | null
          website?: string | null
          industry?: string | null
          customer_type?: string
          default_currency?: string
          discount_percentage?: number | null
          company_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          supplier_code: string
          name: string
          email: string
          phone: string
          contact_person: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          tax_id: string | null
          credit_limit: number | null
          payment_terms: string | null
          is_active: boolean
          notes: string | null
          website: string | null
          industry: string | null
          supplier_type: string
          default_currency: string
          discount_percentage: number | null
          company_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_code?: string
          name: string
          email: string
          phone: string
          contact_person?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          credit_limit?: number | null
          payment_terms?: string | null
          is_active?: boolean
          notes?: string | null
          website?: string | null
          industry?: string | null
          supplier_type?: string
          default_currency?: string
          discount_percentage?: number | null
          company_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_code?: string
          name?: string
          email?: string
          phone?: string
          contact_person?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          tax_id?: string | null
          credit_limit?: number | null
          payment_terms?: string | null
          is_active?: boolean
          notes?: string | null
          website?: string | null
          industry?: string | null
          supplier_type?: string
          default_currency?: string
          discount_percentage?: number | null
          company_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      items: {
        Row: {
          id: string
          item_code: string
          name: string
          description: string | null
          category: string | null
          subcategory: string | null
          unit_of_measure: string
          unit_price: number
          cost_price: number | null
          selling_price: number | null
          tax_rate: number | null
          min_stock_level: number | null
          max_stock_level: number | null
          current_stock: number | null
          reorder_point: number | null
          supplier_id: string | null
          company_id: string
          is_active: boolean
          is_taxable: boolean
          is_inventory_item: boolean
          barcode: string | null
          sku: string | null
          weight: number | null
          dimensions: string | null
          image_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_code: string
          name: string
          description?: string | null
          category?: string | null
          subcategory?: string | null
          unit_of_measure?: string
          unit_price: number
          cost_price?: number | null
          selling_price?: number | null
          tax_rate?: number | null
          min_stock_level?: number | null
          max_stock_level?: number | null
          current_stock?: number | null
          reorder_point?: number | null
          supplier_id?: string | null
          company_id: string
          is_active?: boolean
          is_taxable?: boolean
          is_inventory_item?: boolean
          barcode?: string | null
          sku?: string | null
          weight?: number | null
          dimensions?: string | null
          image_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_code?: string
          name?: string
          description?: string | null
          category?: string | null
          subcategory?: string | null
          unit_of_measure?: string
          unit_price?: number
          cost_price?: number | null
          selling_price?: number | null
          tax_rate?: number | null
          min_stock_level?: number | null
          max_stock_level?: number | null
          current_stock?: number | null
          reorder_point?: number | null
          supplier_id?: string | null
          company_id?: string
          is_active?: boolean
          is_taxable?: boolean
          is_inventory_item?: boolean
          barcode?: string | null
          sku?: string | null
          weight?: number | null
          dimensions?: string | null
          image_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      item_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_category_id: string | null
          company_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_category_id?: string | null
          company_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_category_id?: string | null
          company_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      item_units_of_measure: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          company_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          company_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          company_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      purchase_invoices: {
        Row: {
          id: string
          invoice_number: string
          supplier_id: string
          company_id: string
          invoice_date: string
          due_date: string
          status: string
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          currency: string
          payment_terms: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number?: string
          supplier_id: string
          company_id?: string
          invoice_date: string
          due_date: string
          status?: string
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          currency?: string
          payment_terms?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          supplier_id?: string
          company_id?: string
          invoice_date?: string
          due_date?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          currency?: string
          payment_terms?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      purchase_invoice_line_items: {
        Row: {
          id: string
          purchase_invoice_id: string
          item_name: string
          description: string | null
          quantity: number
          uom: string
          unit_price: number
          tax_rate: number | null
          discount_rate: number | null
          discount_amount: number | null
          line_total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_invoice_id: string
          item_name: string
          description?: string | null
          quantity: number
          uom: string
          unit_price: number
          tax_rate?: number | null
          discount_rate?: number | null
          discount_amount?: number | null
          line_total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          purchase_invoice_id?: string
          item_name?: string
          description?: string | null
          quantity?: number
          uom?: string
          unit_price?: number
          tax_rate?: number | null
          discount_rate?: number | null
          discount_amount?: number | null
          line_total?: number
          created_at?: string
          updated_at?: string
        }
      }
      sales_invoices: {
        Row: {
          id: string
          invoice_number: string
          customer_id: string
          company_id: string
          invoice_date: string
          due_date: string
          status: string
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          currency: string
          payment_terms: string | null
          notes: string | null
          terms_and_conditions: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number?: string
          customer_id: string
          company_id?: string
          invoice_date: string
          due_date: string
          status?: string
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          currency?: string
          payment_terms?: string | null
          notes?: string | null
          terms_and_conditions?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          customer_id?: string
          company_id?: string
          invoice_date?: string
          due_date?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          currency?: string
          payment_terms?: string | null
          notes?: string | null
          terms_and_conditions?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          item_id: string | null
          item_name: string
          description: string | null
          quantity: number
          uom: string
          unit_price: number
          tax_rate: number
          tax_amount: number
          discount_rate: number
          discount_amount: number
          line_total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          item_id?: string | null
          item_name: string
          description?: string | null
          quantity?: number
          uom: string
          unit_price: number
          tax_rate?: number
          tax_amount?: number
          discount_rate?: number
          discount_amount?: number
          line_total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          item_id?: string | null
          item_name?: string
          description?: string | null
          quantity?: number
          uom?: string
          unit_price?: number
          tax_rate?: number
          tax_amount?: number
          discount_rate?: number
          discount_amount?: number
          line_total?: number
          created_at?: string
          updated_at?: string
        }
      }
              chart_of_accounts: {
          Row: {
            id: string
            account_code: string
            account_name: string
            account_type: string
            parent_account_id: string | null
            company_id: string
            is_active: boolean
            normal_balance: string
            description: string | null
            is_group: boolean
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            account_code: string
            account_name: string
            account_type: string
            parent_account_id?: string | null
            company_id: string
            is_active?: boolean
            normal_balance: string
            description?: string | null
            is_group?: boolean
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            account_code?: string
            account_name?: string
            account_type?: string
            parent_account_id?: string | null
            company_id?: string
            is_active?: boolean
            normal_balance?: string
            description?: string | null
            is_group?: boolean
            created_at?: string
            updated_at?: string
          }
        }
      journal_entries: {
        Row: {
          id: string
          journal_number: string
          entry_date?: string
          description: string
          company_id: string
          is_active?: boolean
          reference_type?: string | null
          reference_id?: string | null
          reference_number?: string | null
          status?: string | null
          notes?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          journal_number: string
          entry_date?: string
          description: string
          company_id: string
          is_active?: boolean
          reference_type?: string | null
          reference_id?: string | null
          reference_number?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          journal_number?: string
          entry_date?: string
          description?: string
          company_id?: string
          is_active?: boolean
          reference_type?: string | null
          reference_id?: string | null
          reference_number?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      journal_entry_lines: {
        Row: {
          id: string
          journal_entry_id: string
          account_id: string
          debit_amount: number
          credit_amount: number
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          journal_entry_id: string
          account_id: string
          debit_amount: number
          credit_amount: number
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          journal_entry_id?: string
          account_id?: string
          debit_amount?: number
          credit_amount?: number
          description?: string
          created_at?: string
        }
      }
      stock_items: {
        Row: {
          id: string
          item_id: string
          company_id: string
          warehouse_id?: string | null
          quantity_on_hand: number
          reserved_quantity: number
          available_quantity: number
          average_cost: number
          last_cost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          company_id: string
          warehouse_id?: string | null
          quantity_on_hand: number
          reserved_quantity?: number
          available_quantity: number
          average_cost: number
          last_cost: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          company_id?: string
          warehouse_id?: string | null
          quantity_on_hand?: number
          reserved_quantity?: number
          available_quantity?: number
          average_cost?: number
          last_cost?: number
          created_at?: string
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          item_id: string
          company_id: string
          movement_type: string
          quantity: number
          unit_cost: number
          total_cost: number
          reference_type: string
          reference_id: string
          reference_number: string
          movement_date: string
          notes?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          company_id: string
          movement_type: string
          quantity: number
          unit_cost: number
          total_cost: number
          reference_type: string
          reference_id: string
          reference_number: string
          movement_date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          company_id?: string
          movement_type?: string
          quantity?: number
          unit_cost?: number
          total_cost?: number
          reference_type?: string
          reference_id?: string
          reference_number?: string
          movement_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      account_mappings: {
        Row: {
          id: string
          company_id: string
          transaction_type: string
          account_type: string
          account_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          transaction_type: string
          account_type: string
          account_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          transaction_type?: string
          account_type?: string
          account_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
