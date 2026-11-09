import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  createInvestment,
  createTransaction,
  deleteInvestment,
  listInvestments,
  listTransactions,
  updateInvestment,
} from './investmentService';
import type { InvestmentRow } from '@/types';
import type { InvestmentFormValues, TransactionFormValues } from './schemas';

export const investmentKeys = {
  all: ['investments'] as const,
  list: (userId: string) => ['investments', userId] as const,
};

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (userId: string) => ['transactions', userId] as const,
};

export function useInvestments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: investmentKeys.list(user?.id ?? 'signed-out'),
    queryFn: listInvestments,
    enabled: Boolean(user?.id),
  });
}

export function useTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: transactionKeys.list(user?.id ?? 'signed-out'),
    queryFn: listTransactions,
    enabled: Boolean(user?.id),
  });
}

export function useInvestmentMutations() {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
  };

  const create = useMutation({
    mutationFn: createInvestment,
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: InvestmentFormValues }) =>
      updateInvestment(id, values),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (investment: InvestmentRow) => deleteInvestment(investment.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: investmentKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      ]);
    },
  });

  return { create, update, remove };
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: TransactionFormValues) => createTransaction(values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
        queryClient.invalidateQueries({ queryKey: investmentKeys.all }),
      ]);
    },
  });
}