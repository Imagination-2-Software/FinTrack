import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePortfolioHealth } from '../src/features/dashboard/portfolioHealth.ts';
import { buildPortfolioTimeline } from '../src/features/dashboard/performanceTimeline.ts';
import { calculateGoalProgress, generateSmartInsights } from '../src/features/dashboard/smartInsights.ts';

const mockInvestments = [
  {
    id: 'inv-1',
    user_id: 'user-1',
    asset_name: 'Apple Inc.',
    symbol: 'AAPL',
    asset_type: 'Stocks',
    quantity: 10,
    purchase_price: 150,
    purchase_date: '2026-01-10',
    current_price: 200,
    previous_close_price: 195,
    currency: 'USD',
    notes: null,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'inv-2',
    user_id: 'user-1',
    asset_name: 'Vanguard S&P 500 ETF',
    symbol: 'VOO',
    asset_type: 'ETFs',
    quantity: 5,
    purchase_price: 400,
    purchase_date: '2026-02-15',
    current_price: 450,
    previous_close_price: 440,
    currency: 'USD',
    notes: null,
    created_at: '2026-02-15T00:00:00Z',
    updated_at: '2026-02-15T00:00:00Z',
  },
  {
    id: 'inv-3',
    user_id: 'user-1',
    asset_name: 'Bitcoin',
    symbol: 'BTC',
    asset_type: 'Cryptocurrency',
    quantity: 0.1,
    purchase_price: 50000,
    purchase_date: '2026-03-01',
    current_price: 60000,
    previous_close_price: null, // baseline pending
    currency: 'USD',
    notes: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
];

const mockTransactions = [
  {
    id: 'tx-1',
    user_id: 'user-1',
    investment_id: 'inv-1',
    asset_symbol: 'AAPL',
    asset_name: 'Apple Inc.',
    transaction_type: 'BUY',
    quantity: 10,
    price: 150,
    total_amount: 1500,
    currency: 'USD',
    transaction_date: '2026-01-10',
    notes: null,
    performed_by: 'user-1',
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'tx-2',
    user_id: 'user-1',
    investment_id: 'inv-2',
    asset_symbol: 'VOO',
    asset_name: 'Vanguard S&P 500 ETF',
    transaction_type: 'BUY',
    quantity: 5,
    price: 400,
    total_amount: 2000,
    currency: 'USD',
    transaction_date: '2026-02-15',
    notes: null,
    performed_by: 'user-1',
    created_at: '2026-02-15T00:00:00Z',
  },
];

test('calculatePortfolioHealth calculates transparent diversification breakdown', () => {
  const health = calculatePortfolioHealth(mockInvestments, 'USD');

  assert.equal(health.activeHoldingsCount, 3);
  // AAPL: 10 * 200 = 2000, VOO: 5 * 450 = 2250, BTC: 0.1 * 60000 = 6000. Total = 10250
  // 3 qualifying asset classes (Stocks, ETFs, Crypto each > 5%) -> 30 pts
  assert.equal(health.assetClassesCount, 3);
  assert.equal(health.assetSpreadScore, 30);
  assert.ok(health.overallScore > 0 && health.overallScore <= 100);
  assert.ok(health.explanations.length >= 2);
  assert.equal(health.topHoldingName, 'Bitcoin');
});

test('calculatePortfolioHealth handles empty holdings gracefully', () => {
  const health = calculatePortfolioHealth([], 'USD');
  assert.equal(health.overallScore, 0);
  assert.equal(health.activeHoldingsCount, 0);
  assert.equal(health.topHoldingName, null);
});

test('buildPortfolioTimeline returns chronological points and calculates delta', () => {
  const timeline = buildPortfolioTimeline(mockInvestments, mockTransactions, 'ALL', 'USD');
  assert.equal(timeline.hasData, true);
  assert.ok(timeline.points.length >= 2);
  assert.ok(timeline.endValue >= timeline.startValue);
});

test('buildPortfolioTimeline handles empty state correctly', () => {
  const timeline = buildPortfolioTimeline([], [], '7D', 'USD');
  assert.equal(timeline.hasData, false);
  assert.equal(timeline.points.length, 0);
  assert.equal(timeline.startValue, 0);
  assert.equal(timeline.endValue, 0);
});

test('calculateGoalProgress tracks target, percentage, and remaining amount', () => {
  const goal = calculateGoalProgress(7500, 10000, 'USD');
  assert.equal(goal.targetAmount, 10000);
  assert.equal(goal.currentAmount, 7500);
  assert.equal(goal.percentage, 75);
  assert.equal(goal.remaining, 2500);
  assert.equal(goal.isAchieved, false);

  const completedGoal = calculateGoalProgress(12000, 10000, 'USD');
  assert.equal(completedGoal.percentage, 100);
  assert.equal(completedGoal.remaining, 0);
  assert.equal(completedGoal.isAchieved, true);
});

test('generateSmartInsights produces data-driven observations without AI hallucination', () => {
  const insights = generateSmartInsights(mockInvestments, mockTransactions, 'USD');
  assert.ok(insights.length >= 2);

  // Checks capital appreciation
  const gainInsight = insights.find((i) => i.id === 'overall-gain');
  assert.ok(gainInsight);
  assert.match(gainInsight.description, /gain of/i);

  // Checks baseline pending observation
  const baselineInsight = insights.find((i) => i.id === 'baseline-pending');
  assert.ok(baselineInsight);
  assert.match(baselineInsight.description, /previous close/i);
});
