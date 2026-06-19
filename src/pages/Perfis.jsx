import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Eye, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MATRIX_ROWS = [
  { group: 'DASHBOARD', items: [
    { label: 'Dashboard', viewKey: 'dashboard_view', editKey: null },
  ]},
  { group: 'MÍDIA', items: [
    { label: 'Planos de Mídia', viewKey: 'mediaplans_view', editKey: 'mediaplans_create' },
    { label: 'Planejamento Reverso', viewKey: 'reverseplan_view', editKey: 'reverseplan_create' },
    { label: 'Cenários', viewKey: 'scenarios_view', editKey: 'scenarios_create' },
  ]},
  { group: 'ACOMPANHAMENTO', items: [
    { label: 'Acomp. Semanal', viewKey: 'weekly_view', editKey: null },
    { label: 'Benchmarks', viewKey: 'benchmarks_view', editKey: 'benchmarks_edit' },
  ]},
  { group: 'ADMINISTRAÇÃO', items: [
    { label: 'Clientes', viewKey: 'clients_view', editKey: 'clients_create' },
    { label: 'Tipos de Funil', viewKey: 'funneltypes_view', editKey: 'funneltypes_create' },
    { label: 'Usuários', viewKey: 'users_view', editKey: 'users_invite' },
    { label: 'Perfis e Permissões', viewKey: 'profiles_view', editKey: 'profiles_edit' },
  ]},
];

const GRUPOS_PERMISSOES = {
  'Dashboard': [
    { key: 'dashboard_view', label: 'Acessar Dashboard' },
  ],
  'Mídia': [
    { key: 'mediaplans_view', label: 'Acessar Planos de Mídia' },
    { key: 'mediaplans_create', label: 'Criar/Editar Planos' },
    { key: 'reverseplan_view', label: 'Acessar Planejamento Reverso' },
    { key: 'reverseplan_create', label: 'Usar Planejamento Reverso' },
    { key: 'scenarios_view', label: 'Acessar Cenários' },
    { key: 'scenarios_create', label: 'Criar/Editar Cenários' },
  ],
  'Acompanhamento': [
    { key: 'weekly_view', label: 'Acessar Acomp. Semanal' },
    { key: 'benchmarks_view', label: 'Acessar Benchmarks' },
    { key: 'benchmarks_edit', label: 'Editar Benchmarks' },
  ],
  'Administração': [
    { key: 'clients_view', label: 'Acessar Clientes' },
    { key: 'clients_create', label: 'Criar/Editar Clientes' },
    { key: 'funneltypes_view', label: 'Acessar Tipos de Funil' },
    { key: 'funneltypes_create', label: 'Criar/Editar Tipos de Funil' },
    { key: 'users_view', label: 'Acessar Usuários' },
    { key: 'users_invite', label: 'Convidar Usuários' },
    { key: 'profiles_view', label: 'Acessar Perfis e Permissões' },
    { key: 'profiles_edit', label: 'Editar Perfis e Permissões' },
  ],
};

