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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addon_plans: {
        Row: {
          base_price: number
          created_at: string
          effective_from: string
          id: string
          is_active: boolean
          name: string
          price: number
          service_id: string
          surplus_charge: number
          tax: number
          updated_at: string
          vat: number
        }
        Insert: {
          base_price?: number
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          service_id: string
          surplus_charge?: number
          tax?: number
          updated_at?: string
          vat?: number
        }
        Update: {
          base_price?: number
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          service_id?: string
          surplus_charge?: number
          tax?: number
          updated_at?: string
          vat?: number
        }
        Relationships: []
      }
      addons: {
        Row: {
          base_price: number
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          surplus_charge: number | null
          tax: number | null
          vat: number | null
        }
        Insert: {
          base_price: number
          effective_from?: string | null
          effective_to?: string | null
          id: string
          is_active?: boolean | null
          name: string
          price?: number | null
          surplus_charge?: number | null
          tax?: number | null
          vat?: number | null
        }
        Update: {
          base_price?: number
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          surplus_charge?: number | null
          tax?: number | null
          vat?: number | null
        }
        Relationships: []
      }
      areas: {
        Row: {
          created_at: string | null
          district_id: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          district_id: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          district_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_history: {
        Row: {
          billing_period: string
          connection_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          services_snapshot: string[]
          status: string | null
          total_billed: number
        }
        Insert: {
          billing_period: string
          connection_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          services_snapshot?: string[]
          status?: string | null
          total_billed: number
        }
        Update: {
          billing_period?: string
          connection_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          services_snapshot?: string[]
          status?: string | null
          total_billed?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "customer_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      broadband_plans: {
        Row: {
          base_price: number
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          isp_id: string | null
          name: string
          price: number | null
          speed: string
          surplus_charge: number | null
          tax: number | null
          tier: string
          vat: number | null
        }
        Insert: {
          base_price: number
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          isp_id?: string | null
          name: string
          price?: number | null
          speed: string
          surplus_charge?: number | null
          tax?: number | null
          tier: string
          vat?: number | null
        }
        Update: {
          base_price?: number
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          isp_id?: string | null
          name?: string
          price?: number | null
          speed?: string
          surplus_charge?: number | null
          tax?: number | null
          tier?: string
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "broadband_plans_isp_id_fkey"
            columns: ["isp_id"]
            isOneToOne: false
            referencedRelation: "isps"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_connections: {
        Row: {
          account_status: string
          active_addon_plans: Json
          active_services: string[]
          address: string | null
          area_id: string | null
          balance: number
          broadband_plan_id: string | null
          connection_label: string
          created_at: string
          customer_id: string
          id: string
          is_primary: boolean
          isp_id: string | null
          scheduled_addon_plans: Json
          scheduled_broadband_plan_id: string | null
          scheduled_services: string[]
          speed: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          active_addon_plans?: Json
          active_services?: string[]
          address?: string | null
          area_id?: string | null
          balance?: number
          broadband_plan_id?: string | null
          connection_label?: string
          created_at?: string
          customer_id: string
          id?: string
          is_primary?: boolean
          isp_id?: string | null
          scheduled_addon_plans?: Json
          scheduled_broadband_plan_id?: string | null
          scheduled_services?: string[]
          speed?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          active_addon_plans?: Json
          active_services?: string[]
          address?: string | null
          area_id?: string | null
          balance?: number
          broadband_plan_id?: string | null
          connection_label?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_primary?: boolean
          isp_id?: string | null
          scheduled_addon_plans?: Json
          scheduled_broadband_plan_id?: string | null
          scheduled_services?: string[]
          speed?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_connections_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_connections_broadband_plan_id_fkey"
            columns: ["broadband_plan_id"]
            isOneToOne: false
            referencedRelation: "broadband_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_connections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_connections_isp_id_fkey"
            columns: ["isp_id"]
            isOneToOne: false
            referencedRelation: "isps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_connections_scheduled_broadband_plan_id_fkey"
            columns: ["scheduled_broadband_plan_id"]
            isOneToOne: false
            referencedRelation: "broadband_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_status: string | null
          active_addon_plans: Json
          active_services: string[] | null
          address: string | null
          area_id: string | null
          auth_user_id: string | null
          balance: number | null
          broadband_plan_id: string | null
          created_at: string
          display_name: string | null
          dob: string | null
          email: string | null
          id: string
          isp_id: string | null
          nid: number | null
          password_hash: string | null
          phone_number: string | null
          scheduled_addon_plans: Json
          scheduled_broadband_plan_id: string | null
          scheduled_services: string[] | null
          speed: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_status?: string | null
          active_addon_plans?: Json
          active_services?: string[] | null
          address?: string | null
          area_id?: string | null
          auth_user_id?: string | null
          balance?: number | null
          broadband_plan_id?: string | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          email?: string | null
          id?: string
          isp_id?: string | null
          nid?: number | null
          password_hash?: string | null
          phone_number?: string | null
          scheduled_addon_plans?: Json
          scheduled_broadband_plan_id?: string | null
          scheduled_services?: string[] | null
          speed?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_status?: string | null
          active_addon_plans?: Json
          active_services?: string[] | null
          address?: string | null
          area_id?: string | null
          auth_user_id?: string | null
          balance?: number | null
          broadband_plan_id?: string | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          email?: string | null
          id?: string
          isp_id?: string | null
          nid?: number | null
          password_hash?: string | null
          phone_number?: string | null
          scheduled_addon_plans?: Json
          scheduled_broadband_plan_id?: string | null
          scheduled_services?: string[] | null
          speed?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_broadband_plan_id_fkey"
            columns: ["broadband_plan_id"]
            isOneToOne: false
            referencedRelation: "broadband_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_isp_id_fkey"
            columns: ["isp_id"]
            isOneToOne: false
            referencedRelation: "isps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_scheduled_broadband_plan_id_fkey"
            columns: ["scheduled_broadband_plan_id"]
            isOneToOne: false
            referencedRelation: "broadband_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      default_installation_fees: {
        Row: {
          base_fee: number
          created_at: string | null
          end_date: string | null
          id: string
          start_date: string
          surcharge_amount: number | null
          tax_amount: number | null
          vat_amount: number | null
        }
        Insert: {
          base_fee: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          surcharge_amount?: number | null
          tax_amount?: number | null
          vat_amount?: number | null
        }
        Update: {
          base_fee?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          surcharge_amount?: number | null
          tax_amount?: number | null
          vat_amount?: number | null
        }
        Relationships: []
      }
      default_relocation_fees: {
        Row: {
          base_fee: number
          created_at: string | null
          end_date: string | null
          id: string
          start_date: string
          surcharge_amount: number | null
          tax_amount: number | null
          vat_amount: number | null
        }
        Insert: {
          base_fee: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          surcharge_amount?: number | null
          tax_amount?: number | null
          vat_amount?: number | null
        }
        Update: {
          base_fee?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          surcharge_amount?: number | null
          tax_amount?: number | null
          vat_amount?: number | null
        }
        Relationships: []
      }
      districts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      isp_area_plans: {
        Row: {
          area_id: string
          isp_id: string
          plan_id: string
        }
        Insert: {
          area_id: string
          isp_id: string
          plan_id: string
        }
        Update: {
          area_id?: string
          isp_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "isp_area_plans_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isp_area_plans_isp_id_fkey"
            columns: ["isp_id"]
            isOneToOne: false
            referencedRelation: "isps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isp_area_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "broadband_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      isp_coverage: {
        Row: {
          area_id: string
          isp_id: string
        }
        Insert: {
          area_id: string
          isp_id: string
        }
        Update: {
          area_id?: string
          isp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "isp_coverage_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isp_coverage_isp_id_fkey"
            columns: ["isp_id"]
            isOneToOne: false
            referencedRelation: "isps"
            referencedColumns: ["id"]
          },
        ]
      }
      isp_installation_fees: {
        Row: {
          base_fee: number
          created_at: string | null
          end_date: string | null
          id: string
          isp_id: string
          start_date: string
          surcharge_amount: number | null
          tax_amount: number | null
          vat_amount: number | null
        }
        Insert: {
          base_fee: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          isp_id: string
          start_date?: string
          surcharge_amount?: number | null
          tax_amount?: number | null
          vat_amount?: number | null
        }
        Update: {
          base_fee?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          isp_id?: string
          start_date?: string
          surcharge_amount?: number | null
          tax_amount?: number | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "isp_installation_fees_isp_id_fkey"
            columns: ["isp_id"]
            isOneToOne: false
            referencedRelation: "isps"
            referencedColumns: ["id"]
          },
        ]
      }
      isp_relocation_fees: {
        Row: {
          base_fee: number
          created_at: string | null
          end_date: string | null
          id: string
          isp_id: string
          source_area: string
          start_date: string
          surcharge_amount: number | null
          target_area: string
          tax_amount: number | null
          vat_amount: number | null
        }
        Insert: {
          base_fee: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          isp_id: string
          source_area: string
          start_date?: string
          surcharge_amount?: number | null
          target_area: string
          tax_amount?: number | null
          vat_amount?: number | null
        }
        Update: {
          base_fee?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          isp_id?: string
          source_area?: string
          start_date?: string
          surcharge_amount?: number | null
          target_area?: string
          tax_amount?: number | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "isp_relocation_fees_isp_id_fkey"
            columns: ["isp_id"]
            isOneToOne: false
            referencedRelation: "isps"
            referencedColumns: ["id"]
          },
        ]
      }
      isps: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          tier: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tier?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tier?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          metadata: Json | null
          payment_method: string
          payment_type: string
          status: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method: string
          payment_type: string
          status?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          payment_type?: string
          status?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      relocation_requests: {
        Row: {
          base_fee: number
          created_at: string | null
          customer_id: string | null
          detail_address: string
          id: string
          relocation_date: string
          status: string | null
          surcharge_amount: number | null
          target_area: string
          target_district_id: string
          tax_amount: number | null
          total_fee: number
          transaction_id: string
          vat_amount: number
        }
        Insert: {
          base_fee: number
          created_at?: string | null
          customer_id?: string | null
          detail_address: string
          id?: string
          relocation_date: string
          status?: string | null
          surcharge_amount?: number | null
          target_area: string
          target_district_id: string
          tax_amount?: number | null
          total_fee: number
          transaction_id: string
          vat_amount: number
        }
        Update: {
          base_fee?: number
          created_at?: string | null
          customer_id?: string | null
          detail_address?: string
          id?: string
          relocation_date?: string
          status?: string | null
          surcharge_amount?: number | null
          target_area?: string
          target_district_id?: string
          tax_amount?: number | null
          total_fee?: number
          transaction_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "relocation_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relocation_requests_target_district_id_fkey"
            columns: ["target_district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      termination_requests: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          requested_date: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          requested_date: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          requested_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "termination_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          created_at: string | null
          default_queue: string
          display_label: string
          id: string
          is_active: boolean | null
          name: string
          sla_hours: number | null
        }
        Insert: {
          created_at?: string | null
          default_queue: string
          display_label: string
          id?: string
          is_active?: boolean | null
          name: string
          sla_hours?: number | null
        }
        Update: {
          created_at?: string | null
          default_queue?: string
          display_label?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sla_hours?: number | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message_body: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_body: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_body?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          isp_id: string | null
          priority: string
          queue: string
          sla_deadline: string | null
          source_channel: string
          status: string
          ticket_type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          isp_id?: string | null
          priority: string
          queue: string
          sla_deadline?: string | null
          source_channel?: string
          status?: string
          ticket_type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          isp_id?: string | null
          priority?: string
          queue?: string
          sla_deadline?: string | null
          source_channel?: string
          status?: string
          ticket_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket_type"
            columns: ["ticket_type"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_detailed_installation_fee: {
        Args: { p_isp_id: string }
        Returns: Json
      }
      calculate_detailed_relocation_fee: {
        Args: { p_isp_id: string; p_source_area: string; p_target_area: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_subscriber_id: { Args: never; Returns: string }
      get_customer_billing_history: {
        Args: { _customer_id: string }
        Returns: {
          billing_period: string
          created_at: string
          services_snapshot: string[]
          status: string
          total_billed: number
        }[]
      }
      get_customer_id: { Args: { _user_id: string }; Returns: string }
      get_customer_payment_history: {
        Args: { _customer_id: string }
        Returns: {
          amount: number
          created_at: string
          metadata: Json
          payment_method: string
          payment_type: string
          status: string
          transaction_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      set_customer_password: {
        Args: { _customer_id: string; _new_password: string }
        Returns: undefined
      }
      verify_customer_password: {
        Args: { _customer_id: string; _password: string }
        Returns: boolean
      }
      verify_customer_session: {
        Args: { customer_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer" | "partner"
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
    Enums: {
      app_role: ["admin", "customer", "partner"],
    },
  },
} as const
