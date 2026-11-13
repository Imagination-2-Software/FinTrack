import React, { useState } from 'react';
import { Target, CheckCircle2, TrendingUp, AlertCircle, Info, Edit3, Check } from 'lucide-react';
import type { DisplayCurrency, InvestmentRow, TransactionRow } from '@/types';
import { formatMoney } from '@/features/investments/format';
import {
  calculateGoalProgress,
  generateSmartInsights,
  getStoredGoal,
  saveStoredGoal,
} from '../smartInsights';

interface GoalsAndInsightsProps {
  investments: InvestmentRow[];
  transactions: TransactionRow[];
  currency: DisplayCurrency;
  currentValue: number;
  userId?: string;
}

export const GoalsAndInsights: React.FC<GoalsAndInsightsProps> = ({
  investments,
  transactions,
  currency,
  currentValue,
  userId,
}) => {
  const [targetAmount, setTargetAmount] = useState<number>(() =>
    getStoredGoal(userId, currency)
  );
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [inputGoal, setInputGoal] = useState<string>(String(targetAmount));

  const goal = calculateGoalProgress(currentValue, targetAmount, currency);
  const insights = generateSmartInsights(investments, transactions, currency);

  const handleSaveGoal = () => {
    const parsed = Number(inputGoal);
    if (Number.isFinite(parsed) && parsed > 0) {
      setTargetAmount(parsed);
      saveStoredGoal(userId, currency, parsed);
    }
    setIsEditingGoal(false);
  };

  const setPresetGoal = (amount: number) => {
    setTargetAmount(amount);
    setInputGoal(String(amount));
    saveStoredGoal(userId, currency, amount);
    setIsEditingGoal(false);
  };

  return (
    <section
      aria-labelledby="goals-insights-heading"
      className="grid gap-5 lg:grid-cols-2"
    >
      {/* Investment Goal Card */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/70 pb-4">
            <div>
              <h2 id="goals-insights-heading" className="text-base font-semibold text-white">
                Investment Goal Progress
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Track personal milestone target in {currency}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingGoal((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/70 text-slate-300 hover:text-white hover:border-slate-600 transition"
              title="Edit target milestone"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Goal Edit Panel */}
          {isEditingGoal && (
            <div className="mt-4 rounded-xl border border-brand-500/30 bg-brand-950/20 p-3 text-xs space-y-2.5">
              <label htmlFor="goal-input" className="font-semibold text-brand-300 block">
                Set Target Milestone ({currency}):
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="goal-input"
                  type="number"
                  min="1"
                  step="1000"
                  value={inputGoal}
                  onChange={(e) => setInputGoal(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-500 transition"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save</span>
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-slate-400">Presets:</span>
                {(currency === 'USD'
                  ? [25000, 50000, 100000, 250000]
                  : [1000000, 2500000, 5000000, 10000000]
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPresetGoal(preset)}
                    className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300 hover:bg-slate-700"
                  >
                    {formatMoney(preset, currency)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Goal Metrics */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400">Current Valuation</span>
                <div className="font-mono text-2xl font-bold text-white tabular-nums">
                  {formatMoney(goal.currentAmount, currency)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Target Goal</span>
                <div className="font-mono text-lg font-bold text-slate-300 tabular-nums">
                  {formatMoney(goal.targetAmount, currency)}
                </div>
              </div>
            </div>

            {/* Goal Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">
                  {goal.percentage.toFixed(1)}% Completed
                </span>
                <span className="text-slate-400">
                  {goal.isAchieved ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Milestone Achieved
                    </span>
                  ) : (
                    <span>{formatMoney(goal.remaining, currency)} remaining</span>
                  )}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    goal.isAchieved
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-brand-600 to-indigo-400'
                  }`}
                  style={{ width: `${goal.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-800/60 pt-3 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Target stored locally for your profile</span>
          <Target className="h-3.5 w-3.5 text-slate-500" />
        </div>
      </div>

      {/* Smart Data Insights Card */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/70 pb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Smart Portfolio Insights</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Factual observations synthesized from your recorded ledger
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/70 text-slate-300">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {insights.map((item) => {
              const isPositive = item.type === 'positive';
              const isWarning = item.type === 'warning';

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 text-xs transition ${
                    isPositive
                      ? 'border-emerald-500/20 bg-emerald-950/15 text-slate-200'
                      : isWarning
                      ? 'border-amber-500/20 bg-amber-950/15 text-slate-200'
                      : 'border-slate-800 bg-slate-950/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isPositive ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : isWarning ? (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                    ) : (
                      <Info className="h-4 w-4 shrink-0 text-brand-400" />
                    )}
                    <span className="font-semibold text-white">{item.title}</span>
                  </div>
                  <p className="mt-1 pl-6 leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 border-t border-slate-800/60 pt-3 text-[11px] text-slate-500">
          Pure deterministic analysis &bull; Zero fabricated forecasts
        </div>
      </div>
    </section>
  );
};
