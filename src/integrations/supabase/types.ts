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
      announcements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          message: string
          sent_to_email: boolean | null
          target_audience: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          sent_to_email?: boolean | null
          target_audience?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          sent_to_email?: boolean | null
          target_audience?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_main: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          service_area_polygon: Json | null
          service_radius_km: number | null
          starting_points: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          service_area_polygon?: Json | null
          service_radius_km?: number | null
          starting_points?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          service_area_polygon?: Json | null
          service_radius_km?: number | null
          starting_points?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      brand_subcategories: {
        Row: {
          brand_name: string
          brand_slug: string
          category_id: string
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          parent_subcategory: string
          updated_at: string | null
        }
        Insert: {
          brand_name: string
          brand_slug: string
          category_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          parent_subcategory: string
          updated_at?: string | null
        }
        Update: {
          brand_name?: string
          brand_slug?: string
          category_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          parent_subcategory?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_deals: {
        Row: {
          bundle_type: string
          buy_quantity: number | null
          category_filter: string | null
          created_at: string | null
          description: string | null
          discount_percent: number | null
          ends_at: string | null
          get_quantity: number | null
          id: string
          is_active: boolean | null
          name: string
          product_ids: string[] | null
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          bundle_type?: string
          buy_quantity?: number | null
          category_filter?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          product_ids?: string[] | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          bundle_type?: string
          buy_quantity?: number | null
          category_filter?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_ids?: string[] | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          subcategories: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          subcategories?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          subcategories?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          sender_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          sender_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          sender_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_wallets: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          total_earned: number
          total_spent: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      founder_protection: {
        Row: {
          id: string
          protected_at: string
          user_id: string
        }
        Insert: {
          id?: string
          protected_at?: string
          user_id: string
        }
        Update: {
          id?: string
          protected_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guest_order_lookups: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          order_id: string
          success: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          order_id: string
          success?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          order_id?: string
          success?: boolean | null
        }
        Relationships: []
      }
      mpesa_transactions: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          order_id: string | null
          phone_number: string
          result_code: number | null
          result_desc: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id?: string | null
          phone_number: string
          result_code?: number | null
          result_desc?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          order_id?: string | null
          phone_number?: string
          result_code?: number | null
          result_desc?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cashier_id: string | null
          change_given: number | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_fee: number | null
          delivery_type: string
          discount_amount: number | null
          discount_type: string | null
          id: string
          items: Json
          mpesa_code: string | null
          order_status: string
          order_token: string | null
          order_token_expires_at: string | null
          payment_method: string | null
          payment_status: string
          pickup_date: string | null
          pickup_time: string | null
          receipt_number: string | null
          reward_type: string | null
          sales_channel: string | null
          status_history: Json | null
          subtotal: number
          tax_amount: number | null
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cashier_id?: string | null
          change_given?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_type: string
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          items: Json
          mpesa_code?: string | null
          order_status?: string
          order_token?: string | null
          order_token_expires_at?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_date?: string | null
          pickup_time?: string | null
          receipt_number?: string | null
          reward_type?: string | null
          sales_channel?: string | null
          status_history?: Json | null
          subtotal: number
          tax_amount?: number | null
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cashier_id?: string | null
          change_given?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_type?: string
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          items?: Json
          mpesa_code?: string | null
          order_status?: string
          order_token?: string | null
          order_token_expires_at?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_date?: string | null
          pickup_time?: string | null
          receipt_number?: string | null
          reward_type?: string | null
          sales_channel?: string | null
          status_history?: Json | null
          subtotal?: number
          tax_amount?: number | null
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          id: string
          page_path: string
          referrer: string | null
          user_agent: string | null
          visited_at: string
          visitor_id: string | null
        }
        Insert: {
          id?: string
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_id?: string | null
        }
        Update: {
          id?: string
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          is_approved: boolean | null
          product_id: string
          rating: number
          review_images: string[] | null
          review_text: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          is_approved?: boolean | null
          product_id: string
          rating: number
          review_images?: string[] | null
          review_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          review_images?: string[] | null
          review_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          additional_images: string[] | null
          barcode: string | null
          category: string
          cost_price: number | null
          created_at: string
          description: string | null
          display_section: string | null
          expiry_date: string | null
          id: string
          image_url: string | null
          in_stock: boolean | null
          name: string
          retail_price: number
          sale_ends_at: string | null
          sale_label: string | null
          sale_price: number | null
          search_tags: string | null
          stock_quantity: number | null
          subcategory: string | null
          updated_at: string
          variations: Json | null
          wholesale_min_qty: number | null
          wholesale_price: number | null
        }
        Insert: {
          additional_images?: string[] | null
          barcode?: string | null
          category: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          display_section?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          name: string
          retail_price: number
          sale_ends_at?: string | null
          sale_label?: string | null
          sale_price?: number | null
          search_tags?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          updated_at?: string
          variations?: Json | null
          wholesale_min_qty?: number | null
          wholesale_price?: number | null
        }
        Update: {
          additional_images?: string[] | null
          barcode?: string | null
          category?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          display_section?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          name?: string
          retail_price?: number
          sale_ends_at?: string | null
          sale_label?: string | null
          sale_price?: number | null
          search_tags?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          updated_at?: string
          variations?: Json | null
          wholesale_min_qty?: number | null
          wholesale_price?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          last_viewed_products: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          last_viewed_products?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          last_viewed_products?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string
          target_user_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity?: string
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      site_controls: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      site_terms: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          version?: string
        }
        Relationships: []
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
      vouchers: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          received_by: string | null
          source_name: string
          voucher_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          received_by?: string | null
          source_name: string
          voucher_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          received_by?: string | null
          source_name?: string
          voucher_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_products: {
        Row: {
          additional_images: string[] | null
          barcode: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          display_section: string | null
          expiry_date: string | null
          id: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          retail_price: number | null
          stock_quantity: number | null
          subcategory: string | null
          updated_at: string | null
          variations: Json | null
          wholesale_min_qty: number | null
          wholesale_price: number | null
        }
        Insert: {
          additional_images?: string[] | null
          barcode?: string | null
          category?: string | null
          cost_price?: never
          created_at?: string | null
          description?: string | null
          display_section?: string | null
          expiry_date?: string | null
          id?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          retail_price?: number | null
          stock_quantity?: number | null
          subcategory?: string | null
          updated_at?: string | null
          variations?: Json | null
          wholesale_min_qty?: number | null
          wholesale_price?: number | null
        }
        Update: {
          additional_images?: string[] | null
          barcode?: string | null
          category?: string | null
          cost_price?: never
          created_at?: string | null
          description?: string | null
          display_section?: string | null
          expiry_date?: string | null
          id?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          retail_price?: number | null
          stock_quantity?: number | null
          subcategory?: string | null
          updated_at?: string | null
          variations?: Json | null
          wholesale_min_qty?: number | null
          wholesale_price?: number | null
        }
        Relationships: []
      }
      public_products: {
        Row: {
          additional_images: string[] | null
          barcode: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_section: string | null
          expiry_date: string | null
          id: string | null
          image_url: string | null
          in_stock: boolean | null
          name: string | null
          retail_price: number | null
          sale_ends_at: string | null
          sale_label: string | null
          sale_price: number | null
          search_tags: string | null
          stock_quantity: number | null
          subcategory: string | null
          updated_at: string | null
          variations: Json | null
          wholesale_min_qty: number | null
          wholesale_price: number | null
        }
        Insert: {
          additional_images?: string[] | null
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_section?: string | null
          expiry_date?: string | null
          id?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          retail_price?: number | null
          sale_ends_at?: string | null
          sale_label?: string | null
          sale_price?: number | null
          search_tags?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          updated_at?: string | null
          variations?: Json | null
          wholesale_min_qty?: number | null
          wholesale_price?: number | null
        }
        Update: {
          additional_images?: string[] | null
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_section?: string | null
          expiry_date?: string | null
          id?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          name?: string | null
          retail_price?: number | null
          sale_ends_at?: string | null
          sale_label?: string | null
          sale_price?: number | null
          search_tags?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          updated_at?: string | null
          variations?: Json | null
          wholesale_min_qty?: number | null
          wholesale_price?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_guest_order_rate_limit: {
        Args: {
          _ip_address: string
          _max_attempts: number
          _order_id: string
          _window_minutes: number
        }
        Returns: boolean
      }
      cleanup_old_guest_order_lookups: { Args: never; Returns: number }
      get_guest_order: {
        Args: { _order_id: string; _order_token: string }
        Returns: Database["public"]["CompositeTypes"]["guest_order_info"][]
        SetofOptions: {
          from: "*"
          to: "guest_order_info"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          _details?: Json
          _event_type: string
          _ip_address?: string
          _severity?: string
          _target_user_id?: string
          _user_agent?: string
          _user_id?: string
        }
        Returns: undefined
      }
      mark_guest_order_lookup_success: {
        Args: { _ip_address: string; _order_id: string }
        Returns: undefined
      }
      reduce_stock: {
        Args: { product_id: string; quantity_sold: number }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "customer" | "super_admin"
    }
    CompositeTypes: {
      guest_order_info: {
        id: string | null
        order_status: string | null
        delivery_type: string | null
        delivery_address: string | null
        pickup_date: string | null
        pickup_time: string | null
        items: Json | null
        subtotal: number | null
        delivery_fee: number | null
        total: number | null
        created_at: string | null
      }
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
      app_role: ["admin", "customer", "super_admin"],
    },
  },
} as const
