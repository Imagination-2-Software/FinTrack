import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { AssetType, InvestmentRow, ProfileRow, UserRole } from '@/types';
import { Modal } from '@/features/investments/components/Modal';
import { InvestmentForm } from '@/features/investments/components/InvestmentForm';
import { TransactionForm } from '@/features/investments/components/TransactionForm';
import type { InvestmentFormValues, TransactionFormValues } from '@/features/investments/schemas';
import {
  useAdminInvestmentMutations,
  useAdminProfileMutation,
  useAdminProfiles,
  useAdminUserMutations,
  useAllInvestments,
} from './hooks';
import type { AdminProfileChange } from './adminService';

type PendingRoleStatusAction =
  | { kind: 'role'; profile: ProfileRow; role: UserRole }
  | { kind: 'status'; profile: ProfileRow; isActive: boolean }
  | null;

const assetTypes: AssetType[] = ['Stocks', 'Mutual Funds', 'ETFs', 'Commodities', 'Cryptocurrency'];

const selectClassName =
  'rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50';

function memberSince(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'investments'>('users');

  // User queries & mutations
  const profilesQuery = useAdminProfiles();
  const profileMutation = useAdminProfileMutation();
  const userMutations = useAdminUserMutations();

  // Investment queries & mutations
  const investmentsQuery = useAllInvestments();
  const investmentMutations = useAdminInvestmentMutations();

  // Users filtering state
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DEACTIVATED'>('ALL');

  // Investment filtering state
  const [invSearch, setInvSearch] = useState('');
  const [invUserFilter, setInvUserFilter] = useState<string>('ALL');
  const [invTypeFilter, setInvTypeFilter] = useState<'ALL' | AssetType>('ALL');
  const [invDateFilter, setInvDateFilter] = useState<'ALL' | '30' | '90' | '365'>('ALL');

  // Modals state
  const [pendingRoleStatus, setPendingRoleStatus] = useState<PendingRoleStatusAction>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<ProfileRow | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<ProfileRow | null>(null);

  const [addHoldingTargetUserId, setAddHoldingTargetUserId] = useState<string | null>(null);
  const [editHoldingTarget, setEditHoldingTarget] = useState<InvestmentRow | null>(null);
  const [tradeHoldingTarget, setTradeHoldingTarget] = useState<InvestmentRow | null>(null);
  const [deleteHoldingTarget, setDeleteHoldingTarget] = useState<InvestmentRow | null>(null);

  // Message banners
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profiles = profilesQuery.data ?? [];
  const investments = investmentsQuery.data ?? [];

  const activeCount = profiles.filter((p) => p.is_active).length;
  const deactivatedCount = profiles.length - activeCount;

  // Filtered users
  const filteredProfiles = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    return profiles.filter((p) => {
      if (roleFilter !== 'ALL' && p.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !p.is_active) return false;
      if (statusFilter === 'DEACTIVATED' && p.is_active) return false;
      return !term || `${p.full_name ?? ''} ${p.email}`.toLowerCase().includes(term);
    });
  }, [profiles, roleFilter, statusFilter, userSearch]);

  // Filtered investments
  const filteredInvestments = useMemo(() => {
    const term = invSearch.trim().toLowerCase();
    const now = Date.now();
    return investments.filter((inv) => {
      if (invUserFilter !== 'ALL' && inv.user_id !== invUserFilter) return false;
      if (invTypeFilter !== 'ALL' && inv.asset_type !== invTypeFilter) return false;
      if (term && !`${inv.asset_name} ${inv.symbol}`.toLowerCase().includes(term)) return false;

      if (invDateFilter !== 'ALL') {
        const days = parseInt(invDateFilter, 10);
        const invDate = new Date(inv.purchase_date).getTime();
        const diffDays = (now - invDate) / (1000 * 60 * 60 * 24);
        if (diffDays > days) return false;
      }
      return true;
    });
  }, [investments, invSearch, invUserFilter, invTypeFilter, invDateFilter]);

  // Profile map for easy lookup
  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);

  // Handlers
  const confirmRoleStatusChange = async () => {
    if (!pendingRoleStatus) return;
    const change: AdminProfileChange =
      pendingRoleStatus.kind === 'role'
        ? { role: pendingRoleStatus.role }
        : { is_active: pendingRoleStatus.isActive };

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await profileMutation.mutateAsync({ profileId: pendingRoleStatus.profile.id, change });
      setSuccessMessage(
        pendingRoleStatus.kind === 'role'
          ? `${pendingRoleStatus.profile.email} role changed to ${pendingRoleStatus.role}.`
          : `${pendingRoleStatus.profile.email} ${pendingRoleStatus.isActive ? 'reactivated' : 'deactivated'}.`
      );
      setPendingRoleStatus(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The account update failed.');
    }
  };

  const handleCreateUser = async (email: string, fullName: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await userMutations.createUser.mutateAsync({ email, fullName });
      setShowAddUserModal(false);
      setSuccessMessage(
        `Invitation email sent to ${res.email}. The user must accept the invitation before signing in.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create user account.');
    }
  };

  const handleChangePassword = async (targetUserId: string, newPassword: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await userMutations.changePassword.mutateAsync({ targetUserId, newPassword });
      setPasswordTargetUser(null);
      setSuccessMessage('Password changed successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to change password.');
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await userMutations.deleteUser.mutateAsync(targetUserId);
      setDeleteTargetUser(null);
      setSuccessMessage('User account permanently deleted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete user account.');
    }
  };

  const handleCreateHolding = async (userId: string, values: InvestmentFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await investmentMutations.createHolding.mutateAsync({ userId, values });
      setAddHoldingTargetUserId(null);
      setSuccessMessage(`Holding ${values.symbol.toUpperCase()} added successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create investment.');
    }
  };

  const handleUpdateHolding = async (investmentId: string, values: InvestmentFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await investmentMutations.updateHolding.mutateAsync({ investmentId, values });
      setEditHoldingTarget(null);
      setSuccessMessage(`Holding ${values.symbol.toUpperCase()} updated.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update investment.');
    }
  };

  const handleDeleteHolding = async (investmentId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await investmentMutations.deleteHolding.mutateAsync(investmentId);
      setDeleteHoldingTarget(null);
      setSuccessMessage('Holding removed. Transaction history is preserved in the ledger.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete holding.');
    }
  };

  const handleRecordTrade = async (values: TransactionFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await investmentMutations.recordTrade.mutateAsync(values);
      setTradeHoldingTarget(null);
      setSuccessMessage(
        `${values.transaction_type} trade recorded atomically. Holding position and cost basis updated.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to record transaction.');
    }
  };

  const activeUsers = profiles.filter((p) => p.is_active);

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-rose-400">Administration Console</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Management &amp; Controls</h1>
          <p className="mt-2 text-sm text-slate-400">
            System administrative operations enforced by verified server-side credentials, RLS, and PostgreSQL triggers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => {
              void profilesQuery.refetch();
              void investmentsQuery.refetch();
            }}
            isLoading={profilesQuery.isFetching || investmentsQuery.isFetching}
          >
            Refresh
          </Button>
          {activeTab === 'users' ? (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddUserModal(true)}>
              Add user
            </Button>
          ) : (
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={activeUsers.length === 0}
              onClick={() => setAddHoldingTargetUserId(activeUsers[0]?.id ?? null)}
            >
              Add holding
            </Button>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === 'users'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          User Management ({profiles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('investments')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === 'investments'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <BriefcaseBusiness className="h-4 w-4" />
          Investments &amp; Trades ({investments.length})
        </button>
      </div>

      {errorMessage && (
        <Alert type="error" title="Action failed" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert type="success" title="Success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Registered users" value={profiles.length} icon={<Users className="h-5 w-5" />} />
            <SummaryCard label="Active users" value={activeCount} icon={<UserCheck className="h-5 w-5" />} tone="emerald" />
            <SummaryCard label="Deactivated users" value={deactivatedCount} icon={<UserX className="h-5 w-5" />} tone="amber" />
          </div>

          {profilesQuery.isLoading ? (
            <div className="space-y-4" aria-label="Loading users">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : profilesQuery.isError ? (
            <Alert type="error" title="Could not load users">
              <p>{profilesQuery.error instanceof Error ? profilesQuery.error.message : 'Administrator access is required.'}</p>
            </Alert>
          ) : profiles.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="No registered profiles" description="User profiles will appear here after accounts are created." />
          ) : (
            <>
              <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-[minmax(0,1fr)_180px_190px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    aria-label="Search users"
                    className="pl-9"
                    placeholder="Search name or email"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter by role"
                  className={selectClassName}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
                >
                  <option value="ALL">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
                <select
                  aria-label="Filter by account status"
                  className={selectClassName}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'DEACTIVATED')}
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </div>

              {filteredProfiles.length === 0 ? (
                <EmptyState
                  title="No matching users"
                  description="Try another search or filter."
                  action={
                    <button
                      type="button"
                      className="text-sm font-semibold text-brand-400 hover:text-brand-300"
                      onClick={() => {
                        setUserSearch('');
                        setRoleFilter('ALL');
                        setStatusFilter('ALL');
                      }}
                    >
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                          <tr>
                            <th className="px-4 py-3 font-medium">User</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Registered</th>
                            <th className="px-4 py-3 font-medium">Role Control</th>
                            <th className="px-4 py-3 font-medium">Status Control</th>
                            <th className="px-4 py-3 text-right font-medium">Account Security</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {filteredProfiles.map((p) => {
                            const isSelf = p.id === user?.id;
                            return (
                              <tr key={p.id} className="transition hover:bg-slate-900/80">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-white">
                                    {p.full_name || 'Name not set'}
                                    {isSelf && <span className="ml-2 text-xs text-brand-400 font-semibold">(You)</span>}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-400">{p.email}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant={p.role === 'admin' ? 'brand' : 'default'}>{p.role}</Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant={p.is_active ? 'success' : 'warning'}>
                                    {p.is_active ? 'Active' : 'Deactivated'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-slate-300">{memberSince(p.created_at)}</td>
                                <td className="px-4 py-3">
                                  <select
                                    aria-label={`Change role for ${p.email}`}
                                    className={selectClassName}
                                    value={p.role}
                                    disabled={isSelf}
                                    title={isSelf ? 'Self-demotion is strictly barred.' : undefined}
                                    onChange={(e) =>
                                      setPendingRoleStatus({ kind: 'role', profile: p, role: e.target.value as UserRole })
                                    }
                                  >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    size="sm"
                                    variant={p.is_active ? 'danger' : 'secondary'}
                                    disabled={isSelf}
                                    title={isSelf ? 'Self-deactivation is strictly barred.' : undefined}
                                    onClick={() =>
                                      setPendingRoleStatus({ kind: 'status', profile: p, isActive: !p.is_active })
                                    }
                                  >
                                    {p.is_active ? 'Deactivate' : 'Reactivate'}
                                  </Button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      title="Reset user password via Supabase Auth Admin"
                                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-brand-300"
                                      onClick={() => setPasswordTargetUser(p)}
                                    >
                                      <KeyRound className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      title={isSelf ? 'Self-deletion is blocked.' : 'Permanent account deletion'}
                                      disabled={isSelf}
                                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                      onClick={() => setDeleteTargetUser(p)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile user list */}
                  <ul className="grid gap-3 lg:hidden">
                    {filteredProfiles.map((p) => {
                      const isSelf = p.id === user?.id;
                      return (
                        <li key={p.id} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">
                                {p.full_name || 'Name not set'}
                                {isSelf && <span className="ml-2 text-xs text-brand-400">(You)</span>}
                              </p>
                              <p className="mt-1 break-all text-xs text-slate-400">{p.email}</p>
                            </div>
                            <Badge variant={p.is_active ? 'success' : 'warning'}>
                              {p.is_active ? 'Active' : 'Deactivated'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                            <Badge variant={p.role === 'admin' ? 'brand' : 'default'}>{p.role}</Badge>
                            <span className="text-xs text-slate-500">Joined {memberSince(p.created_at)}</span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <select
                              className={selectClassName}
                              value={p.role}
                              disabled={isSelf}
                              onChange={(e) =>
                                setPendingRoleStatus({ kind: 'role', profile: p, role: e.target.value as UserRole })
                              }
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <Button
                              size="sm"
                              variant={p.is_active ? 'danger' : 'secondary'}
                              disabled={isSelf}
                              onClick={() =>
                                setPendingRoleStatus({ kind: 'status', profile: p, isActive: !p.is_active })
                              }
                            >
                              {p.is_active ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          </div>
                          <div className="flex justify-end gap-2 border-t border-slate-800 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                              onClick={() => setPasswordTargetUser(p)}
                            >
                              Change password
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={isSelf}
                              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                              onClick={() => setDeleteTargetUser(p)}
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-right text-xs text-slate-500">
                    Showing {filteredProfiles.length} of {profiles.length} users
                  </p>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* TAB 2: INVESTMENTS & TRADES */}
      {activeTab === 'investments' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Total portfolio holdings"
              value={investments.length}
              icon={<BriefcaseBusiness className="h-5 w-5" />}
            />
            <SummaryCard
              label="Active investor accounts"
              value={new Set(investments.map((i) => i.user_id)).size}
              icon={<UserCheck className="h-5 w-5" />}
              tone="emerald"
            />
            <SummaryCard
              label="Unique asset tickers"
              value={new Set(investments.map((i) => i.symbol)).size}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="amber"
            />
          </div>

          {investmentsQuery.isLoading ? (
            <div className="space-y-4" aria-label="Loading investments">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : investmentsQuery.isError ? (
            <Alert type="error" title="Could not load investment records">
              <p>{investmentsQuery.error instanceof Error ? investmentsQuery.error.message : 'Please try again.'}</p>
            </Alert>
          ) : investments.length === 0 ? (
            <EmptyState
              icon={<BriefcaseBusiness className="h-6 w-6" />}
              title="No investment holdings recorded"
              description="Holdings added by investors or administrators will appear here."
            />
          ) : (
            <>
              {/* Search & Filters */}
              <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    aria-label="Search investments"
                    className="pl-9"
                    placeholder="Search symbol or asset"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter by investor"
                  className={selectClassName}
                  value={invUserFilter}
                  onChange={(e) => setInvUserFilter(e.target.value)}
                >
                  <option value="ALL">All investor accounts</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name ? `${p.full_name} (${p.email})` : p.email}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by asset type"
                  className={selectClassName}
                  value={invTypeFilter}
                  onChange={(e) => setInvTypeFilter(e.target.value as 'ALL' | AssetType)}
                >
                  <option value="ALL">All asset types</option>
                  {assetTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by purchase date"
                  className={selectClassName}
                  value={invDateFilter}
                  onChange={(e) => setInvDateFilter(e.target.value as 'ALL' | '30' | '90' | '365')}
                >
                  <option value="ALL">All purchase dates</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Past year</option>
                </select>
              </div>

              {filteredInvestments.length === 0 ? (
                <EmptyState
                  title="No matching investment records"
                  description="Try adjusting your search criteria or filters."
                  action={
                    <button
                      type="button"
                      className="text-sm font-semibold text-brand-400 hover:text-brand-300"
                      onClick={() => {
                        setInvSearch('');
                        setInvUserFilter('ALL');
                        setInvTypeFilter('ALL');
                        setInvDateFilter('ALL');
                      }}
                    >
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                          <tr>
                            <th className="px-4 py-3 font-medium">Investor</th>
                            <th className="px-4 py-3 font-medium">Asset</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Position</th>
                            <th className="px-4 py-3 font-medium">Cost Basis</th>
                            <th className="px-4 py-3 font-medium">Current Price</th>
                            <th className="px-4 py-3 font-medium">Purchased</th>
                            <th className="px-4 py-3 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {filteredInvestments.map((inv) => {
                            const owner = profileMap.get(inv.user_id);
                            return (
                              <tr key={inv.id} className="transition hover:bg-slate-900/80">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-white">{owner?.full_name || 'User'}</p>
                                  <p className="text-xs text-slate-400">{owner?.email ?? inv.user_id}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-white">{inv.symbol}</p>
                                  <p className="text-xs text-slate-400">{inv.asset_name}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="default">{inv.asset_type}</Badge>
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-200">
                                  {formatPrice(Number(inv.quantity))} {inv.currency}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-200">
                                  {formatPrice(Number(inv.purchase_price))} {inv.currency}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-200">
                                  {formatPrice(Number(inv.current_price))} {inv.currency}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-400">{inv.purchase_date}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      title="Record BUY/SELL trade (atomic ledger entry)"
                                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-emerald-400"
                                      onClick={() => setTradeHoldingTarget(inv)}
                                    >
                                      <ArrowUpRight className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Edit holding details"
                                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-brand-300"
                                      onClick={() => setEditHoldingTarget(inv)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Delete holding"
                                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400"
                                      onClick={() => setDeleteHoldingTarget(inv)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile investments list */}
                  <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
                    {filteredInvestments.map((inv) => {
                      const owner = profileMap.get(inv.user_id);
                      return (
                        <li key={inv.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">{inv.symbol}</p>
                              <p className="text-xs text-slate-400">{inv.asset_name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Owner: {owner?.full_name || owner?.email || inv.user_id}
                              </p>
                            </div>
                            <Badge variant="default">{inv.asset_type}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-xs">
                            <div>
                              <span className="text-slate-500">Quantity</span>
                              <p className="font-mono text-slate-200">{formatPrice(Number(inv.quantity))}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Current Price</span>
                              <p className="font-mono text-slate-200">
                                {formatPrice(Number(inv.current_price))} {inv.currency}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
                              onClick={() => setTradeHoldingTarget(inv)}
                            >
                              Trade
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Pencil className="h-3.5 w-3.5" />}
                              onClick={() => setEditHoldingTarget(inv)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                              onClick={() => setDeleteHoldingTarget(inv)}
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-right text-xs text-slate-500">
                    Showing {filteredInvestments.length} of {investments.length} records
                  </p>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* MODAL 1: Role / Status Confirmation */}
      {pendingRoleStatus && (
        <Modal
          title={pendingRoleStatus.kind === 'role' ? 'Confirm role change' : `Confirm ${pendingRoleStatus.isActive ? 'reactivation' : 'deactivation'}`}
          onClose={() => setPendingRoleStatus(null)}
          widthClassName="max-w-md"
        >
          <div className="space-y-5">
            <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-slate-300">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
              <p>
                {pendingRoleStatus.kind === 'role' ? (
                  <>
                    Change <strong className="text-white">{pendingRoleStatus.profile.email}</strong> role to{' '}
                    <strong className="text-white">{pendingRoleStatus.role}</strong>?
                  </>
                ) : (
                  <>
                    {pendingRoleStatus.isActive ? 'Reactivate' : 'Deactivate'}{' '}
                    <strong className="text-white">{pendingRoleStatus.profile.email}</strong>?
                  </>
                )}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPendingRoleStatus(null)}>
                Cancel
              </Button>
              <Button
                variant={pendingRoleStatus.kind === 'status' && !pendingRoleStatus.isActive ? 'danger' : 'primary'}
                isLoading={profileMutation.isPending}
                onClick={() => void confirmRoleStatusChange()}
              >
                {pendingRoleStatus.kind === 'role'
                  ? 'Confirm role'
                  : pendingRoleStatus.isActive
                    ? 'Reactivate user'
                    : 'Deactivate user'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Add User */}
      {showAddUserModal && (
        <AddUserModal
          isSubmitting={userMutations.createUser.isPending}
          onClose={() => setShowAddUserModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* MODAL 3: Change Password */}
      {passwordTargetUser && (
        <AdminPasswordModal
          user={passwordTargetUser}
          isSubmitting={userMutations.changePassword.isPending}
          onClose={() => setPasswordTargetUser(null)}
          onSubmit={(newPass) => handleChangePassword(passwordTargetUser.id, newPass)}
        />
      )}

      {/* MODAL 4: Delete User Confirmation */}
      {deleteTargetUser && (
        <Modal title="Delete user account" onClose={() => setDeleteTargetUser(null)} widthClassName="max-w-md">
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <p className="font-semibold text-rose-100">Permanent Account Deletion</p>
                <p className="mt-1 text-xs text-rose-300">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-white">{deleteTargetUser.email}</strong>?
                </p>
                <p className="mt-2 text-[11px] text-rose-400">
                  Security notice: If this user has recorded financial transactions in the ledger, deletion is strictly
                  blocked to preserve immutable audit records.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTargetUser(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={userMutations.deleteUser.isPending}
                onClick={() => void handleDeleteUser(deleteTargetUser.id)}
              >
                Delete permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 5: Add Holding */}
      {addHoldingTargetUserId && (
        <Modal title="Add investment holding" onClose={() => setAddHoldingTargetUserId(null)}>
          <div className="mb-4 space-y-1.5">
            <label className="block text-xs font-semibold uppercase text-slate-300">Assign to user</label>
            <select
              className={selectClassName}
              value={addHoldingTargetUserId}
              onChange={(e) => setAddHoldingTargetUserId(e.target.value)}
            >
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </div>
          <InvestmentForm
            defaultCurrency="USD"
            isSubmitting={investmentMutations.createHolding.isPending}
            onCancel={() => setAddHoldingTargetUserId(null)}
            onSubmit={(values) => handleCreateHolding(addHoldingTargetUserId, values)}
          />
        </Modal>
      )}

      {/* MODAL 6: Edit Holding Metadata */}
      {editHoldingTarget && (
        <Modal title={`Edit holding: ${editHoldingTarget.symbol}`} onClose={() => setEditHoldingTarget(null)}>
          <InvestmentForm
            investment={editHoldingTarget}
            defaultCurrency={editHoldingTarget.currency}
            isSubmitting={investmentMutations.updateHolding.isPending}
            onCancel={() => setEditHoldingTarget(null)}
            onSubmit={(values) => handleUpdateHolding(editHoldingTarget.id, values)}
          />
        </Modal>
      )}

      {/* MODAL 7: Record Trade (Atomic RPC) */}
      {tradeHoldingTarget && (
        <Modal title={`Record trade: ${tradeHoldingTarget.symbol}`} onClose={() => setTradeHoldingTarget(null)}>
          <TransactionForm
            investments={[tradeHoldingTarget]}
            isSubmitting={investmentMutations.recordTrade.isPending}
            onCancel={() => setTradeHoldingTarget(null)}
            onSubmit={handleRecordTrade}
          />
        </Modal>
      )}

      {/* MODAL 8: Delete Holding Confirmation */}
      {deleteHoldingTarget && (
        <Modal title="Delete holding?" onClose={() => setDeleteHoldingTarget(null)} widthClassName="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Delete position <strong className="text-white">{deleteHoldingTarget.symbol}</strong>? Existing ledger
              transactions will remain intact.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteHoldingTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={investmentMutations.deleteHolding.isPending}
                onClick={() => void handleDeleteHolding(deleteHoldingTarget.id)}
              >
                Delete holding
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'emerald' | 'amber';
}> = ({ label, value, icon, tone }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <span className={tone === 'emerald' ? 'text-emerald-400' : tone === 'amber' ? 'text-amber-400' : 'text-sky-400'}>
        {icon}
      </span>
    </div>
    <p className="mt-2 text-2xl font-semibold text-white">{value.toLocaleString()}</p>
  </Card>
);

interface AddUserModalProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (email: string, fullName: string) => Promise<void>;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isSubmitting, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    setError(null);
    await onSubmit(email.trim(), fullName.trim());
  };

  return (
    <Modal title="Add user account" onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" title="Input error">{error}</Alert>}
        <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3 text-xs text-sky-300">
          Supabase will send an invitation link. The user chooses their password after accepting it.
        </div>
        <Input
          label="Email address"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Full name (optional)"
          autoComplete="off"
          maxLength={60}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Send invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface AdminPasswordModalProps {
  user: ProfileRow;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (newPass: string) => Promise<void>;
}

const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({ user, isSubmitting, onClose, onSubmit }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    await onSubmit(password);
  };

  return (
    <Modal title={`Reset password: ${user.email}`} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" title="Error">{error}</Alert>}
        <p className="text-xs text-slate-400">
          This operation calls the server-side Supabase Auth Admin API using secure credentials.
        </p>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters; include uppercase, lowercase, and a number."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Update password
          </Button>
        </div>
      </form>
    </Modal>
  );
};
