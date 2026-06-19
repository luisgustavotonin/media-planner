import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserAccess() {
  const { data = {}, isLoading, error } = useQuery({
    queryKey: ['userAccess'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('validateUserAccess', {});
        // Se status 403 (inativo), logout automaticamente
        if (res.status === 403 || res.data?.is_inactive) {
          await base44.auth.logout('/');
          return { authorized_client_ids: [], is_admin: false, is_inactive: true };
        }
        return res.data || {};
      } catch (err) {
        console.error('[useUserAccess] Error:', err);
        return { authorized_client_ids: [], is_admin: false, is_inactive: false };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });

  const authorizedClientIds = data.authorized_client_ids || [];
  const isAdmin = data.is_admin || false;
  const isInactive = data.is_inactive || false;

  const filterClientsByAccess = (clients = []) => {
    if (isAdmin) return clients;
    return clients.filter(c => authorizedClientIds.includes(c.id));
  };

  return {
    authorizedClientIds,
    isAdmin,
    isInactive,
    filterClientsByAccess,
    isLoading,
    error
  };
}