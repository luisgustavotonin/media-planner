import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const ALL_PERMISSIONS = [
  { key: 'visualizar_dashboard', label: 'Visualizar Dashboard', description: 'Acesso ao painel principal' },

  { key: 'criar_clientes', label: 'Criar Clientes', description: 'Adicionar novos clientes' },
  { key: 'editar_clientes', label: 'Editar Clientes', description: 'Modificar dados de clientes' },
  { key: 'criar_planos', label: 'Criar Planos', description: 'Criar novos planos de mídia' },
  { key: 'editar_planos', label: 'Editar Planos', description: 'Modificar planos existentes' },
  { key: 'ver_planos', label: 'Ver Planos', description: 'Visualizar planos de mídia' },
  { key: 'exportar_pdf', label: 'Exportar PDF', description: 'Gerar relatórios em PDF' },
  { key: 'planejamento_reverso', label: 'Planejamento Reverso', description: 'Acessar módulo de planejamento reverso' },
  { key: 'simulador_cenarios', label: 'Simulador de Cenários', description: 'Simular cenários otimista/realista/conservador' },
  { key: 'acompanhamento_semanal', label: 'Acompanhamento Semanal', description: 'Lançar e ver dados semanais' },
  { key: 'gerenciar_usuarios', label: 'Gerenciar Usuários', description: 'Convidar e gerenciar membros da equipe' },
  { key: 'gerenciar_benchmarks', label: 'Gerenciar Benchmarks', description: 'Editar taxas e CPLs padrão' },
];

const PROFILE_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#6366f1','#ec4899'];

const emptyProfile = {
  name: '', level: 1, description: '', color: '#3b82f6', status: 'ativo',
  permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, false])),
};

export default function ProfilesPermissions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProfile);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('level'),
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.Profile.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profiles'] }); setOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Profile.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profiles'] }); setOpen(false); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Profile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  const handleEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || '', level: p.level || 1, description: p.description || '',
      color: p.color || '#3b82f6', status: p.status || 'ativo',
      permissions: { ...Object.fromEntries(ALL_PERMISSIONS.map(pm => [pm.key, false])), ...(p.permissions || {}) },
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    const { id, created_date, updated_date, created_by, ...data } = form;
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const togglePerm = (key) => {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
  };

  const countPerms = (profile) => {
    if (!profile.permissions) return 0;
    return Object.values(profile.permissions).filter(Boolean).length;
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Perfis e Permissões"
        description="Configure os níveis de acesso do sistema."
        actions={
          <Button onClick={() => { setEditing(null); setForm(emptyProfile); setOpen(true); }} className="gap-2 bg-red-500 hover:bg-red-600">
            <Plus className="w-4 h-4" /> Novo Perfil
          </Button>
        }
      />

      {/* Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {profiles.map(profile => (
          <div key={profile.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${profile.color}20` }}>
                  <Shield className="w-5 h-5" style={{ color: profile.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{profile.name}</h3>
                  <p className="text-[10px] text-gray-400">Nível {profile.level}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(profile)} className="p-1.5 rounded-md hover:bg-gray-100">
                  <Pencil className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button onClick={() => deleteMut.mutate(profile.id)} className="p-1.5 rounded-md hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            {profile.description && <p className="text-xs text-gray-500 mb-3">{profile.description}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{countPerms(profile)} permissões</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${profile.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500'}`}>
                {profile.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        ))}
        {profiles.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Shield className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum perfil criado ainda.</p>
          </div>
        )}
      </div>

      {/* Permission Matrix */}
      {profiles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Matriz de Permissões</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 w-56">Permissão</th>
                  {profiles.map(p => (
                    <th key={p.id} className="text-center py-3 px-4 font-semibold min-w-[100px]" style={{ color: p.color }}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map((perm, i) => (
                  <tr key={perm.key} className={i % 2 === 0 ? 'bg-gray-50/30' : ''}>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{perm.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{perm.description}</p>
                    </td>
                    {profiles.map(p => {
                      const has = p.permissions?.[perm.key];
                      return (
                        <td key={p.id} className="py-3 px-4 text-center">
                          {has ? (
                            <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-gray-200 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do Perfil *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Consultor" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Nível (1=maior acesso)</Label>
                <Input type="number" min="1" max="10" value={form.level} onChange={e => setForm({...form, level: Number(e.target.value)})} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descreva o perfil..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Cor do Perfil</Label>
              <div className="flex items-center gap-2">
                {PROFILE_COLORS.map(c => (
                  <button key={c} onClick={() => setForm({...form, color: c})}
                    className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-3 block">Permissões</Label>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {ALL_PERMISSIONS.map(perm => (
                  <div key={perm.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{perm.label}</p>
                      <p className="text-[10px] text-gray-400">{perm.description}</p>
                    </div>
                    <Switch checked={!!form.permissions?.[perm.key]} onCheckedChange={() => togglePerm(perm.key)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label className="text-xs">Status</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{form.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                <Switch checked={form.status === 'ativo'} onCheckedChange={v => setForm({...form, status: v ? 'ativo' : 'inativo'})} />
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700" disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {editing ? 'Atualizar Perfil' : 'Criar Perfil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}