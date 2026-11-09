import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, isDeactivated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-4">
        <div className="h-12 w-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mb-4">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400">Loading secure session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isDeactivated && location.pathname !== '/deactivated') {
    return <Navigate to="/deactivated" replace />;
  }

  return children ? <>{children}</> : null;
};
