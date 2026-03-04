import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isConsultant = user?.role === 'consultant';
  const isClient = user?.role === 'client';

  return { user, loading, isAdmin, isConsultant, isClient };
}