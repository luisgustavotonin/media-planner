import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserAccess() {
  const { data, isLoading } = useQuery({
    queryKey: ['userAccess'],
    queryFn: async () => {
      const response = await base44.functions.invoke('validateUserAccess', {});
      return response.data;
    },
  });

  const authorizedClientIds = data?.authorized_client_ids || [];
  const isAdmin = data?.is_admin || false;

  const filterClientsByAccess = (clients) => {
    if (isAdmin) return clients;
    return clients.filter(c => authorizedClientIds.includes(c.id));
  };

  return {
    authorizedClientIds,
    isAdmin,
    filterClientsByAccess,
    isLoading
  };
}