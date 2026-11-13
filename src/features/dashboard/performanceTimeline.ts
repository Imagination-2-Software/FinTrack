export type DisplayCurrency = 'USD' | 'INR';

export interface TimelineInvestmentLike {
  id?: string;
  asset_name: string;
  symbol: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  current_price: number;
  previous_close_price?: number | null;
  currency: DisplayCurrency;
}

export interface TimelineTransactionLike {
  id?: string;
  currency?: DisplayCurrency | null;
  transaction_date: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_amount: number;
}

export type TimeFilter = '7D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface TimelineDataPoint {
  date: string; // YYYY-MM-DD
  label: string; // readable e.g. "Nov 10"
  invested: number;
  value: number;
}

export interface PortfolioTimelineResult {
  points: TimelineDataPoint[];
  hasData: boolean;
  timeFilter: TimeFilter;
  startDate: string;
  endDate: string;
  startValue: number;
  endValue: number;
  changeAmount: number;
  changePercentage: number | null;
  emptyReason?: string;
}

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
  const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
  return new Date(year, month, day);
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Builds an accurate portfolio timeline based on actual stored investments and transactions.
 * Calculates capital invested over time and applies recorded current prices.
 */
export function buildPortfolioTimeline(
  investments: TimelineInvestmentLike[],
  transactions: TimelineTransactionLike[],
  timeFilter: TimeFilter,
  currency?: DisplayCurrency
): PortfolioTimelineResult {
  const filteredInvestments = currency
    ? investments.filter((inv) => inv.currency === currency)
    : investments;

  const filteredTransactions = currency
    ? transactions.filter((tx) => !tx.currency || tx.currency === currency)
    : transactions;

  if (filteredInvestments.length === 0) {
    const today = toISODateString(new Date());
    return {
      points: [],
      hasData: false,
      timeFilter,
      startDate: today,
      endDate: today,
      startValue: 0,
      endValue: 0,
      changeAmount: 0,
      changePercentage: null,
      emptyReason: 'No investments recorded.',
    };
  }

  // Calculate current totals
  const totalCurrentValue = filteredInvestments.reduce(
    (sum, inv) => sum + Number(inv.quantity) * Number(inv.current_price),
    0
  );
  const totalInvested = filteredInvestments.reduce(
    (sum, inv) => sum + Number(inv.quantity) * Number(inv.purchase_price),
    0
  );

  const now = new Date();
  const todayStr = toISODateString(now);

  // Determine window start date
  let windowStart = new Date(now);
  switch (timeFilter) {
    case '7D':
      windowStart.setDate(now.getDate() - 7);
      break;
    case '1M':
      windowStart.setMonth(now.getMonth() - 1);
      break;
    case '3M':
      windowStart.setMonth(now.getMonth() - 3);
      break;
    case '6M':
      windowStart.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      windowStart.setFullYear(now.getFullYear() - 1);
      break;
    case 'ALL':
    default: {
      const allDates = [
        ...filteredInvestments.map((i) => i.purchase_date),
        ...filteredTransactions.map((t) => t.transaction_date),
      ].filter(Boolean);
      if (allDates.length > 0) {
        allDates.sort();
        windowStart = parseDate(allDates[0]);
      } else {
        windowStart.setMonth(now.getMonth() - 1);
      }
      break;
    }
  }

  const windowStartStr = toISODateString(windowStart);

  // Collect milestone dates
  const dateEventMap = new Map<string, { investedDelta: number }>();

  filteredInvestments.forEach((inv) => {
    const date = inv.purchase_date || todayStr;
    const existing = dateEventMap.get(date) ?? { investedDelta: 0 };
    existing.investedDelta += Number(inv.quantity) * Number(inv.purchase_price);
    dateEventMap.set(date, existing);
  });

  const sortedDates = Array.from(dateEventMap.keys()).sort();
  const timelinePoints: TimelineDataPoint[] = [];

  if (sortedDates.length > 0 && windowStartStr < sortedDates[0]) {
    timelinePoints.push({
      date: windowStartStr,
      label: formatDateLabel(windowStart),
      invested: 0,
      value: 0,
    });
  }

  let runningInvested = 0;
  for (const dateStr of sortedDates) {
    const event = dateEventMap.get(dateStr)!;
    runningInvested += event.investedDelta;

    if (dateStr >= windowStartStr && dateStr <= todayStr) {
      const d = parseDate(dateStr);
      timelinePoints.push({
        date: dateStr,
        label: formatDateLabel(d),
        invested: Math.round(runningInvested * 100) / 100,
        value:
          dateStr === todayStr
            ? Math.round(totalCurrentValue * 100) / 100
            : Math.round(runningInvested * 100) / 100,
      });
    }
  }

  const hasToday = timelinePoints.some((p) => p.date === todayStr);
  if (!hasToday) {
    timelinePoints.push({
      date: todayStr,
      label: formatDateLabel(now),
      invested: Math.round(totalInvested * 100) / 100,
      value: Math.round(totalCurrentValue * 100) / 100,
    });
  }

  if (timelinePoints.length === 1) {
    const solePoint = timelinePoints[0];
    timelinePoints.unshift({
      date: windowStartStr,
      label: formatDateLabel(windowStart),
      invested: solePoint.invested,
      value: solePoint.invested,
    });
  }

  const startValue = timelinePoints[0]?.value ?? 0;
  const endValue = timelinePoints[timelinePoints.length - 1]?.value ?? totalCurrentValue;
  const changeAmount = endValue - startValue;
  const changePercentage = startValue > 0 ? (changeAmount / startValue) * 100 : null;

  return {
    points: timelinePoints,
    hasData: timelinePoints.length > 0,
    timeFilter,
    startDate: windowStartStr,
    endDate: todayStr,
    startValue,
    endValue,
    changeAmount,
    changePercentage,
  };
}
