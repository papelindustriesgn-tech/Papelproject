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
      profiles: {
        Row: {
          avatar_url: string | null;
          birth_date: string | null;
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
      student_cards: {
        Row: {
          academic_year: string;
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
            foreignKeyName: "student_cards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
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
      universities: {
        Row: {
          city_id: number | null;
          country_code: string;
          created_at: string;
          id: number;
          is_active: boolean;
          name: string;
          short_name: string | null;
        };
        Insert: {
          city_id?: number | null;
          country_code: string;
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name: string;
          short_name?: string | null;
        };
        Update: {
          city_id?: number | null;
          country_code?: string;
          created_at?: string;
          id?: never;
          is_active?: boolean;
          name?: string;
          short_name?: string | null;
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
      admin_set_role: { Args: { p_role: Database["public"]["Enums"]["user_role"]; p_user_id: string }; Returns: undefined };
      admin_set_verification: {
        Args: { p_status: Database["public"]["Enums"]["verification_status"]; p_user_id: string };
        Returns: undefined;
      };
      admin_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      current_academic_year: { Args: Record<PropertyKey, never>; Returns: string };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      next_uny_id: { Args: { p_country: string }; Returns: string };
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
      touch_last_seen: { Args: Record<PropertyKey, never>; Returns: undefined };
      track_view: { Args: { p_id: string; p_type: Database["public"]["Enums"]["view_entity"] }; Returns: undefined };
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
    };
    Enums: {
      card_status: "active" | "revoked";
      deal_category: "restauration" | "shopping" | "transport" | "sport" | "sante" | "tech" | "formation" | "loisirs";
      document_type: "student_card" | "enrollment_certificate" | "registration_certificate" | "other";
      housing_type: "studio" | "chambre" | "colocation" | "appartement";
      item_condition: "neuf" | "comme_neuf" | "bon_etat" | "usage";
      job_type: "job" | "stage" | "alternance" | "freelance" | "benevolat" | "concours" | "bourse" | "formation";
      listing_status: "active" | "sold" | "hidden" | "removed";
      market_category: "smartphones" | "informatique" | "livres" | "fournitures" | "mode" | "maison" | "transport" | "autres";
      user_role: "student" | "admin";
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
      card_status: ["active", "revoked"],
      deal_category: ["restauration", "shopping", "transport", "sport", "sante", "tech", "formation", "loisirs"],
      document_type: ["student_card", "enrollment_certificate", "registration_certificate", "other"],
      housing_type: ["studio", "chambre", "colocation", "appartement"],
      item_condition: ["neuf", "comme_neuf", "bon_etat", "usage"],
      job_type: ["job", "stage", "alternance", "freelance", "benevolat", "concours", "bourse", "formation"],
      listing_status: ["active", "sold", "hidden", "removed"],
      market_category: ["smartphones", "informatique", "livres", "fournitures", "mode", "maison", "transport", "autres"],
      user_role: ["student", "admin"],
      verification_request_status: ["pending", "approved", "rejected"],
      verification_status: ["unverified", "pending", "verified"],
      view_entity: ["deal", "job", "housing", "marketplace"],
    },
  },
} as const;
