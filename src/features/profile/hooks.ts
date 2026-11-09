import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { updateOwnProfile } from './profileService';
import type { ProfileSettingsValues } from './schemas';

export function useUpdateOwnProfile() {
  const { refreshProfile } = useAuth();

  return useMutation({
    mutationFn: (values: ProfileSettingsValues) => updateOwnProfile(values),
    onSuccess: async () => {
      await refreshProfile();
    },
  });
}