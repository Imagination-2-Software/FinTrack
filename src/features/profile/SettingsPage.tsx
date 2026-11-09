import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { KeyRound, Mail, UserRound } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateOwnProfile } from './hooks';
import {
  changeEmailSchema,
  changePasswordSchema,
  profileSettingsSchema,
  type ChangeEmailValues,
  type ChangePasswordValues,
  type ProfileSettingsValues,
} from './schemas';

const selectClassName =
  'w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50';

export const SettingsPage: React.FC = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();

  if (isLoading) {
    return <div className="space-y-5"><Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!user) {
    return <Alert type="error" title="Session unavailable">Sign in again to view your account settings.</Alert>;
  }

  if (!profile) {
    return (
      <Alert type="error" title="Profile unavailable">
        Your account details could not be loaded.
        <Button className="mt-4" variant="outline" size="sm" onClick={() => void refreshProfile()}>Retry</Button>
      </Alert>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase text-sky-400">Account</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Profile &amp; Settings</h1>
        <p className="mt-2 text-sm text-slate-400">Manage your profile preferences and sign-in security.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400"><UserRound className="h-4 w-4" /></div>
            <CardTitle>Account details</CardTitle>
          </div>
          <Badge variant={profile.is_active ? 'success' : 'danger'}>{profile.is_active ? 'Active' : 'Deactivated'}</Badge>
        </CardHeader>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div><dt className="text-xs font-medium uppercase text-slate-500">Email</dt><dd className="mt-1 break-all text-sm text-slate-200">{user.email ?? profile.email}</dd></div>
          <div><dt className="text-xs font-medium uppercase text-slate-500">Account role</dt><dd className="mt-1 text-sm capitalize text-slate-200">{profile.role}</dd></div>
          <div><dt className="text-xs font-medium uppercase text-slate-500">Member since</dt><dd className="mt-1 text-sm text-slate-200">{new Date(user.created_at).toLocaleDateString()}</dd></div>
          <div><dt className="text-xs font-medium uppercase text-slate-500">Profile updated</dt><dd className="mt-1 text-sm text-slate-200">{new Date(profile.updated_at).toLocaleDateString()}</dd></div>
        </dl>
        <p className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-500">Email, role, and account status are managed through verified account and administrator workflows.</p>
      </Card>

      <ProfilePreferences fullName={profile.full_name ?? ''} displayCurrency={profile.display_currency} />
      <EmailSettings currentEmail={user.email ?? profile.email} />
      <PasswordSettings />
    </section>
  );
};

interface ProfilePreferencesProps {
  fullName: string;
  displayCurrency: ProfileSettingsValues['display_currency'];
}

const ProfilePreferences: React.FC<ProfilePreferencesProps> = ({ fullName, displayCurrency }) => {
  const updateProfile = useUpdateOwnProfile();
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileSettingsValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: { full_name: fullName, display_currency: displayCurrency },
  });

  const save = async (values: ProfileSettingsValues) => {
    setSuccess(false);
    try {
      await updateProfile.mutateAsync(values);
      setSuccess(true);
    } catch {
      setSuccess(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Profile preferences</CardTitle></CardHeader>
      {updateProfile.isError && <div className="mb-5"><Alert type="error" title="Profile update failed">{updateProfile.error instanceof Error ? updateProfile.error.message : 'Please try again.'}</Alert></div>}
      {success && <div className="mb-5"><Alert type="success" title="Saved">Your profile preferences were updated.</Alert></div>}
      <form className="space-y-5" noValidate onSubmit={handleSubmit(save)}>
        <Input label="Display name" autoComplete="name" maxLength={60} error={errors.full_name?.message} {...register('full_name')} />
        <div className="max-w-xs space-y-1.5">
          <label htmlFor="display_currency" className="block text-xs font-semibold uppercase text-slate-300">Preferred currency</label>
          <select id="display_currency" className={selectClassName} {...register('display_currency')}>
            <option value="USD">USD · US Dollar</option>
            <option value="INR">INR · Indian Rupee</option>
          </select>
          {errors.display_currency && <p className="text-xs text-rose-400">{errors.display_currency.message}</p>}
          <p className="text-xs text-slate-500">This preference does not convert values recorded in another currency.</p>
        </div>
        <div className="flex justify-end border-t border-slate-800 pt-4">
          <Button type="submit" isLoading={updateProfile.isPending}>Save profile</Button>
        </div>
      </form>
    </Card>
  );
};

const PasswordSettings: React.FC = () => {
  const { updatePassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const submitPassword = async (values: ChangePasswordValues) => {
    setIsSubmitting(true);
    setSuccess(false);
    setErrorMessage(null);
    try {
      const result = await updatePassword(values.newPassword);
      if (result.error) throw result.error;
      reset();
      setSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400"><KeyRound className="h-4 w-4" /></div><CardTitle>Change password</CardTitle></div>
      </CardHeader>
      {errorMessage && <div className="mb-5"><Alert type="error" title="Password update failed">{errorMessage}</Alert></div>}
      {success && <div className="mb-5"><Alert type="success" title="Password updated">Your password has been changed.</Alert></div>}
      <form className="space-y-5" noValidate onSubmit={handleSubmit(submitPassword)}>
        <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters; include uppercase, lowercase, and a number." error={errors.newPassword?.message} {...register('newPassword')} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <div className="flex justify-end border-t border-slate-800 pt-4"><Button type="submit" isLoading={isSubmitting}>Update password</Button></div>
      </form>
    </Card>
  );
};

const EmailSettings: React.FC<{ currentEmail: string }> = ({ currentEmail }) => {
  const { updateEmail } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: '' },
  });

  const submitEmail = async (values: ChangeEmailValues) => {
    if (values.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setErrorMessage('The new email address matches your current email address.');
      return;
    }
    setIsSubmitting(true);
    setConfirmationNotice(null);
    setErrorMessage(null);
    try {
      const result = await updateEmail(values.newEmail);
      if (result.error) throw result.error;
      reset();
      setConfirmationNotice(
        `Confirmation email sent to ${values.newEmail}. Please click the confirmation link sent to your email to verify and apply this change.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update your email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400">
            <Mail className="h-4 w-4" />
          </div>
          <CardTitle>Change email address</CardTitle>
        </div>
      </CardHeader>
      {errorMessage && (
        <div className="mb-5">
          <Alert type="error" title="Email update failed">
            {errorMessage}
          </Alert>
        </div>
      )}
      {confirmationNotice && (
        <div className="mb-5">
          <Alert type="info" title="Verification email sent">
            {confirmationNotice}
          </Alert>
        </div>
      )}
      <form className="space-y-5" noValidate onSubmit={handleSubmit(submitEmail)}>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Current email address</p>
          <p className="mt-1 text-sm font-medium text-slate-200">{currentEmail}</p>
        </div>
        <Input
          label="New email address"
          type="email"
          autoComplete="email"
          hint="Supabase will dispatch a confirmation link to this address before updating your credentials."
          error={errors.newEmail?.message}
          {...register('newEmail')}
        />
        <div className="flex justify-end border-t border-slate-800 pt-4">
          <Button type="submit" isLoading={isSubmitting}>
            Send confirmation link
          </Button>
        </div>
      </form>
    </Card>
  );
};