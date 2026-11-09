import React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'danger' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    brand: 'bg-brand-500/10 text-brand-400 border-brand-500/25',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
    default: 'bg-slate-800 text-slate-300 border-slate-700/80',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-0.5 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border tracking-wide uppercase',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
