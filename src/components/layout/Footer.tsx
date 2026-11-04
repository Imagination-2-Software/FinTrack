import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/60 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">FinTrack</span>
          <span>&bull;</span>
          <span>Professional Investment & Portfolio Management</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-2 py-1 rounded bg-slate-800/80 text-slate-400 font-mono text-[11px]">
            React 18 + Vite + TypeScript
          </span>
          <span className="px-2 py-1 rounded bg-slate-800/80 text-slate-400 font-mono text-[11px]">
            Supabase PostgreSQL
          </span>
          <span className="px-2 py-1 rounded bg-slate-800/80 text-slate-400 font-mono text-[11px]">
            Vercel
          </span>
        </div>
      </div>
    </footer>
  );
};
