import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { resetPasswordSchema, type ResetPasswordFormData } from '../schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setErrorMsg(null);
    const { error } = await updatePassword(data.password);

    if (error) {
      setErrorMsg(error.message || 'Unable to update password. Recovery session may have expired.');
      return;
    }

    setIsSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">FinTrack</span>
          </Link>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Set new password</h2>
          <p className="mt-2 text-sm text-slate-400">
            Please choose a strong password for your account
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Password Updated</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Your password has been changed successfully. You can now access your account.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => navigate('/dashboard')}
                >
                  Continue to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="mb-6">
                  <Alert type="error" title="Password Reset Failed">
                    {errorMsg}
                  </Alert>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <Input
                  label="New Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  leftIcon={<Lock className="h-4 w-4" />}
                  hint="Must include uppercase, lowercase, and a number"
                  error={errors.password?.message}
                  {...register('password')}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Update Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
