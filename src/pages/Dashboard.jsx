import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import StatCard from '../components/ui-custom/StatCard';
import PageHeader from '../components/ui-custom/PageHeader';
import { BarChart3, Building2, DollarSign, TrendingUp, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { calculateConsolidated } from '../components/hooks/usePlanCalculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const STATUS_LABELS = { active: 'ativo', draft: 'rascunho', completed: 'concluído' };

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [filterClient, setFilterClient] = useState('all');
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear] = useState(now.getFullYear());

  const { data: clients = [] } = useQuery({
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

  const myClients = user?.role === 'admin' ? clients : clients.filter(c => c.created_by === user?.email);
  const myPlans = user?.role === 'admin' ? plans : plans.filter(p => p.created_by === user?.email);

  // Planos ativos do mês/ano em vigor (base)
  const currentMonthActivePlans = myPlans.filter(p =>
    p.status === 'active' &&
    p.period_month === now.getMonth() + 1 &&
    p.period_year === now.getFullYear()
  );

  // Filtros aplicados à lista exibida
  const displayedPlans = myPlans.filter(p => {
    const monthMatch = filterMonth === 'all' || p.period_month === Number(filterMonth);
    const clientMatch = filterClient === 'all' || p.client_id === filterClient;
    return p.status === 'active' && monthMatch && clientMatch;
  });

  const totalInvestment = currentMonthActivePlans.reduce((s, p) => s + (p.total_investment || 0), 0);

  let totalRevenue = 0;
  currentMonthActivePlans.forEach(p => {
    if (p.channels && p.channels.length > 0) {
      const rates = Array.isArray(p.conversion_rates) && p.conversion_rates.length
        ? p.conversion_rates
        : [p.lead_to_appointment_rate || 0.35, p.appointment_to_show_rate || 0.7, p.show_to_sale_rate || 0.35];
      const consolidated = calculateConsolidated(p.channels, rates, p.average_ticket || 0);
      totalRevenue += consolidated.totals.total_revenue;
    }
  });

  // Months available in plans for filter
  const availableMonths = [...new Set(myPlans.filter(p => p.status === 'active').map(p => p.period_month))].sort((a, b) => a - b);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Olá, ${user?.full_name?.split(' ')[0] || 'Usuário'}!`}
        description="Visão geral dos planos ativos do mês."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Clientes" value={myClients.length} icon={Building2} color="blue" />
        <StatCard label="Planos Ativos (mês atual)" value={currentMonthActivePlans.length} icon={BarChart3} color="purple" />
        <StatCard label="Investimento (mês atual)" value={`R$${totalInvestment.toLocaleString('pt-BR')}`} icon={DollarSign} color="orange" />
        <StatCard label="Receita Projetada (mês atual)" value={`R$${Math.round(totalRevenue).toLocaleString('pt-BR')}`} icon={TrendingUp} color="green" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Planos de Mídia Ativos</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro Cliente */}
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {myClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Filtro Mês */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={String(m)}>{MESES[m - 1]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link to={createPageUrl('MediaPlans')} className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap">
              Ver todos →
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {displayedPlans.map(plan => (
            <Link
              key={plan.id}
              to={createPageUrl(`PlanDetail?id=${plan.id}`)}
              className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{plan.client_name || 'Sem nome'}</p>
                  <p className="text-xs text-gray-400">{MESES_SHORT[(plan.period_month || 1) - 1]}/{plan.period_year} · {plan.segment || 'Geral'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  R${(plan.total_investment || 0).toLocaleString('pt-BR')}
                </p>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  ativo
                </span>
              </div>
            </Link>
          ))}
          {displayedPlans.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">Nenhum plano ativo encontrado para os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}