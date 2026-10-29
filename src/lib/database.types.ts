export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_agents: {
        Row: {
          data_scope: string;
          description: string;
          effort: string;
          enabled: boolean;
          id: string;
          max_runs_per_day: number;
          max_runs_per_user_day: number;
          model: string;
          monthly_budget_usd: number;
          name: string;
          tools: string[];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          data_scope: string;
          description: string;
          effort?: string;
          enabled?: boolean;
          id: string;
          max_runs_per_day?: number;
          max_runs_per_user_day?: number;
          model?: string;
          monthly_budget_usd?: number;
          name: string;
          tools?: string[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          data_scope?: string;
          description?: string;
          effort?: string;
          enabled?: boolean;
          id?: string;
          max_runs_per_day?: number;
          max_runs_per_user_day?: number;
          model?: string;
          monthly_budget_usd?: number;
          name?: string;
          tools?: string[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_agents_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_approvals: {
        Row: {
          action: string;
          agent_id: string;
          consumed_at: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          expires_at: string;
          id: string;
          params: NonNullable<Json>;
          params_hash: string;
          requested_by: string | null;
          status: string;
        };
        Insert: {
          action: string;
          agent_id: string;
          consumed_at?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          expires_at?: string;
          id?: string;
          params: NonNullable<Json>;
          params_hash: string;
          requested_by?: string | null;
          status?: string;
        };
        Update: {
          action?: string;
          agent_id?: string;
          consumed_at?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          expires_at?: string;
          id?: string;
          params?: NonNullable<Json>;
          params_hash?: string;
          requested_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_approvals_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "ai_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_approvals_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_approvals_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          answered_at: string | null;
          answered_by: string | null;
          created_at: string;
          handed_off_at: string | null;
          handoff_reason: string | null;
          id: string;
          notified_at: string | null;
          notify_error: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answered_at?: string | null;
          answered_by?: string | null;
          created_at?: string;
          handed_off_at?: string | null;
          handoff_reason?: string | null;
          id?: string;
          notified_at?: string | null;
          notify_error?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answered_at?: string | null;
          answered_by?: string | null;
          created_at?: string;
          handed_off_at?: string | null;
          handoff_reason?: string | null;
          id?: string;
          notified_at?: string | null;
          notify_error?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_answered_by_fkey";
            columns: ["answered_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          author_id: string | null;
          content: string;
          conversation_id: string;
          created_at: string;
          id: number;
          request_id: string | null;
          role: string;
        };
        Insert: {
          author_id?: string | null;
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: never;
          request_id?: string | null;
          role: string;
        };
        Update: {
          author_id?: string | null;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: never;
          request_id?: string | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_reports: {
        Row: {
          agent_id: string;
          alert_id: string | null;
          content: string;
          created_at: string;
          id: string;
          metrics: NonNullable<Json>;
          period_days: number | null;
          requested_by: string | null;
          run_id: string | null;
        };
        Insert: {
          agent_id: string;
          alert_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          metrics?: NonNullable<Json>;
          period_days?: number | null;
          requested_by?: string | null;
          run_id?: string | null;
        };
        Update: {
          agent_id?: string;
          alert_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          metrics?: NonNullable<Json>;
          period_days?: number | null;
          requested_by?: string | null;
          run_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_reports_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "ai_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_reports_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_reports_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "ai_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_runs: {
        Row: {
          agent_id: string;
          cost_usd: number | null;
          created_at: string;
          error: string | null;
          estimated_cost_usd: number;
          finished_at: string | null;
          id: string;
          input_tokens: number | null;
          model: string | null;
          output_tokens: number | null;
          reconcile_note: string | null;
          reconciled_at: string | null;
          refusal: string | null;
          requested_by: string | null;
          status: string;
        };
        Insert: {
          agent_id: string;
          cost_usd?: number | null;
          created_at?: string;
          error?: string | null;
          estimated_cost_usd?: number;
          finished_at?: string | null;
          id?: string;
          input_tokens?: number | null;
          model?: string | null;
          output_tokens?: number | null;
          reconcile_note?: string | null;
          reconciled_at?: string | null;
          refusal?: string | null;
          requested_by?: string | null;
          status: string;
        };
        Update: {
          agent_id?: string;
          cost_usd?: number | null;
          created_at?: string;
          error?: string | null;
          estimated_cost_usd?: number;
          finished_at?: string | null;
          id?: string;
          input_tokens?: number | null;
          model?: string | null;
          output_tokens?: number | null;
          reconcile_note?: string | null;
          reconciled_at?: string | null;
          refusal?: string | null;
          requested_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_runs_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "ai_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_runs_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          id: number;
          subject_id: string | null;
          university_id: number | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          subject_id?: string | null;
          university_id?: number | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          subject_id?: string | null;
          university_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      bac_verifications: {
        Row: {
          candidate_hash: string;
          candidate_number: string | null;
          candidate_ref: string;
          created_at: string;
          document_path: string | null;
          exam_year: number;
          id: string;
          method: string;
          provider: string;
          rejection_reason: string | null;
          result: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source_reference: string | null;
          status: Database["public"]["Enums"]["enrollment_status"];
          user_id: string;
        };
        Insert: {
          candidate_hash: string;
          candidate_number?: string | null;
          candidate_ref: string;
          created_at?: string;
          document_path?: string | null;
          exam_year: number;
          id?: string;
          method?: string;
          provider?: string;
          rejection_reason?: string | null;
          result?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_reference?: string | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          user_id: string;
        };
        Update: {
          candidate_hash?: string;
          candidate_number?: string | null;
          candidate_ref?: string;
          created_at?: string;
          document_path?: string | null;
          exam_year?: number;
          id?: string;
          method?: string;
          provider?: string;
          rejection_reason?: string | null;
          result?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_reference?: string | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bac_verifications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bac_verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      card_validations: {
        Row: {
          created_at: string;
          deal_id: string | null;
          eligible: boolean;
          id: string;
          outcome: string;
          partner_id: string;
          scanned_by: string | null;
          student_id: string;
          student_name: string;
          student_uny_id: string;
        };
        Insert: {
          created_at?: string;
          deal_id?: string | null;
          eligible?: boolean;
          id?: string;
          outcome: string;
          partner_id: string;
          scanned_by?: string | null;
          student_id: string;
          student_name: string;
          student_uny_id: string;
        };
        Update: {
          created_at?: string;
          deal_id?: string | null;
          eligible?: boolean;
          id?: string;
          outcome?: string;
          partner_id?: string;
          scanned_by?: string | null;
          student_id?: string;
          student_name?: string;
          student_uny_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_validations_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "card_validations_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "card_validations_scanned_by_fkey";
            columns: ["scanned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "card_validations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cities: {
        Row: {
          country_code: string;
          created_at: string;
          districts: string[];
          id: number;
          is_active: boolean;
          name: string;
          slug: string;
        };
        Insert: {
          country_code: string;
          created_at?: string;
          districts?: string[];
          id?: never;
          is_active?: boolean;
          name: string;
          slug: string;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          districts?: string[];
          id?: never;
          is_active?: boolean;
          name?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cities_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["code"];
          },
        ];
      };
      content_reports: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision_note: string | null;
          details: string | null;
          id: string;
          item_id: string;
          reason: string;
          reporter_id: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          details?: string | null;
          id?: string;
          item_id: string;
          reason: string;
          reporter_id?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          details?: string | null;
          id?: string;
          item_id?: string;
          reason?: string;
          reporter_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_reports_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_reports_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      content_views: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["view_entity"];
          id: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["view_entity"];
          id?: never;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: Database["public"]["Enums"]["view_entity"];
          id?: never;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_views_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      countries: {
        Row: {
          code: string;
          created_at: string;
          currency: string;
          is_active: boolean;
          name: string;
          phone_prefix: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          currency: string;
          is_active?: boolean;
          name: string;
          phone_prefix: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          currency?: string;
          is_active?: boolean;
          name?: string;
          phone_prefix?: string;
        };
        Relationships: [];
      };
      deal_clicks: {
        Row: {
          created_at: string;
          deal_id: string;
          id: number;
          student_id: string | null;
        };
        Insert: {
          created_at?: string;
          deal_id: string;
          id?: never;
          student_id?: string | null;
        };
        Update: {
          created_at?: string;
          deal_id?: string;
          id?: never;
          student_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deal_clicks_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_clicks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_favorites: {
        Row: {
          created_at: string;
          deal_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deal_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deal_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deal_favorites_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_online_access: {
        Row: {
          code: string | null;
          deal_id: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          code?: string | null;
          deal_id: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          code?: string | null;
          deal_id?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deal_online_access_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: true;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          announced_at: string | null;
          category: Database["public"]["Enums"]["deal_category"];
          channel: string;
          city_id: number | null;
          conditions: string;
          created_at: string;
          description: string;
          discount_kind: string | null;
          discount_label: string;
          discount_value: number | null;
          district: string | null;
          flash_ends_at: string | null;
          flash_hours: number | null;
          flash_quantity: number | null;
          flash_started_at: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_demo: boolean;
          is_exclusive: boolean;
          is_featured: boolean;
          online_code_mode: string | null;
          partner_id: string;
          price_gnf: number | null;
          promo_price_gnf: number | null;
          requires_verification: boolean;
          title: string;
          updated_at: string;
          valid_from: string;
          valid_until: string | null;
          view_count: number;
        };
        Insert: {
          announced_at?: string | null;
          category: Database["public"]["Enums"]["deal_category"];
          channel?: string;
          city_id?: number | null;
          conditions?: string;
          created_at?: string;
          description?: string;
          discount_kind?: string | null;
          discount_label: string;
          discount_value?: number | null;
          district?: string | null;
          flash_ends_at?: string | null;
          flash_hours?: number | null;
          flash_quantity?: number | null;
          flash_started_at?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_demo?: boolean;
          is_exclusive?: boolean;
          is_featured?: boolean;
          online_code_mode?: string | null;
          partner_id: string;
          price_gnf?: number | null;
          promo_price_gnf?: number | null;
          requires_verification?: boolean;
          title: string;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
          view_count?: number;
        };
        Update: {
          announced_at?: string | null;
          category?: Database["public"]["Enums"]["deal_category"];
          channel?: string;
          city_id?: number | null;
          conditions?: string;
          created_at?: string;
          description?: string;
          discount_kind?: string | null;
          discount_label?: string;
          discount_value?: number | null;
          district?: string | null;
          flash_ends_at?: string | null;
          flash_hours?: number | null;
          flash_quantity?: number | null;
          flash_started_at?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_demo?: boolean;
          is_exclusive?: boolean;
          is_featured?: boolean;
          online_code_mode?: string | null;
          partner_id?: string;
          price_gnf?: number | null;
          promo_price_gnf?: number | null;
          requires_verification?: boolean;
          title?: string;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deals_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      housing: {
        Row: {
          amenities: string[];
          available_from: string | null;
          city_id: number | null;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          district: string;
          id: string;
          images: string[];
          is_active: boolean;
          is_available: boolean;
          is_demo: boolean;
          partner_id: string | null;
          price_gnf: number;
          rooms: number;
          title: string;
          type: Database["public"]["Enums"]["housing_type"];
          updated_at: string;
          view_count: number;
        };
        Insert: {
          amenities?: string[];
          available_from?: string | null;
          city_id?: number | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          district: string;
          id?: string;
          images?: string[];
          is_active?: boolean;
          is_available?: boolean;
          is_demo?: boolean;
          partner_id?: string | null;
          price_gnf: number;
          rooms?: number;
          title: string;
          type: Database["public"]["Enums"]["housing_type"];
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          amenities?: string[];
          available_from?: string | null;
          city_id?: number | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          district?: string;
          id?: string;
          images?: string[];
          is_active?: boolean;
          is_available?: boolean;
          is_demo?: boolean;
          partner_id?: string | null;
          price_gnf?: number;
          rooms?: number;
          title?: string;
          type?: Database["public"]["Enums"]["housing_type"];
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "housing_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "housing_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "housing_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      housing_favorites: {
        Row: {
          created_at: string;
          housing_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          housing_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          housing_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "housing_favorites_housing_id_fkey";
            columns: ["housing_id"];
            isOneToOne: false;
            referencedRelation: "housing";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "housing_favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_applications: {
        Row: {
          created_at: string;
          id: string;
          job_id: string;
          message: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          job_id: string;
          message: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          job_id?: string;
          message?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_applications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_favorites: {
        Row: {
          created_at: string;
          job_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          job_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          job_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_favorites_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          apply_email: string | null;
          apply_url: string | null;
          city_id: number | null;
          company_name: string;
          compensation: string | null;
          created_at: string;
          deadline: string | null;
          description: string;
          id: string;
          is_active: boolean;
          is_demo: boolean;
          is_remote: boolean;
          location: string | null;
          logo_url: string | null;
          partner_id: string | null;
          skills: string[];
          title: string;
          type: Database["public"]["Enums"]["job_type"];
          updated_at: string;
          view_count: number;
        };
        Insert: {
          apply_email?: string | null;
          apply_url?: string | null;
          city_id?: number | null;
          company_name: string;
          compensation?: string | null;
          created_at?: string;
          deadline?: string | null;
          description?: string;
          id?: string;
          is_active?: boolean;
          is_demo?: boolean;
          is_remote?: boolean;
          location?: string | null;
          logo_url?: string | null;
          partner_id?: string | null;
          skills?: string[];
          title: string;
          type: Database["public"]["Enums"]["job_type"];
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          apply_email?: string | null;
          apply_url?: string | null;
          city_id?: number | null;
          company_name?: string;
          compensation?: string | null;
          created_at?: string;
          deadline?: string | null;
          description?: string;
          id?: string;
          is_active?: boolean;
          is_demo?: boolean;
          is_remote?: boolean;
          location?: string | null;
          logo_url?: string | null;
          partner_id?: string | null;
          skills?: string[];
          title?: string;
          type?: Database["public"]["Enums"]["job_type"];
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_cards: {
        Row: {
          created_at: string;
          id: string;
          last_visit_at: string | null;
          partner_id: string;
          rewards_available: number;
          rewards_used: number;
          stamps: number;
          student_id: string;
          total_spent_gnf: number;
          total_visits: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_visit_at?: string | null;
          partner_id: string;
          rewards_available?: number;
          rewards_used?: number;
          stamps?: number;
          student_id: string;
          total_spent_gnf?: number;
          total_visits?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_visit_at?: string | null;
          partner_id?: string;
          rewards_available?: number;
          rewards_used?: number;
          stamps?: number;
          student_id?: string;
          total_spent_gnf?: number;
          total_visits?: number;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_cards_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_events: {
        Row: {
          amount_gnf: number | null;
          card_id: string;
          created_at: string;
          created_by: string | null;
          id: number;
          kind: string;
        };
        Insert: {
          amount_gnf?: number | null;
          card_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          kind: string;
        };
        Update: {
          amount_gnf?: number | null;
          card_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_events_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_programs: {
        Row: {
          is_active: boolean;
          partner_id: string;
          reward: string;
          stamps_required: number;
          updated_at: string;
        };
        Insert: {
          is_active?: boolean;
          partner_id: string;
          reward: string;
          stamps_required?: number;
          updated_at?: string;
        };
        Update: {
          is_active?: boolean;
          partner_id?: string;
          reward?: string;
          stamps_required?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: true;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_images: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          position: number;
          storage_path: string | null;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          position?: number;
          storage_path?: string | null;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          position?: number;
          storage_path?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_images_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_items";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_items: {
        Row: {
          category: Database["public"]["Enums"]["market_category"];
          city_id: number | null;
          condition: Database["public"]["Enums"]["item_condition"];
          contact_phone: string | null;
          created_at: string;
          description: string;
          district: string | null;
          id: string;
          is_demo: boolean;
          is_negotiable: boolean;
          moderation_note: string | null;
          original_price_gnf: number | null;
          partner_id: string | null;
          price_gnf: number;
          seller_id: string | null;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          category: Database["public"]["Enums"]["market_category"];
          city_id?: number | null;
          condition?: Database["public"]["Enums"]["item_condition"];
          contact_phone?: string | null;
          created_at?: string;
          description?: string;
          district?: string | null;
          id?: string;
          is_demo?: boolean;
          is_negotiable?: boolean;
          moderation_note?: string | null;
          original_price_gnf?: number | null;
          partner_id?: string | null;
          price_gnf: number;
          seller_id?: string | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          category?: Database["public"]["Enums"]["market_category"];
          city_id?: number | null;
          condition?: Database["public"]["Enums"]["item_condition"];
          contact_phone?: string | null;
          created_at?: string;
          description?: string;
          district?: string | null;
          id?: string;
          is_demo?: boolean;
          is_negotiable?: boolean;
          moderation_note?: string | null;
          original_price_gnf?: number | null;
          partner_id?: string | null;
          price_gnf?: number;
          seller_id?: string | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title?: string;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_items_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketplace_items_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketplace_items_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          emailed_at: string | null;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          emailed_at?: string | null;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          emailed_at?: string | null;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ops_alerts: {
        Row: {
          details: NonNullable<Json>;
          fingerprint: string;
          first_seen: string;
          id: string;
          last_seen: string;
          occurrences: number;
          owner_id: string | null;
          resolution: string | null;
          resolved_at: string | null;
          rule: string;
          severity: string;
          status: string;
          title: string;
        };
        Insert: {
          details?: NonNullable<Json>;
          fingerprint: string;
          first_seen?: string;
          id?: string;
          last_seen?: string;
          occurrences?: number;
          owner_id?: string | null;
          resolution?: string | null;
          resolved_at?: string | null;
          rule: string;
          severity: string;
          status?: string;
          title: string;
        };
        Update: {
          details?: NonNullable<Json>;
          fingerprint?: string;
          first_seen?: string;
          id?: string;
          last_seen?: string;
          occurrences?: number;
          owner_id?: string | null;
          resolution?: string | null;
          resolved_at?: string | null;
          rule?: string;
          severity?: string;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ops_alerts_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ops_job_runs: {
        Row: {
          attempts: number;
          error: string | null;
          finished_at: string | null;
          id: string;
          idempotency_key: string;
          job: string;
          max_attempts: number;
          result: Json | null;
          started_at: string;
          status: string;
        };
        Insert: {
          attempts?: number;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key: string;
          job: string;
          max_attempts?: number;
          result?: Json | null;
          started_at?: string;
          status?: string;
        };
        Update: {
          attempts?: number;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key?: string;
          job?: string;
          max_attempts?: number;
          result?: Json | null;
          started_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      partner_applications: {
        Row: {
          business_name: string;
          category: Database["public"]["Enums"]["deal_category"];
          city_id: number | null;
          contact_name: string;
          created_at: string;
          email: string;
          id: string;
          offer: string | null;
          partner_id: string | null;
          phone: string;
          reviewed_at: string | null;
          status: string;
          wants: string[];
        };
        Insert: {
          business_name: string;
          category: Database["public"]["Enums"]["deal_category"];
          city_id?: number | null;
          contact_name: string;
          created_at?: string;
          email: string;
          id?: string;
          offer?: string | null;
          partner_id?: string | null;
          phone: string;
          reviewed_at?: string | null;
          status?: string;
          wants?: string[];
        };
        Update: {
          business_name?: string;
          category?: Database["public"]["Enums"]["deal_category"];
          city_id?: number | null;
          contact_name?: string;
          created_at?: string;
          email?: string;
          id?: string;
          offer?: string | null;
          partner_id?: string | null;
          phone?: string;
          reviewed_at?: string | null;
          status?: string;
          wants?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "partner_applications_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_applications_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_members: {
        Row: {
          created_at: string;
          partner_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          partner_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          partner_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_members_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_survey_responses: {
        Row: {
          answered_by: string | null;
          comments: string | null;
          created_at: string;
          discount_range: string;
          expectations: string[];
          expected_students: string | null;
          offer_types: string[];
          partner_id: string;
          payment_methods: string[];
          understood: string | null;
          updated_at: string;
          would_pay: string | null;
        };
        Insert: {
          answered_by?: string | null;
          comments?: string | null;
          created_at?: string;
          discount_range: string;
          expectations?: string[];
          expected_students?: string | null;
          offer_types?: string[];
          partner_id: string;
          payment_methods?: string[];
          understood?: string | null;
          updated_at?: string;
          would_pay?: string | null;
        };
        Update: {
          answered_by?: string | null;
          comments?: string | null;
          created_at?: string;
          discount_range?: string;
          expectations?: string[];
          expected_students?: string | null;
          offer_types?: string[];
          partner_id?: string;
          payment_methods?: string[];
          understood?: string | null;
          updated_at?: string;
          would_pay?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "partner_survey_responses_answered_by_fkey";
            columns: ["answered_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_survey_responses_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: true;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      partners: {
        Row: {
          address: string | null;
          category: Database["public"]["Enums"]["deal_category"];
          city_id: number | null;
          created_at: string;
          description: string | null;
          district: string | null;
          id: string;
          is_active: boolean;
          is_demo: boolean;
          logo_url: string | null;
          name: string;
          orange_money_merchant_code: string | null;
          phone: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          category: Database["public"]["Enums"]["deal_category"];
          city_id?: number | null;
          created_at?: string;
          description?: string | null;
          district?: string | null;
          id?: string;
          is_active?: boolean;
          is_demo?: boolean;
          logo_url?: string | null;
          name: string;
          orange_money_merchant_code?: string | null;
          phone?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          category?: Database["public"]["Enums"]["deal_category"];
          city_id?: number | null;
          created_at?: string;
          description?: string | null;
          district?: string | null;
          id?: string;
          is_active?: boolean;
          is_demo?: boolean;
          logo_url?: string | null;
          name?: string;
          orange_money_merchant_code?: string | null;
          phone?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "partners_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_status: string;
          avatar_url: string | null;
          birth_date: string | null;
          card_layout: string | null;
          card_theme: string | null;
          city_id: number | null;
          country_code: string;
          created_at: string;
          email: string | null;
          field_of_study: string | null;
          first_name: string;
          gender: string | null;
          id: string;
          is_test_account: boolean;
          last_name: string;
          last_seen_at: string | null;
          notify_deals: boolean;
          notify_email: boolean;
          notify_jobs: boolean;
          phone: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          role: Database["public"]["Enums"]["user_role"];
          signup_flags: string[];
          study_level: string | null;
          university_id: number | null;
          university_other: string | null;
          uny_id: string;
          updated_at: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
        };
        Insert: {
          account_status?: string;
          avatar_url?: string | null;
          birth_date?: string | null;
          card_layout?: string | null;
          card_theme?: string | null;
          city_id?: number | null;
          country_code?: string;
          created_at?: string;
          email?: string | null;
          field_of_study?: string | null;
          first_name: string;
          gender?: string | null;
          id: string;
          is_test_account?: boolean;
          last_name: string;
          last_seen_at?: string | null;
          notify_deals?: boolean;
          notify_email?: boolean;
          notify_jobs?: boolean;
          phone?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          signup_flags?: string[];
          study_level?: string | null;
          university_id?: number | null;
          university_other?: string | null;
          uny_id: string;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
        };
        Update: {
          account_status?: string;
          avatar_url?: string | null;
          birth_date?: string | null;
          card_layout?: string | null;
          card_theme?: string | null;
          city_id?: number | null;
          country_code?: string;
          created_at?: string;
          email?: string | null;
          field_of_study?: string | null;
          first_name?: string;
          gender?: string | null;
          id?: string;
          is_test_account?: boolean;
          last_name?: string;
          last_seen_at?: string | null;
          notify_deals?: boolean;
          notify_email?: boolean;
          notify_jobs?: boolean;
          phone?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          signup_flags?: string[];
          study_level?: string | null;
          university_id?: number | null;
          university_other?: string | null;
          uny_id?: string;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "profiles_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      promo_codes: {
        Row: {
          amount_gnf: number | null;
          code: string;
          created_at: string;
          deal_id: string;
          expires_at: string;
          id: string;
          partner_id: string;
          payment_method: string | null;
          payment_reference: string | null;
          status: string;
          student_id: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          amount_gnf?: number | null;
          code: string;
          created_at?: string;
          deal_id: string;
          expires_at: string;
          id?: string;
          partner_id: string;
          payment_method?: string | null;
          payment_reference?: string | null;
          status?: string;
          student_id: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          amount_gnf?: number | null;
          code?: string;
          created_at?: string;
          deal_id?: string;
          expires_at?: string;
          id?: string;
          partner_id?: string;
          payment_method?: string | null;
          payment_reference?: string | null;
          status?: string;
          student_id?: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "promo_codes_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promo_codes_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promo_codes_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promo_codes_used_by_fkey";
            columns: ["used_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_cards: {
        Row: {
          academic_year: string;
          enrollment_id: string | null;
          expires_at: string;
          id: string;
          issued_at: string;
          qr_token: string;
          status: Database["public"]["Enums"]["card_status"];
          uny_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          academic_year: string;
          enrollment_id?: string | null;
          expires_at: string;
          id?: string;
          issued_at?: string;
          qr_token?: string;
          status?: Database["public"]["Enums"]["card_status"];
          uny_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          academic_year?: string;
          enrollment_id?: string | null;
          expires_at?: string;
          id?: string;
          issued_at?: string;
          qr_token?: string;
          status?: Database["public"]["Enums"]["card_status"];
          uny_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_cards_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "student_enrollments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_cards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_email_accounts: {
        Row: {
          activated_at: string | null;
          address: string | null;
          created_at: string;
          created_by: string | null;
          domain: string;
          id: string;
          last_synced_at: string | null;
          local_part: string;
          provider: string;
          provider_account_ref: string | null;
          status: Database["public"]["Enums"]["student_email_status"];
          status_changed_at: string;
          university_id: number | null;
          user_id: string | null;
        };
        Insert: {
          activated_at?: string | null;
          address?: never;
          created_at?: string;
          created_by?: string | null;
          domain: string;
          id?: string;
          last_synced_at?: string | null;
          local_part: string;
          provider: string;
          provider_account_ref?: string | null;
          status?: Database["public"]["Enums"]["student_email_status"];
          status_changed_at?: string;
          university_id?: number | null;
          user_id?: string | null;
        };
        Update: {
          activated_at?: string | null;
          address?: never;
          created_at?: string;
          created_by?: string | null;
          domain?: string;
          id?: string;
          last_synced_at?: string | null;
          local_part?: string;
          provider?: string;
          provider_account_ref?: string | null;
          status?: Database["public"]["Enums"]["student_email_status"];
          status_changed_at?: string;
          university_id?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_email_accounts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_email_accounts_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_email_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_enrollments: {
        Row: {
          academic_year: string;
          claimed_birth_date: string | null;
          claimed_first_name: string;
          claimed_last_name: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          department: string | null;
          expires_at: string | null;
          faculty: string | null;
          id: string;
          match_details: Json | null;
          method: Database["public"]["Enums"]["verification_method"] | null;
          program: string | null;
          rejection_reason: string | null;
          source_ref: string | null;
          status: Database["public"]["Enums"]["enrollment_status"];
          student_number: string;
          student_number_norm: string | null;
          study_level: string | null;
          university_id: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          academic_year: string;
          claimed_birth_date?: string | null;
          claimed_first_name: string;
          claimed_last_name: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          department?: string | null;
          expires_at?: string | null;
          faculty?: string | null;
          id?: string;
          match_details?: Json | null;
          method?: Database["public"]["Enums"]["verification_method"] | null;
          program?: string | null;
          rejection_reason?: string | null;
          source_ref?: string | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          student_number: string;
          student_number_norm?: never;
          study_level?: string | null;
          university_id: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          academic_year?: string;
          claimed_birth_date?: string | null;
          claimed_first_name?: string;
          claimed_last_name?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          department?: string | null;
          expires_at?: string | null;
          faculty?: string | null;
          id?: string;
          match_details?: Json | null;
          method?: Database["public"]["Enums"]["verification_method"] | null;
          program?: string | null;
          rejection_reason?: string | null;
          source_ref?: string | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          student_number?: string;
          student_number_norm?: never;
          study_level?: string | null;
          university_id?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_enrollments_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_verifications: {
        Row: {
          checks: Json | null;
          created_at: string;
          document_academic_year: string | null;
          document_path: string;
          document_student_number: string | null;
          document_type: Database["public"]["Enums"]["document_type"];
          file_sha256: string | null;
          id: string;
          note: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["verification_request_status"];
          user_id: string;
        };
        Insert: {
          checks?: Json | null;
          created_at?: string;
          document_academic_year?: string | null;
          document_path: string;
          document_student_number?: string | null;
          document_type: Database["public"]["Enums"]["document_type"];
          file_sha256?: string | null;
          id?: string;
          note?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["verification_request_status"];
          user_id: string;
        };
        Update: {
          checks?: Json | null;
          created_at?: string;
          document_academic_year?: string | null;
          document_path?: string;
          document_student_number?: string | null;
          document_type?: Database["public"]["Enums"]["document_type"];
          file_sha256?: string | null;
          id?: string;
          note?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["verification_request_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_verifications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_responses: {
        Row: {
          benefit_types: string[];
          categories: string[];
          contact_ok: boolean;
          created_at: string;
          min_discount: string | null;
          missing: string | null;
          modules: string[];
          monthly_budget: string | null;
          nps: number | null;
          partners: string | null;
          payment_pref: string | null;
          rating: number | null;
          source: string | null;
          understood: string | null;
          updated_at: string;
          user_id: string;
          version: number;
          would_pay: string | null;
          would_use: string | null;
        };
        Insert: {
          benefit_types?: string[];
          categories?: string[];
          contact_ok?: boolean;
          created_at?: string;
          min_discount?: string | null;
          missing?: string | null;
          modules?: string[];
          monthly_budget?: string | null;
          nps?: number | null;
          partners?: string | null;
          payment_pref?: string | null;
          rating?: number | null;
          source?: string | null;
          understood?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
          would_pay?: string | null;
          would_use?: string | null;
        };
        Update: {
          benefit_types?: string[];
          categories?: string[];
          contact_ok?: boolean;
          created_at?: string;
          min_discount?: string | null;
          missing?: string | null;
          modules?: string[];
          monthly_budget?: string | null;
          nps?: number | null;
          partners?: string | null;
          payment_pref?: string | null;
          rating?: number | null;
          source?: string | null;
          understood?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
          would_pay?: string | null;
          would_use?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "survey_responses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      universities: {
        Row: {
          approved_at: string | null;
          city_id: number | null;
          contact_email: string | null;
          country_code: string;
          created_at: string;
          faculties: string[];
          id: number;
          is_active: boolean;
          name: string;
          partner_status: string;
          short_name: string | null;
          slug: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          approved_at?: string | null;
          city_id?: number | null;
          contact_email?: string | null;
          country_code: string;
          created_at?: string;
          faculties?: string[];
          id?: never;
          is_active?: boolean;
          name: string;
          partner_status?: string;
          short_name?: string | null;
          slug: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          approved_at?: string | null;
          city_id?: number | null;
          contact_email?: string | null;
          country_code?: string;
          created_at?: string;
          faculties?: string[];
          id?: never;
          is_active?: boolean;
          name?: string;
          partner_status?: string;
          short_name?: string | null;
          slug?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "universities_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "universities_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["code"];
          },
        ];
      };
      university_announcements: {
        Row: {
          audience: string;
          body: string;
          created_at: string;
          created_by: string | null;
          faculty: string | null;
          id: string;
          recipients: number;
          study_level: string | null;
          title: string;
          university_id: number;
        };
        Insert: {
          audience: string;
          body: string;
          created_at?: string;
          created_by?: string | null;
          faculty?: string | null;
          id?: string;
          recipients?: number;
          study_level?: string | null;
          title: string;
          university_id: number;
        };
        Update: {
          audience?: string;
          body?: string;
          created_at?: string;
          created_by?: string | null;
          faculty?: string | null;
          id?: string;
          recipients?: number;
          study_level?: string | null;
          title?: string;
          university_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "university_announcements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_announcements_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      university_applications: {
        Row: {
          city_id: number | null;
          contact_name: string;
          contact_title: string | null;
          created_at: string;
          email: string;
          has_api: boolean;
          id: string;
          message: string | null;
          phone: string;
          reviewed_at: string | null;
          status: string;
          student_count: number | null;
          university_id: number | null;
          university_name: string;
        };
        Insert: {
          city_id?: number | null;
          contact_name: string;
          contact_title?: string | null;
          created_at?: string;
          email: string;
          has_api?: boolean;
          id?: string;
          message?: string | null;
          phone: string;
          reviewed_at?: string | null;
          status?: string;
          student_count?: number | null;
          university_id?: number | null;
          university_name: string;
        };
        Update: {
          city_id?: number | null;
          contact_name?: string;
          contact_title?: string | null;
          created_at?: string;
          email?: string;
          has_api?: boolean;
          id?: string;
          message?: string | null;
          phone?: string;
          reviewed_at?: string | null;
          status?: string;
          student_count?: number | null;
          university_id?: number | null;
          university_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "university_applications_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_applications_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      university_branding: {
        Row: {
          accent_color: string;
          logo_url: string | null;
          motto: string | null;
          official_name: string | null;
          primary_color: string;
          secondary_color: string;
          university_id: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          accent_color?: string;
          logo_url?: string | null;
          motto?: string | null;
          official_name?: string | null;
          primary_color?: string;
          secondary_color?: string;
          university_id: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          accent_color?: string;
          logo_url?: string | null;
          motto?: string | null;
          official_name?: string | null;
          primary_color?: string;
          secondary_color?: string;
          university_id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "university_branding_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: true;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_branding_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      university_card_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          fields: string[];
          id: string;
          is_active: boolean;
          labels: NonNullable<Json>;
          layout: string;
          university_id: number;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          fields?: string[];
          id?: string;
          is_active?: boolean;
          labels?: NonNullable<Json>;
          layout?: string;
          university_id: number;
          version: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          fields?: string[];
          id?: string;
          is_active?: boolean;
          labels?: NonNullable<Json>;
          layout?: string;
          university_id?: number;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "university_card_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_card_templates_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      university_imports: {
        Row: {
          academic_year: string;
          created_at: string;
          file_name: string | null;
          id: string;
          imported_by: string | null;
          matched_count: number;
          purge_after: string;
          row_count: number;
          skipped_count: number;
          status: string;
          university_id: number;
        };
        Insert: {
          academic_year: string;
          created_at?: string;
          file_name?: string | null;
          id?: string;
          imported_by?: string | null;
          matched_count?: number;
          purge_after: string;
          row_count?: number;
          skipped_count?: number;
          status?: string;
          university_id: number;
        };
        Update: {
          academic_year?: string;
          created_at?: string;
          file_name?: string | null;
          id?: string;
          imported_by?: string | null;
          matched_count?: number;
          purge_after?: string;
          row_count?: number;
          skipped_count?: number;
          status?: string;
          university_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "university_imports_imported_by_fkey";
            columns: ["imported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_imports_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      university_integrations: {
        Row: {
          agreement_reference: string | null;
          agreement_signed_at: string | null;
          auth_type: string;
          base_url: string | null;
          field_mapping: NonNullable<Json>;
          last_call_at: string | null;
          last_test_at: string | null;
          last_test_message: string | null;
          last_test_ok: boolean | null;
          provider: string;
          secret_ref: string | null;
          status: string;
          university_id: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          agreement_reference?: string | null;
          agreement_signed_at?: string | null;
          auth_type?: string;
          base_url?: string | null;
          field_mapping?: NonNullable<Json>;
          last_call_at?: string | null;
          last_test_at?: string | null;
          last_test_message?: string | null;
          last_test_ok?: boolean | null;
          provider?: string;
          secret_ref?: string | null;
          status?: string;
          university_id: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          agreement_reference?: string | null;
          agreement_signed_at?: string | null;
          auth_type?: string;
          base_url?: string | null;
          field_mapping?: NonNullable<Json>;
          last_call_at?: string | null;
          last_test_at?: string | null;
          last_test_message?: string | null;
          last_test_ok?: boolean | null;
          provider?: string;
          secret_ref?: string | null;
          status?: string;
          university_id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "university_integrations_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: true;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_integrations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      university_members: {
        Row: {
          created_at: string;
          invited_by: string | null;
          role: string;
          university_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          invited_by?: string | null;
          role?: string;
          university_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          invited_by?: string | null;
          role?: string;
          university_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "university_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_members_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      university_roster_entries: {
        Row: {
          academic_year: string;
          birth_date_hash: string | null;
          department: string | null;
          faculty: string | null;
          first_name_hash: string | null;
          id: number;
          import_id: string;
          last_name_hash: string;
          program: string | null;
          student_number_hash: string;
          study_level: string | null;
          university_id: number;
        };
        Insert: {
          academic_year: string;
          birth_date_hash?: string | null;
          department?: string | null;
          faculty?: string | null;
          first_name_hash?: string | null;
          id?: never;
          import_id: string;
          last_name_hash: string;
          program?: string | null;
          student_number_hash: string;
          study_level?: string | null;
          university_id: number;
        };
        Update: {
          academic_year?: string;
          birth_date_hash?: string | null;
          department?: string | null;
          faculty?: string | null;
          first_name_hash?: string | null;
          id?: never;
          import_id?: string;
          last_name_hash?: string;
          program?: string | null;
          student_number_hash?: string;
          study_level?: string | null;
          university_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "university_roster_entries_import_id_fkey";
            columns: ["import_id"];
            isOneToOne: false;
            referencedRelation: "university_imports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_roster_entries_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      university_vetting: {
        Row: {
          accreditation_date: string | null;
          accreditation_ref: string | null;
          accreditation_source: string | null;
          callback_person: string | null;
          callback_phone: string | null;
          callback_source: string | null;
          decided_at: string | null;
          decided_by: string | null;
          decision_note: string | null;
          document_path: string | null;
          legal_name: string | null;
          mandate_checked: boolean;
          official_email: string | null;
          official_phone: string | null;
          signatory_name: string | null;
          signatory_title: string | null;
          submitted_at: string | null;
          submitted_by: string | null;
          university_id: number;
        };
        Insert: {
          accreditation_date?: string | null;
          accreditation_ref?: string | null;
          accreditation_source?: string | null;
          callback_person?: string | null;
          callback_phone?: string | null;
          callback_source?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          document_path?: string | null;
          legal_name?: string | null;
          mandate_checked?: boolean;
          official_email?: string | null;
          official_phone?: string | null;
          signatory_name?: string | null;
          signatory_title?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          university_id: number;
        };
        Update: {
          accreditation_date?: string | null;
          accreditation_ref?: string | null;
          accreditation_source?: string | null;
          callback_person?: string | null;
          callback_phone?: string | null;
          callback_source?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          document_path?: string | null;
          legal_name?: string | null;
          mandate_checked?: boolean;
          official_email?: string | null;
          official_phone?: string | null;
          signatory_name?: string | null;
          signatory_title?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          university_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "university_vetting_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_vetting_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "university_vetting_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: true;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      uny_id_counters: {
        Row: {
          country_code: string;
          last_value: number;
          year: number;
        };
        Insert: {
          country_code: string;
          last_value?: number;
          year: number;
        };
        Update: {
          country_code?: string;
          last_value?: number;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "uny_id_counters_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["code"];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      academic_year_end: { Args: Record<PropertyKey, never>; Returns: string };
      academic_year_end_of: { Args: { p_year: string }; Returns: string };
      admin_set_role: { Args: { p_role: Database["public"]["Enums"]["user_role"]; p_user_id: string }; Returns: undefined };
      admin_set_verification: {
        Args: { p_status: Database["public"]["Enums"]["verification_status"]; p_user_id: string };
        Returns: undefined;
      };
      admin_set_verification_impl: {
        Args: { p_status: Database["public"]["Enums"]["verification_status"]; p_user_id: string };
        Returns: undefined;
      };
      admin_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_stats_impl: { Args: Record<PropertyKey, never>; Returns: Json };
      ai_action_hash: { Args: { p_action: string; p_params: Json }; Returns: string };
      ai_approval_consume: { Args: { p_action: string; p_approval: string; p_params: Json }; Returns: undefined };
      ai_approval_decide: { Args: { p_approval: string; p_approve: boolean }; Returns: undefined };
      ai_approval_request: { Args: { p_action: string; p_agent: string; p_params: Json; p_user: string }; Returns: string };
      ai_close: {
        Args: {
          p_cost: number;
          p_error?: string;
          p_input: number;
          p_model: string;
          p_outcome: string;
          p_output: number;
          p_run: string;
        };
        Returns: boolean;
      };
      ai_configure: {
        Args: { p_agent: string; p_budget: number; p_enabled: boolean; p_max_day: number; p_max_user_day: number };
        Returns: undefined;
      };
      ai_finish: {
        Args: {
          p_cost: number;
          p_error?: string;
          p_input: number;
          p_model: string;
          p_ok: boolean;
          p_output: number;
          p_run: string;
        };
        Returns: undefined;
      };
      ai_mark_stale: { Args: { p_minutes?: number }; Returns: number };
      ai_reconcile: { Args: { p_cost: number; p_note: string; p_run: string }; Returns: undefined };
      ai_reserve: { Args: { p_agent: string; p_estimated_cost: number; p_user: string }; Returns: Json };
      allocate_student_email: {
        Args: { p_user: string };
        Returns: {
          activated_at: string | null;
          address: string | null;
          created_at: string;
          created_by: string | null;
          domain: string;
          id: string;
          last_synced_at: string | null;
          local_part: string;
          provider: string;
          provider_account_ref: string | null;
          status: Database["public"]["Enums"]["student_email_status"];
          status_changed_at: string;
          university_id: number | null;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "student_email_accounts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      apply_student_email_policy: { Args: Record<PropertyKey, never>; Returns: number };
      approve_university: {
        Args: {
          p_accreditation_source: string;
          p_callback_person: string;
          p_callback_phone: string;
          p_callback_source: string;
          p_mandate_checked: boolean;
          p_note?: string;
          p_university: number;
        };
        Returns: undefined;
      };
      backup_snapshot: { Args: Record<PropertyKey, never>; Returns: Json };
      card_template_fields: { Args: Record<PropertyKey, never>; Returns: string[] };
      claim_promo_code: { Args: { p_deal: string }; Returns: Json };
      current_academic_year: { Args: Record<PropertyKey, never>; Returns: string };
      data_watch_digest: { Args: Record<PropertyKey, never>; Returns: undefined };
      deal_discount_label: { Args: { p_kind: string; p_value: number }; Returns: string };
      deal_flash_remaining: { Args: { p_deal: string }; Returns: number };
      deal_student_price: { Args: { p_kind: string; p_price: number; p_value: number }; Returns: number };
      deals_trending: {
        Args: { p_limit?: number };
        Returns: {
          deal_id: string;
          score: number;
        }[];
      };
      declare_promo_payment: { Args: { p_code: string; p_reference: string }; Returns: undefined };
      expire_enrollments: { Args: Record<PropertyKey, never>; Returns: number };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_approved: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_partner_manager: { Args: { p_partner: string }; Returns: boolean };
      is_partner_member: { Args: { p_partner: string }; Returns: boolean };
      is_university_member: { Args: { p_university: number }; Returns: boolean };
      is_university_workspace_member: { Args: { p_university: number }; Returns: boolean };
      loyalty_add_visit: { Args: { p_amount: number; p_partner: string; p_student: string }; Returns: Json };
      loyalty_status: { Args: { p_partner: string; p_student: string; p_unlocked?: boolean }; Returns: Json };
      moderate_listing: { Args: { p_decision: string; p_item: string; p_note?: string }; Returns: undefined };
      my_hidden_sellers: { Args: Record<PropertyKey, never>; Returns: string[] };
      new_promo_code: { Args: Record<PropertyKey, never>; Returns: string };
      next_uny_id: { Args: { p_country: string }; Returns: string };
      open_online_offer: { Args: { p_deal: string }; Returns: Json };
      ops_alert_update: { Args: { p_alert: string; p_note?: string; p_status: string }; Returns: undefined };
      ops_job_begin: { Args: { p_job: string; p_key: string; p_max?: number }; Returns: Json };
      ops_job_finish: { Args: { p_error?: string; p_ok: boolean; p_result?: Json; p_run: string }; Returns: undefined };
      ops_metrics: { Args: { p_days?: number }; Returns: Json };
      ops_queues: { Args: Record<PropertyKey, never>; Returns: Json };
      ops_raise: {
        Args: { p_details: Json; p_fingerprint: string; p_rule: string; p_severity: string; p_title: string };
        Returns: undefined;
      };
      ops_run_checks: { Args: Record<PropertyKey, never>; Returns: Json };
      partner_deal_stats: { Args: { p_partner: string }; Returns: Json };
      partner_gift_loyalty: { Args: { p_card: string; p_kind: string; p_partner: string }; Returns: Json };
      partner_gift_loyalty_impl: { Args: { p_card: string; p_kind: string; p_partner: string }; Returns: Json };
      partner_job_applications: {
        Args: { p_job: string };
        Returns: {
          created_at: string;
          email: string;
          field_of_study: string;
          first_name: string;
          id: string;
          last_name: string;
          message: string;
          phone: string;
          study_level: string;
          university: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
        }[];
      };
      partner_redeem_promo_code: {
        Args: {
          p_amount?: number;
          p_code: string;
          p_partner: string;
          p_payment_method?: string;
          p_redeem?: boolean;
          p_reference?: string;
        };
        Returns: Json;
      };
      partner_top_customers: {
        Args: { p_limit?: number; p_partner: string };
        Returns: {
          avatar_url: string;
          card_id: string;
          first_name: string;
          last_initial: string;
          last_visit_at: string;
          rewards_available: number;
          rewards_used: number;
          stamps: number;
          total_spent_gnf: number;
          total_visits: number;
          uny_id: string;
        }[];
      };
      partner_top_customers_impl: {
        Args: { p_limit?: number; p_partner: string };
        Returns: {
          avatar_url: string;
          card_id: string;
          first_name: string;
          last_initial: string;
          last_visit_at: string;
          rewards_available: number;
          rewards_used: number;
          stamps: number;
          total_spent_gnf: number;
          total_visits: number;
          uny_id: string;
        }[];
      };
      partner_use_reward: { Args: { p_card: string; p_partner: string }; Returns: Json };
      partner_validate_card: { Args: { p_deal?: string; p_partner: string; p_token?: string; p_uny_id?: string }; Returns: Json };
      partner_weekly_report: { Args: Record<PropertyKey, never>; Returns: number };
      publish_card_template: {
        Args: { p_fields: string[]; p_labels?: Json; p_layout: string; p_university: number };
        Returns: {
          created_at: string;
          created_by: string | null;
          fields: string[];
          id: string;
          is_active: boolean;
          labels: NonNullable<Json>;
          layout: string;
          university_id: number;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "university_card_templates";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      report_listing: { Args: { p_details?: string; p_item: string; p_reason: string }; Returns: Json };
      review_signups: { Args: { p_decision: string; p_ids: string[]; p_note?: string }; Returns: number };
      review_verification: {
        Args: {
          p_academic_year?: string;
          p_approve: boolean;
          p_checks?: Json;
          p_reason?: string;
          p_student_number?: string;
          p_verification_id: string;
        };
        Returns: {
          checks: Json | null;
          created_at: string;
          document_academic_year: string | null;
          document_path: string;
          document_student_number: string | null;
          document_type: Database["public"]["Enums"]["document_type"];
          file_sha256: string | null;
          id: string;
          note: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["verification_request_status"];
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_verifications";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      review_verification_impl: {
        Args: { p_approve: boolean; p_reason?: string; p_verification_id: string };
        Returns: {
          checks: Json | null;
          created_at: string;
          document_academic_year: string | null;
          document_path: string;
          document_student_number: string | null;
          document_type: Database["public"]["Enums"]["document_type"];
          file_sha256: string | null;
          id: string;
          note: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["verification_request_status"];
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_verifications";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      seller_public_info: {
        Args: { p_ids: string[] };
        Returns: {
          avatar_url: string;
          display_name: string;
          id: string;
          university: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
        }[];
      };
      send_survey_reminders: { Args: Record<PropertyKey, never>; Returns: number };
      set_enrollment_status: {
        Args: {
          p_details?: Json;
          p_enrollment: string;
          p_method?: Database["public"]["Enums"]["verification_method"];
          p_reason?: string;
          p_source_ref?: string;
          p_status: Database["public"]["Enums"]["enrollment_status"];
        };
        Returns: {
          academic_year: string;
          claimed_birth_date: string | null;
          claimed_first_name: string;
          claimed_last_name: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          department: string | null;
          expires_at: string | null;
          faculty: string | null;
          id: string;
          match_details: Json | null;
          method: Database["public"]["Enums"]["verification_method"] | null;
          program: string | null;
          rejection_reason: string | null;
          source_ref: string | null;
          status: Database["public"]["Enums"]["enrollment_status"];
          student_number: string;
          student_number_norm: string | null;
          study_level: string | null;
          university_id: number;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_enrollments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_enrollment_status_impl: {
        Args: {
          p_details?: Json;
          p_enrollment: string;
          p_method?: Database["public"]["Enums"]["verification_method"];
          p_reason?: string;
          p_source_ref?: string;
          p_status: Database["public"]["Enums"]["enrollment_status"];
        };
        Returns: {
          academic_year: string;
          claimed_birth_date: string | null;
          claimed_first_name: string;
          claimed_last_name: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          department: string | null;
          expires_at: string | null;
          faculty: string | null;
          id: string;
          match_details: Json | null;
          method: Database["public"]["Enums"]["verification_method"] | null;
          program: string | null;
          rejection_reason: string | null;
          source_ref: string | null;
          status: Database["public"]["Enums"]["enrollment_status"];
          student_number: string;
          student_number_norm: string | null;
          study_level: string | null;
          university_id: number;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_enrollments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      slugify: { Args: { p: string }; Returns: string };
      submit_enrollment: {
        Args: {
          p_department?: string;
          p_faculty?: string;
          p_program?: string;
          p_student_number: string;
          p_study_level?: string;
          p_university: number;
        };
        Returns: {
          academic_year: string;
          claimed_birth_date: string | null;
          claimed_first_name: string;
          claimed_last_name: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          department: string | null;
          expires_at: string | null;
          faculty: string | null;
          id: string;
          match_details: Json | null;
          method: Database["public"]["Enums"]["verification_method"] | null;
          program: string | null;
          rejection_reason: string | null;
          source_ref: string | null;
          status: Database["public"]["Enums"]["enrollment_status"];
          student_number: string;
          student_number_norm: string | null;
          study_level: string | null;
          university_id: number;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "student_enrollments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      support_answer: { Args: { p_answer: string; p_conversation: string; p_request_id: string }; Returns: Json };
      support_notify: { Args: { p_conversation: string }; Returns: boolean };
      support_retry_notification: { Args: { p_conversation: string }; Returns: boolean };
      touch_last_seen: { Args: Record<PropertyKey, never>; Returns: undefined };
      track_view: { Args: { p_id: string; p_type: Database["public"]["Enums"]["view_entity"] }; Returns: undefined };
      university_audience: {
        Args: { p_audience: string; p_faculty?: string; p_level?: string; p_university: number };
        Returns: {
          user_id: string;
        }[];
      };
      university_audience_count: {
        Args: { p_audience: string; p_faculty?: string; p_level?: string; p_university: number };
        Returns: number;
      };
      university_can: { Args: { p_action: string; p_university: number }; Returns: boolean };
      university_declared_count: { Args: { p_university: number }; Returns: Json };
      university_declared_students: {
        Args: { p_university: number };
        Returns: {
          created_at: string;
          enrollment_status: Database["public"]["Enums"]["enrollment_status"];
          field_of_study: string;
          first_name: string;
          last_name: string;
          study_level: string;
          user_id: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
        }[];
      };
      university_declared_students_impl: {
        Args: { p_university: number };
        Returns: {
          created_at: string;
          enrollment_status: Database["public"]["Enums"]["enrollment_status"];
          field_of_study: string;
          first_name: string;
          last_name: string;
          study_level: string;
          user_id: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
        }[];
      };
      university_enrollments: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_search?: string;
          p_status?: Database["public"]["Enums"]["enrollment_status"][];
          p_university: number;
        };
        Returns: {
          academic_year: string;
          avatar_url: string;
          birth_date: string;
          card_status: Database["public"]["Enums"]["card_status"];
          created_at: string;
          decided_at: string;
          department: string;
          expires_at: string;
          faculty: string;
          first_name: string;
          id: string;
          last_name: string;
          match_details: Json;
          method: Database["public"]["Enums"]["verification_method"];
          program: string;
          rejection_reason: string;
          status: Database["public"]["Enums"]["enrollment_status"];
          student_number: string;
          study_level: string;
          total: number;
          uny_id: string;
          user_id: string;
        }[];
      };
      university_enrollments_impl: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_search?: string;
          p_status?: Database["public"]["Enums"]["enrollment_status"][];
          p_university: number;
        };
        Returns: {
          academic_year: string;
          avatar_url: string;
          birth_date: string;
          card_status: Database["public"]["Enums"]["card_status"];
          created_at: string;
          decided_at: string;
          department: string;
          expires_at: string;
          faculty: string;
          first_name: string;
          id: string;
          last_name: string;
          match_details: Json;
          method: Database["public"]["Enums"]["verification_method"];
          program: string;
          rejection_reason: string;
          status: Database["public"]["Enums"]["enrollment_status"];
          student_number: string;
          study_level: string;
          total: number;
          uny_id: string;
          user_id: string;
        }[];
      };
      university_invite_declared: { Args: { p_university: number }; Returns: number };
      university_invite_declared_impl: { Args: { p_university: number }; Returns: number };
      university_send_announcement: {
        Args: { p_audience: string; p_body: string; p_faculty?: string; p_level?: string; p_title: string; p_university: number };
        Returns: number;
      };
      university_send_announcement_impl: {
        Args: { p_audience: string; p_body: string; p_faculty?: string; p_level?: string; p_title: string; p_university: number };
        Returns: number;
      };
      university_stats: { Args: { p_university: number }; Returns: Json };
      university_submit_vetting: {
        Args: {
          p_accreditation_date: string;
          p_accreditation_ref: string;
          p_document_path: string;
          p_legal_name: string;
          p_official_email: string;
          p_official_phone: string;
          p_signatory_name: string;
          p_signatory_title: string;
          p_university: number;
        };
        Returns: undefined;
      };
      university_workspace_role: { Args: { p_university: number }; Returns: string };
      verify_card: {
        Args: { p_token: string };
        Returns: {
          academic_year: string;
          avatar_url: string;
          card_status: Database["public"]["Enums"]["card_status"];
          expires_at: string;
          field_of_study: string;
          first_name: string;
          last_name: string;
          university: string;
          uny_id: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
        }[];
      };
      verify_card_details: {
        Args: { p_token: string };
        Returns: {
          academic_year: string;
          avatar_url: string;
          card_status: Database["public"]["Enums"]["card_status"];
          expires_at: string;
          field_of_study: string;
          first_name: string;
          last_name: string;
          university: string;
          university_color: string;
          university_logo: string;
          uny_id: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
        }[];
      };
    };
    Enums: {
      card_status: "active" | "revoked" | "expired";
      deal_category: "restauration" | "shopping" | "transport" | "sport" | "sante" | "tech" | "formation" | "loisirs";
      document_type: "student_card" | "enrollment_certificate" | "registration_certificate" | "other";
      enrollment_status: "pending" | "verified" | "rejected" | "expired" | "manual_review" | "incomplete";
      housing_type: "studio" | "chambre" | "colocation" | "appartement";
      item_condition: "neuf" | "comme_neuf" | "bon_etat" | "usage";
      job_type: "job" | "stage" | "alternance" | "freelance" | "benevolat" | "concours" | "bourse" | "formation";
      listing_status: "active" | "sold" | "hidden" | "removed";
      market_category: "smartphones" | "informatique" | "livres" | "fournitures" | "mode" | "maison" | "transport" | "autres";
      student_email_status: "pending" | "active" | "suspended" | "alumni" | "disabled";
      user_role: "student" | "admin" | "partner" | "university";
      verification_method: "api" | "import" | "portal" | "document" | "manual";
      verification_request_status: "pending" | "approved" | "rejected";
      verification_status: "unverified" | "pending" | "verified";
      view_entity: "deal" | "job" | "housing" | "marketplace";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      card_status: ["active", "revoked", "expired"],
      deal_category: ["restauration", "shopping", "transport", "sport", "sante", "tech", "formation", "loisirs"],
      document_type: ["student_card", "enrollment_certificate", "registration_certificate", "other"],
      enrollment_status: ["pending", "verified", "rejected", "expired", "manual_review", "incomplete"],
      housing_type: ["studio", "chambre", "colocation", "appartement"],
      item_condition: ["neuf", "comme_neuf", "bon_etat", "usage"],
      job_type: ["job", "stage", "alternance", "freelance", "benevolat", "concours", "bourse", "formation"],
      listing_status: ["active", "sold", "hidden", "removed"],
      market_category: ["smartphones", "informatique", "livres", "fournitures", "mode", "maison", "transport", "autres"],
      student_email_status: ["pending", "active", "suspended", "alumni", "disabled"],
      user_role: ["student", "admin", "partner", "university"],
      verification_method: ["api", "import", "portal", "document", "manual"],
      verification_request_status: ["pending", "approved", "rejected"],
      verification_status: ["unverified", "pending", "verified"],
      view_entity: ["deal", "job", "housing", "marketplace"],
    },
  },
} as const;
