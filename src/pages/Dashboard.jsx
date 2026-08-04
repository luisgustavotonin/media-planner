import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/hooks/usePermissions';
import PageHeader from '../components/ui-custom/PageHeader';
import ComparisonStatCard from '../components/ui-custom/ComparisonStatCard';
import EmptyState from '../components/ui-custom/EmptyState';
import { Building2, Target, DollarSign, Users, TrendingUp, Calendar, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateConsolidated } from '../components/hooks/usePlanCalculations';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function calcPlanMetrics(plan, objectives = []) {
  if (!plan?.channels?.length) return { leads: 0, sales: 0, investment: 0 };
  const rates = Array.isArray(plan.conversion_rates) && plan.conversion_rates.length
    ? plan.conversion_rates
    : [plan.lead_to_appointment_rate || 0.35, plan.appointment_to_show_rate || 0.7, plan.show_to_sale_rate || 0.35];
  const consolidated = calculateConsolidated(plan.channels, rates, plan.average_ticket || 5000, objectives);
  const investment = (plan.channels || []).reduce((s, c) => s + (c.budget_value || 0), 0);
  return {
    leads: consolidated.totals.total_leads || 0,
    sales: consolidated.totals.total_sales || 0,
    revenue: consolidated.totals.total_revenue || 0,
    investment,
  };
}

function sumMetrics(plans, objectives) {
  return plans.reduce((acc, p) => {
    const m = calcPlanMetrics(p, objectives);
    return { investment: acc.investment + m.investment, leads: acc.leads + m.leads, sales: acc.sales + m.sales, revenue: acc.revenue + m.revenue };
  }, { investment: 0, leads: 0, sales: 0, revenue: 0 });
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

  // Meses com planos (únicos, ordenados do mais recente para o mais antigo)
  const availableMonths = useMemo(() => {
    const map = new Map();
    for (const p of scopedPlans) {
      if (!p.period_month || !p.period_year) continue;
      const key = `${p.period_year}-${String(p.period_month).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { month: p.period_month, year: p.period_year, key });
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [scopedPlans]);

  // Sempre abre no mês atual quando há planos; senão no mais recente disponível
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

  const cur = sumMetrics(activePlans, objectives);
  const prev = sumMetrics(prevActivePlans, objectives);

  const fmtCurrency = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;
  const fmtInt = v => Math.round(v).toLocaleString('pt-BR');

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <ComparisonStatCard
            label="Clientes"
            value={clientsThisMonth}
            previousValue={clientsPrevMonth}
            formatValue={fmtInt}
            icon={Building2}
            color="indigo"
          />
          <ComparisonStatCard
            label="Planos Ativos"
            value={activePlans.length}
            previousValue={prevActivePlans.length}
            formatValue={fmtInt}
            icon={Target}
            color="green"
          />
          <ComparisonStatCard
            label="Investimento Total"
            value={cur.investment}
            previousValue={prev.investment}
            formatValue={fmtCurrency}
            icon={DollarSign}
            color="blue"
          />
          <ComparisonStatCard
            label="Leads Projetados"
            value={cur.leads}
            previousValue={prev.leads}
            formatValue={fmtInt}
            icon={Users}
            color="purple"
          />
          <ComparisonStatCard
            label="Venda Projetada"
            value={cur.sales}
            previousValue={prev.sales}
            formatValue={fmtInt}
            icon={TrendingUp}
            color="orange"
          />
          <ComparisonStatCard
            label="Valor das Vendas"
            value={cur.revenue}
            previousValue={prev.revenue}
            formatValue={fmtCurrency}
            icon={Wallet}
            color="rose"
          />
        </div>
      )}
    </div>
  );
}