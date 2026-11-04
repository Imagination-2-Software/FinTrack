// FinTrack Core Type Definitions

export type UserRole = 'investor' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type AssetCategory =
  | 'equity'
  | 'mutual_fund'
  | 'etf'
  | 'crypto'
  | 'fixed_income'
  | 'cash'
  | 'real_estate'
  | 'commodity';

export interface SystemStatus {
  api: 'operational' | 'degraded' | 'offline';
  database: 'connected' | 'unconfigured' | 'error';
  auth: 'ready' | 'pending';
}
