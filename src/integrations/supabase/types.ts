export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      billing_runs: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          period_end: string
          period_start: string
          run_date: string | null
          status: string | null
          total_expected_revenue: number | null
          total_missing_revenue: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          period_end: string
          period_start: string
          run_date?: string | null
          status?: string | null
          total_expected_revenue?: number | null
          total_missing_revenue?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          run_date?: string | null
          status?: string | null
          total_expected_revenue?: number | null
          total_missing_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calculated_charges: {
        Row: {
          billed_charge: number | null
          billing_run_id: string | null
          charge_type: string | null
          client_id: string
          created_at: string | null
          description: string | null
          expected_charge: number | null
          id: string
          organization_id: string
          quantity: number | null
          reference_id: string | null
          unit_rate: number | null
        }
        Insert: {
          billed_charge?: number | null
          billing_run_id?: string | null
          charge_type?: string | null
          client_id: string
          created_at?: string | null
          description?: string | null
          expected_charge?: number | null
          id?: string
          organization_id: string
          quantity?: number | null
          reference_id?: string | null
          unit_rate?: number | null
        }
        Update: {
          billed_charge?: number | null
          billing_run_id?: string | null
          charge_type?: string | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          expected_charge?: number | null
          id?: string
          organization_id?: string
          quantity?: number | null
          reference_id?: string | null
          unit_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calculated_charges_billing_run_id_fkey"
            columns: ["billing_run_id"]
            isOneToOne: false
            referencedRelation: "billing_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculated_charges_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculated_charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_health_scores: {
        Row: {
          alert_count: number | null
          billing_run_id: string | null
          client_id: string | null
          id: string
          leak_risk_score: number | null
          organization_id: string | null
          total_expected: number | null
          total_recovered: number | null
          updated_at: string | null
        }
        Insert: {
          alert_count?: number | null
          billing_run_id?: string | null
          client_id?: string | null
          id?: string
          leak_risk_score?: number | null
          organization_id?: string | null
          total_expected?: number | null
          total_recovered?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_count?: number | null
          billing_run_id?: string | null
          client_id?: string | null
          id?: string
          leak_risk_score?: number | null
          organization_id?: string | null
          total_expected?: number | null
          total_recovered?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_health_scores_billing_run_id_fkey"
            columns: ["billing_run_id"]
            isOneToOne: false
            referencedRelation: "billing_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_links: {
        Row: {
          client_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          organization_id: string | null
          token: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          token?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_rate_tables: {
        Row: {
          client_id: string
          created_at: string | null
          effective_from: string
          effective_to: string | null
          id: string
          kitting_fee: number | null
          minimum_applies_to: string | null
          monthly_minimum_fee: number | null
          organization_id: string
          pack_fee_per_order: number | null
          pick_fee_per_unit: number | null
          receiving_rate_per_pallet: number | null
          receiving_rate_per_unit: number | null
          returns_processing_fee_per_unit: number | null
          returns_restocking_fee_pct: number | null
          special_handling_fee: number | null
          storage_rate_per_pallet_per_day: number | null
          storage_rate_per_sku_per_day: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          kitting_fee?: number | null
          minimum_applies_to?: string | null
          monthly_minimum_fee?: number | null
          organization_id: string
          pack_fee_per_order?: number | null
          pick_fee_per_unit?: number | null
          receiving_rate_per_pallet?: number | null
          receiving_rate_per_unit?: number | null
          returns_processing_fee_per_unit?: number | null
          returns_restocking_fee_pct?: number | null
          special_handling_fee?: number | null
          storage_rate_per_pallet_per_day?: number | null
          storage_rate_per_sku_per_day?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          kitting_fee?: number | null
          minimum_applies_to?: string | null
          monthly_minimum_fee?: number | null
          organization_id?: string
          pack_fee_per_order?: number | null
          pick_fee_per_unit?: number | null
          receiving_rate_per_pallet?: number | null
          receiving_rate_per_unit?: number | null
          returns_processing_fee_per_unit?: number | null
          returns_restocking_fee_pct?: number | null
          special_handling_fee?: number | null
          storage_rate_per_pallet_per_day?: number | null
          storage_rate_per_sku_per_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_rate_tables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_rate_tables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          organization_id: string
          pallet_count: number | null
          quantity: number | null
          sku: string | null
          source_file_id: string | null
          storage_end_date: string | null
          storage_start_date: string | null
          warehouse_location: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          pallet_count?: number | null
          quantity?: number | null
          sku?: string | null
          source_file_id?: string | null
          storage_end_date?: string | null
          storage_start_date?: string | null
          warehouse_location?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          pallet_count?: number | null
          quantity?: number | null
          sku?: string | null
          source_file_id?: string | null
          storage_end_date?: string | null
          storage_start_date?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          charge_type: string | null
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string | null
          line_total: number | null
          organization_id: string
          quantity: number | null
          unit_rate: number | null
        }
        Insert: {
          charge_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          line_total?: number | null
          organization_id: string
          quantity?: number | null
          unit_rate?: number | null
        }
        Update: {
          charge_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          line_total?: number | null
          organization_id?: string
          quantity?: number | null
          unit_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          billing_run_id: string | null
          client_id: string
          created_at: string | null
          id: string
          invoice_number: string
          organization_id: string
          pdf_storage_path: string | null
          period_end: string | null
          period_start: string | null
          qb_invoice_id: string | null
          qb_invoice_number: string | null
          qb_sync_status: string | null
          qb_synced_at: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
        }
        Insert: {
          billing_run_id?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          invoice_number: string
          organization_id: string
          pdf_storage_path?: string | null
          period_end?: string | null
          period_start?: string | null
          qb_invoice_id?: string | null
          qb_invoice_number?: string | null
          qb_sync_status?: string | null
          qb_synced_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
        }
        Update: {
          billing_run_id?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          invoice_number?: string
          organization_id?: string
          pdf_storage_path?: string | null
          period_end?: string | null
          period_start?: string | null
          qb_invoice_id?: string | null
          qb_invoice_number?: string | null
          qb_sync_status?: string | null
          qb_synced_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_billing_run_id_fkey"
            columns: ["billing_run_id"]
            isOneToOne: false
            referencedRelation: "billing_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          email_invoice_ready: boolean | null
          email_reports_enabled: boolean | null
          email_revenue_alerts: boolean | null
          sms_enabled: boolean | null
          sms_phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          email_invoice_ready?: boolean | null
          email_reports_enabled?: boolean | null
          email_revenue_alerts?: boolean | null
          sms_enabled?: boolean | null
          sms_phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          email_invoice_ready?: boolean | null
          email_reports_enabled?: boolean | null
          email_revenue_alerts?: boolean | null
          sms_enabled?: boolean | null
          sms_phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_activities: {
        Row: {
          client_id: string
          created_at: string | null
          handling_type: string | null
          id: string
          is_return: boolean | null
          order_date: string | null
          order_id: string | null
          organization_id: string
          quantity: number | null
          return_disposition: string | null
          return_reason: string | null
          sku: string | null
          source_file_id: string | null
          units_processed: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          handling_type?: string | null
          id?: string
          is_return?: boolean | null
          order_date?: string | null
          order_id?: string | null
          organization_id: string
          quantity?: number | null
          return_disposition?: string | null
          return_reason?: string | null
          sku?: string | null
          source_file_id?: string | null
          units_processed?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          handling_type?: string | null
          id?: string
          is_return?: boolean | null
          order_date?: string | null
          order_id?: string | null
          organization_id?: string
          quantity?: number | null
          return_disposition?: string | null
          return_reason?: string | null
          sku?: string | null
          source_file_id?: string | null
          units_processed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activities_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          default_billing_contact_email: string | null
          default_currency: string | null
          invoice_footer_note: string | null
          invoice_prefix: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          default_billing_contact_email?: string | null
          default_currency?: string | null
          invoice_footer_note?: string | null
          invoice_prefix?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          default_billing_contact_email?: string | null
          default_currency?: string | null
          invoice_footer_note?: string | null
          invoice_prefix?: string | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          state: string | null
          stripe_customer_id: string | null
          subscription_current_period_end: string | null
          subscription_status: string | null
          timezone: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          state?: string | null
          stripe_customer_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          state?: string | null
          stripe_customer_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      quickbooks_connections: {
        Row: {
          access_token: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          organization_id: string
          refresh_token: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
          refresh_token?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          refresh_token?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_customer_map: {
        Row: {
          client_id: string
          id: string
          mapped_at: string | null
          organization_id: string
          qb_customer_id: string
          qb_customer_name: string | null
        }
        Insert: {
          client_id: string
          id?: string
          mapped_at?: string | null
          organization_id: string
          qb_customer_id: string
          qb_customer_name?: string | null
        }
        Update: {
          client_id?: string
          id?: string
          mapped_at?: string | null
          organization_id?: string
          qb_customer_id?: string
          qb_customer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_customer_map_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_customer_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_logs: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          organization_id: string
          pallet_count: number | null
          receiving_date: string | null
          receiving_type: string | null
          source_file_id: string | null
          units_received: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          pallet_count?: number | null
          receiving_date?: string | null
          receiving_type?: string | null
          source_file_id?: string | null
          units_received?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          pallet_count?: number | null
          receiving_date?: string | null
          receiving_type?: string | null
          source_file_id?: string | null
          units_received?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_logs_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_alerts: {
        Row: {
          alert_type: string
          billing_run_id: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_resolved: boolean | null
          leak_amount: number | null
          organization_id: string | null
          resolved_at: string | null
        }
        Insert: {
          alert_type: string
          billing_run_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          leak_amount?: number | null
          organization_id?: string | null
          resolved_at?: string | null
        }
        Update: {
          alert_type?: string
          billing_run_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          leak_amount?: number | null
          organization_id?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_alerts_billing_run_id_fkey"
            columns: ["billing_run_id"]
            isOneToOne: false
            referencedRelation: "billing_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      source_files: {
        Row: {
          client_id: string | null
          column_mapping: Json | null
          created_at: string | null
          error_message: string | null
          file_type: string | null
          id: string
          organization_id: string
          original_filename: string | null
          status: string | null
          storage_path: string | null
        }
        Insert: {
          client_id?: string | null
          column_mapping?: Json | null
          created_at?: string | null
          error_message?: string | null
          file_type?: string | null
          id?: string
          organization_id: string
          original_filename?: string | null
          status?: string | null
          storage_path?: string | null
        }
        Update: {
          client_id?: string | null
          column_mapping?: Json | null
          created_at?: string | null
          error_message?: string | null
          file_type?: string | null
          id?: string
          organization_id?: string
          original_filename?: string | null
          status?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          has_completed_onboarding: boolean | null
          id: string
          onboarding_progress: Json | null
          organization_id: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          has_completed_onboarding?: boolean | null
          id: string
          onboarding_progress?: Json | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          has_completed_onboarding?: boolean | null
          id?: string
          onboarding_progress?: Json | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
