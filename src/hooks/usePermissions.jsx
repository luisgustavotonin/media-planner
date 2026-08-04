import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { APP_MODULES } from '@/lib/appModules';

// Resolve o acesso do usuário atual: vínculos (UsuarioCliente), perfil e permissões.
// Admin (role=admin) tem acesso total. Demais usuários são governados pelo perfil:
//  - status deve ser APROVADO para acessar o sistema
//  - canView(canUse) por módulo vêm de profile.permissions
export function usePermissions() {
  const [user, setUser] = useState(null);
  const [vinculos, setVinculos] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!active) return;
        setUser(u);
        const v = await base44.entities.UsuarioCliente.filter({ user_email: u.email });
        if (!active) return;
        setVinculos(v);
        const aprovado = v.find(x => x.status === 'APROVADO');
        if (aprovado?.profile_id) {
          try {
            const p = await base44.entities.Profile.get(aprovado.profile_id);
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
  const status = vinculos.length === 0
    ? 'SEM_VINCULO'
    : (vinculos.some(v => v.status === 'APROVADO') ? 'APROVADO' : vinculos[0].status);
  const isApproved = status === 'APROVADO';

  const getPerm = (key) => {
    const p = profile?.permissions?.[key];
    if (typeof p === 'boolean') return { view: p, use: p };
    return { view: !!(p && p.view), use: !!(p && p.use) };
  };

  const canView = (key) => isAdmin || getPerm(key).view;
  const canUse = (key) => isAdmin || getPerm(key).use;

  const allowedPages = APP_MODULES.filter(m => canView(m.key)).map(m => m.page);

  return { user, profile, vinculos, status, isApproved, isAdmin, loading, canView, canUse, allowedPages };
}