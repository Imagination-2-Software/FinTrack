import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className,
}) => {
  const configs = {
    info: {
      border: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
      icon: <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />,
      titleColor: 'text-sky-300',
    },
    success: {
      border: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />,
      titleColor: 'text-emerald-300',
    },
    warning: {
      border: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      icon: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />,
      titleColor: 'text-amber-300',
    },
    error: {
      border: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
      icon: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />,
      titleColor: 'text-rose-300',
    },
  };

  const current = configs[type];

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-4 text-sm flex gap-3 backdrop-blur-sm',
        current.border,
        className
      )}
    >
      {current.icon}
      <div className="flex-1">
        {title && <h5 className={cn('font-semibold mb-1', current.titleColor)}>{title}</h5>}
        <div className="text-xs sm:text-sm leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
