import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { InvestmentsPage } from '@/features/investments/InvestmentsPage';
import { TransactionsPage } from '@/features/investments/TransactionsPage';
import { WatchlistPage } from '@/features/watchlist/WatchlistPage';
import { SettingsPage } from '@/features/profile/SettingsPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { DeactivatedPage } from '@/features/auth/pages/DeactivatedPage';
import { AdminRoute } from './guards/AdminRoute';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { PublicOnlyRoute } from './guards/PublicOnlyRoute';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const RootRedirect: React.FC = () => {
  const { user, isLoading, isDeactivated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isDeactivated) {
    return <Navigate to="/deactivated" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout><DashboardPage /></MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/investments"
        element={
          <ProtectedRoute>
            <MainLayout><InvestmentsPage /></MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <MainLayout><TransactionsPage /></MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/watchlist"
        element={
          <ProtectedRoute>
            <MainLayout><WatchlistPage /></MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <MainLayout><SettingsPage /></MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <MainLayout><AdminPage /></MainLayout>
          </AdminRoute>
        }
      />
      <Route path="/deactivated" element={<DeactivatedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
