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
      deals: {
        Row: {
          category: Database["public"]["Enums"]["deal_category"];
          city_id: number | null;
          conditions: string;
          created_at: string;
          description: string;
          discount_label: string;
          district: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_demo: boolean;
          is_featured: boolean;
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
          category: Database["public"]["Enums"]["deal_category"];
          city_id?: number | null;
          conditions?: string;
          created_at?: string;
          description?: string;
          discount_label: string;
          district?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_demo?: boolean;
          is_featured?: boolean;
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
          category?: Database["public"]["Enums"]["deal_category"];
          city_id?: number | null;
          conditions?: string;
          created_at?: string;
          description?: string;
          discount_label?: string;
          district?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_demo?: boolean;
          is_featured?: boolean;
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
          user_id: string;
        };
        Insert: {
          created_at?: string;
          partner_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          partner_id?: string;
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
          expected_students: string;
          offer_types: string[];
          partner_id: string;
          payment_methods: string[];
          updated_at: string;
          would_pay: string;
        };
        Insert: {
          answered_by?: string | null;
          comments?: string | null;
          created_at?: string;
          discount_range: string;
          expectations?: string[];
          expected_students: string;
          offer_types?: string[];
          partner_id: string;
          payment_methods?: string[];
          updated_at?: string;
          would_pay: string;
        };
        Update: {
          answered_by?: string | null;
          comments?: string | null;
          created_at?: string;
          discount_range?: string;
          expectations?: string[];
          expected_students?: string;
          offer_types?: string[];
          partner_id?: string;
          payment_methods?: string[];
          updated_at?: string;
          would_pay?: string;
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
          role: Database["public"]["Enums"]["user_role"];
          study_level: string | null;
          university_id: number | null;
          university_other: string | null;
          uny_id: string;
          updated_at: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
        };
        Insert: {
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
          role?: Database["public"]["Enums"]["user_role"];
          study_level?: string | null;
          university_id?: number | null;
          university_other?: string | null;
          uny_id: string;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
        };
        Update: {
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
          role?: Database["public"]["Enums"]["user_role"];
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
          created_at: string;
          document_path: string;
          document_type: Database["public"]["Enums"]["document_type"];
          id: string;
          note: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["verification_request_status"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          document_path: string;
          document_type: Database["public"]["Enums"]["document_type"];
          id?: string;
          note?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["verification_request_status"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          document_path?: string;
          document_type?: Database["public"]["Enums"]["document_type"];
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
          updated_at: string;
          user_id: string;
          version: number;
          would_pay: string | null;
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
          updated_at?: string;
          user_id: string;
          version?: number;
          would_pay?: string | null;
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
          updated_at?: string;
          user_id?: string;
          version?: number;
          would_pay?: string | null;
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
          university_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          university_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          university_id?: number;
          user_id?: string;
        };
        Relationships: [
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
      admin_stats: { Args: Record<PropertyKey, never>; Returns: Json };
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
      card_template_fields: { Args: Record<PropertyKey, never>; Returns: string[] };
      claim_promo_code: { Args: { p_deal: string }; Returns: Json };
      current_academic_year: { Args: Record<PropertyKey, never>; Returns: string };
      declare_promo_payment: { Args: { p_code: string; p_reference: string }; Returns: undefined };
      expire_enrollments: { Args: Record<PropertyKey, never>; Returns: number };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_partner_member: { Args: { p_partner: string }; Returns: boolean };
      is_university_member: { Args: { p_university: number }; Returns: boolean };
      new_promo_code: { Args: Record<PropertyKey, never>; Returns: string };
      next_uny_id: { Args: { p_country: string }; Returns: string };
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
      partner_validate_card: { Args: { p_deal?: string; p_partner: string; p_token?: string; p_uny_id?: string }; Returns: Json };
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
      review_verification: {
        Args: { p_approve: boolean; p_reason?: string; p_verification_id: string };
        Returns: {
          created_at: string;
          document_path: string;
          document_type: Database["public"]["Enums"]["document_type"];
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
      touch_last_seen: { Args: Record<PropertyKey, never>; Returns: undefined };
      track_view: { Args: { p_id: string; p_type: Database["public"]["Enums"]["view_entity"] }; Returns: undefined };
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
      university_stats: { Args: { p_university: number }; Returns: Json };
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
      enrollment_status: "pending" | "verified" | "rejected" | "expired" | "manual_review";
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
      enrollment_status: ["pending", "verified", "rejected", "expired", "manual_review"],
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
