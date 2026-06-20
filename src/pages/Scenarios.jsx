import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import { calculateScenarios } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, SlidersHorizontal, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function Scenarios() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [showAdj, setShowAdj] = useState(false);
  const [adjForm, setAdjForm] = useState(null);

  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data.sort((a, b) => (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR'));
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });

  const myPlans = plans.filter(p => allClients.some(c => c.id === p.client_id));

  const clientPlans = myPlans.filter(p => p.client_id === selectedClientId);
  const plan = myPlans.find(p => p.id === selectedPlanId);

  useEffect(() => { setSelectedPlanId(''); }, [selectedClientId]);

  // Sync adjForm when plan changes
  useEffect(() => {
    if (plan) {
      setAdjForm({
        optimistic_cpl_adj: (plan.scenario_adjustments?.optimistic_cpl_adj ?? -0.20) * 100,
        conservative_cpl_adj: (plan.scenario_adjustments?.conservative_cpl_adj ?? 0.25) * 100,
        optimistic_conv_adj: (plan.scenario_adjustments?.optimistic_conv_adj ?? 0.05) * 100,
        conservative_conv_adj: (plan.scenario_adjustments?.conservative_conv_adj ?? -0.05) * 100,
      });
    }
  }, [selectedPlanId]);

  const saveAdjMut = useMutation({
    mutationFn: (data) => base44.entities.MediaPlan.update(plan.id, { scenario_adjustments: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });

  // Usa adjForm (local) para preview em tempo real
  const liveAdjustments = adjForm ? {
    optimistic_cpl_adj: adjForm.optimistic_cpl_adj / 100,
    conservative_cpl_adj: adjForm.conservative_cpl_adj / 100,
    optimistic_conv_adj: adjForm.optimistic_conv_adj / 100,
    conservative_conv_adj: adjForm.conservative_conv_adj / 100,
  } : plan?.scenario_adjustments;

  let scenarios = null;
  if (plan && plan.channels?.length > 0) {
    const rates = Array.isArray(plan.conversion_rates) && plan.conversion_rates.length
      ? plan.conversion_rates
      : [
          plan.lead_to_appointment_rate || 0.35,
          plan.appointment_to_show_rate || 0.7,
          plan.show_to_sale_rate || 0.35,
        ];
    scenarios = calculateScenarios(plan.channels, rates, plan.average_ticket || 5000, liveAdjustments);
  }

  const fmt = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;
  const fmtN = v => Math.round(v).toLocaleString('pt-BR');

  const scenarioConfigs = [
    { key: 'optimistic', label: 'Otimista', icon: TrendingUp, color: 'emerald' },
    { key: 'realistic', label: 'Realista', icon: Minus, color: 'blue' },
    { key: 'conservative', label: 'Conservador', icon: TrendingDown, color: 'amber' },
  ];

  const chartData = scenarios ? [
    { name: 'Leads', Otimista: scenarios.optimistic.totals.total_leads, Realista: scenarios.realistic.totals.total_leads, Conservador: scenarios.conservative.totals.total_leads },
    { name: 'Agendamentos', Otimista: scenarios.optimistic.totals.total_appointments, Realista: scenarios.realistic.totals.total_appointments, Conservador: scenarios.conservative.totals.total_appointments },
    { name: 'Comparec.', Otimista: scenarios.optimistic.totals.total_showups, Realista: scenarios.realistic.totals.total_showups, Conservador: scenarios.conservative.totals.total_showups },
    { name: 'Vendas', Otimista: Math.round(scenarios.optimistic.totals.total_sales), Realista: Math.round(scenarios.realistic.totals.total_sales), Conservador: Math.round(scenarios.conservative.totals.total_sales) },
  ] : [];

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
      <PageHeader title="Simulador de Cenários" description="Compare projeções otimista, realista e conservadora." />

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
        {/* Passo 1: Cliente */}
        <div className="mb-5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">1. Selecione o Cliente</Label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
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
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">2. Selecione o Plano de Mídia</Label>
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

        {!selectedClientId && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
            Selecione um cliente para começar
          </div>
        )}
      </div>

      {plan && adjForm && (
        <div className="bg-white rounded-xl border border-gray-100 mb-6 overflow-hidden">
          <button
            onClick={() => setShowAdj(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">Configurações dos Cenários</span>
              {!showAdj && (
                <span className="text-xs text-gray-400 ml-1">
                  Otimista: CPL {adjForm.optimistic_cpl_adj > 0 ? '+' : ''}{adjForm.optimistic_cpl_adj.toFixed(0)}% / Conv. +{adjForm.optimistic_conv_adj.toFixed(0)}p.p.
                  &nbsp;·&nbsp;
                  Conservador: CPL +{adjForm.conservative_cpl_adj.toFixed(0)}% / Conv. {adjForm.conservative_conv_adj.toFixed(0)}p.p.
                </span>
              )}
            </div>
            {showAdj ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showAdj && (
            <div className="px-6 pb-6 border-t border-gray-50">
              <div className="mt-4 mb-5 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700 space-y-1">
                <p><strong>Como funcionam os cenários:</strong></p>
                <p>• <strong>Realista</strong>: plano atual sem nenhuma alteração.</p>
                <p>• <strong>CPL (%)</strong>: ajuste no Custo por Lead de cada canal. Negativo = leads mais baratos (mais leads pelo mesmo budget). Positivo = leads mais caros.</p>
                <p>• <strong>Conversões (p.p.)</strong>: ajuste em pontos percentuais aplicado a <em>todas</em> as taxas de conversão do funil (ex: Lead→Agendamento, Agendamento→Comparecimento, etc.). Positivo = melhor conversão; negativo = pior.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Otimista */}
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Otimista</h5>
                  <div>
                    <Label className="text-xs text-gray-500">Variação do CPL (%)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={adjForm.optimistic_cpl_adj}
                        onChange={e => setAdjForm(f => ({ ...f, optimistic_cpl_adj: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm w-28"
                      />
                      <span className="text-xs text-gray-400">% no CPL (negativo = mais barato)</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Variação nas Conversões (p.p.)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={adjForm.optimistic_conv_adj}
                        onChange={e => setAdjForm(f => ({ ...f, optimistic_conv_adj: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm w-28"
                      />
                      <span className="text-xs text-gray-400">p.p. nas taxas</span>
                    </div>
                  </div>
                </div>
                {/* Conservador */}
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Conservador</h5>
                  <div>
                    <Label className="text-xs text-gray-500">Variação do CPL (%)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={adjForm.conservative_cpl_adj}
                        onChange={e => setAdjForm(f => ({ ...f, conservative_cpl_adj: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm w-28"
                      />
                      <span className="text-xs text-gray-400">% no CPL (positivo = mais caro)</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Variação nas Conversões (p.p.)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={adjForm.conservative_conv_adj}
                        onChange={e => setAdjForm(f => ({ ...f, conservative_conv_adj: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm w-28"
                      />
                      <span className="text-xs text-gray-400">p.p. nas taxas (negativo = pior)</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => saveAdjMut.mutate(liveAdjustments)}
                disabled={saveAdjMut.isPending}
                className="mt-5 h-8 text-xs bg-blue-600 hover:bg-blue-700"
              >
                {saveAdjMut.isPending ? 'Salvando...' : 'Salvar premissas'}
              </Button>
            </div>
          )}
        </div>
      )}

      {scenarios && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Comparação de Cenários</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Otimista" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Realista" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Conservador" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
            {scenarioConfigs.map(sc => {
              const s = scenarios[sc.key];
              return (
                <div key={sc.key} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg bg-${sc.color}-50 flex items-center justify-center`}>
                      <sc.icon className={`w-4 h-4 text-${sc.color}-500`} />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">{sc.label}</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Leads</span><span className="text-sm font-semibold">{fmtN(s.totals.total_leads)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Agendamentos</span><span className="text-sm font-semibold">{fmtN(s.totals.total_appointments)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Comparecimentos</span><span className="text-sm font-semibold">{fmtN(s.totals.total_showups)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Vendas</span><span className="text-sm font-semibold">{fmtN(s.totals.total_sales)}</span></div>
                    <div className="pt-3 border-t border-gray-50">
                      <div className="flex justify-between"><span className="text-xs text-gray-500">Receita</span><span className="text-sm font-bold text-emerald-600">{fmt(s.totals.total_revenue)}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-xs text-gray-500">CPL Médio</span><span className="text-sm font-semibold">{fmt(s.blended_cpl)}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-xs text-gray-500">ROI</span><span className="text-sm font-semibold">{s.overall_roi.toFixed(0)}%</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {scenarioConfigs.map(sc => {
            const s = scenarios[sc.key];
            return (
              <div key={sc.key} className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/30">
                  <h4 className="text-xs font-semibold text-gray-700">{sc.label} — Por Canal</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-4 font-medium text-gray-500">Canal</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">Leads</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">Vendas</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">Receita</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">CPL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {s.channelResults.map((ch, i) => (
                        <tr key={i}>
                          <td className="py-2 px-4">{ch.channel_name}</td>
                          <td className="py-2 px-3 text-right">{fmtN(ch.metrics.leads)}</td>
                          <td className="py-2 px-3 text-right">{fmtN(ch.metrics.sales)}</td>
                          <td className="py-2 px-3 text-right">{fmt(ch.metrics.revenue)}</td>
                          <td className="py-2 px-3 text-right">{fmt(ch.metrics.cost_per_lead)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}