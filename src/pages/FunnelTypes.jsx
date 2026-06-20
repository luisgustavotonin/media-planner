import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GitBranch, Plus, Pencil, Trash2, ChevronRight, GripVertical, X } from 'lucide-react';

const METRIC_TYPES = [
  { value: 'quantidade', label: 'Quantidade', example: 'ex: curtidas, seguidores, leads' },
  { value: 'percentual', label: 'Percentual (%)', example: 'ex: taxa de conversão' },
  { value: 'valor', label: 'Valor (R$)', example: 'ex: receita, ticket médio' },
];

const METRIC_COLORS = {
  quantidade: 'bg-blue-50 text-blue-700 border-blue-100',
  percentual: 'bg-purple-50 text-purple-700 border-purple-100',
  valor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const emptyStage = () => ({
  key: `stage_${Date.now()}`,
  label: '',
  metric_type: 'quantidade',
  default_rate: null,
});

const emptyForm = {
  name: '',
  description: '',
  stages: [
    { key: 'stage_1', label: 'Lead', metric_type: 'quantidade', default_rate: null },
    { key: 'stage_2', label: 'Venda', metric_type: 'quantidade', default_rate: 0.35 },
  ],
  is_active: true,
};

function FunnelPreview({ stages = [] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((s, i) => (
        <React.Fragment key={s.key || i}>
          <div className="flex flex-col items-center gap-0.5">
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${METRIC_COLORS[s.metric_type] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
              {s.label || `Etapa ${i + 1}`}
            </span>
            <span className="text-[9px] text-gray-400 capitalize">{s.metric_type}</span>
          </div>
          {i < stages.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 mb-3" />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function FunnelTypes() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: funnels = [] } = useQuery({
    queryKey: ['funnelTypes'],
    queryFn: () => base44.entities.FunnelType.list('-created_date'),
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.FunnelType.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funnelTypes'] }); setOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.FunnelType.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funnelTypes'] }); setOpen(false); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.FunnelType.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['funnelTypes'] }),
  });

  const handleEdit = (f) => {
    setEditing(f);
    setForm({ name: f.name || '', description: f.description || '', stages: f.stages || [], is_active: f.is_active !== false });
    setOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, stages: emptyForm.stages.map(s => ({ ...s })) });
    setOpen(true);
  };

  const handleSubmit = () => {
    const data = { name: form.name, description: form.description, stages: form.stages, is_active: form.is_active };
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const addStage = () => {
    setForm(f => ({ ...f, stages: [...f.stages, emptyStage()] }));
  };

  const removeStage = (idx) => {
    setForm(f => ({ ...f, stages: f.stages.filter((_, i) => i !== idx) }));
  };

  const updateStage = (idx, field, value) => {
    setForm(f => ({ ...f, stages: f.stages.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));
  };

  const moveStage = (idx, dir) => {
    setForm(f => {
      const stages = [...f.stages];
      const target = idx + dir;
      if (target < 0 || target >= stages.length) return f;
      [stages[idx], stages[target]] = [stages[target], stages[idx]];
      return { ...f, stages };
    });
  };

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Tipos de Funil"
        description="Configure modelos de funil totalmente livres — etapas, métricas e taxas de conversão."
        actions={
          <Button onClick={handleNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Novo Tipo de Funil
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {funnels.map(f => (
          <div key={f.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{f.name}</h3>
                  <p className="text-[10px] text-gray-400">{(f.stages || []).length} etapas</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(f)} className="p-1.5 rounded-md hover:bg-gray-100">
                  <Pencil className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button onClick={() => deleteMut.mutate(f.id)} className="p-1.5 rounded-md hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            {f.description && <p className="text-xs text-gray-500 mb-3">{f.description}</p>}
            <FunnelPreview stages={f.stages} />
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1 flex-wrap">
                {(f.stages || []).map(s => (
                  <span key={s.key} className={`text-[9px] px-1.5 py-0.5 rounded border ${METRIC_COLORS[s.metric_type] || ''}`}>
                    {s.metric_type}
                  </span>
                ))}
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${f.is_active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500'}`}>
                {f.is_active !== false ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        ))}
        {funnels.length === 0 && (
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-12 text-center">
            <GitBranch className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-4">Nenhum tipo de funil criado ainda.</p>
            <Button onClick={handleNew} variant="outline" size="sm" className="gap-2">
              <Plus className="w-3.5 h-3.5" /> Criar primeiro funil
            </Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Tipo de Funil' : 'Novo Tipo de Funil'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Social Media, E-commerce, Odontológico..." className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Descrição</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Quando usar este funil..." className="mt-1" />
              </div>
            </div>

            {/* Stages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Etapas do Funil</Label>
                <Button onClick={addStage} variant="outline" size="sm" className="h-7 gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Adicionar Etapa
                </Button>
              </div>

              <div className="space-y-2">
                {form.stages.map((stage, idx) => (
                  <div key={stage.key} className="border border-gray-100 rounded-lg p-3 bg-gray-50/40">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveStage(idx, -1)} disabled={idx === 0} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-20">
                          <ChevronRight className="w-3 h-3 text-gray-400 -rotate-90" />
                        </button>
                        <button onClick={() => moveStage(idx, 1)} disabled={idx === form.stages.length - 1} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-20">
                          <ChevronRight className="w-3 h-3 text-gray-400 rotate-90" />
                        </button>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400 w-5">{idx + 1}</span>
                      <Input
                        value={stage.label}
                        onChange={e => updateStage(idx, 'label', e.target.value)}
                        placeholder="Nome da etapa (ex: Curtidas, Seguidores, Agendamentos...)"
                        className="h-7 text-xs flex-1"
                      />
                      <button onClick={() => removeStage(idx)} className="p-1 hover:bg-red-50 rounded flex-shrink-0">
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 pl-8">
                      <div className="flex-1">
                        <Label className="text-[10px] text-gray-400">Tipo de métrica</Label>
                        <Select value={stage.metric_type} onValueChange={v => updateStage(idx, 'metric_type', v)}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {METRIC_TYPES.map(m => (
                              <SelectItem key={m.value} value={m.value}>
                                <span className="font-medium">{m.label}</span>
                                <span className="text-gray-400 ml-1 text-[10px]">{m.example}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {idx > 0 && (
                        <div className="w-28">
                          <Label className="text-[10px] text-gray-400">Taxa conversão padrão</Label>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Input
                              type="number" min="0" max="100"
                              value={stage.default_rate != null ? Math.round(stage.default_rate * 100) : ''}
                              onChange={e => updateStage(idx, 'default_rate', e.target.value ? Number(e.target.value) / 100 : null)}
                              placeholder="—"
                              className="h-7 text-xs"
                            />
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {form.stages.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-400 mb-1.5">Preview</p>
                  <FunnelPreview stages={form.stages} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between py-1">
              <Label className="text-xs">Ativo</Label>
              <Switch checked={form.is_active !== false} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!form.name || form.stages.length < 2 || createMut.isPending || updateMut.isPending}>
              {editing ? 'Atualizar' : 'Criar Funil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}