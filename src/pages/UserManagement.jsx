import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Shield, UserCheck, Eye, Mail, Building2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const roleColors = { admin: 'bg-red-50 text-red-700 border-red-100', consultant: 'bg-blue-50 text-blue-700 border-blue-100', client: 'bg-gray-50 text-gray-600 border-gray-100' };
const roleLabels = { admin: 'Admin', consultant: 'Consultor', client: 'Cliente' };
const roleIcons = { admin: Shield, consultant: UserCheck, client: Eye };

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'consultant', profile_id: '', units: [] });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('level'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data.sort((a, b) => (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR'));
    },
  });

  const inviteMut = useMutation({
    mutationFn: async () => {
      if (!form.email || !form.profile_id) throw new Error('Email e perfil são obrigatórios');
      const response = await base44.functions.invoke('inviteUser', { 
        email: form.email, 
        role: form.role,
        profile_id: form.profile_id
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Convite enviado com sucesso!');
      setInviteOpen(false);
      setForm({ email: '', role: 'consultant', profile_id: '', units: [] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao enviar convite');
    }
  });

  const updateUserMut = useMutation({
    mutationFn: async ({ userId, data }) => {
      return base44.asServiceRole.entities.User.update(userId, data);
    },
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar usuário');
    }
  });

  const handleProfileChange = (userId, profileId) => {
    updateUserMut.mutate({ userId, data: { profile_id: profileId } });
  };

  const toggleUnit = (id) => {
    setForm(f => {
      const units = f.units.includes(id) ? f.units.filter(u => u !== id) : [...f.units, id];
      return { ...f, units };
    });
  };

  const toggleAllUnits = () => {
    setForm(f => ({
      ...f,
      units: f.units.length === clients.length ? [] : clients.map(c => c.id),
    }));
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários e seus acessos ao sistema."
        actions={
          <Button onClick={() => { setForm({ email: '', role: 'consultant', profile_id: '', units: [] }); setInviteOpen(true); }} className="gap-2 bg-red-500 hover:bg-red-600">
            <Plus className="w-4 h-4" /> Incluir Usuário
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <h3 className="text-sm font-semibold text-gray-900">Lista de Usuários</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-6 font-semibold text-gray-700 uppercase tracking-wider">NOME</th>
              <th className="text-left py-3 px-6 font-semibold text-gray-700 uppercase tracking-wider">E-MAIL</th>
              <th className="text-left py-3 px-6 font-semibold text-gray-700 uppercase tracking-wider">PERFIL</th>
              <th className="text-left py-3 px-6 font-semibold text-gray-700 uppercase tracking-wider">UNIDADES</th>
              <th className="text-left py-3 px-6 font-semibold text-gray-700 uppercase tracking-wider">STATUS</th>
              <th className="text-center py-3 px-6 font-semibold text-gray-700 uppercase tracking-wider">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => {
              const profile = profiles.find(p => p.id === u.profile_id);
              const unitCount = u.units?.length || 0;
              return (
                <tr key={u.id}>
                  <td className="py-3 px-6 text-gray-900">{u.full_name || u.email}</td>
                  <td className="py-3 px-6 text-gray-600">{u.email}</td>
                  <td className="py-3 px-6">
                    {profile ? (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${profile.color}20`, color: profile.color }}>
                        {profile.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-gray-600">{unitCount === 0 ? 'Todas' : `${unitCount} unidade${unitCount > 1 ? '(s)' : ''}`}</td>
                  <td className="py-3 px-6">
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Ativo</span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 rounded" title="Editar">
                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Compartilhar">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button className="p-1 hover:bg-red-50 rounded" title="Remover">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum usuário ainda.</p>
          </div>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">E-mail *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="usuario@exemplo.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Perfil de Acesso *</Label>
              <Select value={form.profile_id} onValueChange={v => {
                const profile = profiles.find(p => p.id === v);
                let role = 'consultant';
                if (profile?.level === 1) role = 'admin';
                else if (profile?.level >= 4) role = 'client';
                setForm({...form, profile_id: v, role});
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name} — Nível {p.level}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Função no sistema</Label>
              <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="consultant">Consultor</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Unidades com Acesso</Label>
              <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                <label
                  className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100"
                >
                  <Checkbox
                    checked={form.units.length === clients.length && clients.length > 0}
                    onCheckedChange={toggleAllUnits}
                  />
                  <span className="text-xs font-medium text-gray-700">Todas as unidades</span>
                </label>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {clients.map(c => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={form.units.includes(c.id)}
                        onCheckedChange={() => toggleUnit(c.id)}
                      />
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-700">{c.clinic_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.units.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-1">{form.units.length} unidade(s) selecionada(s)</p>
              )}
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-blue-700">
                <span className="font-medium">📧 Convite por e-mail:</span> O usuário receberá um convite no e-mail informado.
              </p>
            </div>
            <Button onClick={() => inviteMut.mutate()} className="w-full bg-red-500 hover:bg-red-600" disabled={!form.email || !form.profile_id || inviteMut.isPending}>
              {inviteMut.isPending ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}