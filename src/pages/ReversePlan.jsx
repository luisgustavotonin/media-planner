import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateReversePlan } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import StatCard from '../components/ui-custom/StatCard';
import ChannelBadge from '../components/ui-custom/ChannelBadge';
import FunnelVisual from '../components/ui-custom/FunnelVisual';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CurrencyInput from '../components/ui-custom/CurrencyInput';
import PercentInput from '../components/ui-custom/PercentInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, DollarSign, Users, TrendingDown, Calculator, Plus, Trash2, Info, Save, ArrowLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CHANNEL_OPTIONS = ['Meta', 'Google', 'TikTok', 'YouTube', 'LinkedIn', 'Outro'];
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Dado um plano e lista de funnelTypes, retorna os labels das etapas
function getFunnelStageLabels(plan, funnelTypes) {
  const ft = funnelTypes.find(f => f.id === plan?.funnel_type_id);
  if (ft?.stages?.length >= 2) return ft.stages.map(s => s.label);
  return null; // fallback para labels genéricos
}

// Constrói o array de etapas para o FunnelVisual a partir do resultado e labels do funil
function buildFunnelVisualStages(result, stageLabels) {
  if (!result) return [];
  const stageValues = result.stage_values || [];
  if (stageValues.length === 0) return [];

  if (stageLabels && stageLabels.length === stageValues.length) {
    return stageLabels.map((label, i) => ({ label, value: stageValues[i] }));
  }
  // fallback genérico
  const genericLabels = ['Leads', 'Agendamentos', 'Comparecimentos', 'Vendas'];
  return stageValues.map((v, i) => ({ label: genericLabels[i] || `Etapa ${i + 1}`, value: v }));
}

