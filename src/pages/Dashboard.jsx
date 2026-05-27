import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import StatCard from '../components/ui-custom/StatCard';
import PageHeader from '../components/ui-custom/PageHeader';
import { BarChart3, Building2, Users, DollarSign, TrendingUp, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { calculateConsolidated } from '../components/hooks/usePlanCalculations';

const STATUS_LABELS = { active: 'ativo', draft: 'rascunho', completed: 'concluído' };

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });

  const myClients = user?.role === 'admin' ? clients : clients.filter(c => c.created_by === user?.email);
  const myPlans = user?.role === 'admin' ? plans : plans.filter(p => p.created_by === user?.email);
  const activePlans = myPlans.filter(p => p.status === 'active');

  const totalInvestment = myPlans.reduce((s, p) => s + (p.total_investment || 0), 0);
  
  let totalRevenue = 0;
  myPlans.forEach(p => {
    if (p.channels && p.channels.length > 0) {
      const rates = p.conversion_rates?.length
        ? p.conversion_rates
        : [p.lead_to_appointment_rate || 0.35, p.appointment_to_show_rate || 0.7, p.show_to_sale_rate || 0.35];
      const consolidated = calculateConsolidated(p.channels, rates, p.average_ticket || 0);
      totalRevenue += consolidated.totals.total_revenue;
    }
  });

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Olá, ${user?.full_name?.split(' ')[0] || 'Usuário'}!`}
        description="Visão geral do seu desempenho de mídia."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Clientes" value={myClients.length} icon={Building2} color="blue" />
        <StatCard label="Planos Ativos" value={activePlans.length} icon={BarChart3} color="purple" />
        <StatCard label="Investimento Total" value={`R$${totalInvestment.toLocaleString('pt-BR')}`} icon={DollarSign} color="orange" />
        <StatCard label="Receita Projetada" value={`R$${Math.round(totalRevenue).toLocaleString('pt-BR')}`} icon={TrendingUp} color="green" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Planos de Mídia Recentes</h2>
          <Link to={createPageUrl('MediaPlans')} className="text-xs font-medium text-blue-600 hover:text-blue-700">
            Ver todos →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {myPlans.slice(0, 5).map(plan => (
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
                  <p className="text-xs text-gray-400">{MESES[(plan.period_month || 1) - 1]}/{plan.period_year} · {plan.segment || 'Geral'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  R${(plan.total_investment || 0).toLocaleString('pt-BR')}
                </p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  plan.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                  plan.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {STATUS_LABELS[plan.status] || 'rascunho'}
                </span>
              </div>
            </Link>
          ))}
          {myPlans.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">Nenhum plano de mídia ainda. Crie seu primeiro plano para começar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}