import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, CheckCircle, XCircle, Trash2, UserX, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function Usuarios() {
  const { toast } = useToast();
  const [dialogUsuario, setDialogUsuario] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [formUsuario, setFormUsuario] = useState({ nome: '', email: '', profile_id: '', clientes: [] });
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const qc = useQueryClient();
  const { isAdmin, nivelHierarquico } = useCurrentUser();

  const { data: vinculos = [] } = useQuery({
    queryKey: ['usuario-cliente'],
    queryFn: () => base44.entities.UsuarioCliente.list(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients-active'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' }),
  });

  const { data: perfis = [] } = useQuery({
    queryKey: ['profiles-active'],
    queryFn: () => base44.entities.Profile.filter({ status: 'ativo' }),
  });

  const salvarUsuarioMutation = useMutation({
    mutationFn: async (data) => {
      if (usuarioSelecionado) {
        const vinculosExistentes = vinculos.filter((v) => v.user_id === usuarioSelecionado.user_id);
        for (const clientId of data.clientes) {
          const existe = vinculosExistentes.find((v) => v.client_id === clientId);
          if (!existe) {
            await base44.entities.UsuarioCliente.create({
              user_id: usuarioSelecionado.user_id,
              user_email: data.email,
              user_name: data.nome,
              client_id: clientId,
              profile_id: data.profile_id,
              status: 'PENDENTE',
            });
          } else {
            await base44.entities.UsuarioCliente.update(existe.id, { profile_id: data.profile_id });
          }
        }
        const paraExcluir = vinculosExistentes.filter((v) => !data.clientes.includes(v.client_id));
        for (const v of paraExcluir) await base44.entities.UsuarioCliente.delete(v.id);
      } else {
        const perfil = perfis.find((p) => p.id === data.profile_id);
        const role = perfil?.name === 'Master' ? 'admin' : 'user';
        await base44.users.inviteUser(data.email, role);
        for (const clientId of data.clientes) {
          await base44.entities.UsuarioCliente.create({
            user_id: 'temp_' + data.email,
            user_email: data.email,
            user_name: data.nome,
            client_id: clientId,
            profile_id: data.profile_id,
            status: 'PENDENTE',
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuario-cliente'] });
      setDialogUsuario(false);
      setFormUsuario({ nome: '', email: '', profile_id: '', clientes: [] });
      setUsuarioSelecionado(null);
      toast({ title: usuarioSelecionado ? 'Usuário atualizado!' : 'Usuário convidado com sucesso!' });
    },
  });

  const excluirUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      const vinculosUsuario = vinculos.filter((v) => v.user_id === userId);
      for (const v of vinculosUsuario) await base44.entities.UsuarioCliente.delete(v.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuario-cliente'] }); toast({ title: 'Usuário excluído!' }); },
  });

  const inativarUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      const vinculosUsuario = vinculos.filter((v) => v.user_id === userId);
      for (const v of vinculosUsuario) await base44.entities.UsuarioCliente.update(v.id, { status: 'INATIVO' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuario-cliente'] }); toast({ title: 'Usuário inativado!' }); },
  });

  const aprovarUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      const vinculosUsuario = vinculos.filter((v) => v.user_id === userId);
      for (const v of vinculosUsuario) await base44.entities.UsuarioCliente.update(v.id, { status: 'APROVADO' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuario-cliente'] }); toast({ title: 'Usuário aprovado!' }); },
  });

  const abrirDialogoUsuario = (usuario = null) => {
    if (usuario) {
      setUsuarioSelecionado(usuario);
      const vinc = vinculos.filter((v) => v.user_id === usuario.user_id);
      setFormUsuario({
        nome: usuario.user_name,
        email: usuario.user_email,
        profile_id: usuario.profile_id || '',
        clientes: vinc.map((v) => v.client_id),
      });
    } else {
      setUsuarioSelecionado(null);
      setFormUsuario({ nome: '', email: '', profile_id: '', clientes: [] });
    }
    setDialogUsuario(true);
  };

  const toggleCliente = (clientId) => {
    if (formUsuario.clientes.includes(clientId)) {
      setFormUsuario({ ...formUsuario, clientes: formUsuario.clientes.filter((id) => id !== clientId) });
    } else {
      setFormUsuario({ ...formUsuario, clientes: [...formUsuario.clientes, clientId] });
    }
  };

  const usuariosUnicos = vinculos.reduce((acc, v) => {
    if (v.user_id && !acc.find((u) => u.user_id === v.user_id)) acc.push(v);
    return acc;
  }, []);

  const usuariosVisiveis = usuariosUnicos.filter((u) => {
    if (isAdmin) return true;
    const perfil = perfis.find((p) => p.id === u.profile_id);
    return !perfil || (perfil.level || 0) < nivelHierarquico;
  });

  const perfisDisponiveis = perfis.filter((p) => isAdmin || (p.level || 0) < nivelHierarquico);

  const usuariosClienteSelecionado = clienteSelecionado ? vinculos.filter((v) => v.client_id === clienteSelecionado) : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3.5 border-b border-[#f0ece4]">
        <h1 className="text-[15px] font-semibold text-[#312b1d]">Usuários</h1>
        <p className="text-xs text-[#7e6951] mt-0.5">Gerencie usuários e vínculos com clientes</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <Tabs defaultValue="usuarios">
          <TabsList>
            <TabsTrigger value="usuarios">Lista de Usuários</TabsTrigger>
            <TabsTrigger value="por-cliente">Por Cliente</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Usuários</CardTitle>
                  <Button onClick={() => abrirDialogoUsuario()} className="bg-[#f85d07] hover:bg-[#d94e00]">
                    <Plus className="w-4 h-4 mr-2" /> Incluir Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosVisiveis.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-slate-400 py-6">Nenhum usuário vinculado.</TableCell>
                      </TableRow>
                    )}
                    {usuariosVisiveis.map((usuario) => {
                      const perfil = perfis.find((p) => p.id === usuario.profile_id);
                      return (
                        <TableRow key={usuario.user_id}>
                          <TableCell className="font-medium">{usuario.user_name}</TableCell>
                          <TableCell>{usuario.user_email}</TableCell>
                          <TableCell>
                            {perfil ? (
                              <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: perfil.color || '#f85d07' }}>
                                {perfil.name}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Sem perfil</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {usuario.status === 'APROVADO' ? (
                              <span className="flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle className="w-4 h-4" /> Aprovado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-600 text-sm">
                                <XCircle className="w-4 h-4" /> Pendente
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => abrirDialogoUsuario(usuario)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              {usuario.status === 'PENDENTE' && (
                                <Button variant="ghost" size="icon" onClick={() => aprovarUsuarioMutation.mutate(usuario.user_id)}>
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              {usuario.status === 'APROVADO' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => confirm('Confirma a inativação?') && inativarUsuarioMutation.mutate(usuario.user_id)}
                                >
                                  <UserX className="w-4 h-4 text-amber-600" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirm('Excluir permanentemente?') && excluirUsuarioMutation.mutate(usuario.user_id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="por-cliente">
            <Card>
              <CardHeader>
                <CardTitle>Usuários por Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Selecione um Cliente</Label>
                  <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.clinic_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {clienteSelecionado && (
                  <div>
                    <h3 className="font-semibold text-[#312b1d] mb-3">Usuários Vinculados</h3>
                    {usuariosClienteSelecionado.length === 0 ? (
                      <p className="text-sm text-slate-500">Nenhum usuário vinculado</p>
                    ) : (
                      <div className="space-y-2">
                        {usuariosClienteSelecionado.map((vinculo) => {
                          const perfil = perfis.find((p) => p.id === vinculo.profile_id);
                          return (
                            <div key={vinculo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[#312b1d]">{vinculo.user_name}</p>
                                <p className="text-xs text-slate-500">{vinculo.user_email}</p>
                                {perfil && (
                                  <span className="inline-block mt-1 px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: perfil.color || '#f85d07' }}>
                                    {perfil.name}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-slate-600">
                                {vinculo.status === 'APROVADO' ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-4 h-4" /> Aprovado
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-amber-600">
                                    <XCircle className="w-4 h-4" /> Pendente
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogUsuario} onOpenChange={setDialogUsuario}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{usuarioSelecionado ? 'Editar Usuário' : 'Incluir Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formUsuario.nome} onChange={(e) => setFormUsuario({ ...formUsuario, nome: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={formUsuario.email} onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })} disabled={!!usuarioSelecionado} />
              </div>
            </div>
            <div>
              <Label>Perfil de Acesso *</Label>
              <Select value={formUsuario.profile_id} onValueChange={(v) => setFormUsuario({ ...formUsuario, profile_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {perfisDisponiveis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (Nível {p.level || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isAdmin && (
                <p className="text-xs text-[#7e6951] flex items-center gap-1 mt-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Você só pode atribuir perfis de nível inferior ao seu (nível {nivelHierarquico}).
                </p>
              )}
            </div>
            <div>
              <Label>Clientes Vinculados</Label>
              <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = formUsuario.clientes.length === clientes.length;
                    setFormUsuario({ ...formUsuario, clientes: allSelected ? [] : clientes.map((u) => u.id) });
                  }}
                  className="text-sm text-[#f85d07] hover:underline font-medium mb-2 block"
                >
                  {formUsuario.clientes.length === clientes.length ? 'Desselecionar Todas' : 'Selecionar Todas'}
                </button>
                {clientes.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formUsuario.clientes.includes(u.id)} onChange={() => toggleCliente(u.id)} className="rounded" />
                    <span className="text-sm">{u.clinic_name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogUsuario(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => salvarUsuarioMutation.mutate(formUsuario)}
                disabled={!formUsuario.nome || !formUsuario.email || !formUsuario.profile_id || formUsuario.clientes.length === 0}
                className="bg-[#f85d07] hover:bg-[#d94e00]"
              >
                {usuarioSelecionado ? 'Salvar' : 'Incluir'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}