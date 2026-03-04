import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import { calculateScenarios } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Scenarios() {
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });

  const myPlans = user?.role === 'admin' ? plans : plans.filter(p => p.created_by === user?.email);
  const plan = myPlans.find(p => p.id === selectedPlanId);

  let scenarios = null;
  if (plan && plan.channels?.length > 0) {
    const funnel = {
      lead_to_appointment_rate: plan.lead_to_appointment_rate || 0.35,
      appointment_to_show_rate: plan.appointment_to_show_rate || 0.7,
      show_to_sale_rate: plan.show_to_sale_rate || 0.35,
    };
    scenarios = calculateScenarios(plan.channels, funnel, plan.average_ticket || 5000, plan.scenario_adjustments);
  }

  const fmt = v => `R$${Math.round(v).toLocaleString('pt-BR')}`;
  const fmtN = v => Math.round(v).toLocaleString('pt-BR');

  const scenarioConfigs = [
    { key: 'optimistic', label: 'Optimistic', icon: TrendingUp, color: 'emerald', barColor: '#10b981' },
    { key: 'realistic', label: 'Realistic', icon: Minus, color: 'blue', barColor: '#3b82f6' },
    { key: 'conservative', label: 'Conservative', icon: TrendingDown, color: 'amber', barColor: '#f59e0b' },
  ];

  const chartData = scenarios ? [
    { name: 'Leads', Optimistic: scenarios.optimistic.totals.total_leads, Realistic: scenarios.realistic.totals.total_leads, Conservative: scenarios.conservative.totals.total_leads },
    { name: 'Appointments', Optimistic: scenarios.optimistic.totals.total_appointments, Realistic: scenarios.realistic.totals.total_appointments, Conservative: scenarios.conservative.totals.total_appointments },
    { name: 'Show-ups', Optimistic: scenarios.optimistic.totals.total_showups, Realistic: scenarios.realistic.totals.total_showups, Conservative: scenarios.conservative.totals.total_showups },
    { name: 'Sales', Optimistic: Math.round(scenarios.optimistic.totals.total_sales), Realistic: Math.round(scenarios.realistic.totals.total_sales), Conservative: Math.round(scenarios.conservative.totals.total_sales) },
  ] : [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Scenario Simulator" description="Compare optimistic, realistic, and conservative projections." />

      <div className="mb-8">
        <Label className="text-xs">Select Media Plan</Label>
        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="w-full max-w-md mt-1"><SelectValue placeholder="Choose a plan..." /></SelectTrigger>
          <SelectContent>
            {myPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name} — {p.period_month}/{p.period_year}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {scenarios && (
        <>
          {/* Comparison Chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Scenario Comparison</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Optimistic" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Realistic" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Conservative" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scenario Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {scenarioConfigs.map(sc => {
              const s = scenarios[sc.key];
              return (
                <div key={sc.key} className={`bg-white rounded-xl border border-gray-100 p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg bg-${sc.color}-50 flex items-center justify-center`}>
                      <sc.icon className={`w-4 h-4 text-${sc.color}-500`} />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">{sc.label}</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Leads</span><span className="text-sm font-semibold">{fmtN(s.totals.total_leads)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Appointments</span><span className="text-sm font-semibold">{fmtN(s.totals.total_appointments)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Show-ups</span><span className="text-sm font-semibold">{fmtN(s.totals.total_showups)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Sales</span><span className="text-sm font-semibold">{fmtN(s.totals.total_sales)}</span></div>
                    <div className="pt-3 border-t border-gray-50">
                      <div className="flex justify-between"><span className="text-xs text-gray-500">Revenue</span><span className="text-sm font-bold text-emerald-600">{fmt(s.totals.total_revenue)}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-xs text-gray-500">Blended CPL</span><span className="text-sm font-semibold">{fmt(s.blended_cpl)}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-xs text-gray-500">ROI</span><span className="text-sm font-semibold">{s.overall_roi.toFixed(0)}%</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Per-channel table for each scenario */}
          {scenarioConfigs.map(sc => {
            const s = scenarios[sc.key];
            return (
              <div key={sc.key} className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/30">
                  <h4 className="text-xs font-semibold text-gray-700">{sc.label} — Per Channel</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-4 font-medium text-gray-500">Channel</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">Leads</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">Sales</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">Revenue</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">CPL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {s.channelResults.map((ch, i) => (
                        <tr key={i}>
                          <td className="py-2 px-4">{ch.channel_name}</td>
                          <td className="py-2 px-3 text-right">{fmtN(ch.metrics.leads)}</td>
                          <td className="py-2 px-3 text-right">{fmtN(ch.metrics.sales)}</td>
                          <td className="py-2 px-3 text-right">{fmt(ch.metrics.revenue)}</td>
                          <td className="py-2 px-3 text-right">{fmt(ch.metrics.cost_per_lead)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}