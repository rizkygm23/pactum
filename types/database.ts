/**
 * Hand-maintained Supabase Database types for the Pactum schema
 * (supabase/migrations/001…006). Mirrors the `_pactum` tables the app reads
 * and writes, in the same shape `supabase gen types typescript` emits.
 * Update by hand when a migration changes the schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users_pactum: {
        Row: {
          id: string;
          email: string;
          password_hash: string | null;
          company_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash?: string | null;
          company_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string | null;
          company_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects_pactum: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          merchant_wallet_address: string | null;
          merchant_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          merchant_wallet_address?: string | null;
          merchant_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          merchant_wallet_address?: string | null;
          merchant_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_pactum_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users_pactum";
            referencedColumns: ["id"];
          },
        ];
      };
      api_keys_pactum: {
        Row: {
          id: string;
          project_id: string;
          key_hash: string;
          key_prefix: string;
          name: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          key_hash: string;
          key_prefix: string;
          name?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          key_hash?: string;
          key_prefix?: string;
          name?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_pactum_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects_pactum";
            referencedColumns: ["id"];
          },
        ];
      };
      policies_pactum: {
        Row: {
          id: string;
          project_id: string;
          spend_limit_daily: string;
          spend_limit_monthly: string;
          allowlist: Json | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          spend_limit_daily?: string | number;
          spend_limit_monthly?: string | number;
          allowlist?: Json | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          spend_limit_daily?: string | number;
          spend_limit_monthly?: string | number;
          allowlist?: Json | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "policies_pactum_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects_pactum";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_events_pactum: {
        Row: {
          id: string;
          api_key_id: string;
          endpoint: string | null;
          quantity: string | null;
          unit_price: string | null;
          cost: string | null;
          user_address: string | null;
          status: string | null;
          settled_tx_hash: string | null;
          idempotency_key: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          api_key_id: string;
          endpoint?: string | null;
          quantity?: string | number | null;
          unit_price?: string | number | null;
          cost?: string | number | null;
          user_address?: string | null;
          status?: string | null;
          settled_tx_hash?: string | null;
          idempotency_key: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          api_key_id?: string;
          endpoint?: string | null;
          quantity?: string | number | null;
          unit_price?: string | number | null;
          cost?: string | number | null;
          user_address?: string | null;
          status?: string | null;
          settled_tx_hash?: string | null;
          idempotency_key?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_events_pactum_api_key_id_fkey";
            columns: ["api_key_id"];
            isOneToOne: false;
            referencedRelation: "api_keys_pactum";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices_pactum: {
        Row: {
          id: string;
          project_id: string;
          period_start: string;
          period_end: string;
          total_amount: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          period_start: string;
          period_end: string;
          total_amount?: string | number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          period_start?: string;
          period_end?: string;
          total_amount?: string | number;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_pactum_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects_pactum";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions_pactum: {
        Row: {
          id: string;
          invoice_id: string;
          tx_hash: string;
          chain: string;
          amount: string;
          currency: string | null;
          status: string;
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          tx_hash: string;
          chain: string;
          amount?: string | number;
          currency?: string | null;
          status?: string;
          settled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          tx_hash?: string;
          chain?: string;
          amount?: string | number;
          currency?: string | null;
          status?: string;
          settled_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_pactum_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices_pactum";
            referencedColumns: ["id"];
          },
        ];
      };
      webhooks_pactum: {
        Row: {
          id: string;
          project_id: string;
          url: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          url: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          url?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhooks_pactum_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects_pactum";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations_pactum: {
        Row: {
          id: string;
          wallet_address: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages_pactum: {
        Row: {
          id: number;
          conversation_id: string;
          role: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          conversation_id: string;
          role: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          conversation_id?: string;
          role?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_pactum_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations_pactum";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
