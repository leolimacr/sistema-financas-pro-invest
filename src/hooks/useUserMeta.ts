import { useAuth } from '../contexts/AuthContext';

export const useUserMeta = (_userId?: string) => {
  const { userMeta, userMetaLoading } = useAuth();

  return {
    userMeta,
    loading: userMetaLoading,
    isSyncing: false,
    error: null,
  };
};
