import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export const DeactivatedPage: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#0b0f19] px-4 py-12 text-slate-100 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900/90 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-white">Account access is disabled</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          This account has been deactivated. Contact a FinTrack administrator if you believe this is a mistake.
        </p>
        <Button
          className="mt-6"
          variant="outline"
          leftIcon={<LogOut className="h-4 w-4" />}
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </section>
    </main>
  );
};