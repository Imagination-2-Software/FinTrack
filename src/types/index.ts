// FinTrack Core Domain Types

export * from './database.types';

import type { AssetType, InvestmentRow, ProfileRow } from './database.types';

export interface UserProfile extends ProfileRow {}

export interface InvestmentWithCalculations extends InvestmentRow {
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
  // Nullable when baseline / previous close is unavailable (displayed as N/A / Pending Baseline)
  today_profit_loss: number | null;
  today_profit_loss_percentage: number | null;
}

export interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  total_profit_loss: number;
  total_profit_loss_percentage: number;
  today_profit_loss: number | null;
  today_profit_loss_percentage: number | null;
  total_assets_count: number;
}

export interface AssetAllocationItem {
  asset_type: AssetType;
  total_value: number;
  percentage: number;
  color: string;
}

export interface SystemStatus {
  api: 'operational' | 'degraded' | 'offline';
  database: 'connected' | 'unconfigured' | 'error';
  auth: 'ready' | 'pending';
}

export interface ExchangeRates {
  USD: number;
  INR: number;
  updated_at: string;
}
