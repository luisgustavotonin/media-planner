import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import { calculateReversePlan } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import StatCard from '../components/ui-custom/StatCard';
import ChannelBadge from '../components/ui-custom/ChannelBadge';
import FunnelVisual from '../components/ui-custom/FunnelVisual';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CurrencyInput from '../components/ui-custom/CurrencyInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, DollarSign, Users, TrendingDown, Calculator, Plus, Trash2, Info, Save, ArrowLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CHANNEL_OPTIONS = ['Meta', 'Google', 'TikTok', 'YouTube', 'LinkedIn', 'Outro'];
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function PlanList({ records, clients, onSelect, onCreate }) {
  const [filterClient, setFilterClient] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const sortedClients = [...clients].sort((a, b) => (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR'));

  const filtered = records.filter(r => {
    if (filterClient && r.client_id !== filterClient) return false;
    if (filterMonth && r.plan_label !== filterMonth) return false;
    return true;
  });

  const allMonths = [...new Set(records.map(r => r.plan_label).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Planejamentos Salvos</h2>
          <p className="text-sm text-gray-500">{records.length} planejamento(s) reverso(s)</p>
        </div>
        <Button onClick={onCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo Planejamento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Todos os clientes</SelectItem>
            {sortedClients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {allMonths.length > 0 && (
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Todos os meses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos os meses</SelectItem>
              {allMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum planejamento reverso salvo</p>
          <p className="text-gray-400 text-sm mt-1">Crie seu primeiro planejamento para começar</p>
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
                className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.title || cname}</p>
                    <p className="text-xs text-gray-400">{cname} {r.plan_label ? `· ${r.plan_label}` : ''}</p>
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
    </div>
  );
}

function PlanForm({ editRecord, clients, plans, onSave, onDelete, onBack }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState(editRecord?.client_id || '');
  const [selectedPlanId, setSelectedPlanId] = useState(editRecord?.plan_id || '');
  const [title, setTitle] = useState(editRecord?.title || '');
  const [targetRevenue, setTargetRevenue] = useState(editRecord?.target_revenue || 0);
  const [distribution, setDistribution] = useState(editRecord?.distribution || []);
  const [result, setResult] = useState(() => {
    // Auto-calculate on open if we have saved data
    if (editRecord?.result) return editRecord.result;
    return null;
  });

  const clientPlans = plans.filter(p => p.client_id === selectedClientId);
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const sortedClients = [...clients].sort((a, b) => (a.clinic_name || '').localeCompare(b.clinic_name || '', 'pt-BR'));

  useEffect(() => {
    setSelectedPlanId('');
    setDistribution([]);
    setResult(null);
  }, [selectedClientId]);

  // Auto-calculate when editing a saved record that has all data but no result
  useEffect(() => {
    if (editRecord && editRecord.distribution?.length > 0 && editRecord.target_revenue > 0 && !result) {
      const rates = editRecord.conversion_rates || [];
      const ticket = editRecord.average_ticket || 0;
      if (ticket > 0 && rates.length > 0) {
        setResult(calculateReversePlan(editRecord.target_revenue, ticket, rates, editRecord.distribution));
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedPlan || editRecord) return;
    if (selectedPlan.channels?.length > 0) {
      const totalBudget = selectedPlan.channels.reduce((s, c) => s + (c.budget_value || 0), 0);
      setDistribution(selectedPlan.channels.map(ch => ({
        channel_name: ch.channel_name,
        percent: totalBudget > 0 ? Math.round((ch.budget_value / totalBudget) * 100) : 0,
        expected_cpl: ch.expected_cpl || 0,
      })));
    }
  }, [selectedPlanId]);

  const planRates = selectedPlan
    ? (Array.isArray(selectedPlan.conversion_rates) && selectedPlan.conversion_rates.length
        ? selectedPlan.conversion_rates
        : [selectedPlan.lead_to_appointment_rate || 0, selectedPlan.appointment_to_show_rate || 0, selectedPlan.show_to_sale_rate || 0])
    : (editRecord?.conversion_rates || []);

  const planTicket = selectedPlan?.average_ticket || editRecord?.average_ticket || 0;

  const saveMutation = useMutation({
    mutationFn: (data) => editRecord
      ? base44.entities.ReversePlanRecord.update(editRecord.id, data)
      : base44.entities.ReversePlanRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-plans'] });
      toast({ title: 'Planejamento salvo!', description: 'Dados salvos com sucesso.' });
      onSave();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ReversePlanRecord.delete(editRecord.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-plans'] });
      toast({ title: 'Planejamento excluído.' });
      onBack();
    },
  });

  const handleDistChange = (idx, field, value) => {
    setDistribution(d => d.map((ch, i) => i === idx ? { ...ch, [field]: Number(value) } : ch));
  };

  const handleCalculate = () => {
    const r = calculateReversePlan(targetRevenue, planTicket, planRates, distribution);
    setResult(r);
  };

  const handleSave = () => {
    const cname = clients.find(c => c.id === selectedClientId)?.clinic_name || '';
    const planLabel = selectedPlan
      ? `${MESES_SHORT[(selectedPlan.period_month || 1) - 1]}/${selectedPlan.period_year}`
      : '';
    saveMutation.mutate({
      client_id: selectedClientId || editRecord?.client_id,
      client_name: cname || editRecord?.client_name,
      plan_id: selectedPlanId || editRecord?.plan_id,
      plan_label: planLabel || editRecord?.plan_label,
      title: title || `Planejamento — ${cname}`,
      target_revenue: targetRevenue,
      average_ticket: planTicket,
      conversion_rates: planRates,
      distribution,
      result,
    });
  };

  const fmt = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;
  const fmtPct = v => `${(v * 100).toFixed(1)}%`;
  const canCalculate = (selectedPlanId || editRecord?.plan_id) && targetRevenue > 0 && distribution.length > 0 && planTicket > 0;

  const funnelStages = result ? [
    { label: 'Leads', value: result.required_leads },
    ...(result.required_appointments > 0 ? [{ label: 'Agendamentos', value: result.required_appointments }] : []),
    ...(result.required_showups > 0 ? [{ label: 'Comparecimentos', value: result.required_showups }] : []),
    { label: 'Vendas', value: result.required_sales },
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{editRecord ? 'Editar Planejamento' : 'Novo Planejamento Reverso'}</h2>
            <p className="text-sm text-gray-500">Calcule o investimento necessário para atingir sua meta</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editRecord && (
            <Button variant="outline" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="text-red-500 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={handleSave} disabled={saveMutation.isPending || !selectedClientId} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        {/* Título */}
        <div className="mb-5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Título (opcional)</Label>
          <input
            className="mt-2 w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Meta Q3 2026"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Cliente */}
        {!editRecord && (
          <div className="mb-5">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">1. Selecione o Cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="mt-2 max-w-sm"><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
              <SelectContent>
                {sortedClients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Plano */}
        {(selectedClientId || editRecord) && !editRecord && (
          <div className="mb-5">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">2. Selecione o Plano de Mídia (opcional)</Label>
            {clientPlans.length === 0 ? (
              <p className="text-sm text-gray-400 mt-2">Este cliente não possui planos de mídia.</p>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="mt-2 max-w-sm"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
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

        {/* Dados do funil */}
        {(selectedPlan || editRecord?.conversion_rates?.length > 0) && planTicket > 0 && (
          <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-700">Dados do Funil</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-gray-400">Ticket Médio</p>
                <p className="font-semibold text-gray-800">{fmt(planTicket)}</p>
              </div>
              {planRates.map((r, i) => {
                const labels = ['Lead → Agend.', 'Agend. → Compar.', 'Compar. → Venda'];
                return (
                  <div key={i}>
                    <p className="text-gray-400">{labels[i] || `Taxa ${i + 1}`}</p>
                    <p className="font-semibold text-gray-800">{fmtPct(r)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Meta + Canais */}
        {(selectedClientId || editRecord) && (
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
                <Button onClick={handleCalculate} className="gap-2 bg-blue-600 hover:bg-blue-700" disabled={!canCalculate}>
                  <Calculator className="w-4 h-4" /> Calcular
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Resultados */}
      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <StatCard label="Investimento Necessário" value={fmt(result.total_investment)} icon={DollarSign} color="blue" />
            <StatCard label="Leads Necessários" value={result.required_leads.toLocaleString()} icon={Users} color="purple" />
            <StatCard label="Vendas Necessárias" value={result.required_sales.toLocaleString()} icon={Target} color="orange" />
            <StatCard label="Meta de Receita" value={fmt(targetRevenue)} icon={TrendingDown} color="green" />
          </div>

          {funnelStages.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Projeção do Funil</h3>
              <FunnelVisual stages={funnelStages} />
            </div>
          )}

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
        </>
      )}
    </div>
  );
}

export default function ReversePlan() {
  const [view, setView] = useState('list'); // 'list' | 'new' | 'edit'
  const [editRecord, setEditRecord] = useState(null);

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

  const { data: records = [] } = useQuery({
    queryKey: ['reverse-plans'],
    queryFn: () => base44.entities.ReversePlanRecord.list('-created_date'),
  });

  const handleSelect = (r) => { setEditRecord(r); setView('edit'); };
  const handleCreate = () => { setEditRecord(null); setView('new'); };
  const handleBack = () => { setEditRecord(null); setView('list'); };

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto w-full">
      <PageHeader title="Planejamento Reverso" description="Calcule o investimento necessário para atingir suas metas de receita." />

      {view === 'list' && (
        <PlanList records={records} clients={clients} onSelect={handleSelect} onCreate={handleCreate} />
      )}
      {(view === 'new' || view === 'edit') && (
        <PlanForm
          editRecord={editRecord}
          clients={clients}
          plans={plans}
          onSave={handleBack}
          onDelete={handleBack}
          onBack={handleBack}
        />
      )}
    </div>
  );
}