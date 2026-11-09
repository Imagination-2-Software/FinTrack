import { z } from 'zod';

const assetTypes = ['Stocks', 'Mutual Funds', 'ETFs', 'Commodities', 'Cryptocurrency'] as const;
const currencies = ['USD', 'INR'] as const;

const investmentFields = z.object({
	asset_name: z.string().trim().min(1, 'Asset name is required').max(100),
	asset_type: z.enum(assetTypes),
	symbol: z.string().trim().min(1, 'Symbol is required').max(20),
	quantity: z.number().finite().min(0).max(999999999999),
	purchase_price: z.number().finite().min(0).max(99999999999999),
	purchase_date: z.string().min(1, 'Purchase date is required'),
	current_price: z.number().finite().min(0).max(99999999999999),
	currency: z.enum(currencies),
	notes: z.string().max(2000),
});

export const investmentSchema = investmentFields.extend({
	quantity: z.number().finite().positive('Quantity must be greater than zero').max(999999999999),
});

export const investmentEditSchema = investmentFields;

export type InvestmentFormValues = z.infer<typeof investmentFields>;

export const transactionSchema = z.object({
	investment_id: z.string().uuid('Choose an investment'),
	transaction_type: z.enum(['BUY', 'SELL']),
	quantity: z.number().finite().positive('Quantity must be greater than zero').max(999999999999),
	price: z.number().finite().min(0).max(99999999999999),
	transaction_date: z.string().min(1, 'Transaction date is required'),
	notes: z.string().max(2000),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
