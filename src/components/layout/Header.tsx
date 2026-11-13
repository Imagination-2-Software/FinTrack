import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  TrendingUp,
  LayoutDashboard,
  BriefcaseBusiness,
  ArrowLeftRight,
  Star,
  Settings,
  Shield,
  LogOut,
  User as UserIcon,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Header: React.FC = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/investments', label: 'Investments', icon: BriefcaseBusiness },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/watchlist', label: 'Watchlist', icon: Star },
    { to: '/settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2.5 transition opacity-95 hover:opacity-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-md shadow-brand-500/20">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                FinTrack
              </span>
              <span className="hidden rounded-full border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-300 md:inline-block">
                Portfolio
              </span>
            </div>
          </Link>

          {/* Desktop Primary Navigation */}
          {user && (
            <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${isActive
                        ? 'border border-brand-500/25 bg-brand-500/15 text-brand-300 shadow-sm'
                        : 'border border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/60 hover:text-slate-200'
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          )}
        </div>

        {/* User Account Controls & Sign out */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Preferred Currency Pill */}
            {profile?.display_currency && (
              <span className="hidden rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1 font-mono text-[11px] font-semibold text-slate-300 sm:inline-block">
                {profile.display_currency}
              </span>
            )}

            {/* User name tag */}
            <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold uppercase">
                {(profile?.full_name || user.email || 'U')[0]}
              </div>
              <span className="max-w-[130px] truncate font-medium">
                {profile?.full_name || user.email}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-rose-900/50 hover:bg-rose-500/10 hover:text-rose-300"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white md:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Navigation Dropdown */}
      {user && mobileMenuOpen && (
        <div className="border-b border-slate-800/80 bg-slate-950/95 px-4 py-3 md:hidden">
          <div className="mb-2 flex items-center justify-between border-b border-slate-800/60 pb-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate max-w-[200px]">{profile?.full_name || user.email}</span>
            </span>
            {profile?.display_currency && (
              <span className="font-mono font-semibold text-brand-300">
                {profile.display_currency}
              </span>
            )}
          </div>
          <nav className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${isActive
                      ? 'border border-brand-500/30 bg-brand-500/20 text-brand-300'
                      : 'border border-transparent text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
