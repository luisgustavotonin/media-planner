import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CurrencyInput from '../components/ui-custom/CurrencyInput';
import PercentInput from '../components/ui-custom/PercentInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';

const EMPTY_FORM = { segment_label: '', funnel_type_id: '', funnel_type_name: '', conversion_rates: [], meta_default_cpl: 0, google_default_cpl: 0 };

export default function Benchmarks() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = novo
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: benchmarks = [] } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => base44.entities.Benchmark.list(),
  });

  const { data: funnelTypes = [] } = useQuery({
    queryKey: ['funnelTypes'],
    queryFn: () => base44.entities.FunnelType.list(),
  });

  const saveMut = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.Benchmark.update(id, data)
      : base44.entities.Benchmark.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['benchmarks'] }); setEditOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Benchmark.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['benchmarks'] }); setDeleteConfirm(null); },
  });

  const selectedFunnel = funnelTypes.find(f => f.id === form.funnel_type_id);
  // Pares de conversão baseados nas etapas do funil selecionado
  const convPairs = selectedFunnel?.stages?.length >= 2
    ? selectedFunnel.stages.slice(0, -1).map((s, i) => ({
        label: `${s.label} → ${selectedFunnel.stages[i + 1].label}`,
        index: i,
      }))
    : [];

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setEditOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({ ...b });
    setEditOpen(true);
  };

  const handleFunnelChange = (funnelId) => {
    const ft = funnelTypes.find(f => f.id === funnelId);
    const numPairs = ft?.stages?.length >= 2 ? ft.stages.length - 1 : 0;
    setForm(f => ({
      ...f,
      funnel_type_id: funnelId,
      funnel_type_name: ft?.name || '',
      conversion_rates: Array(numPairs).fill(0),
    }));
  };

  const setRate = (i, v) => {
    setForm(f => {
      const rates = [...(f.conversion_rates || [])];
      rates[i] = v;
      return { ...f, conversion_rates: rates };
    });
  };

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, created_by_id, ...data } = form;
    // Sync legacy fields from first 3 rates for backward compat
    data.lead_to_appointment_rate = data.conversion_rates?.[0] || 0;
    data.appointment_to_show_rate = data.conversion_rates?.[1] || 0;
    data.show_to_sale_rate = data.conversion_rates?.[2] || 0;
    saveMut.mutate({ id: editing?.id, data });
  };

  const fmtPct = v => v != null && v > 0 ? `${(v * 100).toFixed(0)}%` : '—';

  // Group benchmarks by funnel
  const byFunnel = {};
  benchmarks.forEach(b => {
    const key = b.funnel_type_id || '__legacy__';
    const label = b.funnel_type_name || 'Sem funil';
    if (!byFunnel[key]) byFunnel[key] = { label, items: [] };
    byFunnel[key].items.push(b);
  });

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Benchmarks"
        description="Taxas de conversão e CPL padrão por funil e segmento."
        actions={
          <Button onClick={openNew} className="gap-2 bg-primary hover:bg-primary/90 h-9 text-xs">
            <Plus className="w-4 h-4" /> Novo Benchmark
          </Button>
        }
      />

      <div className="space-y-6">
        {Object.entries(byFunnel).map(([key, group]) => {
          // Detect funnel stage pairs for column headers
          const ft = funnelTypes.find(f => f.id === key);
          const pairs = ft?.stages?.length >= 2
            ? ft.stages.slice(0, -1).map((s, i) => `${s.label}→${ft.stages[i+1].label}`)
            : ['Lead→Agend.', 'Agend.→Comparec.', 'Comparec.→Venda'];

          return (
            <div key={key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{group.label}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Objetivo</th>
                      {pairs.map((p, i) => (
                        <th key={i} className="text-center py-3 px-3 text-xs font-medium text-gray-500">{p}</th>
                      ))}
                      <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">CPL Meta</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">CPL Google</th>
                      <th className="py-3 px-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.items.map(b => {
                      const rates = Array.isArray(b.conversion_rates) && b.conversion_rates.length
                        ? b.conversion_rates
                        : [b.lead_to_appointment_rate, b.appointment_to_show_rate, b.show_to_sale_rate];
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-medium text-gray-900">{b.segment_label || b.segment || '—'}</td>
                          {pairs.map((_, i) => (
                            <td key={i} className="py-3 px-3 text-center text-gray-600">{fmtPct(rates[i])}</td>
                          ))}
                          <td className="py-3 px-3 text-center text-gray-600">{b.meta_default_cpl ? `R$${b.meta_default_cpl}` : '—'}</td>
                          <td className="py-3 px-3 text-center text-gray-600">{b.google_default_cpl ? `R$${b.google_default_cpl}` : '—'}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEdit(b)} className="p-1.5 rounded-md hover:bg-gray-100">
                                <Pencil className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <button onClick={() => setDeleteConfirm(b)} className="p-1.5 rounded-md hover:bg-red-50">
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {benchmarks.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
            Nenhum benchmark cadastrado. Clique em "Novo Benchmark" para começar.
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar — ${form.segment_label}` : 'Novo Benchmark'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Funil associado</Label>
              <Select value={form.funnel_type_id} onValueChange={handleFunnelChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o funil..." /></SelectTrigger>
                <SelectContent>
                  {funnelTypes.map(ft => <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Nome do Objetivo</Label>
              <Input
                value={form.segment_label || ''}
                onChange={e => setForm(f => ({ ...f, segment_label: e.target.value }))}
                placeholder="Ex: Implantes, Estética..."
                className="mt-1"
              />
            </div>

            {convPairs.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Taxas de Conversão</h4>
                <div className="grid grid-cols-2 gap-3">
                  {convPairs.map(pair => (
                    <div key={pair.index}>
                      <Label className="text-xs">{pair.label}</Label>
                      <PercentInput
                        value={(form.conversion_rates || [])[pair.index] || 0}
                        onChange={v => setRate(pair.index, v)}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">CPL Padrão (R$)</h4>
            <div className="grid grid-cols-2 gap-3">
              {[{ key: 'meta_default_cpl', label: 'Meta' }, { key: 'google_default_cpl', label: 'Google' }].map(ch => (
                <div key={ch.key}>
                  <Label className="text-xs">{ch.label}</Label>
                  <CurrencyInput value={form[ch.key] || 0} onChange={v => setForm(f => ({ ...f, [ch.key]: v }))} prefix="R$" className="mt-1" />
                </div>
              ))}
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={saveMut.isPending || !form.funnel_type_id || !form.segment_label}
            >
              {saveMut.isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Benchmark'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Benchmark</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mt-2">
            Tem certeza que deseja excluir o benchmark <strong>{deleteConfirm?.segment_label}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate(deleteConfirm.id)}
            >
              {deleteMut.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}