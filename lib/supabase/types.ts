export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_config: {
        Row: {
          absence_min_delay_hours: number
          access_type: "open" | "invitation"
          app_name: string
          created_at: string
          end_time: string
          fcc_reminder_days: number
          frequency: string
          id: string
          rules: string | null
          schedule_days: string[]
          start_time: string
          updated_at: string
        }
        Insert: {
          absence_min_delay_hours?: number
          access_type?: "open" | "invitation"
          app_name?: string
          created_at?: string
          end_time?: string
          fcc_reminder_days?: number
          frequency?: string
          id?: string
          rules?: string | null
          schedule_days?: string[]
          start_time?: string
          updated_at?: string
        }
        Update: {
          absence_min_delay_hours?: number
          access_type?: "open" | "invitation"
          app_name?: string
          created_at?: string
          end_time?: string
          fcc_reminder_days?: number
          frequency?: string
          id?: string
          rules?: string | null
          schedule_days?: string[]
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          role: "admin" | "member"
          status: "pending" | "active" | "suspended" | "removed"
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          role?: "admin" | "member"
          status?: "pending" | "active" | "suspended" | "removed"
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          role?: "admin" | "member"
          status?: "pending" | "active" | "suspended" | "removed"
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          english_level: "beginner" | "intermediate" | "advanced"
          first_name: string
          id: string
          last_name: string
          photo_url: string | null
          pseudo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          english_level?: "beginner" | "intermediate" | "advanced"
          first_name: string
          id: string
          last_name: string
          photo_url?: string | null
          pseudo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          english_level?: "beginner" | "intermediate" | "advanced"
          first_name?: string
          id?: string
          last_name?: string
          photo_url?: string | null
          pseudo?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_member_status: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      is_active_member: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type PublicSchema = Database["public"]

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
      Row: infer RowType
    }
    ? RowType
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer RowType
      }
      ? RowType
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
      Insert: infer InsertType
    }
    ? InsertType
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer InsertType
      }
      ? InsertType
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
      Update: infer UpdateType
    }
    ? UpdateType
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer UpdateType
      }
      ? UpdateType
      : never
    : never