// ── Lista: cascata cliente → plano → planejamentos reversos ──
function PlanList({ records, clients, plans, onSelect, onNew }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const sortedClients = [...clients].sort((a, b) =>
    (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR')
  );

  const clientPlans = plans.filter(p => p.client_id === selectedClientId);
  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const planLabel = selectedPlan
    ? `${MESES_SHORT[(selectedPlan.period_month || 1) - 1]}/${selectedPlan.period_year}`
    : '';

  const filtered = selectedPlanId
    ? records.filter(r => r.plan_id === selectedPlanId)
    : [];

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">1. Selecione o Cliente</p>
        <Select value={selectedClientId} onValueChange={v => { setSelectedClientId(v); setSelectedPlanId(''); }}>
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Selecione um cliente..." />
          </SelectTrigger>
          <SelectContent>
            {sortedClients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedClientId && (
          <>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">2. Selecione o Plano de Mídia</p>
            {clientPlans.length === 0 ? (
              <p className="text-sm text-gray-400">Este cliente não possui planos de mídia.</p>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Selecione um plano..." />
                </SelectTrigger>
                <SelectContent>
                  {clientPlans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {MESES_SHORT[(p.period_month || 1) - 1]}/{p.period_year} — {p.status === 'active' ? 'Ativo' : p.status === 'draft' ? 'Rascunho' : 'Concluído'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}
      </div>

      {selectedPlanId && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Planejamentos Reversos</h2>
              <p className="text-sm text-gray-500">{planLabel} · {filtered.length} planejamento(s)</p>
            </div>
            <Button onClick={onNew} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Novo Planejamento
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
              <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum planejamento reverso para este plano</p>
              <p className="text-gray-400 text-sm mt-1">Clique em "Novo Planejamento" para criar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => {
                const cname = clients.find(c => c.id === r.client_id)?.clinic_name || r.client_name || '—';
                const sales = r.result?.required_sales || 0;
                const inv = r.result?.total_investment || 0;
                return (
                  <div
                    key={r.id}
                    onClick={() => onSelect(r)}
                    className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                        <Target className="w-4 h-4 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.title || cname}</p>
                        <p className="text-xs text-gray-400">{cname}{r.plan_label ? ` · ${r.plan_label}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Meta de Receita</p>
                        <p className="text-sm font-semibold text-gray-800">R${Math.round(r.target_revenue || 0).toLocaleString('pt-BR')}</p>
                      </div>
                      {inv > 0 && (
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-gray-400">Investimento</p>
                          <p className="text-sm font-semibold text-gray-800">R${Math.round(inv).toLocaleString('pt-BR')}</p>
                        </div>
                      )}
                      {sales > 0 && (
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-gray-400">Vendas Nec.</p>
                          <p className="text-sm font-semibold text-gray-800">{sales}</p>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Visualizar planejamento salvo (somente leitura) ──
function PlanView({ record, clients, funnelTypes, onBack }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cname = clients.find(c => c.id === record.client_id)?.clinic_name || record.client_name || '—';
  const fmt = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;
  const fmtPct = v => `${(v * 100).toFixed(1)}%`;
  const result = record.result;

  // Tenta reconstruir labels a partir do funnelType salvo no record (via plan_id não temos direto, mas salvamos conversion_rates)
  // Usamos os labels salvos no record.funnel_stage_labels se existir, senão genérico
  const stageLabels = record.funnel_stage_labels || null;
  const funnelVisualStages = buildFunnelVisualStages(result, stageLabels);

  // Labels das taxas para "Dados do Funil"
  const conversionLabels = stageLabels && stageLabels.length >= 2
    ? stageLabels.slice(0, -1).map((l, i) => `${l} → ${stageLabels[i + 1]}`)
    : null;

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ReversePlanRecord.delete(record.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-plans'] });
      toast({ title: 'Planejamento excluído.' });
      onBack();
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{record.title || cname}</h2>
            <p className="text-sm text-gray-500">{cname}{record.plan_label ? ` · ${record.plan_label}` : ''}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="text-red-500 border-red-200 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {record.conversion_rates?.length > 0 && record.average_ticket > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-secondary-foreground" />
            <span className="text-xs font-semibold text-secondary-foreground">Dados do Funil</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-gray-400">Ticket Médio</p>
              <p className="font-semibold text-gray-800">{fmt(record.average_ticket)}</p>
            </div>
            {record.conversion_rates.map((r, i) => {
              const label = conversionLabels?.[i] || `Taxa ${i + 1}`;
              return (
                <div key={i}>
                  <p className="text-gray-400">{label}</p>
                  <p className="font-semibold text-gray-800">{fmtPct(r)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <p className="text-xs text-gray-400 mb-1">Meta de Receita</p>
        <p className="text-2xl font-bold text-gray-900">{fmt(record.target_revenue || 0)}</p>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <StatCard label="Investimento Necessário" value={fmt(result.total_investment)} icon={DollarSign} color="blue" />
            <StatCard label="Leads Necessários" value={result.required_leads.toLocaleString()} icon={Users} color="purple" />
            <StatCard label="Vendas Necessárias" value={result.required_sales.toLocaleString()} icon={Target} color="orange" />
            <StatCard label="Meta de Receita" value={fmt(record.target_revenue)} icon={TrendingDown} color="green" />
          </div>

          {funnelVisualStages.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Projeção do Funil</h3>
              <FunnelVisual stages={funnelVisualStages} />
            </div>
          )}

          {result.channel_budgets?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Orçamento por Canal</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left py-2.5 px-4 font-medium text-gray-500">Canal</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Distribuição</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">CPL</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Leads Nec.</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Budget Nec.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.channel_budgets.map((ch, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-4"><ChannelBadge channel={ch.channel_name} /></td>
                        <td className="py-2.5 px-4 text-right">{ch.percent}%</td>
                        <td className="py-2.5 px-4 text-right">R${ch.expected_cpl}</td>
                        <td className="py-2.5 px-4 text-right">{ch.required_leads.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{fmt(ch.required_budget)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                      <td className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-right">100%</td>
                      <td></td>
                      <td className="py-3 px-4 text-right">{result.required_leads.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{fmt(result.total_investment)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Criar novo planejamento ──
function PlanNew({ clients, plans, funnelTypes, onSave, onBack }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [title, setTitle] = useState('');
  const [targetRevenue, setTargetRevenue] = useState(0);
  const [distribution, setDistribution] = useState([]);
  const [conversionRates, setConversionRates] = useState([]);
  const [editedTicket, setEditedTicket] = useState(0);
  const [result, setResult] = useState(null);

  const updateRate = (i, v) => {
    setConversionRates(rs => rs.map((x, j) => j === i ? v : x));
    setResult(null);
  };
  const updateTicket = (v) => { setEditedTicket(v || 0); setResult(null); };

  const sortedClients = [...clients].sort((a, b) =>
    (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR')
  );
  const clientPlans = plans.filter(p => p.client_id === selectedClientId);
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Busca o funnelType do plano selecionado para obter os labels das etapas
  const funnelType = funnelTypes.find(f => f.id === selectedPlan?.funnel_type_id);
  const funnelStages = funnelType?.stages || [];
  const stageLabels = funnelStages.length >= 2 ? funnelStages.map(s => s.label) : null;

  // Labels de conversão para exibir nos "Dados do Funil"
  const conversionLabels = stageLabels && stageLabels.length >= 2
    ? stageLabels.slice(0, -1).map((l, i) => `${l} → ${stageLabels[i + 1]}`)
    : ['Lead → Agend.', 'Agend. → Compar.', 'Compar. → Venda'];

  useEffect(() => {
    setSelectedPlanId('');
    setDistribution([]);
    setResult(null);
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedPlan) {
      setDistribution([]);
      setConversionRates([]);
      setEditedTicket(0);
      setResult(null);
      return;
    }
    if (selectedPlan.channels?.length > 0) {
      const totalBudget = selectedPlan.channels.reduce((s, c) => s + (c.budget_value || 0), 0);
      setDistribution(selectedPlan.channels.map(ch => ({
        channel_name: ch.channel_name,
        percent: totalBudget > 0 ? Math.round((ch.budget_value / totalBudget) * 100) : 0,
        expected_cpl: ch.expected_cpl || 0,
      })));
    } else {
      setDistribution([]);
    }
    const rates = (Array.isArray(selectedPlan.conversion_rates) && selectedPlan.conversion_rates.length
        ? selectedPlan.conversion_rates
        : [selectedPlan.lead_to_appointment_rate || 0, selectedPlan.appointment_to_show_rate || 0, selectedPlan.show_to_sale_rate || 0]);
    setConversionRates(rates);
    setEditedTicket(selectedPlan.average_ticket || 0);
    setResult(null);
  }, [selectedPlanId]);

  const fmt = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;
  const fmtPct = v => `${(v * 100).toFixed(1)}%`;
  const canCalculate = selectedPlanId && targetRevenue > 0 && distribution.length > 0 && editedTicket > 0;

  const handleDistChange = (idx, field, value) => {
    setDistribution(d => d.map((ch, i) => i === idx ? { ...ch, [field]: Number(value) } : ch));
  };

  // Constrói visual do funil usando stage_values dinâmico + labels do funil
  const funnelVisualStages = buildFunnelVisualStages(result, stageLabels);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ReversePlanRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-plans'] });
      toast({ title: 'Planejamento salvo!' });
      onSave();
    },
  });

  const handleSave = () => {
    const cname = clients.find(c => c.id === selectedClientId)?.clinic_name || '';
    const planLabel = selectedPlan
      ? `${MESES_SHORT[(selectedPlan.period_month || 1) - 1]}/${selectedPlan.period_year}`
      : '';
    const calc = calculateReversePlan(targetRevenue, editedTicket, conversionRates, distribution);
    saveMutation.mutate({
      client_id: selectedClientId,
      client_name: cname,
      plan_id: selectedPlanId,
      plan_label: planLabel,
      title: title || `Planejamento — ${cname}`,
      target_revenue: targetRevenue,
      average_ticket: editedTicket,
      conversion_rates: conversionRates,
      funnel_stage_labels: stageLabels, // salva os labels para uso futuro na view
      distribution,
      result: calc,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Novo Planejamento Reverso</h2>
            <p className="text-sm text-gray-500">Calcule o investimento necessário para atingir sua meta</p>
          </div>
        </div>
        {result && (
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4" /> Salvar
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="mb-5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Título (opcional)</Label>
          <input
            className="mt-2 w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: Meta Q3 2026"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="mb-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">1. Selecione o Cliente</p>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
            <SelectContent>
              {sortedClients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selectedClientId && (
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">2. Selecione o Plano de Mídia</p>
            {clientPlans.length === 0 ? (
              <p className="text-sm text-gray-400">Este cliente não possui planos de mídia.</p>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="max-w-xs"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
                <SelectContent>
                  {clientPlans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {MESES_SHORT[(p.period_month || 1) - 1]}/{p.period_year} — {p.status === 'active' ? 'Ativo' : p.status === 'draft' ? 'Rascunho' : 'Concluído'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Dados do Funil — dinâmico com os labels reais das etapas */}
        {selectedPlan && editedTicket > 0 && (
          <div className="mb-5 p-4 bg-secondary/40 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-secondary-foreground" />
              <span className="text-xs font-semibold text-secondary-foreground">Dados do Funil (editável)</span>
              {funnelType && (
                <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary/60 text-secondary-foreground">
                  {funnelType.name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-gray-400 mb-1">Ticket Médio</p>
                <CurrencyInput value={editedTicket} onChange={updateTicket} prefix="R$" className="text-xs h-9" />
              </div>
              {conversionRates.map((r, i) => (
                <div key={i}>
                  <p className="text-gray-400 mb-1">{conversionLabels[i] || `Taxa ${i + 1}`}</p>
                  <PercentInput value={r} onChange={v => updateRate(i, v)} className="text-xs" />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-3">Edite os valores acima para simular cenários diferentes antes de calcular.</p>
          </div>
        )}

        {selectedPlanId && (
          <>
            <div className="mb-5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Meta de Receita (R$)</Label>
              <div className="mt-2 max-w-xs">
                <CurrencyInput value={targetRevenue} onChange={v => setTargetRevenue(v || 0)} prefix="R$" />
              </div>
            </div>

            <div className="mb-4">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 block">Distribuição por Canal</Label>
              {distribution.length > 0 && (
                <div className="space-y-2 mb-3">
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_32px] gap-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider px-1">
                    <span>Canal</span><span>% do Budget</span><span>CPL (R$)</span><span></span>
                  </div>
                  {distribution.map((ch, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 sm:gap-3 items-center">
                      <Select value={ch.channel_name} onValueChange={v => handleDistChange(idx, 'channel_name', v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHANNEL_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <CurrencyInput value={ch.percent} onChange={v => handleDistChange(idx, 'percent', v)} className="text-xs" placeholder="%" />
                      <CurrencyInput value={ch.expected_cpl} onChange={v => handleDistChange(idx, 'expected_cpl', v)} prefix="R$" className="text-xs" placeholder="CPL" />
                      <button onClick={() => setDistribution(d => d.filter((_, i) => i !== idx))} className="p-1.5 rounded-md hover:bg-red-50 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3 mt-3">
                <Button variant="outline" onClick={() => setDistribution(d => [...d, { channel_name: 'Meta', percent: 0, expected_cpl: 0 }])} className="gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Adicionar Canal
                </Button>
                <Button
                  onClick={() => setResult(calculateReversePlan(targetRevenue, editedTicket, conversionRates, distribution))}
                  className="gap-2 bg-primary hover:bg-primary/90"
                  disabled={!canCalculate}
                >
                  <Calculator className="w-4 h-4" /> Calcular
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <StatCard label="Investimento Necessário" value={fmt(result.total_investment)} icon={DollarSign} color="blue" />
            <StatCard label="Leads Necessários" value={result.required_leads.toLocaleString()} icon={Users} color="purple" />
            <StatCard label="Vendas Necessárias" value={result.required_sales.toLocaleString()} icon={Target} color="orange" />
            <StatCard label="Meta de Receita" value={fmt(targetRevenue)} icon={TrendingDown} color="green" />
          </div>

          {funnelVisualStages.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Projeção do Funil</h3>
              <FunnelVisual stages={funnelVisualStages} />
            </div>
          )}

          {result.channel_budgets?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Orçamento por Canal</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left py-2.5 px-4 font-medium text-gray-500">Canal</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Distribuição</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">CPL</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Leads Nec.</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Budget Nec.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.channel_budgets.map((ch, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-4"><ChannelBadge channel={ch.channel_name} /></td>
                        <td className="py-2.5 px-4 text-right">{ch.percent}%</td>
                        <td className="py-2.5 px-4 text-right">R${ch.expected_cpl}</td>
                        <td className="py-2.5 px-4 text-right">{ch.required_leads.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{fmt(ch.required_budget)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                      <td className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-right">100%</td>
                      <td></td>
                      <td className="py-3 px-4 text-right">{result.required_leads.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{fmt(result.total_investment)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Página principal ──
export default function ReversePlan() {
  const [view, setView] = useState('list');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });

  const { data: records = [] } = useQuery({
    queryKey: ['reverse-plans'],
    queryFn: () => base44.entities.ReversePlanRecord.list('-created_date'),
  });

  const { data: funnelTypes = [] } = useQuery({
    queryKey: ['funnel-types'],
    queryFn: () => base44.entities.FunnelType.list(),
  });

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
      <PageHeader title="Planejamento Reverso" description="Calcule o investimento necessário para atingir suas metas de receita." />

      {view === 'list' && (
        <PlanList
          records={records}
          clients={clients}
          plans={plans}
          onSelect={r => { setSelectedRecord(r); setView('view'); }}
          onNew={() => setView('new')}
        />
      )}
      {view === 'view' && selectedRecord && (
        <PlanView
          record={selectedRecord}
          clients={clients}
          funnelTypes={funnelTypes}
          onBack={() => { setSelectedRecord(null); setView('list'); }}
        />
      )}
      {view === 'new' && (
        <PlanNew
          clients={clients}
          plans={plans}
          funnelTypes={funnelTypes}
          onSave={() => setView('list')}
          onBack={() => setView('list')}
        />
      )}
    </div>
  );
}