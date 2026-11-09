import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { InvestmentRow } from '@/types';
import { formatQuantity, localDateString } from '../format';
import { transactionSchema, type TransactionFormValues } from '../schemas';

interface TransactionFormProps {
  investments: InvestmentRow[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
}

const selectClassName =
  'w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50';

export const TransactionForm: React.FC<TransactionFormProps> = ({
  investments,
  isSubmitting,
  onCancel,
  onSubmit,
}) => {
  const { register, watch, handleSubmit, formState: { errors } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      investment_id: investments[0]?.id ?? '',
      transaction_type: 'BUY',
      quantity: undefined,
      price: undefined,
      transaction_date: localDateString(),
      notes: '',
    },
  });
  const selectedInvestment = investments.find((investment) => investment.id === watch('investment_id'));
  const transactionType = watch('transaction_type');

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-1.5">
        <label htmlFor="transaction_investment" className="block text-xs font-semibold uppercase text-slate-300">Holding</label>
        <select id="transaction_investment" className={selectClassName} {...register('investment_id')}>
          {investments.map((investment) => (
            <option key={investment.id} value={investment.id}>
              {investment.symbol} · {investment.asset_name} · {investment.currency}
            </option>
          ))}
        </select>
        {errors.investment_id && <p className="text-xs text-rose-400">{errors.investment_id.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="transaction_type" className="block text-xs font-semibold uppercase text-slate-300">Type</label>
          <select id="transaction_type" className={selectClassName} {...register('transaction_type')}>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>
        <Input label="Quantity" type="number" min="0" step="0.000001" error={errors.quantity?.message} {...register('quantity', { valueAsNumber: true })} />
        <Input label="Price per unit" type="number" min="0" step="0.0001" error={errors.price?.message} {...register('price', { valueAsNumber: true })} />
        <Input label="Transaction date" type="date" error={errors.transaction_date?.message} {...register('transaction_date')} />
      </div>
      {transactionType === 'SELL' && selectedInvestment && (
        <p className="text-xs text-slate-400">
          Available quantity: {formatQuantity(Number(selectedInvestment.quantity))}. The database rechecks availability while locking the holding.
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="transaction_notes" className="block text-xs font-semibold uppercase text-slate-300">Notes</label>
        <textarea id="transaction_notes" rows={3} maxLength={2000} className={`${selectClassName} resize-y`} {...register('notes')} />
        {errors.notes && <p className="text-xs text-rose-400">{errors.notes.message}</p>}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        The database atomically updates the holding quantity, snapshots its currency, and records the ledger total. A rejected trade changes neither.
      </p>
      <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isSubmitting}>Record transaction</Button>
      </div>
    </form>
  );
};