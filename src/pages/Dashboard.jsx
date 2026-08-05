import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/hooks/usePermissions';
import PageHeader from '../components/ui-custom/PageHeader';
import ComparisonStatCard from '../components/ui-custom/ComparisonStatCard';
import EmptyState from '../components/ui-custom/EmptyState';
import ChannelInvestmentChart from '../components/dashboard/ChannelInvestmentChart';
import FunnelProjectionChart from '../components/dashboard/FunnelProjectionChart';
import MonthlyTrendChart from '../components/dashboard/MonthlyTrendChart';
import ChannelPerformanceTable from '../components/dashboard/ChannelPerformanceTable';
import TopClientsTable from '../components/dashboard/TopClientsTable';
import { formatCurrency, formatInt, formatDecimal } from '@/lib/format';
import { Building2, Target, DollarSign, Users, TrendingUp, Calendar, Wallet, Filter, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateConsolidated } from '../components/hooks/usePlanCalculations';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function planRates(plan) {
  if (Array.isArray(plan.conversion_rates) && plan.conversion_rates.length) return plan.conversion_rates;
  return [plan.lead_to_appointment_rate || 0.35, plan.appointment_to_show_rate || 0.7, plan.show_to_sale_rate || 0.35];
}

// Agrega um plano em um acumulador (channelAgg, clientAgg, totals, funnel)
function aggregatePlan(plan, objectives, channelAgg, clientAgg, totals, funnel) {
  const rates = planRates(plan);
  const c = calculateConsolidated(plan.channels, rates, plan.average_ticket || 5000, objectives);
  totals.investment += c.totals.total_budget || 0;
  totals.leads += c.totals.total_leads || 0;
  totals.sales += c.totals.total_sales || 0;
  totals.revenue += c.totals.total_revenue || 0;
  totals.appointments += c.totals.total_appointments || 0;
  totals.showups += c.totals.total_showups || 0;

  (c.totals.stageValues || []).forEach((v, i) => {
    funnel[i] = (funnel[i] || 0) + (v || 0);
  });

  for (const ch of c.channelResults) {
    const name = ch.channel_name || '—';
    if (!channelAgg[name]) channelAgg[name] = { name, investment: 0, leads: 0, sales: 0, revenue: 0 };
    const a = channelAgg[name];
    a.investment += ch.budget_value || 0;
    a.leads += ch.metrics.leads || 0;
    a.sales += ch.metrics.sales || 0;
    a.revenue += ch.metrics.revenue || 0;
  }

  const cid = plan.client_id || '—';
  if (!clientAgg[cid]) clientAgg[cid] = { name: plan.client_name || '—', planCount: 0, investment: 0, leads: 0, sales: 0, revenue: 0 };
  const cl = clientAgg[cid];
  cl.planCount += 1;
  cl.investment += c.totals.total_budget || 0;
  cl.leads += c.totals.total_leads || 0;
  cl.sales += c.totals.total_sales || 0;
  cl.revenue += c.totals.total_revenue || 0;
}

