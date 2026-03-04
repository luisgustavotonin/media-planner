import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import { calculateReversePlan } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import StatCard from '../components/ui-custom/StatCard';
import ChannelBadge from '../components/ui-custom/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, DollarSign, Users, TrendingDown, Calculator } from 'lucide-react';

const DEFAULT_DIST = [
  { channel_name: 'Meta', percent: 50, expected_cpl: 40 },
  { channel_name: 'Google', percent: 30, expected_cpl: 60 },
  { channel_name: 'TikTok', percent: 10, expected_cpl: 25 },
  { channel_name: 'YouTube', percent: 10, expected_cpl: 50 },
];

export default function ReversePlan() {
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [targetRevenue, setTargetRevenue] = useState(100000);
  const [distribution, setDistribution] = useState(DEFAULT_DIST);
  const [result, setResult] = useState(null);

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });
  const { data: benchmarks = [] } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => base44.entities.Benchmark.list(),
  });

  const myPlans = user?.role === 'admin' ? plans : plans.filter(p => p.created_by === user?.email);
  const selectedPlan = myPlans.find(p => p.id === selectedPlanId);

  const handleDistChange = (idx, field, value) => {
    setDistribution(d => d.map((ch, i) => i === idx ? { ...ch, [field]: Number(value) } : ch));
  };

  const handleCalculate = () => {
    const funnel = selectedPlan ? {
      lead_to_appointment_rate: selectedPlan.lead_to_appointment_rate || 0.35,
      appointment_to_show_rate: selectedPlan.appointment_to_show_rate || 0.7,
      show_to_sale_rate: selectedPlan.show_to_sale_rate || 0.35,
    } : {
      lead_to_appointment_rate: 0.35,
      appointment_to_show_rate: 0.7,
      show_to_sale_rate: 0.35,
    };
    const avgTicket = selectedPlan?.average_ticket || 5000;

    // Load CPLs from plan channels if available
    const dist = distribution.map(d => {
      const planCh = selectedPlan?.channels?.find(c => c.channel_name === d.channel_name);
      return { ...d, expected_cpl: planCh?.expected_cpl || d.expected_cpl };
    });

    setResult(calculateReversePlan(targetRevenue, avgTicket, funnel, dist));
  };

  const fmt = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader title="Reverse Planning" description="Start from a revenue target and calculate the required investment and leads." />

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label className="text-xs">Base Plan (optional)</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a plan for funnel rates" /></SelectTrigger>
              <SelectContent>
                {myPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name} — {p.period_month}/{p.period_year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Target Revenue (R$)</Label>
            <Input type="number" value={targetRevenue} onChange={e => setTargetRevenue(Number(e.target.value))} className="mt-1" />
          </div>
        </div>

        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Channel Distribution</h4>
        <div className="space-y-2 mb-6">
          {distribution.map((ch, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-20"><ChannelBadge channel={ch.channel_name} /></div>
              <div className="flex-1">
                <Input type="number" value={ch.percent} onChange={e => handleDistChange(idx, 'percent', e.target.value)}
                  className="h-9 text-xs" placeholder="%" />
              </div>
              <div className="flex-1">
                <Input type="number" value={ch.expected_cpl} onChange={e => handleDistChange(idx, 'expected_cpl', e.target.value)}
                  className="h-9 text-xs" placeholder="CPL R$" />
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleCalculate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Calculator className="w-4 h-4" /> Calculate Reverse Plan
        </Button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Required Investment" value={fmt(result.total_investment)} icon={DollarSign} color="blue" />
            <StatCard label="Required Leads" value={result.required_leads.toLocaleString()} icon={Users} color="purple" />
            <StatCard label="Required Sales" value={result.required_sales.toLocaleString()} icon={Target} color="orange" />
            <StatCard label="Target Revenue" value={fmt(targetRevenue)} icon={TrendingDown} color="green" />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Channel Budget Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left py-2.5 px-4 font-medium text-gray-500">Channel</th>
                    <th className="text-right py-2.5 px-4 font-medium text-gray-500">Distribution</th>
                    <th className="text-right py-2.5 px-4 font-medium text-gray-500">CPL</th>
                    <th className="text-right py-2.5 px-4 font-medium text-gray-500">Required Leads</th>
                    <th className="text-right py-2.5 px-4 font-medium text-gray-500">Required Budget</th>
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