import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatCard from '../components/ui-custom/StatCard';
import { DollarSign, Target, Users, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list(),
  });

  const activePlans = plans.filter(p => p.status === 'active');
  const totalInvestment = plans.reduce((sum, p) => sum + (p.total_investment || 0), 0);
  const totalLeads = plans.reduce((sum, p) => {
    const channels = p.channels || [];
    return sum + channels.reduce((s, c) => s + (c.budget_value || 0) / (c.expected_cpl || 1), 0);
  }, 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Bem-vindo ao Media Planner</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Clientes" value={clients.length.toString()} icon={Users} color="blue" />
        <StatCard label="Planos Ativos" value={activePlans.length.toString()} icon={Target} color="green" />
        <StatCard label="Investimento Total" value={`R$${Math.round(totalInvestment).toLocaleString('pt-BR')}`} icon={DollarSign} color="purple" />
        <StatCard label="Leads Estimados" value={Math.round(totalLeads).toLocaleString('pt-BR')} icon={TrendingUp} color="orange" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Primeiros Passos</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>✓ Explore a seção de <strong>Clientes</strong> para gerenciar suas clínicas</p>
          <p>✓ Crie <strong>Planos de Mídia</strong> para organizar suas campanhas por canal</p>
          <p>✓ Use <strong>Planejamento Reverso</strong> para calcular orçamentos necessários</p>
          <p>✓ Compare cenários em <strong>Simulador de Cenários</strong> para otimizar resultados</p>
        </div>
      </div>
    </div>
  );
}