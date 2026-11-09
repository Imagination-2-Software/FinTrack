import React from 'react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto',
        className
      )}
    >
      {icon && (
        <div className="h-14 w-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-white tracking-tight">{title}</h4>
      <p className="mt-1.5 text-sm text-slate-400 leading-relaxed max-w-sm">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
