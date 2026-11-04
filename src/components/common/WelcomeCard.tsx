import React from 'react';
import {
  ShieldCheck,
  Zap,
  Server,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export const WelcomeCard: React.FC = () => {
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-800/40 via-slate-900/60 to-slate-950 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-6">
            <Zap className="h-3.5 w-3.5 text-brand-400" />
            Phase 1 Scaffolding Ready
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Institutional-Grade{' '}
            <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              Portfolio Management
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
            Welcome to <strong className="text-white font-semibold">FinTrack</strong>. A modern,
            high-performance investment tracking platform built with React, Vite, TypeScript,
            Vercel Serverless, and Supabase PostgreSQL.
          </p>

          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-sm font-medium text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Project Scaffolded & Ready</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-sm font-medium text-slate-200">
              <Lock className="h-4 w-4 text-brand-400" />
              <span>RLS Security Model Prepared</span>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture & Infrastructure Status */}
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-brand-400" />
          System & Architecture Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Frontend Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Frontend Core</h3>
              <p className="text-sm text-slate-400 mt-1">
                React 18 + Vite + TypeScript with Tailwind CSS & Lucide icons.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">Bundle & Dev Server</span>
              <span className="text-emerald-400 font-medium">Ready</span>
            </div>
          </div>

          {/* Backend Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Server className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Vercel Serverless API</h3>
              <p className="text-sm text-slate-400 mt-1">
                Lightweight Node.js serverless functions running at the edge.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">Health Endpoint:</span>
              <code className="text-emerald-400 font-mono">/api/health</code>
            </div>
          </div>

          {/* Database Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Supabase PostgreSQL</h3>
              <p className="text-sm text-slate-400 mt-1">
                Sole database engine with Auth and Row Level Security isolation.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">Connection Status</span>
              {isSupabaseConfigured ? (
                <span className="text-emerald-400 font-medium">Configured</span>
              ) : (
                <span className="text-amber-400 font-medium">Pending (.env.local)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next Phase Roadmap Preview */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white mb-3">Implementation Roadmap</h3>
        <p className="text-sm text-slate-400 mb-6 max-w-2xl">
          FinTrack is built systematically according to the approved architecture. Here are the sequential milestones:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-emerald-500/30">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              Phase 1 &bull; Active
            </div>
            <div className="text-sm font-medium text-white">Project Scaffolding</div>
            <div className="text-xs text-slate-400 mt-1">Vite + React + TS, API foundation, Libs</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Phase 2
            </div>
            <div className="text-sm font-medium text-slate-200">Database & RLS</div>
            <div className="text-xs text-slate-400 mt-1">Supabase SQL migrations, Schema, Triggers</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Phase 3
            </div>
            <div className="text-sm font-medium text-slate-200">Supabase Auth</div>
            <div className="text-xs text-slate-400 mt-1">Sign-up, Login, Session Management, Guards</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Phase 4 & 5
            </div>
            <div className="text-sm font-medium text-slate-200">Portfolios & Analytics</div>
            <div className="text-xs text-slate-400 mt-1">Holdings, Transactions, Recharts dashboard</div>
          </div>
        </div>
      </div>
    </div>
  );
};
