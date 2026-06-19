import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, UserCheck, Building2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [form, setForm] = useState({ email: '', full_name: '', profile_id: '', units: [] });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

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
      if (!form.email || !form.profile_id) {
        throw new Error('Email e perfil são obrigatórios');
      }

      const response = await base44.functions.invoke('inviteUser', {
        email: form.email,
        full_name: form.full_name,
        profile_id: form.profile_id,
        units: form.units
      });

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success('Usuário criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Reset form and close modal
      setForm({ email: '', full_name: '', profile_id: '', units: [] });
      setInviteOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao criar usuário');
    }
  });

  const updateUserMut = useMutation({
    mutationFn: async ({ userId, data }) => {
      const response = await base44.functions.invoke('updateUser', { userId, data });
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso!');
      setEditingUserId(null);
      setForm({ email: '', full_name: '', profile_id: '', units: [] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Erro ao atualizar usuário');
    }
  });

  const deleteUserMut = useMutation({
    mutationFn: async (userId) => {
      const response = await base44.functions.invoke('updateUser', {
        userId,
        data: { deleted: true }
      });
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('Usuário deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Erro ao deletar usuário');
    }
  });

  const toggleUserStatus = (user) => {
    const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    updateUserMut.mutate({ userId: user.id, data: { status: newStatus } });
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setForm({
      email: user.email,
      full_name: user.full_name || '',
      profile_id: user.profile_id || '',
      units: user.units || []
    });
  };

  const handleSaveEdit = () => {
    const isCurrent = isCurrentUserRow(editingUserId);

    if (isCurrent && !form.full_name) {
      toast.error('Preencha o nome');
      return;
    }
    if (!isCurrent && !form.full_name && !form.profile_id && form.units.length === 0) {
      toast.error('Preencha ao menos um campo');
      return;
    }

    const updateData = {};
    if (form.full_name) updateData.full_name = form.full_name;
    if (form.profile_id) updateData.profile_id = form.profile_id;
    updateData.units = form.units;

    updateUserMut.mutate({ userId: editingUserId, data: updateData });
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

  const isCurrentUserRow = (userId) => currentUser?.id === userId;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários e seus acessos ao sistema."
        actions={
          <Button
            onClick={() => {
              setEditingUserId(null);
              setForm({ email: '', full_name: '', profile_id: '', units: [] });
              setInviteOpen(true);
            }}
            className="gap-2 bg-red-500 hover:bg-red-600"
          >
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
              <th className="text-left py-3 px-6 font-semibold text-gray-700 uppercase tracking-wider">CLIENTES</th>
              <th className="text-left py-3 px-6 font-semibold text-gray-700 uppercase tracking-wider">STATUS</th>
              <th className="text-center py-3 px-6 font-semibold text-gray-700 uppercase tracking-wider">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => {
              const profile = profiles.find(p => p.id === u.profile_id);
              const clientCount = u.units?.length || 0;
              const isCurrent = isCurrentUserRow(u.id);

              return (
                <tr key={u.id} className={isCurrent ? 'bg-amber-50' : ''}>
                  <td className="py-3 px-6 text-gray-900 font-medium">{u.full_name || u.email}</td>
                  <td className="py-3 px-6 text-gray-600">{u.email}</td>
                  <td className="py-3 px-6">
                    {isCurrent ? (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                        ADMIN
                      </span>
                    ) : profile ? (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${profile.color}20`, color: profile.color }}>
                        {profile.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-gray-600">{clientCount === 0 ? 'Todos' : `${clientCount} cliente${clientCount > 1 ? '(s)' : ''}`}</td>
                  <td className="py-3 px-6">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${u.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEditClick(u)}
                        className={`p-1 rounded ${isCurrent ? 'hover:bg-amber-100' : 'hover:bg-gray-100'}`}
                        title="Editar"
                      >
                        <Pencil className={`w-3.5 h-3.5 ${isCurrent ? 'text-amber-600' : 'text-gray-400'}`} />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(u)}
                        disabled={isCurrent}
                        className={`p-1 rounded ${isCurrent ? 'opacity-50 cursor-not-allowed' : u.status === 'ativo' ? 'hover:bg-emerald-50' : 'hover:bg-gray-100'}`}
                        title={isCurrent ? 'Não pode desativar sua própria conta' : u.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      >
                        <UserCheck className={`w-3.5 h-3.5 ${isCurrent ? 'text-gray-300' : u.status === 'ativo' ? 'text-emerald-600' : 'text-gray-400'}`} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja deletar este usuário?')) {
                            deleteUserMut.mutate(u.id);
                          }
                        }}
                        disabled={isCurrent}
                        className={`p-1 rounded ${isCurrent ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}
                        title={isCurrent ? 'Não pode deletar sua própria conta' : 'Deletar'}
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-gray-300' : 'text-red-400'}`} />
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

      {/* Dialog para editar usuário */}
      <Dialog open={!!editingUserId} onOpenChange={(open) => !open && setEditingUserId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input disabled value={form.email} className="mt-1 bg-gray-50" />
            </div>
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="João da Silva"
                className="mt-1"
              />
            </div>
            {!isCurrentUserRow(editingUserId) && (
              <>
                <div>
                  <Label className="text-xs">Perfil de Acesso</Label>
                  <Select value={form.profile_id} onValueChange={v => setForm({ ...form, profile_id: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={users.find(u => u.id === editingUserId)?.status || 'ativo'} onValueChange={v => {
                    const userData = users.find(u => u.id === editingUserId);
                    if (userData) {
                      updateUserMut.mutate({ userId: editingUserId, data: { status: v } });
                    }
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Clientes com Acesso</Label>
                  <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                    <label className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100">
                      <Checkbox checked={form.units.length === clients.length && clients.length > 0} onCheckedChange={toggleAllUnits} />
                      <span className="text-xs font-medium text-gray-700">Todos os clientes</span>
                    </label>
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                      {clients.map(c => (
                        <label key={c.id} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                          <Checkbox checked={form.units.includes(c.id)} onCheckedChange={() => toggleUnit(c.id)} />
                          <Building2 className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-700">{c.clinic_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {form.units.length > 0 && <p className="text-[10px] text-gray-400 mt-1">{form.units.length} cliente(s) selecionado(s)</p>}
                </div>
              </>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingUserId(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700" disabled={updateUserMut.isPending}>
                {updateUserMut.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para convidar novo usuário */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">E-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@exemplo.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="João da Silva"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Perfil de Acesso *</Label>
              <Select value={form.profile_id} onValueChange={v => setForm({ ...form, profile_id: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Clientes com Acesso</Label>
              <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                <label className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100">
                  <Checkbox checked={form.units.length === clients.length && clients.length > 0} onCheckedChange={toggleAllUnits} />
                  <span className="text-xs font-medium text-gray-700">Todos os clientes</span>
                </label>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {clients.map(c => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                      <Checkbox checked={form.units.includes(c.id)} onCheckedChange={() => toggleUnit(c.id)} />
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-700">{c.clinic_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.units.length > 0 && <p className="text-[10px] text-gray-400 mt-1">{form.units.length} cliente(s) selecionado(s)</p>}
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-blue-700">
                <span className="font-medium">📧 Convite por e-mail:</span> O usuário receberá um convite no e-mail informado.
              </p>
            </div>
            <Button
              onClick={() => inviteMut.mutate()}
              className="w-full bg-red-500 hover:bg-red-600"
              disabled={!form.email || !form.profile_id || inviteMut.isPending}
            >
              {inviteMut.isPending ? 'Criando usuário...' : 'Criar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}