export default function Dashboard() {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });
  const { data: objectives = [] } = useQuery({
    queryKey: ['campaignObjectives'],
    queryFn: () => base44.entities.CampaignObjective.filter({ is_active: true }),
  });

  const { allowedClientIds } = usePermissions();
  const scopedPlans = !allowedClientIds ? plans : plans.filter(p => allowedClientIds.includes(p.client_id));

  const availableMonths = useMemo(() => {
    const map = new Map();
    for (const p of scopedPlans) {
      if (!p.period_month || !p.period_year) continue;
      const key = `${p.period_year}-${String(p.period_month).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { month: p.period_month, year: p.period_year, key });
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [scopedPlans]);

  const [selectedKey, setSelectedKey] = useState('');
  useEffect(() => {
    if (availableMonths.length === 0) { setSelectedKey(''); return; }
    const cur = availableMonths.find(m => m.month === curMonth && m.year === curYear);
    setSelectedKey((cur || availableMonths[0]).key);
  }, [availableMonths]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = availableMonths.find(m => m.key === selectedKey) || { month: curMonth, year: curYear };
  const selMonth = sel.month;
  const selYear = sel.year;
  const prevMonth = selMonth === 1 ? 12 : selMonth - 1;
  const prevYear = selMonth === 1 ? selYear - 1 : selYear;

  const monthPlans = scopedPlans.filter(p => p.period_month === selMonth && p.period_year === selYear);
  const prevMonthPlans = scopedPlans.filter(p => p.period_month === prevMonth && p.period_year === prevYear);

  const activePlans = monthPlans.filter(p => p.status === 'active');
  const prevActivePlans = prevMonthPlans.filter(p => p.status === 'active');

  const clientsThisMonth = new Set(monthPlans.map(p => p.client_id).filter(Boolean)).size;
  const clientsPrevMonth = new Set(prevMonthPlans.map(p => p.client_id).filter(Boolean)).size;

  // Agregações do mês selecionado
  const dash = useMemo(() => {
    const channelAgg = {};
    const clientAgg = {};
    const totals = { investment: 0, leads: 0, sales: 0, revenue: 0, appointments: 0, showups: 0 };
    const funnel = [];
    for (const p of activePlans) aggregatePlan(p, objectives, channelAgg, clientAgg, totals, funnel);

    const channelRows = Object.values(channelAgg).map(a => ({
      ...a,
      cpl: a.leads > 0 ? a.investment / a.leads : 0,
      roas: a.investment > 0 ? a.revenue / a.investment : 0,
    }));
    const clientRows = Object.values(clientAgg);

    const blendedCPL = totals.leads > 0 ? totals.investment / totals.leads : 0;
    const blendedROAS = totals.investment > 0 ? totals.revenue / totals.investment : 0;

    return { channelRows, clientRows, totals, funnel, blendedCPL, blendedROAS };
  }, [activePlans, objectives]);

  // Agregações mês anterior (para CPL/ROAS comparativos)
  const prevDash = useMemo(() => {
    const totals = { investment: 0, leads: 0, sales: 0, revenue: 0 };
    for (const p of prevActivePlans) {
      const rates = planRates(p);
      const c = calculateConsolidated(p.channels, rates, p.average_ticket || 5000, objectives);
      totals.investment += c.totals.total_budget || 0;
      totals.leads += c.totals.total_leads || 0;
      totals.sales += c.totals.total_sales || 0;
      totals.revenue += c.totals.total_revenue || 0;
    }
    return {
      cpl: totals.leads > 0 ? totals.investment / totals.leads : 0,
      roas: totals.investment > 0 ? totals.revenue / totals.investment : 0,
      investment: totals.investment,
      leads: totals.leads,
      sales: totals.sales,
      revenue: totals.revenue,
    };
  }, [prevActivePlans, objectives]);

  // Tendência mensal (ascendente)
  const trendData = useMemo(() => {
    return [...availableMonths].reverse().map(m => {
      const mp = scopedPlans.filter(p => p.period_month === m.month && p.period_year === m.year && p.status === 'active');
      const t = { investment: 0, revenue: 0 };
      for (const p of mp) {
        const c = calculateConsolidated(p.channels, planRates(p), p.average_ticket || 5000, objectives);
        t.investment += c.totals.total_budget || 0;
        t.revenue += c.totals.total_revenue || 0;
      }
      return { label: `${ABREV[m.month - 1]}/${String(m.year).slice(2)}`, investment: t.investment, revenue: t.revenue };
    });
  }, [availableMonths, scopedPlans, objectives]);

  const channelPieData = dash.channelRows.map(a => ({ name: a.name, value: a.investment }));

  const fmtCurrency = formatCurrency;
  const fmtInt = formatInt;

  if (isLoading) {
    return (
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Visão geral de ${MESES[selMonth - 1]}/${selYear}`}
        actions={
          availableMonths.length > 0 && (
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-[180px] h-9">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(m => (
                  <SelectItem key={m.key} value={m.key}>
                    {MESES[m.month - 1]}/{m.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      {monthPlans.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={`Nenhum plano em ${MESES[selMonth - 1]}/${selYear}`}
          description="Selecione outro mês ou crie um novo plano de mídia."
        />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <ComparisonStatCard label="Clientes" value={clientsThisMonth} previousValue={clientsPrevMonth} formatValue={fmtInt} icon={Building2} color="indigo" />
            <ComparisonStatCard label="Planos Ativos" value={activePlans.length} previousValue={prevActivePlans.length} formatValue={fmtInt} icon={Target} color="green" />
            <ComparisonStatCard label="Investimento Total" value={dash.totals.investment} previousValue={prevDash.investment} formatValue={fmtCurrency} icon={DollarSign} color="blue" />
            <ComparisonStatCard label="Leads Projetados" value={dash.totals.leads} previousValue={prevDash.leads} formatValue={fmtInt} icon={Users} color="purple" />
            <ComparisonStatCard label="Venda Projetada" value={dash.totals.sales} previousValue={prevDash.sales} formatValue={fmtInt} icon={TrendingUp} color="orange" />
            <ComparisonStatCard label="Valor das Vendas" value={dash.totals.revenue} previousValue={prevDash.revenue} formatValue={fmtCurrency} icon={Wallet} color="rose" />
            <ComparisonStatCard label="CPL Blended" value={dash.blendedCPL} previousValue={prevDash.cpl} formatValue={fmtCurrency} icon={Filter} color="amber" />
            <ComparisonStatCard label="ROAS Blended" value={dash.blendedROAS} previousValue={prevDash.roas} formatValue={v => `${formatDecimal(v)}x`} icon={Activity} color="teal" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            <ChannelInvestmentChart data={channelPieData} />
            <FunnelProjectionChart data={dash.funnel} />
            <MonthlyTrendChart data={trendData} />
          </div>

          {/* Tables row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
            <div className="lg:col-span-3">
              <ChannelPerformanceTable data={dash.channelRows} />
            </div>
            <div className="lg:col-span-2">
              <TopClientsTable data={dash.clientRows} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}