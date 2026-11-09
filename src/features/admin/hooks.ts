import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  adminChangeUserPassword,
  adminCreateInvestment,
  adminCreateUser,
  adminDeleteInvestment,
  adminDeleteUser,
  adminRecordTransaction,
  adminUpdateInvestment,
  listAdminProfiles,
  listAllInvestments,
  updateAdminProfile,
  type AdminProfileChange,
} from './adminService';
import type { InvestmentFormValues, TransactionFormValues } from '@/features/investments/schemas';

export const adminProfileKeys = {
  all: ['admin-profiles'] as const,
  list: (userId: string) => ['admin-profiles', userId] as const,
};

export const adminInvestmentKeys = {
  all: ['admin-investments'] as const,
  list: (userId: string) => ['admin-investments', userId] as const,
};

export function useAdminProfiles() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: adminProfileKeys.list(user?.id ?? 'signed-out'),
    queryFn: listAdminProfiles,
    enabled: Boolean(user?.id && isAdmin),
  });
}

export function useAdminProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, change }: { profileId: string; change: AdminProfileChange }) =>
      updateAdminProfile(profileId, change),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminProfileKeys.all });
    },
  });
}

export function useAdminUserMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminProfileKeys.all });

  const createUser = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: invalidate,
  });

  const changePassword = useMutation({
    mutationFn: ({ targetUserId, newPassword }: { targetUserId: string; newPassword: string }) =>
      adminChangeUserPassword(targetUserId, newPassword),
  });

  const deleteUser = useMutation({
    mutationFn: (targetUserId: string) => adminDeleteUser(targetUserId),
    onSuccess: invalidate,
  });

  return { createUser, changePassword, deleteUser };
}

export function useAllInvestments() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: adminInvestmentKeys.list(user?.id ?? 'signed-out'),
    queryFn: listAllInvestments,
    enabled: Boolean(user?.id && isAdmin),
  });
}

export function useAdminInvestmentMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminInvestmentKeys.all });
  };

  const createHolding = useMutation({
    mutationFn: ({ userId, values }: { userId: string; values: InvestmentFormValues }) =>
      adminCreateInvestment(userId, values),
    onSuccess: invalidate,
  });

  const updateHolding = useMutation({
    mutationFn: ({ investmentId, values }: { investmentId: string; values: InvestmentFormValues }) =>
      adminUpdateInvestment(investmentId, values),
    onSuccess: invalidate,
  });

  const deleteHolding = useMutation({
    mutationFn: (investmentId: string) => adminDeleteInvestment(investmentId),
    onSuccess: invalidate,
  });

  const recordTrade = useMutation({
    mutationFn: (values: TransactionFormValues) => adminRecordTransaction(values),
    onSuccess: invalidate,
  });

  return { createHolding, updateHolding, deleteHolding, recordTrade };
}
