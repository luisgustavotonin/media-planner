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
import { Target, DollarSign, Users, TrendingDown, Calculator, Plus, Trash2, Info, Save, ArrowLeft, ChevronRight, ChevronDown, ChevronUp, FileDown, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { findBenchmark, getCplFromBenchmark, getRatesFromBenchmark } from '@/lib/benchmarkLookup';
import { exportReversePlanToPdf } from '../components/plan/ReversePlanPdfExport';

const GENERIC_RATE_LABELS = ['Lead → Agend.', 'Agend. → Compar.', 'Compar. → Venda'];
const GENERIC_STAGE_LABELS = ['Leads', 'Agendamentos', 'Comparecimentos', 'Vendas'];

// Cor de destaque por canal para separar as caixas visualmente
const CHANNEL_ACCENTS = {
  'Google': '#4285F4',
  'Meta': '#0866FF',
  'Instagram': '#E1306C',
  'TikTok': '#111111',
  'YouTube': '#FF0000',
  'LinkedIn': '#0A66C2',
  'Outlook': '#0078D4',
  'Wix': '#000000',
};
const channelAccent = (name) => CHANNEL_ACCENTS[name] || '#f85d07';

// ── Diálogo de confirmação de exclusão ──
function ConfirmDeleteDialog({ open, onConfirm, onCancel, title = 'Excluir?', message = 'Esta ação não pode ser desfeita.' }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">{message}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lista: cliente → planejamentos reversos ──
function PlanList({ records, clients, onSelect, onNew }) {
  const [selectedClientId, setSelectedClientId] = useState('');

  const sortedClients = [...clients].sort((a, b) =>
    (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR')
  );

  const filtered = selectedClientId
    ? records.filter(r => r.client_id === selectedClientId)
    : [];

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">1. Selecione o Cliente</p>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Selecione um cliente..." />
          </SelectTrigger>
          <SelectContent>
            {sortedClients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClientId && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Planejamentos Reversos</h2>
              <p className="text-sm text-gray-500">{filtered.length} planejamento(s)</p>
            </div>
            <Button onClick={onNew} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Novo Planejamento
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
              <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum planejamento reverso para este cliente</p>
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
                        <p className="text-xs text-gray-400">{cname}</p>
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const cname = clients.find(c => c.id === record.client_id)?.clinic_name || record.client_name || '—';
  const fmt = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;
  const fmtPct = v => `${(v * 100).toFixed(1)}%`;
  const result = record.result;

  const rowFunnelStages = (ch) => {
    const values = ch.stage_values || [];
    if (!values.length) return [];
    const labels = ch.funnel_stage_labels;
    if (labels && labels.length === values.length) {
      return labels.map((l, i) => ({ label: l, value: values[i] }));
    }
    return values.map((v, i) => ({ label: GENERIC_STAGE_LABELS[i] || `Etapa ${i + 1}`, value: v }));
  };
  const rowConvLabels = (ch) => {
    const labels = ch.funnel_stage_labels;
    return labels && labels.length >= 2
      ? labels.slice(0, -1).map((l, i) => `${l} → ${labels[i + 1]}`)
      : GENERIC_RATE_LABELS;
  };

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ReversePlanRecord.delete(record.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-plans'] });
      toast({ title: 'Planejamento excluído.' });
      onBack();
    },
  });

  const buildFunnelStagesView = (rates, labels, base = 100) => {
    const lbls = labels && labels.length >= 2 ? labels : GENERIC_STAGE_LABELS;
    const stages = [{ label: lbls[0], value: Math.round(base) }];
    let cur = base;
    (rates || []).forEach((r, i) => {
      cur = cur * (r || 0);
      stages.push({ label: lbls[i + 1] || `Etapa ${i + 2}`, value: Math.round(cur) });
    });
    return stages;
  };

  return (
    <div>
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        title="Excluir planejamento?"
        message="O planejamento será removido permanentemente. Esta ação não pode ser desfeita."
        onConfirm={() => { setShowDeleteConfirm(false); deleteMutation.mutate(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{record.title || cname}</h2>
            <p className="text-sm text-gray-500">{cname}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => exportReversePlanToPdf({
                clientName: cname,
                planTitle: record.title,
                targetRevenue: record.target_revenue,
                result,
              })}
            >
              <FileDown className="w-4 h-4" /> Exportar PDF
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} disabled={deleteMutation.isPending} className="text-red-500 border-red-200 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {result?.channel_budgets?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-secondary-foreground" />
            <span className="text-xs font-semibold text-secondary-foreground">Dados do Funil por Canal</span>
          </div>
          <div className="space-y-3">
            {result.channel_budgets.map((ch, i) => {
              const conv = rowConvLabels(ch);
              return (
                <div key={i} className="pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <ChannelBadge channel={ch.channel_name} />
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs font-medium text-gray-600">{ch.objective_name || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs pl-1">
                    <div>
                      <p className="text-gray-400">Ticket Médio</p>
                      <p className="font-semibold text-gray-800">{fmt(ch.average_ticket || 0)}</p>
                    </div>
                    {(ch.conversion_rates || []).map((r, ri) => (
                      <div key={ri}>
                        <p className="text-gray-400">{conv[ri] || `Taxa ${ri + 1}`}</p>
                        <p className="font-semibold text-gray-800">{fmtPct(r)}</p>
                      </div>
                    ))}
                  </div>
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
            <StatCard label="Investimento Necessário" value={fmt(result.total_with_tax || result.total_investment)} sublabel={result.total_tax ? `Inclui ${fmt(result.total_tax)} em impostos` : ''} icon={DollarSign} color="blue" />
            <StatCard label="Leads Necessários" value={result.required_leads.toLocaleString()} icon={Users} color="purple" />
            <StatCard label="Vendas Necessárias" value={result.required_sales.toLocaleString()} icon={Target} color="orange" />
            <StatCard label="Meta de Receita" value={fmt(record.target_revenue)} icon={TrendingDown} color="green" />
          </div>

          {result.channel_budgets?.filter(ch => ch.stage_values?.length > 0).length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Projeção do Funil por Canal</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {result.channel_budgets.filter(ch => ch.stage_values?.length > 0).map((ch, i) => {
                  const stages = rowFunnelStages(ch);
                  const hasBench = (ch.benchmark_rates || []).length > 0 && (ch.benchmark_cpl || 0) > 0;
                  const benchLead = hasBench ? (ch.required_budget || 0) / ch.benchmark_cpl : (ch.stage_values[0] || 0);
                  const benchmarkStages = hasBench
                    ? buildFunnelStagesView(ch.benchmark_rates, ch.funnel_stage_labels, benchLead)
                    : null;
                  return (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <ChannelBadge channel={ch.channel_name} />
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs font-medium text-gray-600">{ch.objective_name}</span>
                      </div>
                      <FunnelVisual stages={stages} benchmarkStages={benchmarkStages} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.channel_budgets?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Resultado por Canal</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left py-2.5 px-4 font-medium text-gray-500">Canal</th>
                      <th className="text-left py-2.5 px-4 font-medium text-gray-500">Objetivo</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">%</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">CPL</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Leads</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Vendas</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Budget</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Imposto</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Total c/ Imp.</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">ROAS</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">CAC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.channel_budgets.map((ch, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-4"><ChannelBadge channel={ch.channel_name} /></td>
                        <td className="py-2.5 px-4 text-gray-600">{ch.objective_name || '—'}</td>
                        <td className="py-2.5 px-4 text-right">{ch.percent}%</td>
                        <td className="py-2.5 px-4 text-right">R${ch.expected_cpl}</td>
                        <td className="py-2.5 px-4 text-right">{ch.required_leads.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right">{ch.required_sales?.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{fmt(ch.required_budget)}</td>
                        <td className="py-2.5 px-4 text-right">{ch.tax_value ? fmt(ch.tax_value) : '—'}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{fmt(ch.total_with_tax)}</td>
                        <td className="py-2.5 px-4 text-right">{ch.roas ? `${ch.roas.toFixed(2)}x` : '—'}</td>
                        <td className="py-2.5 px-4 text-right">{ch.cac ? fmt(ch.cac) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                      <td className="py-3 px-4" colSpan={4}>Total</td>
                      <td className="py-3 px-4 text-right">{result.required_leads.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{result.required_sales?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{fmt(result.total_investment)}</td>
                      <td className="py-3 px-4 text-right">{result.total_tax ? fmt(result.total_tax) : '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmt(result.total_with_tax)}</td>
                      <td className="py-3 px-4 text-right">{result.total_roas ? `${result.total_roas.toFixed(2)}x` : '—'}</td>
                      <td className="py-3 px-4 text-right">{result.total_cac ? fmt(result.total_cac) : '—'}</td>
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
function PlanNew({ clients, funnelTypes, objectives, benchmarks, onSave, onBack }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [title, setTitle] = useState('');
  const [targetRevenue, setTargetRevenue] = useState(0);
  const [distribution, setDistribution] = useState([]);
  const [result, setResult] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [deleteRowIdx, setDeleteRowIdx] = useState(null);

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => base44.entities.Channel.list(),
  });
  const activeChannels = channels.filter(c => c.is_active);

  const sortedClients = [...clients].sort((a, b) =>
    (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR')
  );
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Resolve os dados de um objetivo para uma linha (taxas, ticket, labels, CPL)
  // Benchmark vem da chave: funil + canal + objetivo
  const resolveObjectiveForRow = (objectiveId, channelName) => {
    const obj = objectives.find(o => o.id === objectiveId);
    if (!obj) return {};
    const funnelType = obj.funnel_type_id ? funnelTypes.find(f => f.id === obj.funnel_type_id) : null;
    const stageLabels = funnelType?.stages?.length >= 2 ? funnelType.stages.map(s => s.label) : null;
    const bm = findBenchmark({
      benchmarks,
      funnelTypeId: obj.funnel_type_id,
      channelName,
      objectiveId,
    });
    let rates = getRatesFromBenchmark(bm);
    const benchmarkRates = [...rates];
    if (rates.length === 0) rates = [0.3, 0.5, 0.5];
    return {
      objective_name: obj.name,
      objective_type: obj.type,
      funnel_type_id: obj.funnel_type_id || '',
      funnel_stage_labels: stageLabels,
      conversion_rates: rates,
      benchmark_rates: benchmarkRates,
      average_ticket: selectedClient?.average_ticket || 0,
      expected_cpl: getCplFromBenchmark(bm),
      benchmark_cpl: getCplFromBenchmark(bm),
    };
  };

  // Pré-popula com os canais ativos (split igual) ao selecionar cliente
  useEffect(() => {
    if (!selectedClientId) { setDistribution([]); setTitle(''); setTargetRevenue(0); setResult(null); return; }
    setTitle(''); setTargetRevenue(0); setResult(null);
    if (activeChannels.length > 0) {
      const equal = Math.round(100 / activeChannels.length);
      setDistribution(activeChannels.map((ch, i) => ({
        channel_name: ch.name,
        objective_id: '',
        objective_name: '',
        percent: i === activeChannels.length - 1 ? 100 - equal * (activeChannels.length - 1) : equal,
        expected_cpl: 0,
        tax_percent: 0,
        conversion_rates: [],
        average_ticket: 0,
        funnel_stage_labels: null,
      })));
    } else {
      setDistribution([]);
    }
  }, [selectedClientId, activeChannels.length]);

  const objectivesForChannel = (channelName) =>
    objectives.filter(o => o.is_active !== false && (!o.channels?.length || o.channels.includes(channelName)));

  const setChannelForRow = (idx, channelName) => {
    setDistribution(d => d.map((r, i) => {
      if (i !== idx) return r;
      const obj = r.objective_id ? objectives.find(o => o.id === r.objective_id) : null;
      const stillApplies = obj && (!obj.channels?.length || obj.channels.includes(channelName));
      return {
        ...r,
        channel_name: channelName,
        expected_cpl: 0,
        objective_id: stillApplies ? r.objective_id : '',
        objective_name: stillApplies ? r.objective_name : '',
        conversion_rates: stillApplies ? r.conversion_rates : [],
        average_ticket: stillApplies ? r.average_ticket : 0,
        funnel_stage_labels: stillApplies ? r.funnel_stage_labels : null,
      };
    }));
    setResult(null);
  };

  const setObjectiveForRow = (idx, objectiveId) => {
    setDistribution(d => d.map((r, i) => {
      if (i !== idx) return r;
      const resolved = resolveObjectiveForRow(objectiveId, r.channel_name);
      return { ...r, objective_id: objectiveId, ...resolved };
    }));
    setResult(null);
  };

  const handleDistChange = (idx, field, value) => {
    setDistribution(d => d.map((r, i) => i === idx ? { ...r, [field]: Number(value) } : r));
    setResult(null);
  };

  const updateRowRate = (idx, ri, v) => {
    setDistribution(d => d.map((r, i) => i === idx ? { ...r, conversion_rates: (r.conversion_rates || []).map((x, j) => j === ri ? v : x) } : r));
    setResult(null);
  };
  const updateRowTicket = (idx, v) => {
    setDistribution(d => d.map((r, i) => i === idx ? { ...r, average_ticket: v || 0 } : r));
    setResult(null);
  };

  const addChannel = () => {
    setDistribution(d => [...d, {
      channel_name: '', objective_id: '', objective_name: '',
      percent: 0, expected_cpl: 0, tax_percent: 0,
      conversion_rates: [], average_ticket: 0, funnel_stage_labels: null,
    }]);
    setResult(null);
  };

  const toggleRowExpand = (idx) => setExpandedRows(e => ({ ...e, [idx]: !e[idx] }));

  const fmt = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;
  const totalPercent = distribution.reduce((s, r) => s + (Number(r.percent) || 0), 0);
  const canCalculate = targetRevenue > 0
    && distribution.length > 0
    && Math.abs(totalPercent - 100) < 0.01
    && distribution.every(r => r.channel_name && r.objective_id && r.expected_cpl > 0 && r.average_ticket > 0 && (r.conversion_rates?.length || 0) > 0);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ReversePlanRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-plans'] });
      toast({ title: 'Planejamento salvo!' });
      onSave();
    },
  });

  const handleSave = () => {
    const cname = selectedClient?.clinic_name || '';
    const calc = calculateReversePlan(targetRevenue, distribution);
    const firstRow = distribution[0] || {};
    saveMutation.mutate({
      client_id: selectedClientId,
      client_name: cname,
      title: title || `Planejamento — ${cname}`,
      target_revenue: targetRevenue,
      average_ticket: firstRow.average_ticket || 0,
      conversion_rates: firstRow.conversion_rates || [],
      funnel_stage_labels: firstRow.funnel_stage_labels || null,
      distribution,
      result: calc,
    });
  };

  const rowConversionLabels = (row) => {
    const labels = row.funnel_stage_labels;
    return labels && labels.length >= 2
      ? labels.slice(0, -1).map((l, i) => `${l} → ${labels[i + 1]}`)
      : GENERIC_RATE_LABELS;
  };

  // Monta as etapas do funil (volumes) a partir de taxas, usando base 100 leads,
  // para comparar projeção do cliente x benchmark no gráfico.
  const buildFunnelStages = (rates, labels, base = 100) => {
    const lbls = labels && labels.length >= 2 ? labels : GENERIC_STAGE_LABELS;
    const stages = [{ label: lbls[0], value: Math.round(base) }];
    let cur = base;
    (rates || []).forEach((r, i) => {
      cur = cur * (r || 0);
      stages.push({ label: lbls[i + 1] || `Etapa ${i + 2}`, value: Math.round(cur) });
    });
    return stages;
  };

  return (
    <div>
      <ConfirmDeleteDialog
        open={deleteRowIdx !== null}
        title="Remover canal?"
        message="O canal será removido da distribuição. Esta ação não pode ser desfeita."
        onConfirm={() => { setDistribution(d => d.filter((_, i) => i !== deleteRowIdx)); setResult(null); setDeleteRowIdx(null); }}
        onCancel={() => setDeleteRowIdx(null)}
      />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Novo Planejamento Reverso</h2>
            <p className="text-sm text-gray-500">Cada canal tem seu próprio objetivo e suas próprias metas</p>
          </div>
        </div>
        {result && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => exportReversePlanToPdf({
                clientName: selectedClient?.clinic_name,
                planTitle: title,
                targetRevenue,
                result,
              })}
              variant="outline"
              className="gap-2"
            >
              <FileDown className="w-4 h-4" /> Exportar PDF
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2 bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="mb-5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Título (opcional)</Label>
          <input
            className="mt-2 w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: Planejamento Semestral 2026.2"
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
          <>
            <div className="mb-5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Meta de Receita (R$)</Label>
              <div className="mt-2 max-w-xs">
                <CurrencyInput value={targetRevenue} onChange={v => setTargetRevenue(v || 0)} prefix="R$" placeholder="0" />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Distribuição por Canal</Label>
                <span className={`text-[11px] font-medium ${Math.abs(totalPercent - 100) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                  Total: {totalPercent}%
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">Selecione um objetivo para cada canal. As taxas e o ticket vêm do funil do objetivo — edite para simular cenários.</p>

              {activeChannels.length === 0 ? (
                <p className="text-sm text-gray-400 py-3">Nenhum canal ativo cadastrado. Cadastre canais em Config. Campanhas.</p>
              ) : (
                <div className="space-y-2">
                  <div className="hidden lg:grid grid-cols-[1.2fr_1.4fr_0.8fr_1fr_0.8fr_32px_32px] gap-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider px-1">
                    <span>Canal</span><span>Objetivo</span><span>% Budget</span><span>CPL (R$)</span><span>Imposto %</span><span></span><span></span>
                  </div>
                  {distribution.map((row, idx) => {
                    const isExpanded = expandedRows[idx];
                    const convLabels = rowConversionLabels(row);
                    const hasObjective = !!row.objective_id;
                    return (
                      <div key={idx} className="border border-gray-100 rounded-lg overflow-hidden" style={{ borderLeft: `4px solid ${channelAccent(row.channel_name)}` }}>
                        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.4fr_0.8fr_1fr_0.8fr_32px_32px] gap-2 items-center p-2 transition-colors" style={{ backgroundColor: channelAccent(row.channel_name) + (isExpanded ? '22' : '12') }}>
                          <Select value={row.channel_name || undefined} onValueChange={v => setChannelForRow(idx, v)}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Canal..." /></SelectTrigger>
                            <SelectContent>
                              {activeChannels.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={row.objective_id || 'none'} onValueChange={v => setObjectiveForRow(idx, v === 'none' ? '' : v)} disabled={!row.channel_name}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um objetivo..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Nenhum —</SelectItem>
                              {objectivesForChannel(row.channel_name).map(obj => (
                                <SelectItem key={obj.id} value={obj.id}>
                                  {obj.name} ({obj.type === 'branding' ? 'Branding' : 'Performance'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <CurrencyInput value={row.percent} onChange={v => handleDistChange(idx, 'percent', v)} className="text-xs" placeholder="%" />
                          <CurrencyInput value={row.expected_cpl} onChange={v => handleDistChange(idx, 'expected_cpl', v)} prefix="R$" className="text-xs" placeholder="CPL" />
                          <PercentInput value={row.tax_percent || 0} onChange={v => handleDistChange(idx, 'tax_percent', v)} className="text-xs h-9" />
                          <button onClick={() => toggleRowExpand(idx)} disabled={!hasObjective}
                            className={`p-1.5 rounded-md ${hasObjective ? 'hover:bg-gray-100 text-gray-400' : 'text-gray-200 cursor-not-allowed'}`} title="Editar funil">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setDeleteRowIdx(idx)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {hasObjective && isExpanded && (
                          <div className="px-3 py-3 bg-secondary/30 border-t border-gray-100">
                            <div className="flex items-center gap-2 mb-3">
                              <Info className="w-3.5 h-3.5 text-secondary-foreground" />
                              <span className="text-[11px] font-semibold text-secondary-foreground">Dados do Funil — {row.objective_name}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                              <div>
                                <p className="text-gray-400 mb-1">Ticket Médio</p>
                                <CurrencyInput value={row.average_ticket} onChange={v => updateRowTicket(idx, v)} prefix="R$" className="text-xs h-9" placeholder="0" />
                              </div>
                              {(row.conversion_rates || []).map((r, ri) => (
                                <div key={ri}>
                                  <p className="text-gray-400 mb-1">{convLabels[ri] || `Taxa ${ri + 1}`}</p>
                                  <PercentInput value={r} onChange={v => updateRowRate(idx, ri, v)} className="text-xs" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-3">
                <Button variant="outline" onClick={addChannel} className="gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Adicionar Canal
                </Button>
                <Button
                  onClick={() => setResult(calculateReversePlan(targetRevenue, distribution))}
                  className="gap-2 bg-primary hover:bg-primary/90"
                  disabled={!canCalculate}
                >
                  <Calculator className="w-4 h-4" /> Calcular
                </Button>
                {!canCalculate && distribution.length > 0 && (
                  <span className="text-[11px] text-gray-400 self-center">
                    {Math.abs(totalPercent - 100) >= 0.01 ? 'A soma dos % deve ser 100.' : 'Selecione um objetivo em cada canal.'}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <StatCard label="Investimento Necessário" value={fmt(result.total_with_tax || result.total_investment)} sublabel={result.total_tax ? `Inclui ${fmt(result.total_tax)} em impostos` : ''} icon={DollarSign} color="blue" />
            <StatCard label="Leads Necessários" value={result.required_leads.toLocaleString()} icon={Users} color="purple" />
            <StatCard label="Vendas Necessárias" value={result.required_sales.toLocaleString()} icon={Target} color="orange" />
            <StatCard label="Meta de Receita" value={fmt(targetRevenue)} icon={TrendingDown} color="green" />
          </div>

          {result.channel_budgets?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Resultado por Canal</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left py-2.5 px-4 font-medium text-gray-500">Canal</th>
                      <th className="text-left py-2.5 px-4 font-medium text-gray-500">Objetivo</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">%</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">CPL</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Leads</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Vendas</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Inv. Líquido</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Imposto</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Inv. Bruto</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">Valor em Vendas</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">ROAS</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-500">CAC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.channel_budgets.map((ch, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-4"><ChannelBadge channel={ch.channel_name} /></td>
                        <td className="py-2.5 px-4 text-gray-600">{ch.objective_name || '—'}</td>
                        <td className="py-2.5 px-4 text-right">{ch.percent}%</td>
                        <td className="py-2.5 px-4 text-right">R${ch.expected_cpl}</td>
                        <td className="py-2.5 px-4 text-right">{ch.required_leads.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right">{ch.required_sales.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{fmt(ch.required_budget)}</td>
                        <td className="py-2.5 px-4 text-right">{ch.tax_value ? fmt(ch.tax_value) : '—'}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{fmt(ch.total_with_tax)}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-green-700">{fmt(ch.revenue)}</td>
                        <td className="py-2.5 px-4 text-right">{ch.roas ? `${ch.roas.toFixed(2)}x` : '—'}</td>
                        <td className="py-2.5 px-4 text-right">{ch.cac ? fmt(ch.cac) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                      <td className="py-3 px-4" colSpan={4}>Total</td>
                      <td className="py-3 px-4 text-right">{result.required_leads.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{result.required_sales.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{fmt(result.total_investment)}</td>
                      <td className="py-3 px-4 text-right">{result.total_tax ? fmt(result.total_tax) : '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmt(result.total_with_tax)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-700">{fmt(result.total_revenue)}</td>
                      <td className="py-3 px-4 text-right">{result.total_roas ? `${result.total_roas.toFixed(2)}x` : '—'}</td>
                      <td className="py-3 px-4 text-right">{result.total_cac ? fmt(result.total_cac) : '—'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Projeção do funil por canal (metrinhas separadas) */}
          {result.channel_budgets?.filter(ch => ch.stage_values?.length > 0).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Projeção do Funil por Canal</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {result.channel_budgets.filter(ch => ch.stage_values?.length > 0).map((ch, i) => {
                  const stages = (ch.funnel_stage_labels && ch.funnel_stage_labels.length === ch.stage_values.length)
                    ? ch.funnel_stage_labels.map((l, k) => ({ label: l, value: ch.stage_values[k] }))
                    : ch.stage_values.map((v, k) => ({ label: GENERIC_STAGE_LABELS[k] || `Etapa ${k + 1}`, value: v }));
                  const hasBench = (ch.benchmark_rates || []).length > 0 && (ch.benchmark_cpl || 0) > 0;
                  // benchLead = leads que o canal geraria com o benchmark CPL, sobre o mesmo budget líquido
                  const benchLead = hasBench ? (ch.required_budget || 0) / ch.benchmark_cpl : 0;
                  const benchmarkStages = hasBench
                    ? buildFunnelStages(ch.benchmark_rates, ch.funnel_stage_labels, benchLead)
                    : null;
                  return (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <ChannelBadge channel={ch.channel_name} />
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs font-medium text-gray-600">{ch.objective_name}</span>
                      </div>
                      <FunnelVisual stages={stages} benchmarkStages={benchmarkStages} />
                    </div>
                  );
                })}
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

  const { data: records = [] } = useQuery({
    queryKey: ['reverse-plans'],
    queryFn: () => base44.entities.ReversePlanRecord.list('-created_date'),
  });

  const { data: funnelTypes = [] } = useQuery({
    queryKey: ['funnel-types'],
    queryFn: () => base44.entities.FunnelType.list(),
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ['campaign-objectives'],
    queryFn: () => base44.entities.CampaignObjective.filter({ is_active: true }),
  });

  const { data: benchmarks = [] } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => base44.entities.Benchmark.list(),
  });

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
      <PageHeader title="Planejamento Reverso" description="Calcule o investimento necessário para atingir suas metas de receita — independente do plano de mídia." />

      {view === 'list' && (
        <PlanList
          records={records}
          clients={clients}
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
          funnelTypes={funnelTypes}
          objectives={objectives}
          benchmarks={benchmarks}
          onSave={() => {}}
          onBack={() => setView('list')}
        />
      )}
    </div>
  );
}