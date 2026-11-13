import React, { useState } from 'react';
import { ShieldCheck, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { DisplayCurrency, InvestmentRow } from '@/types';
import { calculatePortfolioHealth } from '../portfolioHealth';

interface PortfolioHealthCardProps {
  investments: InvestmentRow[];
  currency: DisplayCurrency;
}

export const PortfolioHealthCard: React.FC<PortfolioHealthCardProps> = ({
  investments,
  currency,
}) => {
  const [showFormula, setShowFormula] = useState(false);
  const health = calculatePortfolioHealth(investments, currency);

  return (
    <section
      aria-labelledby="portfolio-health-heading"
      className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-4">
        <div>
          <h2 id="portfolio-health-heading" className="text-base font-semibold text-white">
            Portfolio Health &amp; Diversification
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Algorithmic concentration and risk spread evaluation
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/70 text-slate-300">
          <ShieldCheck className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Score & Rating Bar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold text-white tabular-nums">
                {health.overallScore}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
            <div className={`mt-0.5 text-xs font-semibold ${health.ratingColor}`}>
              {health.rating}
            </div>
          </div>

          <div className="flex items-center gap-3 text-right text-xs">
            <div>
              <p className="text-slate-400">Asset Spread</p>
              <p className="font-mono font-bold text-white tabular-nums">
                {health.assetSpreadScore} / 50
              </p>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <p className="text-slate-400">Concentration Safety</p>
              <p className="font-mono font-bold text-white tabular-nums">
                {health.concentrationSafetyScore} / 50
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              health.overallScore >= 80
                ? 'bg-emerald-500'
                : health.overallScore >= 65
                ? 'bg-indigo-500'
                : health.overallScore >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(5, health.overallScore)}%` }}
          />
        </div>

        {/* Transparent Explanations */}
        <div className="space-y-1.5 rounded-xl border border-slate-800/70 bg-slate-950/40 p-3 text-xs">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-brand-400" />
            <span>Audit Breakdown:</span>
          </p>
          <ul className="space-y-1 pl-4 text-slate-400 list-disc">
            {health.explanations.map((exp, idx) => (
              <li key={idx}>{exp}</li>
            ))}
          </ul>
        </div>

        {/* Formula Toggle */}
        <button
          type="button"
          onClick={() => setShowFormula((prev) => !prev)}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition"
        >
          <span>{showFormula ? 'Hide calculation formula' : 'How is this score calculated?'}</span>
          {showFormula ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showFormula && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] text-slate-400 space-y-1.5 animate-fadeIn">
            <p className="font-medium text-slate-300">Deterministic Mathematical Methodology:</p>
            <p>
              &bull; <strong className="text-slate-200">Asset Spread (0–50 pts):</strong> 10 points awarded for each of the 5 recognized asset classes (Stocks, Mutual Funds, ETFs, Commodities, Crypto) holding at least 5% of portfolio value.
            </p>
            <p>
              &bull; <strong className="text-slate-200">Concentration Safety (0–50 pts):</strong> Max single holding &le; 20% yields full 50 pts. Concentration above 20% proportionately reduces the score down to 0 at 100% single-asset weight.
            </p>
            <p className="text-slate-500 italic">
              No machine-learning hallucinations or fabricated scores. Fully auditable from your recorded holdings.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
