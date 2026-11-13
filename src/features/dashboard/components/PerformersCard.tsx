import React from 'react';
import { Award, AlertTriangle } from 'lucide-react';
import type { DisplayCurrency, InvestmentRow } from '@/types';
import { calculateInvestment, formatMoney } from '@/features/investments/format';

interface PerformersCardProps {
  investments: InvestmentRow[];
  currency: DisplayCurrency;
}

export const PerformersCard: React.FC<PerformersCardProps> = ({ investments, currency }) => {
  const filtered = investments.filter((inv) => inv.currency === currency && Number(inv.quantity) > 0);

  const calculated = filtered
    .map((inv) => ({
      investment: inv,
      metrics: calculateInvestment(inv),
    }))
    .filter((item) => item.metrics.profitLossPercentage !== null)
    .sort((a, b) => (b.metrics.profitLossPercentage ?? 0) - (a.metrics.profitLossPercentage ?? 0));

  const topPerformer = calculated.length > 0 ? calculated[0] : null;
  const bottomPerformer =
    calculated.length > 1
      ? calculated[calculated.length - 1]
      : null;

  return (
    <section
      aria-labelledby="performers-heading"
      className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-4">
        <div>
          <h2 id="performers-heading" className="text-base font-semibold text-white">
            Performance Leaders &amp; Drawdowns
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Top performing holding vs holding requiring attention
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Top Performer */}
        <div className="flex flex-col justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <Award className="h-4 w-4" />
                Top Performer
              </span>
              {topPerformer && (
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  +{(topPerformer.metrics.profitLossPercentage ?? 0).toFixed(2)}%
                </span>
              )}
            </div>

            {topPerformer ? (
              <div className="mt-3">
                <p className="truncate text-base font-bold text-white">
                  {topPerformer.investment.asset_name}
                </p>
                <p className="text-xs text-slate-400">
                  {topPerformer.investment.symbol} &bull; {topPerformer.investment.asset_type}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">No active positions recorded.</p>
            )}
          </div>

          {topPerformer && (
            <div className="mt-4 border-t border-slate-800/60 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">Unrealized Gain</span>
              <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                +{formatMoney(topPerformer.metrics.profitLoss, currency)}
              </span>
            </div>
          )}
        </div>

        {/* Needs Attention / Worst Performer */}
        <div className="flex flex-col justify-between rounded-xl border border-rose-500/20 bg-rose-950/10 p-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-400">
                <AlertTriangle className="h-4 w-4" />
                Needs Attention
              </span>
              {bottomPerformer && (
                <span
                  className={`font-mono text-xs font-semibold ${
                    (bottomPerformer.metrics.profitLossPercentage ?? 0) < 0
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {(bottomPerformer.metrics.profitLossPercentage ?? 0) >= 0 ? '+' : ''}
                  {(bottomPerformer.metrics.profitLossPercentage ?? 0).toFixed(2)}%
                </span>
              )}
            </div>

            {bottomPerformer ? (
              <div className="mt-3">
                <p className="truncate text-base font-bold text-white">
                  {bottomPerformer.investment.asset_name}
                </p>
                <p className="text-xs text-slate-400">
                  {bottomPerformer.investment.symbol} &bull; {bottomPerformer.investment.asset_type}
                </p>
              </div>
            ) : topPerformer ? (
              <div className="mt-3 text-xs text-slate-400">
                <p>Only one position active.</p>
                <p className="mt-1 text-slate-500">Add more holdings to track relative drawdown.</p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">No active positions recorded.</p>
            )}
          </div>

          {bottomPerformer && (
            <div className="mt-4 border-t border-slate-800/60 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">Net Return</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  bottomPerformer.metrics.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {bottomPerformer.metrics.profitLoss >= 0 ? '+' : ''}
                {formatMoney(bottomPerformer.metrics.profitLoss, currency)}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
