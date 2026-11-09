import { supabase } from '@/lib/supabase';
import type { InvestmentRow, ProfileRow, TransactionRow, UserRole } from '@/types';
import type { InvestmentFormValues, TransactionFormValues } from '@/features/investments/schemas';
import { isRecord, readAdminResponse } from './apiResponse';

export type AdminProfileChange =
  | { role: UserRole; is_active?: never }
  | { is_active: boolean; role?: never };

export async function requireAdminUserId(): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Your session has expired. Please sign in again.');

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError) throw adminError;
  if (!isAdmin) throw new Error('Administrator access is required.');

  return authData.user.id;
}

async function getAdminAuthHeader(): Promise<HeadersInit> {
  await requireAdminUserId();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const { session } = data;
  if (!session?.access_token) {
    throw new Error('Valid authentication session token is required.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

// ----------------------------------------------------------------------------
// User Management
// ----------------------------------------------------------------------------

export async function listAdminProfiles(): Promise<ProfileRow[]> {
  await requireAdminUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateAdminProfile(
  profileId: string,
  change: AdminProfileChange
): Promise<ProfileRow> {
  const adminUserId = await requireAdminUserId();

  if (profileId === adminUserId && ('role' in change || change.is_active === false)) {
    throw new Error('You cannot remove your own administrator access or deactivate your account.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(change)
    .eq('id', profileId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Profile not found or administrator access was denied.');
  return data;
}

export async function adminCreateUser(payload: {
  email: string;
  fullName: string;
}): Promise<{ id: string; email: string }> {
  const headers = await getAdminAuthHeader();
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'create-user', ...payload }),
  });
  const data = await readAdminResponse(res);
  if (!isRecord(data.user) ||
    typeof data.user.id !== 'string' ||
    typeof data.user.email !== 'string'
  ) {
    throw new Error('Admin API did not return a valid invited user.');
  }
  return { id: data.user.id, email: data.user.email };
}

export async function adminChangeUserPassword(targetUserId: string, newPassword: string): Promise<void> {
  const headers = await getAdminAuthHeader();
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'change-password', targetUserId, newPassword }),
  });
  await readAdminResponse(res);
}

export async function adminDeleteUser(targetUserId: string): Promise<void> {
  const headers = await getAdminAuthHeader();
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'delete-user', targetUserId }),
  });
  await readAdminResponse(res);
}

// ----------------------------------------------------------------------------
// Investment & Trade Management
// ----------------------------------------------------------------------------

export async function listAllInvestments(): Promise<InvestmentRow[]> {
  await requireAdminUserId();
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function adminCreateInvestment(
  userId: string,
  values: InvestmentFormValues
): Promise<InvestmentRow> {
  await requireAdminUserId();
  const { data, error } = await supabase
    .from('investments')
    .insert({
      asset_name: values.asset_name.trim(),
      asset_type: values.asset_type,
      symbol: values.symbol.trim().toUpperCase(),
      quantity: values.quantity,
      purchase_price: values.purchase_price,
      purchase_date: values.purchase_date,
      current_price: values.current_price,
      currency: values.currency,
      notes: values.notes.trim() || null,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function adminUpdateInvestment(
  investmentId: string,
  values: InvestmentFormValues
): Promise<InvestmentRow> {
  await requireAdminUserId();
  const { data, error } = await supabase
    .from('investments')
    .update({
      asset_name: values.asset_name.trim(),
      asset_type: values.asset_type,
      symbol: values.symbol.trim().toUpperCase(),
      purchase_date: values.purchase_date,
      current_price: values.current_price,
      currency: values.currency,
      notes: values.notes.trim() || null,
    })
    .eq('id', investmentId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Investment not found or administrator access was denied.');
  return data;
}

export async function adminDeleteInvestment(investmentId: string): Promise<void> {
  await requireAdminUserId();
  const { data, error } = await supabase
    .from('investments')
    .delete()
    .eq('id', investmentId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Investment not found or administrator access was denied.');
}

export async function adminRecordTransaction(values: TransactionFormValues): Promise<TransactionRow> {
  await requireAdminUserId();
  const { data, error } = await supabase.rpc('record_transaction', {
    p_investment_id: values.investment_id,
    p_transaction_type: values.transaction_type,
    p_quantity: values.quantity,
    p_price: values.price,
    p_transaction_date: values.transaction_date,
    p_notes: values.notes.trim() || null,
  });

  if (error) throw error;
  return data as TransactionRow;
}
