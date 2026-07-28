import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import { calculateConsolidated } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import MonthlyFunnelSummary from '../components/plan/MonthlyFunnelSummary';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CurrencyInput from '../components/ui-custom/CurrencyInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const FUNNEL_KPIS = [
  { label: 'Vendas', unit: 'numero' },
  { label: 'Receita', unit: 'moeda' },
];

function fmtKpi(val, unit) {
  if (unit === 'percentual') return `${((val || 0) * 100).toFixed(1)}%`;
  if (unit === 'numero') return Math.round(val || 0).toLocaleString('pt-BR');
  return `R$${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KpiInput({ kpi, value, onChange, className }) {
  if (kpi.unit === 'percentual') {
    return (
      <div className="relative">
        <input type="text" inputMode="decimal" value={value ? String(value * 100) : ''} placeholder="0"
          onChange={e => {
            const clean = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
            onChange((parseFloat(clean) || 0) / 100);
          }}
          className={`w-full h-9 border border-gray-200 rounded-md text-sm px-3 pr-8 bg-white focus:outline-none focus:ring-1 focus:ring-primary ${className || ''}`} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
      </div>
    );
  }
  if (kpi.unit === 'moeda') {
    return <CurrencyInput value={value || 0} onChange={onChange} prefix="R$" className={className} />;
  }
  return (
    <input type="text" inputMode="decimal" value={value ? String(value) : ''} placeholder="0"
      onChange={e => {
        const clean = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
        onChange(parseFloat(clean) || 0);
      }}
      className={`w-full h-9 border border-gray-200 rounded-md text-sm px-3 bg-white focus:outline-none focus:ring-1 focus:ring-primary ${className || ''}`} />
  );
}

function NumField({ value, onChange, className }) {
  return (
    <input type="text" inputMode="decimal" value={value ? String(value) : ''} placeholder="0"
      onChange={e => {
        const clean = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
        onChange(parseFloat(clean) || 0);
      }}
      className={`mt-1 w-full h-9 border border-gray-200 rounded-md text-sm px-3 bg-white focus:outline-none focus:ring-1 focus:ring-primary ${className || ''}`} />
  );
}

export default function WeeklyTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [weekForm, setWeekForm] = useState({
    week_number: 1,
    investment_actual: 0,
    leads_actual: 0,
    appointments_actual: 0,
    showups_actual: 0,
    kpi_actuals: [],
  });
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

  const { data: funnelTypes = [] } = useQuery({
    queryKey: ['funnelTypes'],
    queryFn: () => base44.entities.FunnelType.list(),
  });

  const myPlans = user?.role === 'admin' ? plans : plans.filter(p => p.created_by === user?.email);
  const clientPlans = myPlans.filter(p => !filterClientId || p.client_id === filterClientId);
  const plan = myPlans.find(p => p.id === selectedPlanId);
  const actuals = allActuals.filter(a => a.plan_id === selectedPlanId);

  const activeKpis = useMemo(() => {
    if (!plan) return [];
    const kpiMap = new Map();
    for (const ch of plan.channels || []) {
      for (const camp of ch.strategies || []) {
        for (const kv of camp.kpi_values || []) {
          if (kv.value > 0 && !kpiMap.has(kv.label)) {
            kpiMap.set(kv.label, { label: kv.label, unit: kv.unit });
          }
        }
        if (!(camp.kpi_values || []).length && camp.kpi_value > 0) {
          const label = camp.kpi_label || 'KPI';
          if (!kpiMap.has(label)) {
            kpiMap.set(label, { label, unit: 'moeda' });
          }
        }
      }
    }
    return Array.from(kpiMap.values());
  }, [plan]);

  const additionalKpis = useMemo(
    () => activeKpis.filter(k => !FUNNEL_KPIS.some(fk => fk.label === k.label)),
    [activeKpis]
  );
  const formKpis = useMemo(
    () => [...FUNNEL_KPIS, ...additionalKpis],
    [additionalKpis]
  );

  let consolidated = null;
  let weeklyTargets = [];
  let netInvestment = 0;
  let rates = [];
  if (plan && plan.channels?.length > 0) {
    rates = Array.isArray(plan.conversion_rates) && plan.conversion_rates.length
      ? plan.conversion_rates
      : [plan.lead_to_appointment_rate || 0.35, plan.appointment_to_show_rate || 0.7, plan.show_to_sale_rate || 0.35];
    consolidated = calculateConsolidated(plan.channels, rates, plan.average_ticket || 5000);
    netInvestment = (plan.channels || []).reduce((s, c) => {
      const tax = (c.tax_percent || 0) / 100;
      return s + (c.budget_value || 0) * (1 - tax);
    }, 0);
    const baseInvestment = netInvestment || consolidated.totals.total_budget || 0;
    for (let w = 1; w <= 4; w++) {
      weeklyTargets.push({
        week: w,
        investment: baseInvestment / 4,
        leads: (consolidated.totals.total_leads || 0) / 4,
        appointments: (consolidated.totals.total_appointments || 0) / 4,
        showups: (consolidated.totals.total_showups || 0) / 4,
        sales: (consolidated.totals.total_sales || 0) / 4,
        revenue: (consolidated.totals.total_revenue || 0) / 4,
      });
    }
  }

  const funnelType = funnelTypes.find(ft => ft.id === plan?.funnel_type_id);
  const stageLabels = funnelType?.stages?.map(s => s.label) || null;

  // Real monthly totals from actuals
  const realInvestment = actuals.reduce((s, a) => s + (a.investment_actual || 0), 0);
  const realLeads = actuals.reduce((s, a) => s + (a.leads_actual || 0), 0);
  const realAppointments = actuals.reduce((s, a) => s + (a.appointments_actual || 0), 0);
  const realShowups = actuals.reduce((s, a) => s + (a.showups_actual || 0), 0);
  const realSales = actuals.reduce((s, a) => {
    const v = (a.kpi_actuals || []).find(ka => ka.label === 'Vendas');
    return s + (v?.value || 0);
  }, 0);
  const realRevenue = actuals.reduce((s, a) => {
    const r = (a.kpi_actuals || []).find(ka => ka.label === 'Receita');
    return s + (r?.value || 0);
  }, 0);

  const meta = consolidated ? {
    investment: netInvestment || consolidated.totals.total_budget,
    leads: consolidated.totals.total_leads,
    appointments: consolidated.totals.total_appointments,
    showups: consolidated.totals.total_showups,
    sales: consolidated.totals.total_sales,
    revenue: consolidated.totals.total_revenue,
    ticket: plan?.average_ticket || 0,
    rates,
    cpl: consolidated.blended_cpl,
  } : null;

  const real = {
    investment: realInvestment,
    leads: realLeads,
    appointments: realAppointments,
    showups: realShowups,
    sales: realSales,
    revenue: realRevenue,
    ticket: realSales > 0 ? realRevenue / realSales : 0,
    rates: [
      realLeads > 0 ? realAppointments / realLeads : 0,
      realAppointments > 0 ? realShowups / realAppointments : 0,
      realShowups > 0 ? realSales / realShowups : 0,
    ],
    cpl: realLeads > 0 ? realInvestment / realLeads : 0,
  };

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
        kpi_actuals: formKpis.map(k => {
          const found = (existing.kpi_actuals || []).find(ka => ka.label === k.label);
          return { label: k.label, value: found?.value || 0 };
        }),
      });
    } else {
      setWeekForm(f => ({
        ...f,
        investment_actual: 0,
        leads_actual: 0,
        appointments_actual: 0,
        showups_actual: 0,
        kpi_actuals: formKpis.map(k => ({ label: k.label, value: 0 })),
      }));
    }
  }, [weekForm.week_number, allActuals, selectedPlanId, formKpis]);

  const getKpiVal = (label) => (weekForm.kpi_actuals || []).find(ka => ka.label === label)?.value || 0;
  const setKpiVal = (label, value) => setWeekForm(f => ({
    ...f,
    kpi_actuals: (f.kpi_actuals || []).map(ka => ka.label === label ? { ...ka, value } : ka),
  }));
  const getActualKpi = (actual, label) => (actual?.kpi_actuals || []).find(ka => ka.label === label)?.value || 0;

  if (plansLoading || actualsLoading) {
    return (
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
        <PageHeader title="Acompanhamento Semanal" description="Acompanhe o funil do mês: meta vs realizado." />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
      <PageHeader title="Acompanhamento Semanal" description="Acompanhe o funil do mês: meta vs realizado." />

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
          Selecione um plano de mídia para visualizar o acompanhamento.
        </div>
      )}

      {selectedPlanId && !consolidated && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          O plano selecionado não possui canais configurados.
        </div>
      )}

      {plan && consolidated && (
        <>
          <div className="mb-6">
            <MonthlyFunnelSummary meta={meta} real={real} stageLabels={stageLabels} />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Lançar Dados Semanais</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
                <NumField value={weekForm.leads_actual} onChange={v => setWeekForm(f => ({...f, leads_actual: v}))} />
              </div>
              <div>
                <Label className="text-xs">Agendamentos</Label>
                <NumField value={weekForm.appointments_actual} onChange={v => setWeekForm(f => ({...f, appointments_actual: v}))} />
              </div>
              <div>
                <Label className="text-xs">Comparecimentos</Label>
                <NumField value={weekForm.showups_actual} onChange={v => setWeekForm(f => ({...f, showups_actual: v}))} />
              </div>
              <div>
                <Label className="text-xs">Vendas</Label>
                <NumField value={getKpiVal('Vendas')} onChange={v => setKpiVal('Vendas', v)} />
              </div>
              <div>
                <Label className="text-xs">Receita (R$)</Label>
                <CurrencyInput value={getKpiVal('Receita')} onChange={v => setKpiVal('Receita', v || 0)} prefix="R$" className="mt-1" />
              </div>
              {additionalKpis.map(kpi => (
                <div key={kpi.label}>
                  <Label className="text-xs">{kpi.label} {kpi.unit === 'percentual' ? '(%)' : kpi.unit === 'moeda' ? '(R$)' : ''}</Label>
                  <KpiInput kpi={kpi}
                    value={getKpiVal(kpi.label)}
                    onChange={v => setKpiVal(kpi.label, v)}
                    className="mt-1" />
                </div>
              ))}
              <div className="flex items-end">
                <Button onClick={() => saveMut.mutate(weekForm)} className="w-full gap-2 bg-primary hover:bg-primary/90" disabled={saveMut.isPending}>
                  <Save className="w-4 h-4" /> {saveMut.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Acompanhamento Semanal — Meta vs Realizado</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left py-2.5 px-4 font-medium text-gray-500">Semana</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Meta Invest.</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Real Invest.</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Leads</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Agend.</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Comp.</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Vendas</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {weeklyTargets.map((t, i) => {
                    const actual = actuals.find(a => a.week_number === t.week);
                    return (
                      <tr key={i}>
                        <td className="py-2.5 px-4 font-medium">Semana {t.week}</td>
                        <td className="py-2.5 px-3 text-right text-gray-400">R${Math.round(t.investment).toLocaleString('pt-BR')}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{actual?.investment_actual ? `R$${Math.round(actual.investment_actual).toLocaleString('pt-BR')}` : '—'}</td>
                        <td className="py-2.5 px-3 text-right">{actual?.leads_actual ? Math.round(actual.leads_actual).toLocaleString('pt-BR') : '—'}</td>
                        <td className="py-2.5 px-3 text-right">{actual?.appointments_actual ? Math.round(actual.appointments_actual).toLocaleString('pt-BR') : '—'}</td>
                        <td className="py-2.5 px-3 text-right">{actual?.showups_actual ? Math.round(actual.showups_actual).toLocaleString('pt-BR') : '—'}</td>
                        <td className="py-2.5 px-3 text-right">{getActualKpi(actual, 'Vendas') ? Math.round(getActualKpi(actual, 'Vendas')).toLocaleString('pt-BR') : '—'}</td>
                        <td className="py-2.5 px-3 text-right">{getActualKpi(actual, 'Receita') ? `R$${Math.round(getActualKpi(actual, 'Receita')).toLocaleString('pt-BR')}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}