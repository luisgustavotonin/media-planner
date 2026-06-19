import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function useUserAccess() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['userAccess'],
    queryFn: async () => {
      const response = await base44.functions.invoke('validateUserAccess', {});
      return response.data;
    },
  });

  const authorizedClientIds = data?.authorized_client_ids || [];
  const isAdmin = data?.is_admin || false;
  const accessDenied = data?.access_denied || false;

  // Se acesso foi negado, redireciona para logout
  useEffect(() => {
    if (accessDenied && !isLoading) {
      base44.auth.logout();
    }
  }, [accessDenied, isLoading]);

  const filterClientsByAccess = (clients) => {
    if (accessDenied) return [];
    if (isAdmin) return clients;
    return clients.filter(c => authorizedClientIds.includes(c.id));
  };

  return {
    authorizedClientIds,
    isAdmin,
    filterClientsByAccess,
    isLoading,
    accessDenied
  };
}