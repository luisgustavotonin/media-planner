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
import { Save, Users, DollarSign, TrendingUp, Target, ArrowLeft, FileDown, Trash2 } from 'lucide-react';
import { exportPlanToPdf } from '../components/plan/PlanPdfExport';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const SEGMENTOS = {
  implants: 'Implantes', aesthetics: 'Estética', orthodontics: 'Ortodontia',
  general: 'Clínica Geral', periodontics: 'Periodontia', endodontics: 'Endodontia',
  pediatric: 'Odontopediatria', other: 'Outros',
};
const STATUS_PT = { draft: 'Rascunho', active: 'Ativo', completed: 'Concluído' };

export default function PlanDetail() {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('id');
  const { user } = useAuth();
  const perms = usePermissions(user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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

  const { data: benchmarks = [] } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => base44.entities.Benchmark.list(),
  });

  const [localPlan, setLocalPlan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    // Só sincroniza com o servidor se não houver edições locais em andamento
    if (plan && !isSaving) setLocalPlan(prev => prev === null ? { ...plan } : prev);
  }, [plan]);

  const saveMut = useMutation({
    mutationFn: (data) => {
      const { id, created_date, updated_date, created_by, created_by_id, ...rest } = data;
      return base44.entities.MediaPlan.update(planId, rest);
    },
    onSuccess: (savedData) => {
      // Atualiza localPlan com o dado retornado do servidor (fonte da verdade)
      if (savedData) setLocalPlan({ ...savedData });
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
    },
    onError: () => setIsSaving(false),
  });

  const deleteMut = useMutation({
    mutationFn: () => base44.entities.MediaPlan.delete(planId),
    onSuccess: () => {
      toast.success('Plano de mídia deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      navigate(createPageUrl('MediaPlans'));
    },
    onError: () => {
      toast.error('Erro ao deletar plano de mídia');
    }
  });

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja deletar este plano de mídia? Esta ação não pode ser desfeita.')) {
      deleteMut.mutate();
    }
  };

  if (isLoading || !localPlan) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const funnelType = funnelTypes.find(f => f.id === localPlan.funnel_type_id);
  // Busca benchmark: 1) funil + segmento exato, 2) só funil (sem segmento), 3) legado só por segmento
  const benchmark = benchmarks.find(b => b.funnel_type_id === localPlan.funnel_type_id && b.segment === localPlan.segment)
    || benchmarks.find(b => b.funnel_type_id === localPlan.funnel_type_id)
    || benchmarks.find(b => !b.funnel_type_id && b.segment === localPlan.segment);
  const funnelStages = funnelType?.stages || [];

  // Pares de conversão dinâmicos baseados nas etapas do funil
  const conversionPairs = funnelStages.length >= 2
    ? funnelStages.slice(0, -1).map((s, i) => ({
        label: `${s.label} → ${funnelStages[i + 1].label}`,
        field: `conversion_rate_${i}`,
      }))
    : [
        { label: 'Lead → Agendamento', field: 'conversion_rate_0' },
        { label: 'Agendamento → Comparecimento', field: 'conversion_rate_1' },
        { label: 'Comparecimento → Venda', field: 'conversion_rate_2' },
      ];

  // Lê as taxas do array dinâmico; fallback para campos legados apenas se conversion_rates não existir
  const hasRatesArray = Array.isArray(localPlan.conversion_rates) && localPlan.conversion_rates.length > 0;
  const getRate = (i) => {
    if (hasRatesArray) return localPlan.conversion_rates[i] ?? 0;
    const legacy = [localPlan.lead_to_appointment_rate, localPlan.appointment_to_show_rate, localPlan.show_to_sale_rate];
    return legacy[i] ?? 0;
  };

  const updateRate = (i, value) => {
    const rates = conversionPairs.map((_, idx) => getRate(idx));
    rates[i] = value;
    setLocalPlan(p => ({
      ...p,
      conversion_rates: rates,
      // manter campos legados sincronizados para compatibilidade
      lead_to_appointment_rate: rates[0] || 0,
      appointment_to_show_rate: rates[1] || 0,
      show_to_sale_rate: rates[2] || 0,
    }));
  };

  // Array com todas as taxas do funil em ordem (cascata completa) — já em decimal (0-1) via PercentInput
  const activeRates = conversionPairs.map((_, i) => getRate(i));

  const daysInMonth = new Date(localPlan.period_year || new Date().getFullYear(), localPlan.period_month || 1, 0).getDate();
  const channels = localPlan.channels || [];
  const avgTicket = localPlan.average_ticket || 0;
  const consolidated = calculateConsolidated(channels, activeRates, avgTicket);
  const totalInvestment = channels.reduce((s, c) => s + (c.budget_value || 0), 0);
  const netInvestment = channels.reduce((s, c) => {
    const tax = (c.tax_percent || 0) / 100;
    return s + (c.budget_value || 0) * (1 - tax);
  }, 0);
  const hasAnyTax = channels.some(c => (c.tax_percent || 0) > 0);

  const updateField = (field, value) => setLocalPlan(p => ({ ...p, [field]: value }));
  const handleSave = () => {
    setIsSaving(true);
    saveMut.mutate({ ...localPlan, total_investment: totalInvestment });
  };
  const handleChannelsChange = (newChannels) => {
    setLocalPlan(p => ({ ...p, channels: newChannels, total_investment: newChannels.reduce((s, c) => s + (c.budget_value || 0), 0) }));
  };

  const STATUS_OPTIONS = [
    { value: 'draft', label: 'Rascunho' },
    { value: 'active', label: 'Ativo' },
    { value: 'completed', label: 'Concluído' },
  ];
  const statusLabel = STATUS_PT[localPlan.status] || 'Rascunho';
  const segmentoLabel = SEGMENTOS[localPlan.segment] || localPlan.segment || 'Geral';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl('MediaPlans')} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3 h-3" /> Voltar aos Planos
        </Link>
        <PageHeader
          title={`${localPlan.client_name || 'Sem nome'} — ${MESES[(localPlan.period_month || 1) - 1]} ${localPlan.period_year}`}
          description={`Segmento: ${segmentoLabel} · Status: ${statusLabel}`}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2 h-9 text-xs"
                onClick={() => exportPlanToPdf({ localPlan, consolidated, totalInvestment, funnelStages, conversionPairs, getRate })}
              >
                <FileDown className="w-4 h-4" /> Exportar PDF
              </Button>
              {!readOnly && (
                <>
                  <Select value={localPlan.status || 'draft'} onValueChange={v => updateField('status', v)}>
                    <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleDelete} variant="outline" className="gap-2 h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" disabled={deleteMut.isPending}>
                    <Trash2 className="w-4 h-4" /> {deleteMut.isPending ? 'Deletando...' : 'Deletar'}
                  </Button>
                  <Button onClick={handleSave} className="gap-2 bg-blue-600 hover:bg-blue-700" disabled={saveMut.isPending}>
                    <Save className="w-4 h-4" /> Salvar
                  </Button>
                </>
              )}
            </div>
          }
        />
      </div>

      <div className={`grid grid-cols-2 gap-4 mb-6 ${hasAnyTax ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <StatCard label="Investimento Bruto" value={`R$${totalInvestment.toLocaleString('pt-BR')}`} icon={DollarSign} color="blue" />
        {hasAnyTax && (
          <StatCard label="Investimento Líquido" value={`R$${Math.round(netInvestment).toLocaleString('pt-BR')}`} icon={DollarSign} color="blue" sublabel="após impostos" />
        )}
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
            {conversionPairs.map((pair, i) => (
              <div key={pair.field}>
                <Label className="text-xs">{pair.label} (%)</Label>
                <PercentInput value={getRate(i)} onChange={v => updateRate(i, v)} className="mt-1" />
              </div>
            ))}
            <div>
              <Label className="text-xs">Ticket Médio (R$)</Label>
              <CurrencyInput value={localPlan.average_ticket || 0} onChange={v => updateField('average_ticket', v)} prefix="R$" className="mt-1" />
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <ChannelEditor channels={channels} onChange={handleChannelsChange} totalInvestment={totalInvestment} readOnly={readOnly} days={daysInMonth} />
      </div>

      <div className="mb-6">
        <FunnelChart data={consolidated.totals} title="Funil Consolidado" funnelStages={funnelStages} benchmark={benchmark} />
      </div>

      <ResultsTable channelResults={consolidated.channelResults} totals={consolidated.totals} blended={consolidated} funnelStages={funnelStages} />
    </div>
  );
}