import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { DisplayCurrency, InvestmentRow } from '@/types';
import { investmentEditSchema, investmentSchema, type InvestmentFormValues } from '../schemas';

const assetTypes = ['Stocks', 'Mutual Funds', 'ETFs', 'Commodities', 'Cryptocurrency'] as const;

interface InvestmentFormProps {
  investment?: InvestmentRow | null;
  defaultCurrency: DisplayCurrency;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: InvestmentFormValues) => Promise<void>;
}

const selectClassName =
  'w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50';

export const InvestmentForm: React.FC<InvestmentFormProps> = ({
  investment,
  defaultCurrency,
  isSubmitting,
  onCancel,
  onSubmit,
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<InvestmentFormValues>({
    resolver: zodResolver(investment ? investmentEditSchema : investmentSchema),
    defaultValues: investment
      ? {
          asset_name: investment.asset_name,
          asset_type: investment.asset_type,
          symbol: investment.symbol,
          quantity: Number(investment.quantity),
          purchase_price: Number(investment.purchase_price),
          purchase_date: investment.purchase_date,
          current_price: Number(investment.current_price),
          currency: investment.currency,
          notes: investment.notes ?? '',
        }
      : {
          asset_name: '',
          asset_type: 'Stocks',
          symbol: '',
          quantity: undefined,
          purchase_price: undefined,
          purchase_date: '',
          current_price: undefined,
          currency: defaultCurrency,
          notes: '',
        },
  });

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Asset name" autoComplete="off" placeholder="Company or fund name" error={errors.asset_name?.message} {...register('asset_name')} />
        <div className="space-y-1.5">
          <label htmlFor="asset_type" className="block text-xs font-semibold uppercase text-slate-300">Asset type</label>
          <select id="asset_type" className={selectClassName} {...register('asset_type')}>
            {assetTypes.map((assetType) => <option key={assetType} value={assetType}>{assetType}</option>)}
          </select>
          {errors.asset_type && <p className="text-xs text-rose-400">{errors.asset_type.message}</p>}
        </div>
        <Input label="Symbol" autoComplete="off" placeholder="e.g. ACME" error={errors.symbol?.message} {...register('symbol')} />
        <Input
          label="Quantity"
          type="number"
          min="0"
          step="0.000001"
          readOnly={Boolean(investment)}
          hint={investment ? 'Quantity changes through BUY and SELL transactions.' : undefined}
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true })}
        />
        <Input
          label="Purchase price"
          type="number"
          min="0"
          step="0.0001"
          readOnly={Boolean(investment)}
          hint={investment ? 'Average cost basis changes through BUY and SELL transactions.' : undefined}
          error={errors.purchase_price?.message}
          {...register('purchase_price', { valueAsNumber: true })}
        />
        <Input label="Purchase date" type="date" error={errors.purchase_date?.message} {...register('purchase_date')} />
        <Input label="Current price" type="number" min="0" step="0.0001" error={errors.current_price?.message} {...register('current_price', { valueAsNumber: true })} />
        <div className="space-y-1.5">
          <label htmlFor="currency" className="block text-xs font-semibold uppercase text-slate-300">Currency</label>
          <select id="currency" className={selectClassName} {...register('currency')}>
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
          {errors.currency && <p className="text-xs text-rose-400">{errors.currency.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-xs font-semibold uppercase text-slate-300">Notes</label>
        <textarea
          id="notes"
          rows={3}
          maxLength={2000}
          className={`${selectClassName} resize-y`}
          {...register('notes')}
        />
        {errors.notes && <p className="text-xs text-rose-400">{errors.notes.message}</p>}
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isSubmitting}>{investment ? 'Save changes' : 'Add holding'}</Button>
      </div>
    </form>
  );
};