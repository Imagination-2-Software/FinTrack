export type DisplayCurrency = 'USD' | 'INR';

export interface InsightInvestmentLike {
  id?: string;
  asset_name: string;
  symbol: string;
  asset_type: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  previous_close_price?: number | null;
  currency: DisplayCurrency;
}

export interface InsightTransactionLike {
  id?: string;
  currency?: DisplayCurrency | null;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_amount: number;
}

export interface InvestmentGoal {
  targetAmount: number;
  currentAmount: number;
  currency: DisplayCurrency;
  percentage: number;
  remaining: number;
  isAchieved: boolean;
}

export interface SmartInsight {
  id: string;
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
}

const DEFAULT_TARGETS: Record<DisplayCurrency, number> = {
  USD: 50000,
  INR: 2500000,
};

function formatCurrency(value: number, currency: DisplayCurrency): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getStoredGoal(userId: string | undefined, currency: DisplayCurrency): number {
  if (typeof window === 'undefined') return DEFAULT_TARGETS[currency];
  try {
    const key = `fintrack_goal_${userId || 'guest'}_${currency}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_TARGETS[currency];
}

export function saveStoredGoal(userId: string | undefined, currency: DisplayCurrency, amount: number): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `fintrack_goal_${userId || 'guest'}_${currency}`;
    localStorage.setItem(key, String(amount));
  } catch {
    // ignore
  }
}

export function calculateGoalProgress(
  currentAmount: number,
  targetAmount: number,
  currency: DisplayCurrency
): InvestmentGoal {
  const safeTarget = Math.max(1, targetAmount);
  const percentage = Math.min(100, Math.max(0, (currentAmount / safeTarget) * 100));
  const remaining = Math.max(0, safeTarget - currentAmount);
  const isAchieved = currentAmount >= safeTarget;

  return {
    targetAmount: safeTarget,
    currentAmount,
    currency,
    percentage,
    remaining,
    isAchieved,
  };
}

/**
 * Derives factual observations strictly from verified stored data.
 * Does NOT generate hallucinated advice or external market predictions.
 */
export function generateSmartInsights(
  investments: InsightInvestmentLike[],
  transactions: InsightTransactionLike[],
  currency: DisplayCurrency
): SmartInsight[] {
  const filtered = investments.filter((inv) => inv.currency === currency);
  if (filtered.length === 0) {
    return [
      {
        id: 'no-investments',
        type: 'info',
        title: 'Portfolio Initializing',
        description: 'Add your first holding to start receiving real-time portfolio analytics and insights.',
      },
    ];
  }

  const insights: SmartInsight[] = [];

  // 1. Overall Profitability Observation
  const totalInvested = filtered.reduce(
    (sum, inv) => sum + Number(inv.quantity) * Number(inv.purchase_price),
    0
  );
  const totalCurrent = filtered.reduce(
    (sum, inv) => sum + Number(inv.quantity) * Number(inv.current_price),
    0
  );
  const totalPL = totalCurrent - totalInvested;
  const plPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  if (totalInvested > 0) {
    if (totalPL > 0) {
      insights.push({
        id: 'overall-gain',
        type: 'positive',
        title: 'Capital Appreciation',
        description: `Your portfolio shows an unrealized gain of ${formatCurrency(totalPL, currency)} (+${plPercent.toFixed(2)}%) across ${filtered.length} active positions.`,
      });
    } else if (totalPL < 0) {
      insights.push({
        id: 'overall-loss',
        type: 'warning',
        title: 'Unrealized Drawdown',
        description: `Current positions have an unrealized loss of ${formatCurrency(Math.abs(totalPL), currency)} (${plPercent.toFixed(2)}%) relative to purchase basis.`,
      });
    } else {
      insights.push({
        id: 'overall-neutral',
        type: 'info',
        title: 'Cost Basis Parity',
        description: `Your portfolio valuation is currently at par with total capital invested (${formatCurrency(totalInvested, currency)}).`,
      });
    }
  }

  // 2. Asset Class Dominance Observation
  const classTotals = new Map<string, number>();
  filtered.forEach((inv) => {
    const val = Number(inv.quantity) * Number(inv.current_price);
    classTotals.set(inv.asset_type, (classTotals.get(inv.asset_type) ?? 0) + val);
  });

  const sortedClasses = Array.from(classTotals.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedClasses.length > 0 && totalCurrent > 0) {
    const [topClass, topClassVal] = sortedClasses[0];
    const topClassPercent = (topClassVal / totalCurrent) * 100;
    if (topClassPercent >= 60) {
      insights.push({
        id: 'class-concentration',
        type: 'warning',
        title: `Heavy ${topClass} Allocation`,
        description: `${topClass} accounts for ${topClassPercent.toFixed(1)}% of your total portfolio. Spreading across additional asset classes may reduce volatility.`,
      });
    } else {
      insights.push({
        id: 'class-balance',
        type: 'info',
        title: 'Multi-Asset Exposure',
        description: `Your capital is distributed across ${sortedClasses.length} asset classes, led by ${topClass} at ${topClassPercent.toFixed(1)}%.`,
      });
    }
  }

  // 3. Baseline Pricing Status Observation
  const pendingBaseline = filtered.filter(
    (inv) =>
      Number(inv.quantity) > 0 &&
      (inv.previous_close_price === null ||
        !Number.isFinite(Number(inv.previous_close_price)) ||
        Number(inv.previous_close_price) <= 0)
  );

  if (pendingBaseline.length > 0) {
    insights.push({
      id: 'baseline-pending',
      type: 'info',
      title: 'Previous Close Baseline',
      description: `${pendingBaseline.length} holding${pendingBaseline.length > 1 ? 's do' : ' does'} not have a previous close price recorded. Enter previous close prices in Investments to activate daily change calculations.`,
    });
  }

  // 4. Ledger Activity Observation
  const filteredTx = transactions.filter((t) => !t.currency || t.currency === currency);
  if (filteredTx.length > 0) {
    const buyCount = filteredTx.filter((t) => t.transaction_type === 'BUY').length;
    const sellCount = filteredTx.filter((t) => t.transaction_type === 'SELL').length;
    insights.push({
      id: 'ledger-activity',
      type: 'info',
      title: 'Ledger Audit Summary',
      description: `${filteredTx.length} total transaction${filteredTx.length > 1 ? 's' : ''} recorded (${buyCount} buys, ${sellCount} sells) maintaining full audit history.`,
    });
  }

  return insights;
}
