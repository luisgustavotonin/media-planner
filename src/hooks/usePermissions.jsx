import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { APP_MODULES } from '@/lib/appModules';

// Resolve o acesso do usuário atual: vínculos (UsuarioCliente), perfil e permissões.
// Admin (role=admin) tem acesso total. Demais usuários são governados pelo perfil:
//  - status deve ser APROVADO para acessar o sistema
//  - canView(canUse) por módulo vêm de profile.permissions
//
// O resultado é cacheado no react-query (chave ['permissions']) para que navegar
// entre páginas não dispare novas chamadas em série a cada clique — o Layout monta
// em cada rota, e sem cache ele refaria auth.me() + UsuarioCliente + Profile a cada
// navegação, causando o delay percebido.
async function resolvePermissions() {
  const u = await base44.auth.me();
  let vinculos = [];
  try {
    vinculos = await base44.entities.UsuarioCliente.filter({ user_email: u.email });
  } catch (e) { /* sem vínculos */ }
  const aprovado = vinculos.find(x => x.status === 'APROVADO');
  let profile = null;
  if (aprovado?.profile_id) {
    try { profile = await base44.entities.Profile.get(aprovado.profile_id); }
    catch (e) { /* perfil órfão */ }
  }
  return { user: u, vinculos, profile };
}

export function usePermissions() {
  const { data, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: resolvePermissions,
    staleTime: 5 * 60 * 1000,   // não refaz a cada navegação; refaz em background após 5 min
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const user = data?.user ?? null;
  const vinculos = data?.vinculos ?? [];
  const profile = data?.profile ?? null;
  const loading = isLoading;

  const isAdmin = user?.role === 'admin';
  const status = vinculos.length === 0
    ? 'SEM_VINCULO'
    : (vinculos.some(v => v.status === 'APROVADO') ? 'APROVADO' : vinculos[0].status);
  const isApproved = status === 'APROVADO';
  // null = sem restrição (admin); array = apenas estes clientes
  const allowedClientIds = isAdmin ? null : vinculos.filter(v => v.status === 'APROVADO').map(v => v.client_id);

  const getPerm = (key) => {
    const p = profile?.permissions?.[key];
    if (typeof p === 'boolean') return { view: p, use: p };
    return { view: !!(p && p.view), use: !!(p && p.use) };
  };

  const canView = (key) => isAdmin || getPerm(key).view;
  const canUse = (key) => isAdmin || getPerm(key).use;

  const allowedPages = APP_MODULES.filter(m => canView(m.key)).map(m => m.page);

  return { user, profile, vinculos, status, isApproved, isAdmin, loading, canView, canUse, allowedPages, allowedClientIds };
}