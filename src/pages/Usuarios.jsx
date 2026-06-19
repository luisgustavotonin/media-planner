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
import { Plus, Edit, CheckCircle, XCircle, Trash2, UserX } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function UsuariosPage() {
  const [dialogUsuario, setDialogUsuario] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [formUsuario, setFormUsuario] = useState({ nome: '', email: '', perfil_id: '', clientes: [] });
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const queryClient = useQueryClient();

  const { data: vinculos = [] } = useQuery({
    queryKey: ['user-client'],
    queryFn: () => base44.entities.UserClient.list()
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data.sort((a, b) => (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR'));
    }
  });

  const { data: perfis = [] } = useQuery({
    queryKey: ['access-profiles'],
    queryFn: () => base44.entities.AccessProfile.filter({ ativo: true })
  });

  const salvarUsuarioMutation = useMutation({
    mutationFn: async (data) => {
      if (usuarioSelecionado) {
        const vinculosExistentes = vinculos.filter(v => v.user_id === usuarioSelecionado.user_id);
        for (const clienteId of data.clientes) {
          const existe = vinculosExistentes.find(v => v.client_id === clienteId);
          if (!existe) {
            await base44.entities.UserClient.create({
              user_id: usuarioSelecionado.user_id,
              user_email: data.email,
              user_nome: data.nome,
              client_id: clienteId,
              perfil_id: data.perfil_id,
              status: 'PENDENTE'
            });
          } else {
            await base44.entities.UserClient.update(existe.id, { perfil_id: data.perfil_id });
          }
        }
        const paraExcluir = vinculosExistentes.filter(v => !data.clientes.includes(v.client_id));
        for (const v of paraExcluir) await base44.entities.UserClient.delete(v.id);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        const perfil = perfis.find(p => p.id === data.perfil_id);
        const role = perfil?.nome === 'Master' ? 'admin' : 'user';
        await base44.users.inviteUser(data.email, role);
        for (const clienteId of data.clientes) {
          await base44.entities.UserClient.create({
            user_id: 'temp_' + data.email,
            user_email: data.email,
            user_nome: data.nome,
            client_id: clienteId,
            perfil_id: data.perfil_id,
            status: 'PENDENTE'
          });
        }
        toast.success('Usuário incluído com sucesso!');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-client']);
      setDialogUsuario(false);
      setFormUsuario({ nome: '', email: '', perfil_id: '', clientes: [] });
      setUsuarioSelecionado(null);
    }
  });

  const excluirUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      const vinculosUsuario = vinculos.filter(v => v.user_id === userId);
      for (const v of vinculosUsuario) await base44.entities.UserClient.delete(v.id);
      toast.success('Usuário excluído!');
    },
    onSuccess: () => queryClient.invalidateQueries(['user-client'])
  });

  const inativarUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      const vinculosUsuario = vinculos.filter(v => v.user_id === userId);
      for (const v of vinculosUsuario) await base44.entities.UserClient.update(v.id, { status: 'INATIVO' });
      toast.success('Usuário inativado!');
    },
    onSuccess: () => queryClient.invalidateQueries(['user-client'])
  });

  const aprovarUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      const vinculosUsuario = vinculos.filter(v => v.user_id === userId);
      for (const v of vinculosUsuario) await base44.entities.UserClient.update(v.id, { status: 'APROVADO' });
      toast.success('Usuário aprovado!');
    },
    onSuccess: () => queryClient.invalidateQueries(['user-client'])
  });

  const abrirDialogoUsuario = (usuario = null) => {
    if (usuario) {
      setUsuarioSelecionado(usuario);
      const vinc = vinculos.filter(v => v.user_id === usuario.user_id);
      setFormUsuario({
        nome: usuario.user_nome,
        email: usuario.user_email,
        perfil_id: usuario.perfil_id || '',
        clientes: vinc.map(v => v.client_id)
      });
    } else {
      setUsuarioSelecionado(null);
      setFormUsuario({ nome: '', email: '', perfil_id: '', clientes: [] });
    }
    setDialogUsuario(true);
  };

  const toggleCliente = (clienteId) => {
    if (formUsuario.clientes.includes(clienteId)) {
      setFormUsuario({ ...formUsuario, clientes: formUsuario.clientes.filter(id => id !== clienteId) });
    } else {
      setFormUsuario({ ...formUsuario, clientes: [...formUsuario.clientes, clienteId] });
    }
  };

  const usuariosUnicos = vinculos.reduce((acc, v) => {
    if (v.user_id && !acc.find(u => u.user_id === v.user_id)) acc.push(v);
    return acc;
  }, []);

  const usuariosClienteSelecionado = clienteSelecionado
    ? vinculos.filter(v => v.client_id === clienteSelecionado)
    : [];

  const removerUsuarioClienteMutation = useMutation({
    mutationFn: async (vinculoId) => {
      await base44.entities.UserClient.delete(vinculoId);
      toast.success('Usuário removido do cliente!');
    },
    onSuccess: () => queryClient.invalidateQueries(['user-client'])
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Usuários</h1>
        <p className="text-slate-600">Gerencie os usuários e seus vínculos com clientes</p>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList>
          <TabsTrigger value="usuarios">Lista de Usuários</TabsTrigger>
          <TabsTrigger value="por-cliente">Usuários por Cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lista de Usuários</CardTitle>
                <Button onClick={() => abrirDialogoUsuario()} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Incluir Usuário
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
                    <TableHead>Clientes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosUnicos.map(usuario => {
                    const vinc = vinculos.filter(v => v.user_id === usuario.user_id);
                    const perfil = perfis.find(p => p.id === usuario.perfil_id);
                    return (
                      <TableRow key={usuario.user_id}>
                        <TableCell className="font-medium">{usuario.user_nome}</TableCell>
                        <TableCell>{usuario.user_email}</TableCell>
                        <TableCell>
                          {perfil ? (
                            <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: perfil.cor || '#64748B' }}>
                              {perfil.nome}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Sem perfil</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">{vinc.filter(v => v.status === 'APROVADO').length} cliente(s)</span>
                        </TableCell>
                        <TableCell>
                          {usuario.status === 'APROVADO' ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle className="w-4 h-4" /> Aprovado</span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600 text-sm"><XCircle className="w-4 h-4" /> Pendente</span>
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
                              <Button variant="ghost" size="icon" onClick={() => {
                                if (confirm('⚠️ Confirma a inativação deste usuário?')) inativarUsuarioMutation.mutate(usuario.user_id);
                              }}>
                                <UserX className="w-4 h-4 text-amber-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (confirm('⚠️ EXCLUIR PERMANENTEMENTE este usuário?\n\nTodos os vínculos serão removidos.')) {
                                excluirUsuarioMutation.mutate(usuario.user_id);
                              }
                            }}>
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
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {clienteSelecionado && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Usuários Vinculados</h3>
                  {usuariosClienteSelecionado.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum usuário vinculado a este cliente</p>
                  ) : (
                    <div className="space-y-2">
                      {usuariosClienteSelecionado.map(vinculo => {
                        const usuario = usuariosUnicos.find(u => u.user_id === vinculo.user_id);
                        const perfil = perfis.find(p => p.id === vinculo.perfil_id);
                        return (
                          <div key={vinculo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{vinculo.user_nome}</p>
                              <p className="text-xs text-slate-500">{vinculo.user_email}</p>
                              {perfil && (
                                <span className="inline-block mt-1 px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: perfil.cor || '#64748B' }}>
                                  {perfil.nome}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-600">
                                {vinculo.status === 'APROVADO' ? (
                                  <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> Aprovado</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-amber-600"><XCircle className="w-4 h-4" /> Pendente</span>
                                )}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('Remover este usuário do cliente?')) {
                                    removerUsuarioClienteMutation.mutate(vinculo.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
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

      <Dialog open={dialogUsuario} onOpenChange={setDialogUsuario}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{usuarioSelecionado ? 'Editar Usuário' : 'Incluir Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formUsuario.nome} onChange={e => setFormUsuario({ ...formUsuario, nome: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={formUsuario.email}
                  onChange={e => setFormUsuario({ ...formUsuario, email: e.target.value })}
                  disabled={!!usuarioSelecionado} />
              </div>
            </div>
            <div>
              <Label>Perfil de Acesso *</Label>
              <Select value={formUsuario.perfil_id} onValueChange={v => setFormUsuario({ ...formUsuario, perfil_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um perfil..." /></SelectTrigger>
                <SelectContent>
                  {perfis.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clientes Vinculados</Label>
              <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = formUsuario.clientes.length === clientes.length;
                    setFormUsuario({ ...formUsuario, clientes: allSelected ? [] : clientes.map(c => c.id) });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-2 block"
                >
                  {formUsuario.clientes.length === clientes.length ? 'Desselecionar Todas' : 'Selecionar Todas'}
                </button>
                {clientes.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formUsuario.clientes.includes(c.id)}
                      onChange={() => toggleCliente(c.id)} className="rounded" />
                    <span className="text-sm">{c.clinic_name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogUsuario(false)}>Cancelar</Button>
              <Button onClick={() => salvarUsuarioMutation.mutate(formUsuario)} className="bg-red-600 hover:bg-red-700">
                {usuarioSelecionado ? 'Salvar' : 'Incluir Usuário'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}