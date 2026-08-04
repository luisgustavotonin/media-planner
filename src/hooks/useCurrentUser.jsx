import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Retorna o usuário atual + seu perfil de acesso (nível hierárquico).
// O perfil é resolvido via vínculo UsuarioCliente -> Profile.
export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!active) return;
        setUser(u);
        const vinculos = await base44.entities.UsuarioCliente.filter({ user_email: u.email });
        if (active && vinculos.length > 0 && vinculos[0].profile_id) {
          try {
            const p = await base44.entities.Profile.get(vinculos[0].profile_id);
            if (active) setProfile(p);
          } catch (e) { /* perfil órfão */ }
        }
      } catch (e) {
        /* não logado */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const isAdmin = user?.role === 'admin';
  const nivelHierarquico = profile?.level || (isAdmin ? 1 : 99);
  return { user, profile, isAdmin, nivelHierarquico, loading };
}