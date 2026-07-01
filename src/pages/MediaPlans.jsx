import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import PageHeader from '../components/ui-custom/PageHeader';
import EmptyState from '../components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart3, Plus, Search, Target, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
// Especialidades agora vêm dos benchmarks cadastrados (carregados abaixo)
const STATUS_LABELS = { active: 'ativo', draft: 'rascunho', completed: 'concluído' };

const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function MediaPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data.sort((a, b) => (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR'));
    },
  });
  const { data: benchmarks = [] } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => base44.entities.Benchmark.list(),
  });
  const { data: funnelTypes = [] } = useQuery({
    queryKey: ['funnelTypes'],
    queryFn: () => base44.entities.FunnelType.filter({ is_active: true }),
  });

  const [form, setForm] = useState({
    client_id: '', period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(),
    segment: 'general', status: 'draft', funnel_type_id: '',
  });

  const createMut = useMutation({
    mutationFn: async (d) => {
      const client = allClients.find(c => c.id === d.client_id);
      const ft = funnelTypes.find(f => f.id === d.funnel_type_id);

      // Busca o benchmark direto da API para garantir dados atualizados
      const bmList = await base44.entities.Benchmark.filter({ funnel_type_id: d.funnel_type_id });
      const bm = bmList?.[0]
        || benchmarks.find(b => b.funnel_type_id === d.funnel_type_id)
        || benchmarks.find(b => b.funnel_type_name === ft?.name);

      const ftStages = ft?.stages || [];
      // Prioriza as taxas do benchmark cadastrado; se não houver, usa default_rate do FunnelType
      const conversion_rates = bm?.conversion_rates?.length > 0
        ? bm.conversion_rates
        : ftStages.length >= 2
          ? ftStages.slice(1).map(s => s.default_rate ?? 0)
          : [
              bm?.lead_to_appointment_rate ?? 0.35,
              bm?.appointment_to_show_rate ?? 0.7,
              bm?.show_to_sale_rate ?? 0.35,
            ];

      return base44.entities.MediaPlan.create({
        ...d,
        client_name: client?.clinic_name || '',
        funnel_type_name: ft?.name || '',
        segment: ft?.name || 'general',
        average_ticket: client?.average_ticket || 5000,
        conversion_rates,
        lead_to_appointment_rate: conversion_rates[0] ?? 0,
        appointment_to_show_rate: conversion_rates[1] ?? 0,
        show_to_sale_rate: conversion_rates[2] ?? 0,
        channels: [],
        total_investment: 0,
      });
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setOpen(false);
      navigate(createPageUrl(`PlanDetail?id=${newPlan.id}`));
    },
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.MediaPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });

  const isClientRole = user?.role === 'client';

  const myPlans = plans.filter(p => allClients.some(c => c.id === p.client_id));
  const clientPlans = myPlans.filter(p => p.client_id === selectedClientId);
  const selectedPlan = myPlans.find(p => p.id === selectedPlanId);

  // Segmentos baseados nos benchmarks cadastrados
  const ESPECIALIDADES = benchmarks.map(b => ({
    value: b.segment,
    label: b.segment_label || b.segment,
  }));

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Planos de Mídia"
        description="Crie e gerencie planos de mídia multicanal."
        actions={!isClientRole && selectedClientId && (
          <Button onClick={() => { setForm(f => ({ ...f, client_id: selectedClientId })); setOpen(true); }} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Novo Plano
          </Button>
        )}
      />

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        {/* Passo 1: Cliente */}
        <div className="mb-5">
          <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">1. Selecione o Cliente</Label>
          <Select value={selectedClientId} onValueChange={v => { setSelectedClientId(v); setSelectedPlanId(''); }}>
            <SelectTrigger className="mt-2 max-w-sm">
              <SelectValue placeholder="Selecione um cliente..." />
            </SelectTrigger>
            <SelectContent>
              {allClients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
            </SelectContent>
            </Select>
            </div>

        {/* Passo 2: Plano */}
        {selectedClientId && (
          <div className="mb-5">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">2. Selecione o Plano de Mídia</Label>
            {clientPlans.length === 0 ? (
              <p className="text-sm text-gray-400 mt-2">Este cliente não possui planos de mídia cadastrados.</p>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="mt-2 max-w-sm">
                  <SelectValue placeholder="Selecione um plano..." />
                </SelectTrigger>
                <SelectContent>
                  {clientPlans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {MESES_SHORT[(p.period_month || 1) - 1]}/{p.period_year} — {p.status === 'active' ? 'Ativo' : p.status === 'draft' ? 'Rascunho' : 'Concluído'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {selectedPlan && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <Link to={createPageUrl(`PlanDetail?id=${selectedPlan.id}`)} className="flex items-center justify-between hover:opacity-75 transition-opacity">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                <Target className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedPlan.client_name || 'Sem nome'}</p>
                <p className="text-xs text-gray-400">
                  {MESES_SHORT[(selectedPlan.period_month || 1) - 1]}/{selectedPlan.period_year} · {selectedPlan.funnel_type_name || 'Sem funil'} · {selectedPlan.channels?.length || 0} canais
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">R${(selectedPlan.total_investment || 0).toLocaleString('pt-BR')}</p>
              <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full inline-block mt-1 ${
                selectedPlan.status === 'active' ? 'bg-primary/15 text-primary' :
                selectedPlan.status === 'completed' ? 'bg-muted text-muted-foreground' :
                'bg-secondary/60 text-secondary-foreground'
              }`}>
                {STATUS_LABELS[selectedPlan.status] || 'rascunho'}
              </span>
            </div>
          </Link>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Criar Plano de Mídia</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.client_id} onValueChange={v => setForm({...form, client_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {allClients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mês</Label>
                <Select value={String(form.period_month)} onValueChange={v => setForm({...form, period_month: Number(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ano</Label>
                <Input type="number" value={form.period_year} onChange={e => setForm({...form, period_year: Number(e.target.value)})} />
              </div>
            </div>
            <Button onClick={() => createMut.mutate(form)} className="w-full bg-primary hover:bg-primary/90" disabled={!form.client_id || createMut.isPending}>
              Criar Plano
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}