import React from 'react';
import { TrendingUp, ShieldCheck, Database, Terminal } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              FinTrack
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              v0.1.0 Beta
            </span>
          </div>
        </div>

        {/* System Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
            <Terminal className="h-3.5 w-3.5 text-brand-400" />
            <span className="text-slate-400">API:</span>
            <span className="text-emerald-400 font-medium">Serverless Ready</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
            <Database className="h-3.5 w-3.5 text-brand-400" />
            <span className="text-slate-400">DB:</span>
            {isSupabaseConfigured ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                Pending Keys
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-2 border-l border-slate-800">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">RLS Protected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
