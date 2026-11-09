import { supabase } from '@/lib/supabase';
import type { InvestmentInsert, InvestmentRow, TransactionRow } from '@/types';
import type { InvestmentFormValues, TransactionFormValues } from './schemas';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error('Your session has expired. Please sign in again.');

  return data.user.id;
}

export async function listInvestments(): Promise<InvestmentRow[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('asset_name');

  if (error) throw error;
  return data;
}

function toInvestmentRecord(values: InvestmentFormValues): Omit<InvestmentInsert, 'user_id'> {
  return {
    ...values,
    symbol: values.symbol.trim().toUpperCase(),
    notes: values.notes.trim() || null,
  };
}

export async function createInvestment(values: InvestmentFormValues): Promise<InvestmentRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('investments')
    .insert({ ...toInvestmentRecord(values), user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInvestment(
  investmentId: string,
  values: InvestmentFormValues
): Promise<InvestmentRow> {
  const userId = await requireUserId();
  // Only send permitted metadata columns. quantity and purchase_price are
  // ledger-managed via record_transaction() and excluded from column-level
  // UPDATE grants on public.investments.
  const { quantity: _q, purchase_price: _pp, ...metadata } = toInvestmentRecord(values);
  const { data, error } = await supabase
    .from('investments')
    .update(metadata)
    .eq('id', investmentId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Investment not found or access denied.');
  return data;
}

export async function deleteInvestment(investmentId: string): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('investments')
    .delete()
    .eq('id', investmentId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Investment not found or access denied.');
}

export async function listTransactions(): Promise<TransactionRow[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as TransactionRow[];
}

export async function createTransaction(values: TransactionFormValues): Promise<TransactionRow> {
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