export default function PerfisPage() {
  const [dialogPerfil, setDialogPerfil] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const queryClient = useQueryClient();

  const { data: perfis = [] } = useQuery({
    queryKey: ['access-profiles'],
    queryFn: () => base44.entities.AccessProfile.list()
  });

  const perfisOrdenados = [...perfis].sort((a, b) => (a.nivel_hierarquico || 5) - (b.nivel_hierarquico || 5));

  const salvarPerfilMutation = useMutation({
    mutationFn: async (data) => {
      if (perfilSelecionado) {
        await base44.entities.AccessProfile.update(perfilSelecionado.id, data);
      } else {
        await base44.entities.AccessProfile.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['access-profiles']);
      setDialogPerfil(false);
      setPerfilSelecionado(null);
      toast.success('Perfil salvo com sucesso!');
    }
  });

  const excluirPerfilMutation = useMutation({
    mutationFn: async (perfilId) => {
      await base44.entities.AccessProfile.delete(perfilId);
      toast.success('Perfil excluído!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['access-profiles']);
    }
  });

  const togglePermissaoMatrix = async (perfil, key) => {
    const novasPermissoes = {
      ...perfil.permissoes,
      [key]: !perfil.permissoes?.[key]
    };
    await base44.entities.AccessProfile.update(perfil.id, { permissoes: novasPermissoes });
    queryClient.invalidateQueries(['access-profiles']);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Perfis e Permissões</h1>
          <p className="text-slate-600">Gerencie os perfis de acesso e suas permissões</p>
        </div>
        <Button onClick={() => { setPerfilSelecionado(null); setDialogPerfil(true); }} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Perfil
        </Button>
      </div>

      {/* Cards de Perfis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {perfisOrdenados.map(perfil => {
          const totalPermissoes = Object.values(perfil.permissoes || {}).filter(Boolean).length;
          return (
            <div key={perfil.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: (perfil.cor || '#64748B') + '25' }}
                  >
                    <Shield className="w-5 h-5" style={{ color: perfil.cor || '#64748B' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{perfil.nome}</h3>
                    <p className="text-xs text-slate-500">Nível {perfil.nivel_hierarquico || 5}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => { setPerfilSelecionado(perfil); setDialogPerfil(true); }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Excluir este perfil permanentemente?')) {
                        excluirPerfilMutation.mutate(perfil.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4 min-h-[2.5rem]">{perfil.descricao || 'Sem descrição'}</p>
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="text-slate-500">{totalPermissoes} permissões</span>
                <span className={cn('px-2.5 py-1 rounded-full font-medium', perfil.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
                  {perfil.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Matriz de Permissões */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Matriz de Permissões</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left p-4 text-sm text-slate-700 sticky left-0 bg-white z-10 min-w-[160px] font-semibold">
                    Menu
                  </th>
                  {perfisOrdenados.map(perfil => (
                    <th key={perfil.id} className="p-3 text-center min-w-[130px]">
                      <div className="font-semibold text-sm mb-1.5" style={{ color: perfil.cor || '#64748B' }}>
                        {perfil.nome}
                      </div>
                      <div className="flex justify-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                        </span>
                        <span className="flex items-center gap-1">
                          <Pencil className="w-3 h-3" />
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX_ROWS.map(({ group, items }) => (
                  <React.Fragment key={group}>
                    <tr>
                      <td
                        colSpan={perfisOrdenados.length + 1}
                        className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100"
                      >
                        {group}
                      </td>
                    </tr>
                    {items.map(({ label, viewKey, editKey }) => (
                      <tr key={viewKey} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-sm text-slate-700 sticky left-0 bg-white font-medium">{label}</td>
                        {perfisOrdenados.map(perfil => (
                          <td key={perfil.id} className="p-3 text-center">
                            <div className="flex justify-center gap-4">
                              <button
                                onClick={() => togglePermissaoMatrix(perfil, viewKey)}
                                title="Visualizar"
                                className={cn(
                                  'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110',
                                  perfil.permissoes?.[viewKey]
                                    ? 'bg-green-500 border-green-500'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                )}
                              >
                                {perfil.permissoes?.[viewKey] && <Eye className="w-3 h-3 text-white" />}
                              </button>
                              {editKey ? (
                                <button
                                  onClick={() => togglePermissaoMatrix(perfil, editKey)}
                                  title="Editar / Ações"
                                  className={cn(
                                    'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110',
                                    perfil.permissoes?.[editKey]
                                      ? 'bg-blue-500 border-blue-500'
                                      : 'bg-white border-slate-200 hover:border-slate-300'
                                  )}
                                >
                                  {perfil.permissoes?.[editKey] && <Pencil className="w-3 h-3 text-white" />}
                                </button>
                              ) : (
                                <div className="w-7 h-7" />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          🟢 Verde = Visualizar &nbsp;|&nbsp; 🔵 Azul = Editar / Ações &nbsp;|&nbsp; Clique nos círculos para ativar/desativar
        </p>
      </div>

      <DialogPerfilAcesso
        open={dialogPerfil}
        onOpenChange={setDialogPerfil}
        perfil={perfilSelecionado}
        onSalvar={(data) => salvarPerfilMutation.mutate(data)}
      />
    </div>
  );
}

function DialogPerfilAcesso({ open, onOpenChange, perfil, onSalvar }) {
  const [formData, setFormData] = useState({
    nome: '', descricao: '', nivel_hierarquico: 5,
    cor: '#DC2626', ativo: true, permissoes: {}
  });

  const [gruposExpandidos, setGruposExpandidos] = useState({
    'Dashboard': true, 'Mídia': true, 'Acompanhamento': false, 'Administração': false,
  });

  React.useEffect(() => {
    if (perfil) {
      setFormData({
        nome: perfil.nome || '',
        descricao: perfil.descricao || '',
        nivel_hierarquico: perfil.nivel_hierarquico || 5,
        cor: perfil.cor || '#DC2626',
        ativo: perfil.ativo !== false,
        permissoes: perfil.permissoes || {}
      });
    } else {
      setFormData({ nome: '', descricao: '', nivel_hierarquico: 5, cor: '#DC2626', ativo: true, permissoes: {} });
    }
  }, [perfil, open]);

  const togglePermissao = (key) => {
    setFormData({ ...formData, permissoes: { ...formData.permissoes, [key]: !formData.permissoes[key] } });
  };

  const desmarcarTodos = (grupo) => {
    const novas = { ...formData.permissoes };
    GRUPOS_PERMISSOES[grupo].forEach(p => { novas[p.key] = false; });
    setFormData({ ...formData, permissoes: novas });
  };

  const marcarTodos = (grupo) => {
    const novas = { ...formData.permissoes };
    GRUPOS_PERMISSOES[grupo].forEach(p => { novas[p.key] = true; });
    setFormData({ ...formData, permissoes: novas });
  };

  const contarPermissoes = (grupo) => {
    const total = GRUPOS_PERMISSOES[grupo].length;
    const marcadas = GRUPOS_PERMISSOES[grupo].filter(p => formData.permissoes[p.key]).length;
    return `${marcadas}/${total}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{perfil ? 'Editar Perfil' : 'Novo Perfil de Acesso'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Perfil *</Label>
              <Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Gerente" />
            </div>
            <div>
              <Label>Nível Hierárquico</Label>
              <Input type="number" min="1" max="10" value={formData.nivel_hierarquico}
                onChange={e => setFormData({ ...formData, nivel_hierarquico: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descreva as responsabilidades deste perfil" />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={formData.cor} onChange={e => setFormData({ ...formData, cor: e.target.value })} className="h-10 w-20 rounded border cursor-pointer" />
              <Input value={formData.cor} onChange={e => setFormData({ ...formData, cor: e.target.value })} placeholder="#DC2626" className="flex-1" />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b">
              <Label className="text-base font-semibold">Permissões</Label>
            </div>
            <div className="divide-y">
              {Object.entries(GRUPOS_PERMISSOES).map(([grupo, permissoes]) => (
                <div key={grupo}>
                  <button
                    onClick={() => setGruposExpandidos({ ...gruposExpandidos, [grupo]: !gruposExpandidos[grupo] })}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {gruposExpandidos[grupo] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      <span className="font-medium text-sm">{grupo}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{contarPermissoes(grupo)}</span>
                      <button onClick={(e) => { e.stopPropagation(); marcarTodos(grupo); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Marcar</button>
                      <button onClick={(e) => { e.stopPropagation(); desmarcarTodos(grupo); }} className="text-xs text-red-600 hover:text-red-700 font-medium">Desmarcar</button>
                    </div>
                  </button>
                  {gruposExpandidos[grupo] && (
                    <div className="px-4 py-2 bg-slate-50 space-y-2">
                      {permissoes.map(p => (
                        <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formData.permissoes[p.key] || false}
                            onChange={() => togglePermissao(p.key)} className="rounded" />
                          <span className="text-sm">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.ativo} onChange={e => setFormData({ ...formData, ativo: e.target.checked })} className="rounded" />
            <span className="text-sm font-medium">Perfil Ativo</span>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => onSalvar(formData)} className="bg-red-600 hover:bg-red-700">
              {perfil ? 'Salvar' : 'Criar Perfil'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}