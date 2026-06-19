import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Shield, UserCheck, Eye, Mail, Building2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const roleColors = { admin: 'bg-red-50 text-red-700 border-red-100', consultant: 'bg-blue-50 text-blue-700 border-blue-100', client: 'bg-gray-50 text-gray-600 border-gray-100' };
const roleLabels = { admin: 'Admin', consultant: 'Consultor', client: 'Cliente' };
const roleIcons = { admin: Shield, consultant: UserCheck, client: Eye };

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'consultant', profile_id: '', units: [] });

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

  const handleInvite = async () => {
    if (!form.email) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(form.email, form.role);
      toast.success(`Convite enviado para ${form.email}!`);
      setInviteOpen(false);
      setForm({ full_name: '', email: '', role: 'consultant', profile_id: '', units: [] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error('Erro ao enviar convite. Verifique o e-mail e tente novamente.');
    } finally {
      setInviting(false);
    }
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Usuários"
        description="Gerencie os membros da equipe e seus acessos."
        actions={
          <Button onClick={() => setInviteOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Adicionar Usuário
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {users.map(u => {
          const Icon = roleIcons[u.role] || Eye;
          const profile = profiles.find(p => p.id === u.profile_id);
          return (
            <div key={u.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-600">{u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.full_name || u.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Mail className="w-3 h-3 text-gray-300" />
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {profile && (
                  <span className="text-[11px] text-gray-500 hidden sm:block">{profile.name}</span>
                )}
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 border ${roleColors[u.role] || roleColors.client}`}>
                  <Icon className="w-3 h-3" />
                  {roleLabels[u.role] || 'Usuário'}
                </span>
              </div>
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum usuário ainda. Adicione o primeiro membro da equipe.</p>
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
              <Label className="text-xs">Nome Completo</Label>
              <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="João da Silva" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">E-mail *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="usuario@exemplo.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Perfil de Acesso</Label>
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
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                        {p.name} — Nível {p.level}
                      </span>
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
                <span className="font-medium">📧 Convite por e-mail:</span> O usuário receberá um convite no e-mail informado e ao fazer login já terá as permissões configuradas automaticamente.
              </p>
            </div>
            <Button onClick={handleInvite} className="w-full bg-blue-600 hover:bg-blue-700" disabled={!form.email || inviting}>
              {inviting ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}