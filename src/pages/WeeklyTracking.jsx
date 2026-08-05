import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/usePermissions';
import { calculateConsolidated } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import ResultsFunnel from '../components/plan/ResultsFunnel';
import { exportResultsPdf } from '../components/plan/ResultsPdfExport';
import ChannelBadge from '../components/ui-custom/ChannelBadge';
import ConfirmDeleteDialog from '../components/ui-custom/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CurrencyInput from '../components/ui-custom/CurrencyInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, FileDown, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtN(v) { return Math.round(v || 0).toLocaleString('pt-BR'); }
function fmtCur(v) { return `R$${Math.round(v || 0).toLocaleString('pt-BR')}`; }
function fmtPct(v) {
  if (typeof v !== 'number' || !isFinite(v)) return '-';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(1)}%`;
}

// Alinha um array de valores de etapa ao tamanho do funil (trunca/completa com 0)
function alignStages(values, len) {
  const out = [];
  for (let i = 0; i < len; i++) out.push(Math.round(values[i] || 0));
  return out;
}

function NumField({ value, onChange, className }) {
  return (
    <input type="text" inputMode="numeric" value={value ? String(value) : ''} placeholder="0"
      onChange={e => {
        const clean = e.target.value.replace(/[^\d]/g, '');
        onChange(clean ? parseInt(clean, 10) : 0);
      }}
      className={`w-full h-9 border border-gray-200 rounded-md text-sm px-3 bg-white focus:outline-none focus:ring-1 focus:ring-primary ${className || ''}`} />
  );
}

// Tabela Meta vs Realizado vs Desvio
function GapTable({ stageLabels, meta, real }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/70 border-b border-gray-100">
            <th className="text-left py-2.5 px-3 font-medium text-gray-500">Etapa</th>
            <th className="text-right py-2.5 px-3 font-medium text-gray-500">Meta</th>
            <th className="text-right py-2.5 px-3 font-medium text-gray-500">Realizado</th>
            <th className="text-right py-2.5 px-3 font-medium text-gray-500">Desvio</th>
            <th className="text-right py-2.5 px-3 font-medium text-gray-500">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stageLabels.map((label, i) => {
            const m = meta[i] || 0;
            const r = real[i] || 0;
            const desvio = r - m;
            const desvioPct = m > 0 ? (r - m) / m : 0;
            return (
              <tr key={i} className="hover:bg-gray-50/30">
                <td className="py-2.5 px-3 font-medium text-gray-900">{label}</td>
                <td className="py-2.5 px-3 text-right text-gray-500">{fmtN(m)}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{fmtN(r)}</td>
                <td className={`py-2.5 px-3 text-right font-medium ${desvio >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {desvio >= 0 ? '+' : ''}{fmtN(desvio)}
                </td>
                <td className={`py-2.5 px-3 text-right font-medium ${desvioPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {fmtPct(desvioPct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChannelResultCard({ channel, stageLabels, expanded, onToggle }) {
  const projected = channel.projected;
  const actual = channel.actual;
  const investDesvio = actual.investment - projected.investment;
  const investDesvioPct = projected.investment > 0 ? (actual.investment - projected.investment) / projected.investment : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <ChannelBadge channel={channel.name} />
        <span className="text-sm font-semibold text-gray-900">{channel.name}</span>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Invest. Meta</p>
            <p className="text-gray-600 font-medium">{fmtCur(projected.investment)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Invest. Realizado</p>
            <p className={`font-semibold ${investDesvio >= 0 ? 'text-gray-900' : 'text-gray-900'}`}>{fmtCur(actual.investment)}</p>
          </div>
          <span className={`inline-flex items-center gap-1 font-medium ${investDesvioPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {investDesvioPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {fmtPct(investDesvioPct)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Funil — Realizado vs Meta</h4>
              <ResultsFunnel
                stages={stageLabels.map((label, i) => ({ label, value: actual.stages[i] }))}
                metaStages={stageLabels.map((label, i) => ({ label, value: projected.stages[i] }))}
              />
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Desvio por Etapa</h4>
              <GapTable stageLabels={stageLabels} meta={projected.stages} real={actual.stages} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyTracking() {
  const { allowedClientIds } = usePermissions();
  const queryClient = useQueryClient();
  const [filterClientId, setFilterClientId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [channelActuals, setChannelActuals] = useState([]);
  const [expandedChannels, setExpandedChannels] = useState({});
  const [showClearDialog, setShowClearDialog] = useState(false);

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

  const { data: objectives = [] } = useQuery({
    queryKey: ['objectives'],
    queryFn: () => base44.entities.CampaignObjective.list(),
  });

  const scopedClients = !allowedClientIds ? clients : clients.filter(c => allowedClientIds.includes(c.id));
  const myPlans = !allowedClientIds ? plans : plans.filter(p => allowedClientIds.includes(p.client_id));
  const clientPlans = myPlans.filter(p => !filterClientId || p.client_id === filterClientId);
  const plan = myPlans.find(p => p.id === selectedPlanId);
  const existingActual = allActuals.find(a => a.plan_id === selectedPlanId);

  const funnelType = funnelTypes.find(ft => ft.id === plan?.funnel_type_id);
  const stageLabels = useMemo(() => {
    const labels = funnelType?.stages?.map(s => s.label);
    return labels && labels.length >= 2 ? labels : ['Leads', 'Agendamentos', 'Comparecimentos', 'Vendas'];
  }, [funnelType]);

  // Projeção (meta) consolidada e por canal — usa investimento bruto
  const projected = useMemo(() => {
    if (!plan || !plan.channels?.length) return null;
    const rates = Array.isArray(plan.conversion_rates) && plan.conversion_rates.length
      ? plan.conversion_rates
      : [plan.lead_to_appointment_rate || 0.35, plan.appointment_to_show_rate || 0.7, plan.show_to_sale_rate || 0.35];
    return calculateConsolidated(plan.channels, rates, plan.average_ticket || 5000, objectives);
  }, [plan, objectives]);

  // Dados por canal: projetado + realizado
  const channelData = useMemo(() => {
    if (!projected || !plan) return [];
    return projected.channelResults.map((cr, i) => {
      const name = cr.channel_name;
      const projectedStages = alignStages(cr.metrics.stageValues, stageLabels.length);
      const projectedInvestment = cr.budget_value || 0;
      const actualEntry = channelActuals.find(ca => ca.channel_name === name) || {};
      const actualStages = stageLabels.map(label => {
        const sa = (actualEntry.stage_actuals || []).find(s => s.label === label);
        return sa?.value || 0;
      });
      const actualInvestment = actualEntry.investment || 0;
      return { name, projected: { stages: projectedStages, investment: projectedInvestment }, actual: { stages: actualStages, investment: actualInvestment } };
    });
  }, [projected, plan, channelActuals, stageLabels]);

  // Consolidado real
  const consolidated = useMemo(() => {
    if (!projected) return null;
    const projStages = alignStages(projected.totals.stageValues, stageLabels.length);
    const projInvest = projected.totals.total_budget || 0;
    const realStages = stageLabels.map((_, i) => channelData.reduce((s, ch) => s + (ch.actual.stages[i] || 0), 0));
    const realInvest = channelData.reduce((s, ch) => s + (ch.actual.investment || 0), 0);
    return { projected: { stages: projStages, investment: projInvest }, actual: { stages: realStages, investment: realInvest } };
  }, [projected, channelData, stageLabels]);

  // Inicializa o formulário quando muda o plano ou o registro existente
  useEffect(() => {
    if (!plan) { setChannelActuals([]); return; }
    const baseChannels = plan.channels.map(ch => ch.channel_name);
    const existing = allActuals.find(a => a.plan_id === plan.id);
    if (existing?.reference_date) setReferenceDate(existing.reference_date);

    setChannelActuals(baseChannels.map(name => {
      const found = (existing?.channel_actuals || []).find(ca => ca.channel_name === name);
      const stageActuals = stageLabels.map(label => {
        const sa = (found?.stage_actuals || []).find(s => s.label === label);
        return { label, value: sa?.value || 0 };
      });
      return { channel_name: name, investment: found?.investment || 0, stage_actuals: stageActuals };
    }));
    setExpandedChannels({});
  }, [plan, allActuals, stageLabels]);

  const updateChannelInvestment = (name, value) => {
    setChannelActuals(prev => prev.map(ca => ca.channel_name === name ? { ...ca, investment: value } : ca));
  };
  const updateStageActual = (name, label, value) => {
    setChannelActuals(prev => prev.map(ca => ca.channel_name === name
      ? { ...ca, stage_actuals: ca.stage_actuals.map(s => s.label === label ? { ...s, value } : s) }
      : ca));
  };
  const toggleChannel = (name) => setExpandedChannels(prev => ({ ...prev, [name]: !prev[name] }));

  const saveMut = useMutation({
    mutationFn: (data) => {
      const existing = allActuals.find(a => a.plan_id === selectedPlanId);
      if (existing) {
        return base44.entities.WeeklyActual.update(existing.id, data);
      }
      return base44.entities.WeeklyActual.create({ ...data, plan_id: selectedPlanId, client_id: plan?.client_id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weeklyActuals'] }),
  });

  const clearMut = useMutation({
    mutationFn: () => base44.entities.WeeklyActual.deleteMany({ plan_id: selectedPlanId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyActuals'] });
      setShowClearDialog(false);
    },
  });

  const handleSave = () => {
    saveMut.mutate({ reference_date: referenceDate, channel_actuals: channelActuals });
  };

  const handleExportPdf = () => {
    if (!consolidated) return;
    const planLabel = plan ? `${MESES[(plan.period_month || 1) - 1]}/${plan.period_year}` : '';
    exportResultsPdf({
      clientName: plan?.client_name,
      planLabel,
      referenceDate,
      stageLabels,
      consolidated,
      channels: channelData,
    });
  };

  if (plansLoading || actualsLoading) {
    return (
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
        <PageHeader title="Acompanhamento de Resultados" description="Lance os resultados por canal e veja o desvio do funil." />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
      <PageHeader title="Acompanhamento de Resultados" description="Lance os resultados por canal e veja o desvio do funil frente à meta." />

      {/* Seleção cliente + plano */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">1. Selecione o Cliente</Label>
            <Select value={filterClientId} onValueChange={v => { setFilterClientId(v); setSelectedPlanId(''); }}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
              <SelectContent>
                {scopedClients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filterClientId && (
            <div>
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">2. Selecione o Plano de Mídia</Label>
              {clientPlans.length === 0 ? (
                <p className="text-sm text-gray-400 mt-2">Este cliente não possui planos cadastrados.</p>
              ) : (
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
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
        </div>
        {!filterClientId && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm mt-4">
            Selecione um cliente para começar
          </div>
        )}
      </div>

      {!selectedPlanId && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          Selecione um plano de mídia para visualizar o acompanhamento.
        </div>
      )}

      {selectedPlanId && !projected && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          O plano selecionado não possui canais configurados.
        </div>
      )}

      {selectedPlanId && projected && (
        <>
          {/* Lançamento de resultados por canal */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Lançar Resultados por Canal</h3>
              <div className="flex items-center gap-3">
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Data de referência</Label>
                  <input type="date" value={referenceDate} onChange={e => setReferenceDate(e.target.value)}
                    className="ml-2 h-9 border border-gray-200 rounded-md text-sm px-3 bg-white focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {channelActuals.map(ca => (
                <div key={ca.channel_name} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <ChannelBadge channel={ca.channel_name} />
                    <span className="text-sm font-semibold text-gray-900">{ca.channel_name}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Investimento Realizado (R$)</Label>
                      <CurrencyInput value={ca.investment} onChange={v => updateChannelInvestment(ca.channel_name, v || 0)} prefix="R$" className="mt-1" />
                    </div>
                    {stageLabels.map(label => {
                      const found = (ca.stage_actuals || []).find(s => s.label === label);
                      return (
                        <div key={label}>
                          <Label className="text-xs">{label} (realizado)</Label>
                          <NumField value={found?.value || 0} onChange={v => updateStageActual(ca.channel_name, label, v)} className="mt-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-5">
              <Button onClick={handleSave} className="gap-2 bg-primary hover:bg-primary/90" disabled={saveMut.isPending}>
                <Save className="w-4 h-4" /> {saveMut.isPending ? 'Salvando...' : 'Salvar Resultados'}
              </Button>
              <Button onClick={handleExportPdf} variant="outline" className="gap-2">
                <FileDown className="w-4 h-4" /> Exportar PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowClearDialog(true)}
                disabled={clearMut.isPending || !existingActual}
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 ml-auto"
              >
                <Trash2 className="w-4 h-4" /> Limpar
              </Button>
            </div>
          </div>

          {/* Consolidado */}
          {consolidated && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Consolidado — Meta vs Realizado</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Funil Consolidado</h4>
                  <ResultsFunnel
                    stages={stageLabels.map((label, i) => ({ label, value: consolidated.actual.stages[i] }))}
                    metaStages={stageLabels.map((label, i) => ({ label, value: consolidated.projected.stages[i] }))}
                  />
                </div>
                <div>
                  <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Desvio por Etapa</h4>
                  <GapTable stageLabels={stageLabels} meta={consolidated.projected.stages} real={consolidated.actual.stages} />
                  <div className="flex justify-between mt-3 px-3 py-2 bg-gray-50/60 rounded-md text-sm">
                    <span className="font-medium text-gray-700">Investimento</span>
                    <div className="flex gap-6">
                      <span className="text-gray-500">Meta: {fmtCur(consolidated.projected.investment)}</span>
                      <span className="font-semibold text-gray-900">Real: {fmtCur(consolidated.actual.investment)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Por canal */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 px-1">Por Canal</h3>
            {channelData.map(ch => (
              <ChannelResultCard
                key={ch.name}
                channel={ch}
                stageLabels={stageLabels}
                expanded={expandedChannels[ch.name] !== false}
                onToggle={() => toggleChannel(ch.name)}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDeleteDialog
        open={showClearDialog}
        onCancel={() => setShowClearDialog(false)}
        onConfirm={() => clearMut.mutate()}
        isPending={clearMut.isPending}
        title="Limpar resultados"
        message="Deseja remover todos os resultados realizados deste plano? Esta ação não pode ser desfeita."
        confirmLabel="Limpar"
      />
    </div>
  );
}