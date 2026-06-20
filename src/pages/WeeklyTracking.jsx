import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import { calculateConsolidated, generateRecommendations } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import StatCard from '../components/ui-custom/StatCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CurrencyInput from '../components/ui-custom/CurrencyInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, AlertTriangle, CheckCircle, Info, TrendingUp, Target, DollarSign, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SEVERITY_STYLES = {
  high: { icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  medium: { icon: Info, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  low: { icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
};

export default function WeeklyTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [weekForm, setWeekForm] = useState({ week_number: 1, investment_actual: 0, leads_actual: 0, appointments_actual: 0, showups_actual: 0 });

  const [filterClientId, setFilterClientId] = useState('');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return data.sort((a, b) => (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR'));
    },
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });

  const { data: allActuals = [], isLoading: actualsLoading } = useQuery({
    queryKey: ['weeklyActuals'],
    queryFn: () => base44.entities.WeeklyActual.list(),
  });

  const myPlans = user?.role === 'admin' ? plans : plans.filter(p => p.created_by === user?.email);
  const clientPlans = myPlans.filter(p => !filterClientId || p.client_id === filterClientId);
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const plan = myPlans.find(p => p.id === selectedPlanId);
  const actuals = allActuals.filter(a => a.plan_id === selectedPlanId);

  let consolidated = null;
  let weeklyTargets = [];
  if (plan && plan.channels?.length > 0) {
    const rates = Array.isArray(plan.conversion_rates) && plan.conversion_rates.length
      ? plan.conversion_rates
      : [plan.lead_to_appointment_rate || 0.35, plan.appointment_to_show_rate || 0.7, plan.show_to_sale_rate || 0.35];
    consolidated = calculateConsolidated(plan.channels, rates, plan.average_ticket || 5000);
    for (let w = 1; w <= 4; w++) {
      weeklyTargets.push({
        week: w,
        investment: (consolidated.totals.total_budget || 0) / 4,
        leads: Math.round(consolidated.totals.total_leads / 4),
        appointments: Math.round(consolidated.totals.total_appointments / 4),
        showups: Math.round(consolidated.totals.total_showups / 4),
      });
    }
  }

  const saveMut = useMutation({
    mutationFn: (data) => {
      const existing = actuals.find(a => a.week_number === data.week_number);
      if (existing) {
        const { id, created_date, updated_date, created_by, ...rest } = data;
        return base44.entities.WeeklyActual.update(existing.id, rest);
      }
      return base44.entities.WeeklyActual.create({ ...data, plan_id: selectedPlanId, client_id: plan?.client_id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weeklyActuals'] }),
  });

  useEffect(() => {
    const existing = actuals.find(a => a.week_number === weekForm.week_number);
    if (existing) {
      setWeekForm({
        week_number: existing.week_number,
        investment_actual: existing.investment_actual || 0,
        leads_actual: existing.leads_actual || 0,
        appointments_actual: existing.appointments_actual || 0,
        showups_actual: existing.showups_actual || 0,
      });
    } else {
      setWeekForm(f => ({ ...f, investment_actual: 0, leads_actual: 0, appointments_actual: 0, showups_actual: 0 }));
    }
  }, [weekForm.week_number, allActuals, selectedPlanId]);

  const totalActualInvestment = actuals.reduce((s, a) => s + (a.investment_actual || 0), 0);
  const totalActualLeads = actuals.reduce((s, a) => s + (a.leads_actual || 0), 0);
  const weeksElapsed = actuals.length;
  const projectedLeads = weeksElapsed > 0 ? (totalActualLeads / weeksElapsed) * 4 : 0;
  const projectedInvestment = weeksElapsed > 0 ? (totalActualInvestment / weeksElapsed) * 4 : 0;

  const chartData = weeklyTargets.map((t) => {
    const actual = actuals.find(a => a.week_number === t.week);
    return {
      name: `Semana ${t.week}`,
      'Meta Leads': t.leads,
      'Real Leads': actual?.leads_actual || null,
    };
  });

  const recommendations = plan && consolidated ? generateRecommendations(consolidated.channelResults, actuals, weeklyTargets) : [];
  const pctOf = (actual, target) => target > 0 ? Math.round((actual / target) * 100) : 0;

  if (plansLoading || actualsLoading) {
    return (
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
        <PageHeader title="Acompanhamento Semanal" description="Acompanhe o desempenho real vs metas planejadas." />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
      <PageHeader title="Acompanhamento Semanal" description="Acompanhe o desempenho real vs metas planejadas." />

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="mb-5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">1. Selecione o Cliente</Label>
          <Select value={filterClientId} onValueChange={v => { setFilterClientId(v); setSelectedPlanId(''); }}>
            <SelectTrigger className="mt-2 max-w-sm">
              <SelectValue placeholder="Selecione um cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {filterClientId && (
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
                      {MESES[(p.period_month || 1) - 1]}/{p.period_year} — {p.status === 'active' ? 'Ativo' : p.status === 'draft' ? 'Rascunho' : 'Concluído'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        {!filterClientId && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm">
            Selecione um cliente para começar
          </div>
        )}
      </div>

      {!selectedPlanId && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          Selecione um plano de mídia para visualizar o acompanhamento semanal.
        </div>
      )}

      {selectedPlanId && !consolidated && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          O plano selecionado não possui canais configurados. Adicione canais no Plano de Mídia para acompanhar.
        </div>
      )}

      {plan && consolidated && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
            <StatCard label="Investimento Real" value={`R$${totalActualInvestment.toLocaleString('pt-BR')}`} icon={DollarSign} color="blue"
              trend={pctOf(totalActualInvestment, consolidated.totals.total_budget) - 100} />
            <StatCard label="Leads Reais" value={totalActualLeads.toLocaleString()} icon={Users} color="purple"
              trend={pctOf(totalActualLeads, consolidated.totals.total_leads) - 100} />
            <StatCard label="Leads Projetados" value={Math.round(projectedLeads).toLocaleString()} icon={TrendingUp} color="orange"
              sublabel={`Meta: ${consolidated.totals.total_leads}`} />
            <StatCard label="Invest. Projetado" value={`R$${Math.round(projectedInvestment).toLocaleString('pt-BR')}`} icon={Target} color="green"
              sublabel={`Meta: R$${Math.round(consolidated.totals.total_budget).toLocaleString('pt-BR')}`} />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Desempenho Semanal</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Meta Leads" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="Real Leads" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Lançar Dados Semanais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs">Semana</Label>
                <Select value={String(weekForm.week_number)} onValueChange={v => setWeekForm(f => ({ ...f, week_number: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4].map(w => <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Investimento (R$)</Label>
                <CurrencyInput value={weekForm.investment_actual} onChange={v => setWeekForm(f => ({...f, investment_actual: v || 0}))} prefix="R$" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Leads</Label>
                <CurrencyInput value={weekForm.leads_actual} onChange={v => setWeekForm(f => ({...f, leads_actual: v || 0}))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Agendamentos</Label>
                <CurrencyInput value={weekForm.appointments_actual} onChange={v => setWeekForm(f => ({...f, appointments_actual: v || 0}))} className="mt-1" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => saveMut.mutate(weekForm)} className="w-full gap-2 bg-blue-600 hover:bg-blue-700" disabled={saveMut.isPending}>
                  <Save className="w-4 h-4" /> {saveMut.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Metas vs Realizado por Semana</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left py-2.5 px-4 font-medium text-gray-500">Semana</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Meta Invest.</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Real Invest.</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Meta Leads</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Real Leads</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">% da Meta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {weeklyTargets.map((t, i) => {
                    const actual = actuals.find(a => a.week_number === t.week);
                    const pct = actual?.leads_actual && t.leads > 0 ? Math.round((actual.leads_actual / t.leads) * 100) : null;
                    return (
                      <tr key={i}>
                        <td className="py-2.5 px-4 font-medium">Semana {t.week}</td>
                        <td className="py-2.5 px-3 text-right">R${Math.round(t.investment).toLocaleString('pt-BR')}</td>
                        <td className="py-2.5 px-3 text-right">{actual ? `R$${(actual.investment_actual || 0).toLocaleString('pt-BR')}` : '—'}</td>
                        <td className="py-2.5 px-3 text-right">{t.leads}</td>
                        <td className="py-2.5 px-3 text-right">{actual?.leads_actual ?? '—'}</td>
                        <td className="py-2.5 px-3 text-right">
                          {pct !== null ? <span className={`font-semibold ${pct >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>{pct}%</span> : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Recomendações de Ação</h3>
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const style = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.low;
                const Icon = style.icon;
                return (
                  <div key={i} className={`flex gap-3 p-4 rounded-lg border ${style.bg} ${style.border}`}>
                    <Icon className={`w-4 h-4 mt-0.5 ${style.text} flex-shrink-0`} />
                    <div>
                      <p className={`text-sm ${style.text}`}>{rec.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{rec.suggested_action}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}