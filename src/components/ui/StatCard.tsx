import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface StatCardProps {
  title: string;
  value: string;
  changeAmount?: string;
  changePercentage?: number | null;
  baselinePending?: boolean;
  baselineNote?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  changeAmount,
  changePercentage,
  baselinePending = false,
  baselineNote,
  icon,
  tooltip,
  className,
}) => {
  const isPositive = typeof changePercentage === 'number' && changePercentage > 0;
  const isNegative = typeof changePercentage === 'number' && changePercentage < 0;
  const isZero = typeof changePercentage === 'number' && changePercentage === 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 backdrop-blur-md shadow-xl transition-all duration-200 hover:border-slate-700/80',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {icon && (
          <div className="h-9 w-9 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-300">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
          {value}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {baselinePending ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-amber-400">
            <HelpCircle className="h-3 w-3" />
            <span>{baselineNote || 'Pending Baseline'}</span>
          </span>
        ) : typeof changePercentage === 'number' ? (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold',
              isPositive && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              isNegative && 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
              isZero && 'bg-slate-800 text-slate-400 border border-slate-700'
            )}
          >
            {isPositive && <ArrowUpRight className="h-3.5 w-3.5" />}
            {isNegative && <ArrowDownRight className="h-3.5 w-3.5" />}
            {isZero && <Minus className="h-3.5 w-3.5" />}
            <span>
              {isPositive ? '+' : ''}
              {changePercentage.toFixed(2)}%
            </span>
            {changeAmount && (
              <span className="opacity-80 font-normal">({changeAmount})</span>
            )}
          </div>
        ) : null}

        {tooltip && <span className="text-[11px] text-slate-500">{tooltip}</span>}
      </div>
    </div>
  );
};
