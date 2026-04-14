export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          access_time: string | null
          client_id: number | null
          id: number
          location_id: number | null
          status: string | null
        }
        Insert: {
          access_time?: string | null
          client_id?: number | null
          id?: never
          location_id?: number | null
          status?: string | null
        }
        Update: {
          access_time?: string | null
          client_id?: number | null
          id?: never
          location_id?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: number | null
          createdat: string | null
          date_of_birth: string | null
          email: string | null
          gender: string | null
          id: number
          image_url: string | null
          last_name: string | null
          name: string | null
          phone_number: string | null
          updatedat: string | null
        }
        Insert: {
          company_id?: number | null
          createdat?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: never
          image_url?: string | null
          last_name?: string | null
          name?: string | null
          phone_number?: string | null
          updatedat?: string | null
        }
        Update: {
          company_id?: number | null
          createdat?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: never
          image_url?: string | null
          last_name?: string | null
          name?: string | null
          phone_number?: string | null
          updatedat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          client_range: string | null
          club_type: string | null
          country: string | null
          id: number
          name: string | null
          owner: string | null
        }
        Insert: {
          client_range?: string | null
          club_type?: string | null
          country?: string | null
          id?: never
          name?: string | null
          owner?: string | null
        }
        Update: {
          client_range?: string | null
          club_type?: string | null
          country?: string | null
          id?: never
          name?: string | null
          owner?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          company_id: number | null
          id: number
          name: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: number | null
          id?: never
          name: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: number | null
          id?: never
          name?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          id: number
          location_id: number
          payment_date: string | null
          payment_method: string | null
          subscription_id: number | null
        }
        Insert: {
          amount?: number | null
          id?: never
          location_id: number
          payment_date?: string | null
          payment_method?: string | null
          subscription_id?: number | null
        }
        Update: {
          amount?: number | null
          id?: never
          location_id?: number
          payment_date?: string | null
          payment_method?: string | null
          subscription_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          access_end_time: string | null
          access_level: string | null
          access_start_time: string | null
          company_id: number | null
          description: string | null
          duration: unknown | null
          id: number
          name: string | null
          price: number | null
        }
        Insert: {
          access_end_time?: string | null
          access_level?: string | null
          access_start_time?: string | null
          company_id?: number | null
          description?: string | null
          duration?: unknown | null
          id?: never
          name?: string | null
          price?: number | null
        }
        Update: {
          access_end_time?: string | null
          access_level?: string | null
          access_start_time?: string | null
          company_id?: number | null
          description?: string | null
          duration?: unknown | null
          id?: never
          name?: string | null
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: number | null
          comments: string | null
          id: number
          location_id: number | null
          rating: number | null
        }
        Insert: {
          client_id?: number | null
          comments?: string | null
          id?: never
          location_id?: number | null
          rating?: number | null
        }
        Update: {
          client_id?: number | null
          comments?: string | null
          id?: never
          location_id?: number | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          client_id: number | null
          end_date: string | null
          id: number
          location_id: number | null
          plan_id: number | null
          start_date: string | null
        }
        Insert: {
          client_id?: number | null
          end_date?: string | null
          id?: never
          location_id?: number | null
          plan_id?: number | null
          start_date?: string | null
        }
        Update: {
          client_id?: number | null
          end_date?: string | null
          id?: never
          location_id?: number | null
          plan_id?: number | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_membership_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access: {
        Row: {
          company_id: number | null
          id: number
          location_id: number | null
          role: string
          user_id: string | null
        }
        Insert: {
          company_id?: number | null
          id?: never
          location_id?: number | null
          role: string
          user_id?: string | null
        }
        Update: {
          company_id?: number | null
          id?: never
          location_id?: number | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
