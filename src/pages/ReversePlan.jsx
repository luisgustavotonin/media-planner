import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import { useUserAccess } from '../components/hooks/useUserAccess';
import { calculateReversePlan } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import StatCard from '../components/ui-custom/StatCard';
import ChannelBadge from '../components/ui-custom/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CurrencyInput from '../components/ui-custom/CurrencyInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, DollarSign, Users, TrendingDown, Calculator, Plus, Trash2, Info } from 'lucide-react';

const CHANNEL_OPTIONS = ['Meta', 'Google', 'TikTok', 'YouTube', 'LinkedIn', 'Outro'];
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function ReversePlan() {
  const { user } = useAuth();
  const { filterClientsByAccess } = useUserAccess();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [targetRevenue, setTargetRevenue] = useState(0);
  const [distribution, setDistribution] = useState([]);
  const [result, setResult] = useState(null);

  const { data: allClients = [] } = useQuery({
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

  const myClients = filterClientsByAccess(allClients);
  const myPlans = plans.filter(p => myClients.some(c => c.id === p.client_id));

  const clientPlans = myPlans.filter(p => p.client_id === selectedClientId);
  const selectedPlan = myPlans.find(p => p.id === selectedPlanId);

  // Quando troca cliente, limpa plano e resultado
  useEffect(() => {
    setSelectedPlanId('');
    setResult(null);
    setDistribution([]);
  }, [selectedClientId]);

  // Quando seleciona plano, pré-popula canais do plano
  useEffect(() => {
    if (!selectedPlan) return;
    setResult(null);
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
  }, [selectedPlanId]);

  // Taxas e ticket do plano selecionado
  const planRates = selectedPlan
    ? (Array.isArray(selectedPlan.conversion_rates) && selectedPlan.conversion_rates.length
        ? selectedPlan.conversion_rates
        : [
            selectedPlan.lead_to_appointment_rate || 0,
            selectedPlan.appointment_to_show_rate || 0,
            selectedPlan.show_to_sale_rate || 0,
          ])
    : [];
  const planTicket = selectedPlan?.average_ticket || 0;

  const handleDistChange = (idx, field, value) => {
    setDistribution(d => d.map((ch, i) => i === idx ? { ...ch, [field]: Number(value) } : ch));
  };

  const addChannel = () => {
    setDistribution(d => [...d, { channel_name: 'Meta', percent: 0, expected_cpl: 0 }]);
  };

  const removeChannel = (idx) => {
    setDistribution(d => d.filter((_, i) => i !== idx));
  };

  const handleCalculate = () => {
    setResult(calculateReversePlan(targetRevenue, planTicket, planRates, distribution));
  };

  const fmt = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;
  const fmtPct = v => `${(v * 100).toFixed(1)}%`;
  const canCalculate = selectedPlanId && targetRevenue > 0 && distribution.length > 0 && planTicket > 0;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader title="Planejamento Reverso" description="Selecione um cliente e plano de mídia para calcular o investimento necessário." />

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        {/* Passo 1: Cliente */}
        <div className="mb-5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">1. Selecione o Cliente</Label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="mt-2 max-w-sm">
              <SelectValue placeholder="Selecione um cliente..." />
            </SelectTrigger>
            <SelectContent>
              {myClients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Passo 2: Plano */}
        {selectedClientId && (
          <div className="mb-5">
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">2. Selecione o Plano de Mídia</Label>
            {clientPlans.length === 0 ? (
              <p className="text-sm text-gray-400 mt-2">Este cliente não possui planos de mídia cadastrados.</p>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="mt-2 max-w-sm">
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
          </div>
        )}

        {/* Dados do funil do plano selecionado */}
        {selectedPlan && (
          <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-700">Dados do Funil — {selectedPlan.funnel_type_name || 'Funil do Plano'}</span>
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

        {/* Meta de receita + canais */}
        {selectedPlanId && (
          <>
            <div className="mb-5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">3. Meta de Receita (R$)</Label>
              <div className="mt-2 max-w-xs">
                <CurrencyInput value={targetRevenue} onChange={v => setTargetRevenue(v || 0)} prefix="R$" />
              </div>
            </div>

            <div className="mb-4">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 block">4. Distribuição por Canal</Label>
              {distribution.length === 0 ? (
                <p className="text-sm text-gray-400 mb-3">Nenhum canal. Clique em "Adicionar Canal" para começar.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider px-1">
                    <span>Canal</span><span>% do Budget</span><span>CPL (R$)</span><span></span>
                  </div>
                  {distribution.map((ch, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-3 items-center">
                      <Select value={ch.channel_name} onValueChange={v => handleDistChange(idx, 'channel_name', v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHANNEL_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <CurrencyInput value={ch.percent} onChange={v => handleDistChange(idx, 'percent', v)} className="text-xs" placeholder="%" />
                      <CurrencyInput value={ch.expected_cpl} onChange={v => handleDistChange(idx, 'expected_cpl', v)} prefix="R$" className="text-xs" placeholder="CPL" />
                      <button onClick={() => removeChannel(idx)} className="p-1.5 rounded-md hover:bg-red-50 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={addChannel} className="gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Adicionar Canal
                </Button>
                <Button onClick={handleCalculate} className="gap-2 bg-blue-600 hover:bg-blue-700" disabled={!canCalculate}>
                  <Calculator className="w-4 h-4" /> Calcular Planejamento Reverso
                </Button>
              </div>
            </div>
          </>
        )}

        {!selectedClientId && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
            Selecione um cliente para começar
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Investimento Necessário" value={fmt(result.total_investment)} icon={DollarSign} color="blue" />
            <StatCard label="Leads Necessários" value={result.required_leads.toLocaleString()} icon={Users} color="purple" />
            <StatCard label="Vendas Necessárias" value={result.required_sales.toLocaleString()} icon={Target} color="orange" />
            <StatCard label="Meta de Receita" value={fmt(targetRevenue)} icon={TrendingDown} color="green" />
          </div>

          {result.required_appointments > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Projeção do Funil</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Leads', value: result.required_leads },
                  { label: 'Agendamentos', value: result.required_appointments },
                  { label: 'Comparecimentos', value: result.required_showups },
                  { label: 'Vendas', value: result.required_sales },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 mb-1">{item.label}</p>
                    <p className="text-lg font-bold text-gray-800">{Number(item.value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
                    <th className="text-right py-2.5 px-4 font-medium text-gray-500">Leads Necessários</th>
                    <th className="text-right py-2.5 px-4 font-medium text-gray-500">Budget Necessário</th>
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
                    <td className="py-3 px-4"></td>
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