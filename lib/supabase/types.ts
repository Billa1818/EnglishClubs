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
          app_logo_url: string | null
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
          app_logo_url?: string | null
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
          app_logo_url?: string | null
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
      activities: {
        Row: {
          category:
            | "ice_breaker"
            | "vocabulary"
            | "conversation"
            | "comprehension"
            | "writing"
          created_at: string
          created_by: string | null
          default_duration: number
          description: string
          icon: string | null
          id: string
          instructions: string
          is_archived: boolean
          is_default: boolean
          materials: string[]
          max_duration: number
          members_required: number
          min_duration: number
          name: string
          name_en: string
          requires_topic: boolean
          selection_mode: "automatic" | "manual" | "semi-automatic"
          topics_reusable: boolean
          updated_at: string
        }
        Insert: {
          category:
            | "ice_breaker"
            | "vocabulary"
            | "conversation"
            | "comprehension"
            | "writing"
          created_at?: string
          created_by?: string | null
          default_duration: number
          description: string
          icon?: string | null
          id?: string
          instructions: string
          is_archived?: boolean
          is_default?: boolean
          materials?: string[]
          max_duration: number
          members_required?: number
          min_duration: number
          name: string
          name_en: string
          requires_topic?: boolean
          selection_mode?: "automatic" | "manual" | "semi-automatic"
          topics_reusable?: boolean
          updated_at?: string
        }
        Update: {
          category?:
            | "ice_breaker"
            | "vocabulary"
            | "conversation"
            | "comprehension"
            | "writing"
          created_at?: string
          created_by?: string | null
          default_duration?: number
          description?: string
          icon?: string | null
          id?: string
          instructions?: string
          is_archived?: boolean
          is_default?: boolean
          materials?: string[]
          max_duration?: number
          members_required?: number
          min_duration?: number
          name?: string
          name_en?: string
          requires_topic?: boolean
          selection_mode?: "automatic" | "manual" | "semi-automatic"
          topics_reusable?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          activity_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_archived: boolean
          level: "beginner" | "intermediate" | "advanced"
          title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_archived?: boolean
          level?: "beginner" | "intermediate" | "advanced"
          title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_archived?: boolean
          level?: "beginner" | "intermediate" | "advanced"
          title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "topics_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_usages: {
        Row: {
          created_at: string
          id: string
          session_id: string
          topic_id: string
          updated_at: string
          used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          topic_id: string
          updated_at?: string
          used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          topic_id?: string
          updated_at?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_usages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_usages_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_usages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      invitations: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          token: string
          type: "link" | "email"
          updated_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string
          id?: string
          token?: string
          type?: "link" | "email"
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          token?: string
          type?: "link" | "email"
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_activity_index: number | null
          date: string
          end_time: string
          id: string
          notes: string | null
          start_time: string
          started_at: string | null
          status: "upcoming" | "ongoing" | "completed" | "cancelled"
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_activity_index?: number | null
          date: string
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          started_at?: string | null
          status?: "upcoming" | "ongoing" | "completed" | "cancelled"
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_activity_index?: number | null
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          started_at?: string | null
          status?: "upcoming" | "ongoing" | "completed" | "cancelled"
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      session_activities: {
        Row: {
          activity_id: string
          assignment_timing: "before_event" | "during_event"
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration: number
          id: string
          order_index: number
          session_id: string
          started_at: string | null
          status: "pending" | "in_progress" | "completed" | "skipped"
          updated_at: string
        }
        Insert: {
          activity_id: string
          assignment_timing?: "before_event" | "during_event"
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration: number
          id?: string
          order_index: number
          session_id: string
          started_at?: string | null
          status?: "pending" | "in_progress" | "completed" | "skipped"
          updated_at?: string
        }
        Update: {
          activity_id?: string
          assignment_timing?: "before_event" | "during_event"
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration?: number
          id?: string
          order_index?: number
          session_id?: string
          started_at?: string | null
          status?: "pending" | "in_progress" | "completed" | "skipped"
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_activities_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_activity_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_type: string
          created_at: string
          id: string
          reason: string | null
          session_activity_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string
          created_at?: string
          id?: string
          reason?: string | null
          session_activity_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string
          created_at?: string
          id?: string
          reason?: string | null
          session_activity_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_activity_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_activity_assignments_session_activity_id_fkey"
            columns: ["session_activity_id"]
            isOneToOne: false
            referencedRelation: "session_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_activity_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_selection_cycles: {
        Row: {
          activity_id: string
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          is_active: boolean
          started_at: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_selection_cycles_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_selection_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_selections: {
        Row: {
          counts_in_cycle: boolean
          created_at: string
          cycle_id: string
          id: string
          selected_at: string
          selected_by: string | null
          selection_mode: "automatic" | "manual" | "semi-automatic"
          session_activity_id: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          counts_in_cycle?: boolean
          created_at?: string
          cycle_id: string
          id?: string
          selected_at?: string
          selected_by?: string | null
          selection_mode?: "automatic" | "manual" | "semi-automatic"
          session_activity_id: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          counts_in_cycle?: boolean
          created_at?: string
          cycle_id?: string
          id?: string
          selected_at?: string
          selected_by?: string | null
          selection_mode?: "automatic" | "manual" | "semi-automatic"
          session_activity_id?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_selections_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "activity_selection_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_selections_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_selections_session_activity_id_fkey"
            columns: ["session_activity_id"]
            isOneToOne: false
            referencedRelation: "session_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_selections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      absence_requests: {
        Row: {
          admin_comment: string | null
          created_at: string
          id: string
          reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
          status: "pending" | "approved" | "rejected"
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
          status?: "pending" | "approved" | "rejected"
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
          status?: "pending" | "approved" | "rejected"
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendances: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          declared_at: string | null
          id: string
          session_id: string
          status: "declared" | "confirmed" | "absent" | "excused"
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          declared_at?: string | null
          id?: string
          session_id: string
          status?: "declared" | "confirmed" | "absent" | "excused"
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          declared_at?: string | null
          id?: string
          session_id?: string
          status?: "declared" | "confirmed" | "absent" | "excused"
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fcc_progressions: {
        Row: {
          certificate_name: string | null
          created_at: string
          id: string
          level: "Starting" | "In Progress" | "Almost Done" | "Completed"
          modules_completed: number
          screenshot_url: string | null
          track: string
          updated_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          certificate_name?: string | null
          created_at?: string
          id?: string
          level?: "Starting" | "In Progress" | "Almost Done" | "Completed"
          modules_completed?: number
          screenshot_url?: string | null
          track: string
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          certificate_name?: string | null
          created_at?: string
          id?: string
          level?: "Starting" | "In Progress" | "Almost Done" | "Completed"
          modules_completed?: number
          screenshot_url?: string | null
          track?: string
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fcc_progressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fcc_progressions_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email: boolean
          id: string
          in_app: boolean
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: boolean
          id?: string
          in_app?: boolean
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: boolean
          id?: string
          in_app?: boolean
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          metadata: Json
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      consume_invitation_token: {
        Args: {
          p_email?: string
          p_token: string
          p_user_id: string
        }
        Returns: boolean
      }
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
      sync_topics_usage_count: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      verify_invitation_token: {
        Args: {
          p_email?: string
          p_token: string
        }
        Returns: {
          email: string | null
          expires_at: string
          id: string
          token: string
          type: string
        }[]
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
