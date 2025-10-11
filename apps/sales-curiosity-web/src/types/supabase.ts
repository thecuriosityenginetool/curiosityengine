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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_training_data: {
        Row: {
          email_content: string
          email_date: string | null
          email_type: string | null
          id: string
          is_processed: boolean | null
          processed_at: string | null
          recipient_email: string | null
          sender_email: string | null
          subject_line: string | null
          user_id: string
        }
        Insert: {
          email_content: string
          email_date?: string | null
          email_type?: string | null
          id?: string
          is_processed?: boolean | null
          processed_at?: string | null
          recipient_email?: string | null
          sender_email?: string | null
          subject_line?: string | null
          user_id: string
        }
        Update: {
          email_content?: string
          email_date?: string | null
          email_type?: string | null
          id?: string
          is_processed?: boolean | null
          processed_at?: string | null
          recipient_email?: string | null
          sender_email?: string | null
          subject_line?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_integrations: {
        Row: {
          access_token: string
          connected_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          refresh_token: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          refresh_token?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          refresh_token?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          created_at: string | null
          description: string | null
          emails_sent: number | null
          id: string
          name: string
          open_rate: number | null
          reply_rate: number | null
          status: string | null
          total_recipients: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          emails_sent?: number | null
          id?: string
          name: string
          open_rate?: number | null
          reply_rate?: number | null
          status?: string | null
          total_recipients?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          emails_sent?: number | null
          id?: string
          name?: string
          open_rate?: number | null
          reply_rate?: number | null
          status?: string | null
          total_recipients?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_integrations: {
        Row: {
          access_token: string
          connected_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          provider: string
          refresh_token: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          refresh_token?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          refresh_token?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_emails: {
        Row: {
          created_at: string | null
          email_type: string | null
          generated_content: string
          id: string
          prompt: string
          recipient_context: Json | null
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_type?: string | null
          generated_content: string
          id?: string
          prompt: string
          recipient_context?: Json | null
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_type?: string | null
          generated_content?: string
          id?: string
          prompt?: string
          recipient_context?: Json | null
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_prospects: {
        Row: {
          ai_analysis: string | null
          company: string | null
          created_at: string | null
          id: string
          industry: string | null
          linkedin_url: string
          location: string | null
          name: string | null
          profile_data: Json | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          linkedin_url: string
          location?: string | null
          name?: string | null
          profile_data?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string
          location?: string | null
          name?: string | null
          profile_data?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_prospects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string
          name: string
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string
          name: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string
          name?: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          crm_connected: boolean | null
          email: string
          email_connected: boolean | null
          full_name: string | null
          id: string
          linkedin_connected: boolean | null
          organization_id: string | null
          role: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          crm_connected?: boolean | null
          email: string
          email_connected?: boolean | null
          full_name?: string | null
          id?: string
          linkedin_connected?: boolean | null
          organization_id?: string | null
          role?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          crm_connected?: boolean | null
          email?: string
          email_connected?: boolean | null
          full_name?: string | null
          id?: string
          linkedin_connected?: boolean | null
          organization_id?: string | null
          role?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          ai_emails_generated: number | null
          credits_balance: number | null
          crm_records_synced: number | null
          last_reset_date: string | null
          linkedin_profiles_analyzed: number | null
          monthly_ai_limit: number | null
          monthly_usage: number | null
          total_credits_purchased: number | null
          total_credits_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_emails_generated?: number | null
          credits_balance?: number | null
          crm_records_synced?: number | null
          last_reset_date?: string | null
          linkedin_profiles_analyzed?: number | null
          monthly_ai_limit?: number | null
          monthly_usage?: number | null
          total_credits_purchased?: number | null
          total_credits_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_emails_generated?: number | null
          credits_balance?: number | null
          crm_records_synced?: number | null
          last_reset_date?: string | null
          linkedin_profiles_analyzed?: number | null
          monthly_ai_limit?: number | null
          monthly_usage?: number | null
          total_credits_purchased?: number | null
          total_credits_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_monthly_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
