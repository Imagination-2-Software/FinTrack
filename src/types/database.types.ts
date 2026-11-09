// FinTrack Database Type Definitions
// Strongly typed representations of Supabase PostgreSQL tables, views, and functions

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'user';
export type DisplayCurrency = 'USD' | 'INR';
export type AssetType = 'Stocks' | 'Mutual Funds' | 'ETFs' | 'Commodities' | 'Cryptocurrency';
export type TransactionType = 'BUY' | 'SELL';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          display_currency: DisplayCurrency;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          display_currency?: DisplayCurrency;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          display_currency?: DisplayCurrency;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      investments: {
        Row: {
          id: string;
          user_id: string;
          asset_name: string;
          asset_type: AssetType;
          symbol: string;
          quantity: number;
          purchase_price: number;
          purchase_date: string;
          current_price: number;
          previous_close_price: number | null;
          currency: DisplayCurrency;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_name: string;
          asset_type: AssetType;
          symbol: string;
          quantity: number;
          purchase_price: number;
          purchase_date: string;
          current_price: number;
          previous_close_price?: number | null;
          currency?: DisplayCurrency;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_name?: string;
          asset_type?: AssetType;
          symbol?: string;
          quantity?: number;
          purchase_price?: number;
          purchase_date?: string;
          current_price?: number;
          previous_close_price?: number | null;
          currency?: DisplayCurrency;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'investments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          investment_id: string | null;
          asset_symbol: string;
          asset_name: string;
          transaction_type: TransactionType;
          quantity: number;
          price: number;
          total_amount: number;
          currency: DisplayCurrency | null;
          transaction_date: string;
          notes: string | null;
          performed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          investment_id?: string | null;
          asset_symbol: string;
          asset_name: string;
          transaction_type: TransactionType;
          quantity: number;
          price: number;
          total_amount: number;
          currency?: DisplayCurrency | null;
          transaction_date: string;
          notes?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          investment_id?: string | null;
          asset_symbol?: string;
          asset_name?: string;
          transaction_type?: TransactionType;
          quantity?: number;
          price?: number;
          total_amount?: number;
          currency?: DisplayCurrency | null;
          transaction_date?: string;
          notes?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_investment_id_fkey';
            columns: ['investment_id'];
            referencedRelation: 'investments';
            referencedColumns: ['id'];
          }
        ];
      };
      watchlist: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          asset_name: string;
          asset_type: AssetType;
          target_price: number | null;
          current_price: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          asset_name: string;
          asset_type: AssetType;
          target_price?: number | null;
          current_price?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          asset_name?: string;
          asset_type?: AssetType;
          target_price?: number | null;
          current_price?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'watchlist_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_active_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      record_transaction: {
        Args: {
          p_investment_id: string;
          p_transaction_type: string;
          p_quantity: number;
          p_price: number;
          p_transaction_date: string;
          p_notes?: string | null;
        };
        Returns: {
          id: string;
          user_id: string;
          investment_id: string | null;
          asset_symbol: string;
          asset_name: string;
          transaction_type: TransactionType;
          quantity: number;
          price: number;
          total_amount: number;
          currency: DisplayCurrency | null;
          transaction_date: string;
          notes: string | null;
          created_at: string;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Domain Model Exports
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type InvestmentRow = Database['public']['Tables']['investments']['Row'];
export type InvestmentInsert = Database['public']['Tables']['investments']['Insert'];
export type InvestmentUpdate = Database['public']['Tables']['investments']['Update'];

export type TransactionRow = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

export type WatchlistRow = Database['public']['Tables']['watchlist']['Row'];
export type WatchlistInsert = Database['public']['Tables']['watchlist']['Insert'];
export type WatchlistUpdate = Database['public']['Tables']['watchlist']['Update'];
