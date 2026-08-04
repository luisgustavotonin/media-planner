import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Shield, ChevronDown, ChevronUp, Eye, MousePointerClick } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { APP_MODULES } from '@/lib/appModules';

const getPermVal = (perfil, key) => {
  const p = perfil?.permissions?.[key];
  if (typeof p === 'boolean') return { view: p, use: p };
  return { view: !!(p && p.view), use: !!(p && p.use) };
};

// Permissões dinâmicas: derivadas dos módulos do app (src/lib/appModules.js),
// agrupadas por "group". Novos módulos aparecem aqui automaticamente.
const PERMISSOES = Object.values(
  APP_MODULES.reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = { grupo: m.group, items: [] };
    acc[m.group].items.push({ key: m.key, label: m.label });
    return acc;
  }, {})
);

export default function PerfisPermissoes() {
  const { toast } = useToast();
  const [dialogPerfil, setDialogPerfil] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const qc = useQueryClient();

  const { data: perfis = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list(),
  });

  const perfisOrdenados = [...perfis].sort((a, b) => (a.level || 5) - (b.level || 5));

  const salvarPerfilMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        name: data.name,
        description: data.description,
        level: data.level,
        color: data.color,
        status: data.ativo ? 'ativo' : 'inativo',
        permissions: data.permissions,
      };
      if (perfilSelecionado) await base44.entities.Profile.update(perfilSelecionado.id, payload);
      else await base44.entities.Profile.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['profiles-active'] });
      setDialogPerfil(false);
      setPerfilSelecionado(null);
      toast({ title: 'Perfil salvo!' });
    },
  });

  const excluirPerfilMutation = useMutation({
    mutationFn: async (perfil) => await base44.entities.Profile.delete(perfil.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['profiles-active'] });
      toast({ title: 'Perfil excluído!' });
    },
  });

  const togglePermissaoMatrix = async (perfil, key, tipo) => {
    const atual = getPermVal(perfil, key);
    const novo = { ...atual, [tipo]: !atual[tipo] };
    if (tipo === 'use' && novo.use) novo.view = true;
    if (tipo === 'view' && !novo.view) novo.use = false;
    const novasPermissoes = { ...perfil.permissions, [key]: novo };
    await base44.entities.Profile.update(perfil.id, { permissions: novasPermissoes });
    qc.invalidateQueries({ queryKey: ['profiles'] });
    qc.invalidateQueries({ queryKey: ['profiles-active'] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3.5 border-b border-[#f0ece4] flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-[#312b1d]">Perfis e Permissões</h1>
          <p className="text-xs text-[#7e6951] mt-0.5">Gerencie perfis de acesso e permissões por módulo</p>
        </div>
        <Button onClick={() => { setPerfilSelecionado(null); setDialogPerfil(true); }} className="bg-[#f85d07] hover:bg-[#d94e00]">
          <Plus className="w-4 h-4 mr-2" /> Novo Perfil
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {perfisOrdenados.map((perfil) => {
            const totalPermissoes = Object.values(perfil.permissions || {}).filter((p) => typeof p === 'boolean' ? p : (p && (p.view || p.use))).length;
            return (
              <div key={perfil.id} className="bg-white border border-[#e5e0d8] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (perfil.color || '#f85d07') + '25' }}>
                      <Shield className="w-5 h-5" style={{ color: perfil.color || '#f85d07' }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#312b1d] leading-tight">{perfil.name}</h3>
                      <p className="text-xs text-[#7e6951]">Nível {perfil.level || 5}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => { setPerfilSelecionado(perfil); setDialogPerfil(true); }} className="p-1.5 text-[#7e6951] hover:text-[#312b1d] rounded transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => confirm('Excluir este perfil?') && excluirPerfilMutation.mutate(perfil)} className="p-1.5 text-[#7e6951] hover:text-red-600 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[#7e6951] mb-4 min-h-[2.5rem]">{perfil.description || 'Sem descrição'}</p>
                <div className="flex items-center justify-between text-xs border-t border-[#f0ece4] pt-3">
                  <span className="text-[#7e6951]">{totalPermissoes} permissões</span>
                  <span className={`px-2.5 py-1 rounded-full font-medium ${perfil.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {perfil.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#312b1d] mb-4">Matriz de Permissões</h2>
          <div className="bg-white border border-[#e5e0d8] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#f0ece4]">
                    <th className="text-left p-4 text-sm text-[#312b1d] sticky left-0 bg-white z-10 min-w-[200px] font-semibold">Permissão</th>
                    {perfisOrdenados.map((perfil) => (
                      <th key={perfil.id} className="p-3 text-center min-w-[130px]">
                        <div className="font-semibold text-sm" style={{ color: perfil.color || '#f85d07' }}>{perfil.name}</div>
                        <div className="flex items-center justify-center gap-2 mt-1 text-[9px] text-[#b0a090] uppercase tracking-wide">
                          <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> Ver</span>
                          <span className="flex items-center gap-0.5"><MousePointerClick className="w-2.5 h-2.5" /> Usar</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSOES.map(({ grupo, items }) => (
                    <React.Fragment key={grupo}>
                      <tr>
                        <td colSpan={perfisOrdenados.length + 1} className="px-4 py-2 text-xs font-semibold text-[#b0a090] uppercase tracking-wider bg-[#faf9f5] border-y border-[#f0ece4]">
                          {grupo}
                        </td>
                      </tr>
                      {items.map(({ key, label }) => (
                        <tr key={key} className="border-b border-[#f0ece4] hover:bg-[#faf9f5]/50 transition-colors">
                          <td className="p-4 text-sm text-[#312b1d] sticky left-0 bg-white font-medium">{label}</td>
                          {perfisOrdenados.map((perfil) => {
                            const perm = getPermVal(perfil, key);
                            return (
                              <td key={perfil.id} className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => togglePermissaoMatrix(perfil, key, 'view')}
                                    title="Visualizar"
                                    className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all hover:scale-110 ${perm.view ? 'bg-[#f85d07] border-[#f85d07] text-white' : 'bg-white border border-[#e5e0d8] text-[#b0a090] hover:border-[#b0a090]'}`}
                                  >
                                    <Eye className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => togglePermissaoMatrix(perfil, key, 'use')}
                                    title="Utilizar / Gerenciar"
                                    className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all hover:scale-110 ${perm.use ? 'bg-[#f85d07] border-[#f85d07] text-white' : 'bg-white border border-[#e5e0d8] text-[#b0a090] hover:border-[#b0a090]'}`}
                                  >
                                    <MousePointerClick className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <DialogPerfilAcesso open={dialogPerfil} onOpenChange={setDialogPerfil} perfil={perfilSelecionado} onSalvar={(data) => salvarPerfilMutation.mutate(data)} />
    </div>
  );
}

function DialogPerfilAcesso({ open, onOpenChange, perfil, onSalvar }) {
  const [formData, setFormData] = useState({ name: '', description: '', level: 5, color: '#f85d07', ativo: true, permissions: {} });
  const [gruposExpandidos, setGruposExpandidos] = useState({});

  useEffect(() => {
    if (perfil) {
      setFormData({
        name: perfil.name || '',
        description: perfil.description || '',
        level: perfil.level || 5,
        color: perfil.color || '#f85d07',
        ativo: perfil.status !== 'inativo',
        permissions: perfil.permissions || {},
      });
    } else {
      setFormData({ name: '', description: '', level: 5, color: '#f85d07', ativo: true, permissions: {} });
    }
    setGruposExpandidos(Object.fromEntries(PERMISSOES.map(g => [g.grupo, true])));
  }, [perfil, open]);

  const getPerm = (key) => {
    const p = formData.permissions[key];
    if (typeof p === 'boolean') return { view: p, use: p };
    return { view: !!(p && p.view), use: !!(p && p.use) };
  };

  const togglePermissao = (key, tipo) => {
    const atual = getPerm(key);
    const novo = { ...atual, [tipo]: !atual[tipo] };
    if (tipo === 'use' && novo.use) novo.view = true;
    if (tipo === 'view' && !novo.view) novo.use = false;
    setFormData({ ...formData, permissions: { ...formData.permissions, [key]: novo } });
  };

  const marcarTodos = (grupo) => {
    const novas = { ...formData.permissions };
    PERMISSOES.find((g) => g.grupo === grupo).items.forEach((p) => { novas[p.key] = { view: true, use: true }; });
    setFormData({ ...formData, permissions: novas });
  };

  const desmarcarTodos = (grupo) => {
    const novas = { ...formData.permissions };
    PERMISSOES.find((g) => g.grupo === grupo).items.forEach((p) => { novas[p.key] = { view: false, use: false }; });
    setFormData({ ...formData, permissions: novas });
  };

  const contarPermissoes = (grupo) => {
    const items = PERMISSOES.find((g) => g.grupo === grupo).items;
    return `${items.filter((p) => {
      const perm = getPerm(p.key);
      return perm.view || perm.use;
    }).length}/${items.length}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{perfil ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Gestor" />
            </div>
            <div>
              <Label>Nível Hierárquico</Label>
              <Input type="number" min="1" max="10" value={formData.level} onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Responsabilidades do perfil" />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10 w-20 rounded border cursor-pointer" />
              <Input value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="flex-1" />
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#faf9f5] px-4 py-2 border-b border-[#e5e0d8]">
              <Label className="text-base font-semibold">Permissões</Label>
            </div>
            <div className="divide-y">
              {PERMISSOES.map(({ grupo, items }) => (
                <div key={grupo}>
                  <button onClick={() => setGruposExpandidos({ ...gruposExpandidos, [grupo]: !gruposExpandidos[grupo] })} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#faf9f5] transition-colors">
                    <div className="flex items-center gap-2">
                      {gruposExpandidos[grupo] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      <span className="font-medium text-sm">{grupo}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#7e6951]">{contarPermissoes(grupo)}</span>
                      <button onClick={(e) => { e.stopPropagation(); marcarTodos(grupo); }} className="text-xs text-green-600 hover:underline">Marcar</button>
                      <button onClick={(e) => { e.stopPropagation(); desmarcarTodos(grupo); }} className="text-xs text-red-600 hover:underline">Desmarcar</button>
                    </div>
                  </button>
                  {gruposExpandidos[grupo] && (
                    <div className="px-4 py-3 bg-[#faf9f5]/50 space-y-1.5">
                      <div className="flex items-center text-[10px] font-semibold text-[#b0a090] uppercase tracking-wide mb-1">
                        <span className="flex-1"></span>
                        <span className="w-8 text-center">Ver</span>
                        <span className="w-8 text-center">Usar</span>
                      </div>
                      {items.map((perm) => {
                        const p = getPerm(perm.key);
                        return (
                          <div key={perm.key} className="flex items-center">
                            <span className="flex-1 text-sm">{perm.label}</span>
                            <div className="w-8 flex justify-center">
                              <input type="checkbox" checked={p.view} onChange={() => togglePermissao(perm.key, 'view')} className="rounded" />
                            </div>
                            <div className="w-8 flex justify-center">
                              <input type="checkbox" checked={p.use} onChange={() => togglePermissao(perm.key, 'use')} className="rounded" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ativo" checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} className="rounded" />
            <Label htmlFor="ativo">Perfil ativo</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => onSalvar(formData)} disabled={!formData.name} className="bg-[#f85d07] hover:bg-[#d94e00]">
              {perfil ? 'Salvar' : 'Criar Perfil'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}