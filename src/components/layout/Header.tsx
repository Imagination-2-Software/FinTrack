import React from 'react';
import { NavLink } from 'react-router-dom';
import { TrendingUp, Star, Settings, Shield, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Header: React.FC = () => {
  const { user, profile, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

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

        {/* User Account Controls & Sign out */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
              <div className="h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <UserIcon className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium max-w-[150px] truncate">
                {profile?.full_name || user.email}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/80 transition"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
      {user && (
        <nav aria-label="Primary navigation" className="border-t border-slate-800/80">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            <NavLink
              to="/watchlist"
              className={({ isActive }) => `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Star className="h-4 w-4" />
              Watchlist
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) => `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Shield className="h-4 w-4" />
                Admin
              </NavLink>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
