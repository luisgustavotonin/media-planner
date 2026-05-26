import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import { usePermissions } from '../components/hooks/usePermissions';
import { calculateConsolidated } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import StatCard from '../components/ui-custom/StatCard';
import FunnelChart from '../components/ui-custom/FunnelChart';
import ChannelEditor from '../components/plan/ChannelEditor';
import ResultsTable from '../components/plan/ResultsTable';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CurrencyInput from '../components/ui-custom/CurrencyInput';
import PercentInput from '../components/ui-custom/PercentInput';
import { Save, Users, DollarSign, TrendingUp, Target, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function PlanDetail() {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('id');
  const { user } = useAuth();
  const perms = usePermissions(user);
  const queryClient = useQueryClient();
  const readOnly = perms.canViewOnly;

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => base44.entities.MediaPlan.filter({ id: planId }),
    select: data => data?.[0],
    enabled: !!planId,
  });

  const { data: funnelTypes = [] } = useQuery({
    queryKey: ['funnelTypes'],
    queryFn: () => base44.entities.FunnelType.list(),
  });

  const [localPlan, setLocalPlan] = useState(null);
  useEffect(() => { if (plan) setLocalPlan({ ...plan }); }, [plan]);

  const saveMut = useMutation({
    mutationFn: (data) => {
      const { id, created_date, updated_date, created_by, ...rest } = data;
      return base44.entities.MediaPlan.update(planId, rest);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plan', planId] }),
  });

  if (isLoading || !localPlan) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const funnelType = funnelTypes.find(f => f.id === localPlan.funnel_type_id);
  const funnelStages = funnelType?.stages || [];
  // Monta labels dinâmicos das etapas de conversão (pares consecutivos)
  const conversionLabels = funnelStages.length >= 2
    ? funnelStages.slice(0, -1).map((s, i) => `${s.label} → ${funnelStages[i + 1].label}`)
    : ['Lead → Agendamento', 'Agendamento → Comparecimento', 'Comparecimento → Venda'];

  const planFunnel = {
    lead_to_appointment_rate: localPlan.lead_to_appointment_rate || 0.35,
    appointment_to_show_rate: localPlan.appointment_to_show_rate || 0.7,
    show_to_sale_rate: localPlan.show_to_sale_rate || 0.35,
  };
  const channels = localPlan.channels || [];
  const avgTicket = localPlan.average_ticket || 0;
  const consolidated = calculateConsolidated(channels, planFunnel, avgTicket);
  const totalInvestment = channels.reduce((s, c) => s + (c.budget_value || 0), 0);

  const updateField = (field, value) => setLocalPlan(p => ({ ...p, [field]: value }));
  const handleSave = () => saveMut.mutate({ ...localPlan, total_investment: totalInvestment });
  const handleChannelsChange = (newChannels) => {
    setLocalPlan(p => ({ ...p, channels: newChannels, total_investment: newChannels.reduce((s, c) => s + (c.budget_value || 0), 0) }));
  };

  const STATUS_OPTIONS = [
    { value: 'draft', label: 'Rascunho' },
    { value: 'active', label: 'Ativo' },
    { value: 'completed', label: 'Concluído' },
  ];
  const statusLabel = STATUS_OPTIONS.find(s => s.value === localPlan.status)?.label || 'Rascunho';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl('MediaPlans')} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3 h-3" /> Voltar aos Planos
        </Link>
        <PageHeader
          title={`${localPlan.client_name || 'Sem nome'} — ${MESES[(localPlan.period_month || 1) - 1]} ${localPlan.period_year}`}
          description={`Segmento: ${localPlan.segment || 'Geral'} · Status: ${statusLabel}`}
          actions={!readOnly && (
            <div className="flex gap-2">
              <Select value={localPlan.status || 'draft'} onValueChange={v => updateField('status', v)}>
                <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleSave} className="gap-2 bg-blue-600 hover:bg-blue-700" disabled={saveMut.isPending}>
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Investimento Total" value={`R$${totalInvestment.toLocaleString('pt-BR')}`} icon={DollarSign} color="blue" />
        <StatCard label="Leads Esperados" value={consolidated.totals.total_leads.toLocaleString()} icon={Users} color="purple" />

        <StatCard label="Vendas Esperadas" value={Math.round(consolidated.totals.total_sales).toLocaleString()} icon={Target} color="orange" />
        <StatCard label="Receita Projetada" value={`R$${Math.round(consolidated.totals.total_revenue).toLocaleString('pt-BR')}`} icon={TrendingUp} color="green" />
      </div>

      {!readOnly && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Premissas do Funil</h3>
            {funnelType && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {funnelType.name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">{conversionLabels[0]} (%)</Label>
              <PercentInput value={localPlan.lead_to_appointment_rate || 0} onChange={v => updateField('lead_to_appointment_rate', v)} className="mt-1" />
            </div>
            {conversionLabels[1] && (
              <div>
                <Label className="text-xs">{conversionLabels[1]} (%)</Label>
                <PercentInput value={localPlan.appointment_to_show_rate || 0} onChange={v => updateField('appointment_to_show_rate', v)} className="mt-1" />
              </div>
            )}
            {conversionLabels[2] && (
              <div>
                <Label className="text-xs">{conversionLabels[2]} (%)</Label>
                <PercentInput value={localPlan.show_to_sale_rate || 0} onChange={v => updateField('show_to_sale_rate', v)} className="mt-1" />
              </div>
            )}
            <div>
              <Label className="text-xs">Ticket Médio (R$)</Label>
              <CurrencyInput value={localPlan.average_ticket || 0} onChange={v => updateField('average_ticket', v)} prefix="R$" className="mt-1" />
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <ChannelEditor channels={channels} onChange={handleChannelsChange} totalInvestment={totalInvestment} readOnly={readOnly} />
      </div>

      <div className="mb-6">
        <FunnelChart data={consolidated.totals} title="Funil Consolidado" />
      </div>

      <ResultsTable channelResults={consolidated.channelResults} totals={consolidated.totals} blended={consolidated} />
    </div>
  );
}