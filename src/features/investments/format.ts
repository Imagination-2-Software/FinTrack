import type { DisplayCurrency, InvestmentRow } from '@/types';

export function formatMoney(value: number, currency: DisplayCurrency): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
}

export function calculateInvestment(investment: InvestmentRow) {
  const investedValue = Number(investment.quantity) * Number(investment.purchase_price);
  const currentValue = Number(investment.quantity) * Number(investment.current_price);
  const profitLoss = currentValue - investedValue;

  return {
    investedValue,
    currentValue,
    profitLoss,
    profitLossPercentage: investedValue === 0 ? null : (profitLoss / investedValue) * 100,
  };
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}