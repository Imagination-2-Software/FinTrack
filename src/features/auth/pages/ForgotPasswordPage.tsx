import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword, isConfigured } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSent, setIsSent] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMsg(null);
    const { error } = await resetPassword(data.email);

    if (error) {
      setErrorMsg(error.message || 'Unable to send password reset email.');
      return;
    }

    setIsSent(true);
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
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Reset your password</h2>
          <p className="mt-2 text-sm text-slate-400">
            Enter your email to receive a secure recovery link
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-6">
            <Alert type="warning" title="Supabase Environment Not Configured">
              Missing <code className="text-amber-300 font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-amber-300 font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>.
            </Alert>
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          {isSent ? (
            <div className="text-center py-4 space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Recovery Email Sent</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                If an account exists with that email, we have sent instructions to reset your password.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="secondary" size="md" className="w-full">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="mb-6">
                  <Alert type="error" title="Reset Request Failed">
                    {errorMsg}
                  </Alert>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <Input
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Send Recovery Link
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
