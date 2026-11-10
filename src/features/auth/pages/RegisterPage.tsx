import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodV4Resolver } from '@/lib/zodResolver';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema, type RegisterFormData } from '../schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

export const RegisterPage: React.FC = () => {
  const { signUp, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodV4Resolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setAuthError(null);
    const { error } = await signUp(data.email, data.password, data.fullName);

    if (error) {
      setAuthError(error.message || 'Registration failed. Please try again.');
      return;
    }

    setRegistrationSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">FinTrack</span>
          </Link>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Start managing your investments with high precision
          </p>
        </div>

        {/* Supabase Unconfigured Warning Banner */}
        {!isConfigured && (
          <div className="mb-6">
            <Alert type="warning" title="Supabase Environment Not Configured">
              Missing <code className="text-amber-300 font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-amber-300 font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> in{' '}
              <code className="text-amber-300 font-mono text-xs">.env.local</code>. Please configure your credentials to enable registration.
            </Alert>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          {registrationSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Account Created Successfully</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                If email confirmation is enabled in your Supabase project, please check your inbox to verify your address.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <>
              {authError && (
                <div className="mb-6">
                  <Alert type="error" title="Registration Error">
                    {authError}
                  </Alert>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <Input
                  label="Full Name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Jane Doe"
                  leftIcon={<User className="h-4 w-4" />}
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />

                <Input
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Input
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  leftIcon={<Lock className="h-4 w-4" />}
                  hint="Must include uppercase, lowercase, and a number"
                  error={errors.password?.message}
                  {...register('password')}
                />

                <Input
                  label="Confirm Password"
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
                  className="w-full mt-2"
                  isLoading={isSubmitting}
                >
                  Create Account
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
