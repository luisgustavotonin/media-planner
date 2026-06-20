import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/ui-custom/PageHeader';
import StatCard from '../components/ui-custom/StatCard';
import EmptyState from '../components/ui-custom/EmptyState';
import { 
  Building2, 
  BarChart3, 
  DollarSign, 
  Target,
  TrendingUp,
  Calendar,
  Users as UsersIcon,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function Dashboard() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
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

  // Filtros para mês atual
  const currentMonthPlans = plans.filter(p => 
    p.period_month === currentMonth && p.period_year === currentYear
  );
  const activePlans = currentMonthPlans.filter(p => p.status === 'active');
  const draftPlans = currentMonthPlans.filter(p => p.status === 'draft');

  // Métricas
  const activeInvestment = activePlans.reduce((sum, p) => sum + (p.total_investment || 0), 0);
  const activeLeads = activePlans.reduce((sum, p) => {
    const channels = p.channels || [];
    return sum + channels.reduce((s, c) => s + (c.budget_value || 0) / (c.expected_cpl || 1), 0);
  }, 0);

  const totalInvestment = plans.reduce((sum, p) => sum + (p.total_investment || 0), 0);
  const totalLeads = plans.reduce((sum, p) => {
    const channels = p.channels || [];
    return sum + channels.reduce((s, c) => s + (c.budget_value || 0) / (c.expected_cpl || 1), 0);
  }, 0);

  const isLoading = clientsLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
      {/* Header */}
      <PageHeader 
        title="Dashboard"
        description={`Visão geral de ${MESES_SHORT[currentMonth - 1]}/${currentYear}`}
      />

      {/* Métricas do Mês Atual */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Este Mês ({MESES_SHORT[currentMonth - 1]}/{currentYear})
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard 
            label="Planos Ativos" 
            value={activePlans.length.toString()} 
            icon={Target} 
            color="green"
          />
          <StatCard 
            label="Planos em Rascunho" 
            value={draftPlans.length.toString()} 
            icon={BarChart3} 
            color="amber"
          />
          <StatCard 
            label="Investimento Ativo" 
            value={`R$${Math.round(activeInvestment).toLocaleString('pt-BR')}`} 
            icon={DollarSign} 
            color="blue"
          />
          <StatCard 
            label="Leads Estimados" 
            value={Math.round(activeLeads).toLocaleString('pt-BR')} 
            icon={TrendingUp} 
            color="purple"
          />
        </div>
      </div>

      {/* Métricas Gerais */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Totais (Todos os Períodos)
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard 
            label="Clientes" 
            value={clients.length.toString()} 
            icon={Building2} 
            color="indigo"
          />
          <StatCard 
            label="Total de Planos" 
            value={plans.length.toString()} 
            icon={Calendar} 
            color="cyan"
          />
          <StatCard 
            label="Investimento Total" 
            value={`R$${Math.round(totalInvestment).toLocaleString('pt-BR')}`} 
            icon={DollarSign} 
            color="rose"
          />
          <StatCard 
            label="Leads Projetados" 
            value={Math.round(totalLeads).toLocaleString('pt-BR')} 
            icon={UsersIcon} 
            color="teal"
          />
        </div>
      </div>

      {/* Planos Ativos Recentes */}
      {activePlans.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Planos Ativos de {MESES_SHORT[currentMonth - 1]}</h2>
          <div className="space-y-3">
            {activePlans.slice(0, 5).map(plan => {
              const clientInfo = clients.find(c => c.id === plan.client_id);
              const investment = plan.total_investment || 0;
              const leads = (plan.channels || []).reduce((s, c) => s + (c.budget_value || 0) / (c.expected_cpl || 1), 0);
              
              return (
                <Link 
                  key={plan.id}
                  to={createPageUrl(`PlanDetail?id=${plan.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all group"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 group-hover:text-blue-600">{clientInfo?.clinic_name || 'Sem cliente'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.channels?.length || 0} canais • {Math.round(leads)} leads estimados</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-gray-900">R${Math.round(investment).toLocaleString('pt-BR')}</p>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 mt-1 ml-auto transition-colors" />
                  </div>
                </Link>
              );
            })}
            {activePlans.length > 5 && (
              <p className="text-xs text-gray-400 pt-2">+ {activePlans.length - 5} planos não listados</p>
            )}
          </div>
        </div>
      ) : (
        <EmptyState 
          icon={Target}
          title="Nenhum plano ativo este mês"
          description="Comece criando um novo plano de mídia."
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Link 
          to={createPageUrl('Clients')}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Gerenciar Clientes</p>
              <p className="text-sm text-gray-600">{clients.length} clientes cadastrados</p>
            </div>
          </div>
        </Link>

        <Link 
          to={createPageUrl('MediaPlans')}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6 hover:border-green-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Planos de Mídia</p>
              <p className="text-sm text-gray-600">{plans.length} planos no total</p>
            </div>
          </div>
        </Link>

        <Link 
          to={createPageUrl('ReversePlan')}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6 hover:border-purple-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Planejamento Reverso</p>
              <p className="text-sm text-gray-600">Calcule orçamentos necessários</p>
            </div>
          </div>
        </Link>

        <Link 
          to={createPageUrl('Scenarios')}
          className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6 hover:border-orange-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Cenários</p>
              <p className="text-sm text-gray-600">Compare diferentes projeções</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}