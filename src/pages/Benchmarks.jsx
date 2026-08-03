import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CurrencyInput from '../components/ui-custom/CurrencyInput';
import PercentInput from '../components/ui-custom/PercentInput';
import ChannelBadge from '../components/ui-custom/ChannelBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';

const EMPTY_FORM = {
  funnel_type_id: '',
  funnel_type_name: '',
  channel_name: '',
  segment: 'general',
  segment_label: '',
  conversion_rates: [],
  default_cpl: 0,
};

export default function Benchmarks() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
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
  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => base44.entities.Channel.list(),
  });

  const activeChannels = useMemo(() => channels.filter(c => c.is_active), [channels]);

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
    setForm({ ...EMPTY_FORM, ...b });
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

  const handleChannelChange = (channelName) => {
    setForm(f => ({ ...f, channel_name: channelName }));
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
    if (!data.segment_label) { data.segment_label = 'Geral'; data.segment = 'general'; }
    // Sync legacy fields for backward compat
    data.lead_to_appointment_rate = data.conversion_rates?.[0] || 0;
    data.appointment_to_show_rate = data.conversion_rates?.[1] || 0;
    data.show_to_sale_rate = data.conversion_rates?.[2] || 0;
    saveMut.mutate({ id: editing?.id, data });
  };

  const fmtPct = v => v != null && v > 0 ? `${(v * 100).toFixed(0)}%` : '—';

  // Agrupa por funil → depois por canal → depois por objetivo/segmento
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
        description="Taxas de conversão e CPL por funil + canal."
        actions={
          <Button onClick={openNew} className="gap-2 bg-primary hover:bg-primary/90 h-9 text-xs">
            <Plus className="w-4 h-4" /> Novo Benchmark
          </Button>
        }
      />

      <div className="space-y-6">
        {Object.entries(byFunnel).map(([key, group]) => {
          const ft = funnelTypes.find(f => f.id === key);
          const pairs = ft?.stages?.length >= 2
            ? ft.stages.slice(0, -1).map((s, i) => `${s.label}→${ft.stages[i + 1].label}`)
            : ['Lead→Agend.', 'Agend.→Comparec.', 'Comparec.→Venda'];

          return (
            <div key={key} className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-secondary">
                <span className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">{ft?.name || group.label}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Canal</th>
                      {pairs.map((p, i) => (
                        <th key={i} className="text-center py-3 px-3 text-xs font-medium text-gray-500">{p}</th>
                      ))}
                      <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">CPL</th>
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
                          <td className="py-3 px-4">
                            {b.channel_name
                              ? <ChannelBadge channel={b.channel_name} />
                              : <span className="text-xs text-gray-400">—</span>}
                          </td>
                          {pairs.map((_, i) => (
                            <td key={i} className="py-3 px-3 text-center text-gray-600">{fmtPct(rates[i])}</td>
                          ))}
                          <td className="py-3 px-3 text-center text-gray-600">
                            {(b.default_cpl || b.meta_default_cpl || b.google_default_cpl) ? `R$${b.default_cpl || b.meta_default_cpl || b.google_default_cpl}` : '—'}
                          </td>
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
            <DialogTitle>{editing ? `Editar Benchmark` : 'Novo Benchmark'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Funil</Label>
              <Select value={form.funnel_type_id} onValueChange={handleFunnelChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o funil..." /></SelectTrigger>
                <SelectContent>
                  {funnelTypes.map(ft => <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Canal</Label>
              <Select value={form.channel_name || undefined} onValueChange={handleChannelChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o canal..." /></SelectTrigger>
                <SelectContent>
                  {activeChannels.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
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

            <div>
              <Label className="text-xs">CPL Padrão (R$)</Label>
              <CurrencyInput
                value={form.default_cpl || 0}
                onChange={v => setForm(f => ({ ...f, default_cpl: v }))}
                prefix="R$"
                className="mt-1"
                placeholder="CPL deste canal/objetivo"
              />
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={saveMut.isPending || !form.funnel_type_id || !form.channel_name}
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
            Tem certeza que deseja excluir este benchmark? Esta ação não pode ser desfeita.
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