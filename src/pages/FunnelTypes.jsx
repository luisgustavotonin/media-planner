import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GitBranch, Plus, Pencil, Trash2, Check, ChevronRight } from 'lucide-react';

const emptyForm = {
  name: '',
  description: '',
  lead_label: 'Lead',
  has_appointment: true,
  appointment_label: 'Agendamento',
  has_showup: true,
  showup_label: 'Comparecimento',
  sale_label: 'Venda',
  default_lead_to_appointment_rate: 0.35,
  default_appointment_to_show_rate: 0.70,
  default_show_to_sale_rate: 0.35,
  is_active: true,
};

function FunnelPreview({ form }) {
  const stages = [form.lead_label || 'Lead'];
  if (form.has_appointment) stages.push(form.appointment_label || 'Agendamento');
  if (form.has_showup) stages.push(form.showup_label || 'Comparecimento');
  stages.push(form.sale_label || 'Venda');

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((s, i) => (
        <React.Fragment key={i}>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium border border-blue-100">{s}</span>
          {i < stages.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
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
    setForm({ ...emptyForm, ...f });
    setOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const handleSubmit = () => {
    const { id, created_date, updated_date, created_by, ...data } = form;
    // If no showup, clear showup rate
    if (!data.has_showup) data.default_appointment_to_show_rate = null;
    if (!data.has_appointment) {
      data.default_lead_to_appointment_rate = null;
      data.default_appointment_to_show_rate = null;
    }
    if (editing) updateMut.mutate({ id: editing.id, d: data });
    else createMut.mutate(data);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const stageCount = (f) => {
    let n = 2; // lead + sale sempre
    if (f.has_appointment) n++;
    if (f.has_showup) n++;
    return n;
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Tipos de Funil"
        description="Configure os modelos de funil de conversão disponíveis para os planos."
        actions={
          <Button onClick={handleNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Novo Tipo de Funil
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {funnels.map(f => (
          <div key={f.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{f.name}</h3>
                  <p className="text-[10px] text-gray-400">{stageCount(f)} etapas</p>
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
            <FunnelPreview form={f} />
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-3 text-[10px] text-gray-400">
                {f.default_lead_to_appointment_rate && (
                  <span>Lead→{f.appointment_label || 'Agend.'}: {Math.round(f.default_lead_to_appointment_rate * 100)}%</span>
                )}
                {f.has_showup && f.default_appointment_to_show_rate && (
                  <span>→Compar.: {Math.round(f.default_appointment_to_show_rate * 100)}%</span>
                )}
                {f.default_show_to_sale_rate && (
                  <span>→Venda: {Math.round(f.default_show_to_sale_rate * 100)}%</span>
                )}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Tipo de Funil' : 'Novo Tipo de Funil'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-4">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Odontológico Completo" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Descreva quando usar este funil..." className="mt-1" />
            </div>

            {/* Etapas */}
            <div>
              <Label className="text-xs mb-3 block">Etapas do Funil</Label>
              <div className="space-y-3 border border-gray-100 rounded-lg p-4">
                {/* Lead */}
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-[10px] text-gray-500">Nome da etapa de Lead</Label>
                    <Input value={form.lead_label} onChange={e => set('lead_label', e.target.value)} className="mt-0.5 h-7 text-xs" />
                  </div>
                </div>

                {/* Agendamento */}
                <div className="flex items-start gap-3">
                  <Switch checked={!!form.has_appointment} onCheckedChange={v => { set('has_appointment', v); if (!v) set('has_showup', false); }} className="mt-1" />
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-gray-700">Etapa de Agendamento</Label>
                    {form.has_appointment && (
                      <div className="mt-1.5 space-y-1.5">
                        <Input value={form.appointment_label} onChange={e => set('appointment_label', e.target.value)} placeholder="Nome da etapa" className="h-7 text-xs" />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 w-32">Taxa Lead→ (padrão)</span>
                          <Input type="number" min="0" max="100" value={Math.round((form.default_lead_to_appointment_rate || 0) * 100)}
                            onChange={e => set('default_lead_to_appointment_rate', Number(e.target.value) / 100)}
                            className="h-7 text-xs w-20" />
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comparecimento */}
                {form.has_appointment && (
                  <div className="flex items-start gap-3">
                    <Switch checked={!!form.has_showup} onCheckedChange={v => set('has_showup', v)} className="mt-1" />
                    <div className="flex-1">
                      <Label className="text-xs font-medium text-gray-700">Etapa de Comparecimento</Label>
                      {form.has_showup && (
                        <div className="mt-1.5 space-y-1.5">
                          <Input value={form.showup_label} onChange={e => set('showup_label', e.target.value)} placeholder="Nome da etapa" className="h-7 text-xs" />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-32">Taxa Agend.→ (padrão)</span>
                            <Input type="number" min="0" max="100" value={Math.round((form.default_appointment_to_show_rate || 0) * 100)}
                              onChange={e => set('default_appointment_to_show_rate', Number(e.target.value) / 100)}
                              className="h-7 text-xs w-20" />
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Venda */}
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-[10px] text-gray-500">Nome da etapa final (Venda/Conversão)</Label>
                    <Input value={form.sale_label} onChange={e => set('sale_label', e.target.value)} className="mt-0.5 h-7 text-xs" />
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-gray-400 w-32">Taxa última etapa→ (padrão)</span>
                      <Input type="number" min="0" max="100" value={Math.round((form.default_show_to_sale_rate || 0) * 100)}
                        onChange={e => set('default_show_to_sale_rate', Number(e.target.value) / 100)}
                        className="h-7 text-xs w-20" />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label className="text-xs mb-2 block text-gray-500">Preview do funil</Label>
              <div className="bg-gray-50 rounded-lg p-3">
                <FunnelPreview form={form} />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label className="text-xs">Ativo</Label>
              <Switch checked={form.is_active !== false} onCheckedChange={v => set('is_active', v)} />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {editing ? 'Atualizar' : 'Criar Funil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}