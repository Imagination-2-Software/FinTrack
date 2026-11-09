import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface AdminRouteProps {
  children?: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, isDeactivated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-4">
        <Loader2 className="h-6 w-6 text-brand-400 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Verifying administrative credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isDeactivated) {
    return <Navigate to="/deactivated" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-slate-900/90 p-8 text-center shadow-2xl">
          <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-white">403 – Administrative Access Denied</h1>
          <p className="mt-2 text-sm text-slate-400">
            This module requires verified platform administrator privileges. Your account role has not been granted access.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/dashboard">
              <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : null;
};
