export type AssetType = 'Stocks' | 'Mutual Funds' | 'ETFs' | 'Commodities' | 'Cryptocurrency';
export type DisplayCurrency = 'USD' | 'INR';

export interface InvestmentLike {
  id?: string;
  asset_name: string;
  symbol: string;
  asset_type: AssetType;
  quantity: number;
  purchase_price: number;
  current_price: number;
  previous_close_price?: number | null;
  currency: DisplayCurrency;
}

export interface HealthBreakdown {
  overallScore: number;
  rating: 'Excellent' | 'Good' | 'Moderate' | 'High Concentration';
  ratingColor: string;
  assetSpreadScore: number; // 0 - 50
  concentrationSafetyScore: number; // 0 - 50
  maxHoldingWeight: number; // percentage (0-100)
  topHoldingName: string | null;
  top3HoldingsWeight: number; // percentage (0-100)
  assetClassesCount: number;
  totalAssetClassesAvailable: number;
  activeHoldingsCount: number;
  explanations: string[];
}

export const ALL_ASSET_CLASSES: AssetType[] = [
  'Stocks',
  'Mutual Funds',
  'ETFs',
  'Commodities',
  'Cryptocurrency',
];

/**
 * Calculates a transparent, mathematically grounded Portfolio Health & Diversification Score.
 * No arbitrary numbers:
 * - Asset Spread (0-50 pts): 10 points per asset class that holds >= 5% of total value.
 * - Concentration Safety (0-50 pts):
 *     <= 20% max holding: 50 pts (safe diversification)
 *     20% - 35% max holding: 35-49 pts (moderate concentration)
 *     35% - 60% max holding: 15-34 pts (elevated concentration)
 *     > 60% max holding: 0-14 pts (heavy single-asset dependency)
 */
export function calculatePortfolioHealth(
  investments: InvestmentLike[],
  currency?: DisplayCurrency
): HealthBreakdown {
  const filtered = currency
    ? investments.filter((inv) => inv.currency === currency)
    : investments;

  const activeHoldings = filtered.filter((inv) => Number(inv.quantity) > 0);

  if (activeHoldings.length === 0) {
    return {
      overallScore: 0,
      rating: 'Moderate',
      ratingColor: 'text-slate-400',
      assetSpreadScore: 0,
      concentrationSafetyScore: 0,
      maxHoldingWeight: 0,
      topHoldingName: null,
      top3HoldingsWeight: 0,
      assetClassesCount: 0,
      totalAssetClassesAvailable: ALL_ASSET_CLASSES.length,
      activeHoldingsCount: 0,
      explanations: ['No active holdings recorded for this currency.'],
    };
  }

  // Calculate values
  const holdingValues = activeHoldings.map((inv) => ({
    name: inv.asset_name,
    symbol: inv.symbol,
    type: inv.asset_type,
    value: Math.max(0, Number(inv.quantity) * Number(inv.current_price)),
  }));

  const totalValue = holdingValues.reduce((sum, h) => sum + h.value, 0);

  if (totalValue <= 0) {
    return {
      overallScore: 20,
      rating: 'Moderate',
      ratingColor: 'text-amber-400',
      assetSpreadScore: 10,
      concentrationSafetyScore: 10,
      maxHoldingWeight: 0,
      topHoldingName: null,
      top3HoldingsWeight: 0,
      assetClassesCount: 1,
      totalAssetClassesAvailable: ALL_ASSET_CLASSES.length,
      activeHoldingsCount: activeHoldings.length,
      explanations: ['Portfolio has zero recorded positive market value.'],
    };
  }

  // Sort by value descending
  const sortedHoldings = [...holdingValues].sort((a, b) => b.value - a.value);
  const maxHolding = sortedHoldings[0];
  const maxHoldingWeight = (maxHolding.value / totalValue) * 100;

  const top3Value = sortedHoldings.slice(0, 3).reduce((sum, h) => sum + h.value, 0);
  const top3HoldingsWeight = (top3Value / totalValue) * 100;

  // Asset class distribution
  const classTotals = new Map<AssetType, number>();
  holdingValues.forEach((h) => {
    classTotals.set(h.type, (classTotals.get(h.type) ?? 0) + h.value);
  });

  // Meaningful asset class: has >= 5% of total portfolio value
  let qualifyingClasses = 0;
  classTotals.forEach((val) => {
    if ((val / totalValue) * 100 >= 5) {
      qualifyingClasses += 1;
    }
  });

  // If a class has < 5% but is the only holding, minimum 1 qualifying
  if (qualifyingClasses === 0 && classTotals.size > 0) {
    qualifyingClasses = 1;
  }

  // 1. Asset Spread Score: 10 pts per qualifying class (max 50)
  const assetSpreadScore = Math.min(50, qualifyingClasses * 10);

  // 2. Concentration Safety Score (0 - 50 pts)
  let concentrationSafetyScore: number;
  if (maxHoldingWeight <= 20) {
    // Highly diversified: full 50 pts
    concentrationSafetyScore = 50;
  } else if (maxHoldingWeight <= 35) {
    // 20% -> 50 pts, 35% -> 35 pts
    const ratio = (maxHoldingWeight - 20) / 15;
    concentrationSafetyScore = Math.round(50 - ratio * 15);
  } else if (maxHoldingWeight <= 60) {
    // 35% -> 35 pts, 60% -> 15 pts
    const ratio = (maxHoldingWeight - 35) / 25;
    concentrationSafetyScore = Math.round(35 - ratio * 20);
  } else {
    // > 60% -> 15 down to 0 at 100%
    const ratio = (maxHoldingWeight - 60) / 40;
    concentrationSafetyScore = Math.max(0, Math.round(15 - ratio * 15));
  }

  const overallScore = Math.min(100, Math.max(0, assetSpreadScore + concentrationSafetyScore));

  let rating: HealthBreakdown['rating'];
  let ratingColor: string;
  if (overallScore >= 80) {
    rating = 'Excellent';
    ratingColor = 'text-emerald-400';
  } else if (overallScore >= 65) {
    rating = 'Good';
    ratingColor = 'text-sky-400';
  } else if (overallScore >= 50) {
    rating = 'Moderate';
    ratingColor = 'text-amber-400';
  } else {
    rating = 'High Concentration';
    ratingColor = 'text-rose-400';
  }

  const explanations: string[] = [
    `Asset Spread (${assetSpreadScore}/50): ${qualifyingClasses} of ${ALL_ASSET_CLASSES.length} asset classes have significant allocation (>=5%).`,
    `Concentration Safety (${concentrationSafetyScore}/50): Largest single holding "${maxHolding.name}" represents ${maxHoldingWeight.toFixed(1)}% of your portfolio.`,
  ];

  if (activeHoldings.length >= 3) {
    explanations.push(
      `Top 3 holdings account for ${top3HoldingsWeight.toFixed(1)}% of total portfolio value.`
    );
  }

  if (maxHoldingWeight > 40) {
    explanations.push(
      `Notice: "${maxHolding.name}" exceeds 40% concentration. Consider rebalancing if your risk tolerance requires lower single-asset exposure.`
    );
  }

  return {
    overallScore,
    rating,
    ratingColor,
    assetSpreadScore,
    concentrationSafetyScore,
    maxHoldingWeight,
    topHoldingName: maxHolding.name,
    top3HoldingsWeight,
    assetClassesCount: qualifyingClasses,
    totalAssetClassesAvailable: ALL_ASSET_CLASSES.length,
    activeHoldingsCount: activeHoldings.length,
    explanations,
  };
}
