import {
  LayoutDashboard, BarChart3, Target, FlaskConical, CalendarDays,
  Building2, Settings, GitBranch, Megaphone, Users, Shield,
} from 'lucide-react';

// Fonte única de verdade dos módulos do app.
// Cada item vira automaticamente:
//  - um item no menu lateral (Layout.jsx, agrupado por "group")
//  - uma linha na matriz de permissões (PerfisPermissoes.jsx)
// Para adicionar um novo módulo/permissão, basta incluir um item aqui.
export const APP_MODULES = [
  { key: 'dashboard', label: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard, group: 'Operacional', roles: ['admin', 'consultant', 'user'] },
  { key: 'planos_midia', label: 'Planos de Mídia', page: 'MediaPlans', icon: BarChart3, group: 'Operacional', roles: ['admin', 'consultant', 'user', 'client'] },
  { key: 'planejamento_reverso', label: 'Planejamento Reverso', page: 'ReversePlan', icon: Target, group: 'Operacional', roles: ['admin', 'consultant', 'user'] },
  { key: 'cenarios', label: 'Cenários', page: 'Scenarios', icon: FlaskConical, group: 'Operacional', roles: ['admin', 'consultant', 'user'] },
  { key: 'acomp_semanal', label: 'Acomp. Semanal', page: 'WeeklyTracking', icon: CalendarDays, group: 'Operacional', roles: ['admin', 'consultant', 'user'] },
  { key: 'clientes', label: 'Clientes', page: 'Clients', icon: Building2, group: 'Administrativo', roles: ['admin', 'consultant', 'user'] },
  { key: 'benchmarks', label: 'Benchmarks', page: 'Benchmarks', icon: Settings, group: 'Administrativo', roles: ['admin', 'user', 'consultant'] },
  { key: 'tipos_funil', label: 'Tipos de Funil', page: 'FunnelTypes', icon: GitBranch, group: 'Administrativo', roles: ['admin', 'user', 'consultant'] },
  { key: 'config_campanhas', label: 'Config. Campanhas', page: 'CampaignSettings', icon: Megaphone, group: 'Administrativo', roles: ['admin', 'user', 'consultant'] },
  { key: 'usuarios', label: 'Usuários', page: 'Usuarios', icon: Users, group: 'Administrativo', roles: ['admin'] },
  { key: 'perfis_permissoes', label: 'Perfis e Permissões', page: 'PerfisPermissoes', icon: Shield, group: 'Administrativo', roles: ['admin'] },
];

export const MODULE_GROUPS = ['Operacional', 'Administrativo'];