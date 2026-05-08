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
      article_comments: {
        Row: {
          article_key: string
          body: string
          created_at: string
          display_name: string | null
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          article_key: string
          body: string
          created_at?: string
          display_name?: string | null
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          article_key?: string
          body?: string
          created_at?: string
          display_name?: string | null
          id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "article_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      bookshelves: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_drops: {
        Row: {
          body: string
          created_at: string
          drop_date: string
          emoji: string
          fact: string
          title: string
          topic: string
        }
        Insert: {
          body: string
          created_at?: string
          drop_date: string
          emoji?: string
          fact: string
          title: string
          topic?: string
        }
        Update: {
          body?: string
          created_at?: string
          drop_date?: string
          emoji?: string
          fact?: string
          title?: string
          topic?: string
        }
        Relationships: []
      }
      favourite_articles: {
        Row: {
          body: string
          bookshelf_id: string | null
          created_at: string
          id: string
          source_name: string | null
          source_url: string | null
          summary: string
          title: string
          topic: string
          user_id: string
        }
        Insert: {
          body: string
          bookshelf_id?: string | null
          created_at?: string
          id?: string
          source_name?: string | null
          source_url?: string | null
          summary: string
          title: string
          topic: string
          user_id: string
        }
        Update: {
          body?: string
          bookshelf_id?: string | null
          created_at?: string
          id?: string
          source_name?: string | null
          source_url?: string | null
          summary?: string
          title?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourite_articles_bookshelf_id_fkey"
            columns: ["bookshelf_id"]
            isOneToOne: false
            referencedRelation: "bookshelves"
            referencedColumns: ["id"]
          },
        ]
      }
      favourite_topics: {
        Row: {
          created_at: string
          id: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          articles_read: number
          created_at: string
          current_streak: number
          display_name: string | null
          highest_streak: number
          id: string
          last_read_date: string | null
          seconds_read: number
          short_code: string
          top_topic: string | null
          updated_at: string
          xp: number
        }
        Insert: {
          articles_read?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          highest_streak?: number
          id: string
          last_read_date?: string | null
          seconds_read?: number
          short_code?: string
          top_topic?: string | null
          updated_at?: string
          xp?: number
        }
        Update: {
          articles_read?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          highest_streak?: number
          id?: string
          last_read_date?: string | null
          seconds_read?: number
          short_code?: string
          top_topic?: string | null
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      quiz_challenges: {
        Row: {
          article_body: string | null
          article_summary: string | null
          article_title: string | null
          challenger_done_reading: boolean
          challenger_finished: boolean
          challenger_id: string
          challenger_score: number
          created_at: string
          id: string
          opponent_done_reading: boolean
          opponent_finished: boolean
          opponent_id: string
          opponent_score: number
          question_count: number
          questions: Json | null
          reading_started_at: string | null
          status: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          article_body?: string | null
          article_summary?: string | null
          article_title?: string | null
          challenger_done_reading?: boolean
          challenger_finished?: boolean
          challenger_id: string
          challenger_score?: number
          created_at?: string
          id?: string
          opponent_done_reading?: boolean
          opponent_finished?: boolean
          opponent_id: string
          opponent_score?: number
          question_count?: number
          questions?: Json | null
          reading_started_at?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          article_body?: string | null
          article_summary?: string | null
          article_title?: string | null
          challenger_done_reading?: boolean
          challenger_finished?: boolean
          challenger_id?: string
          challenger_score?: number
          created_at?: string
          id?: string
          opponent_done_reading?: boolean
          opponent_finished?: boolean
          opponent_id?: string
          opponent_score?: number
          question_count?: number
          questions?: Json | null
          reading_started_at?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      read_history: {
        Row: {
          body: string | null
          created_at: string
          emoji: string | null
          id: string
          source_kind: string
          source_name: string | null
          source_url: string | null
          summary: string | null
          title: string
          topic: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          source_kind?: string
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          title: string
          topic: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          source_kind?: string
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      topic_connections: {
        Row: {
          from_topic: string
          id: string
          to_topic: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          from_topic: string
          id?: string
          to_topic: string
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          from_topic?: string
          id?: string
          to_topic?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string
          id: string
          interest: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          country: string
          created_at: string
          font_size: string
          onboarded: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string
          created_at?: string
          font_size?: string
          onboarded?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          font_size?: string
          onboarded?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          article_title: string | null
          created_at: string
          id: string
          reason: string
          seconds_spent: number
          topic: string
          user_id: string
          xp: number
        }
        Insert: {
          article_title?: string | null
          created_at?: string
          id?: string
          reason?: string
          seconds_spent?: number
          topic: string
          user_id: string
          xp: number
        }
        Update: {
          article_title?: string | null
          created_at?: string
          id?: string
          reason?: string
          seconds_spent?: number
          topic?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_short_code: { Args: never; Returns: string }
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
