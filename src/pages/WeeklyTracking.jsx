import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import { calculateConsolidated, generateRecommendations } from '../components/hooks/usePlanCalculations';
import PageHeader from '../components/ui-custom/PageHeader';
import StatCard from '../components/ui-custom/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Save, AlertTriangle, CheckCircle, Info, TrendingUp, Target, DollarSign, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SEVERITY_STYLES = {
  high: { icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  medium: { icon: Info, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  low: { icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
};

export default function WeeklyTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });
  const { data: allActuals = [] } = useQuery({
    queryKey: ['weeklyActuals'],
    queryFn: () => base44.entities.WeeklyActual.list(),
  });

  const myPlans = user?.role === 'admin' ? plans : plans.filter(p => p.created_by === user?.email);
  const plan = myPlans.find(p => p.id === selectedPlanId);
  const actuals = allActuals.filter(a => a.plan_id === selectedPlanId);

  // Calculate monthly targets and weekly targets
  let consolidated = null;
  let weeklyTargets = [];
  if (plan && plan.channels?.length > 0) {
    const funnel = {
      lead_to_appointment_rate: plan.lead_to_appointment_rate || 0.35,
      appointment_to_show_rate: plan.appointment_to_show_rate || 0.7,
      show_to_sale_rate: plan.show_to_sale_rate || 0.35,
    };
    consolidated = calculateConsolidated(plan.channels, funnel, plan.average_ticket || 5000);
    const weeks = 4;
    for (let w = 1; w <= weeks; w++) {
      weeklyTargets.push({
        week: w,
        investment: (consolidated.totals.total_budget || 0) / weeks,
        leads: Math.round(consolidated.totals.total_leads / weeks),
        appointments: Math.round(consolidated.totals.total_appointments / weeks),
        showups: Math.round(consolidated.totals.total_showups / weeks),
      });
    }
  }

  // Weekly actuals form
  const [weekForm, setWeekForm] = useState({ week_number: 1, investment_actual: 0, leads_actual: 0, appointments_actual: 0, showups_actual: 0 });

  const saveMut = useMutation({
    mutationFn: (data) => {
      const existing = actuals.find(a => a.week_number === data.week_number);
      if (existing) {
        const { id, created_date, updated_date, created_by, ...rest } = data;
        return base44.entities.WeeklyActual.update(existing.id, rest);
      }
      return base44.entities.WeeklyActual.create({ ...data, plan_id: selectedPlanId, client_id: plan?.client_id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weeklyActuals'] }),
  });

  // Load existing data when week changes
  useEffect(() => {
    const existing = actuals.find(a => a.week_number === weekForm.week_number);
    if (existing) {
      setWeekForm({ week_number: existing.week_number, investment_actual: existing.investment_actual || 0, leads_actual: existing.leads_actual || 0, appointments_actual: existing.appointments_actual || 0, showups_actual: existing.showups_actual || 0 });
    } else {
      setWeekForm(f => ({ ...f, investment_actual: 0, leads_actual: 0, appointments_actual: 0, showups_actual: 0 }));
    }
  }, [weekForm.week_number, allActuals, selectedPlanId]);

  // Pacing calculation
  const totalActualInvestment = actuals.reduce((s, a) => s + (a.investment_actual || 0), 0);
  const totalActualLeads = actuals.reduce((s, a) => s + (a.leads_actual || 0), 0);
  const weeksElapsed = actuals.length;
  const projectedLeads = weeksElapsed > 0 ? (totalActualLeads / weeksElapsed) * 4 : 0;
  const projectedInvestment = weeksElapsed > 0 ? (totalActualInvestment / weeksElapsed) * 4 : 0;

  // Chart data
  const chartData = weeklyTargets.map((t, i) => {
    const actual = actuals.find(a => a.week_number === t.week);
    return {
      name: `Week ${t.week}`,
      'Target Leads': t.leads,
      'Actual Leads': actual?.leads_actual || null,
      'Target Investment': Math.round(t.investment),
      'Actual Investment': actual?.investment_actual || null,
    };
  });

  // Recommendations
  const recommendations = plan && consolidated ? generateRecommendations(consolidated.channelResults, actuals, weeklyTargets) : [];

  const pctOf = (actual, target) => target > 0 ? Math.round((actual / target) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Weekly Tracking" description="Track actual performance against planned targets." />

      <div className="mb-8">
        <Label className="text-xs">Select Media Plan</Label>
        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="w-full max-w-md mt-1"><SelectValue placeholder="Choose a plan..." /></SelectTrigger>
          <SelectContent>
            {myPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name} — {p.period_month}/{p.period_year}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {plan && consolidated && (
        <>
          {/* Pacing Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Actual Investment" value={`R$${totalActualInvestment.toLocaleString('pt-BR')}`} icon={DollarSign} color="blue"
              trend={pctOf(totalActualInvestment, consolidated.totals.total_budget) - 100} />
            <StatCard label="Actual Leads" value={totalActualLeads.toLocaleString()} icon={Users} color="purple"
              trend={pctOf(totalActualLeads, consolidated.totals.total_leads) - 100} />
            <StatCard label="Projected Leads" value={Math.round(projectedLeads).toLocaleString()} icon={TrendingUp} color="orange"
              sublabel={`Target: ${consolidated.totals.total_leads}`} />
            <StatCard label="Projected Investment" value={`R$${Math.round(projectedInvestment).toLocaleString('pt-BR')}`} icon={Target} color="green"
              sublabel={`Target: R$${Math.round(consolidated.totals.total_budget).toLocaleString('pt-BR')}`} />
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Weekly Performance</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Target Leads" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="Actual Leads" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Actuals Form */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Enter Weekly Actuals</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Week</Label>
                <Select value={String(weekForm.week_number)} onValueChange={v => setWeekForm(f => ({ ...f, week_number: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4].map(w => <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Investment (R$)</Label>
                <Input type="number" value={weekForm.investment_actual} onChange={e => setWeekForm(f => ({...f, investment_actual: Number(e.target.value)}))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Leads</Label>
                <Input type="number" value={weekForm.leads_actual} onChange={e => setWeekForm(f => ({...f, leads_actual: Number(e.target.value)}))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Appointments</Label>
                <Input type="number" value={weekForm.appointments_actual} onChange={e => setWeekForm(f => ({...f, appointments_actual: Number(e.target.value)}))} className="mt-1" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => saveMut.mutate(weekForm)} className="w-full gap-2 bg-blue-600 hover:bg-blue-700" disabled={saveMut.isPending}>
                  <Save className="w-4 h-4" /> Save
                </Button>
              </div>
            </div>
          </div>

          {/* Targets Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Weekly Targets vs Actuals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left py-2.5 px-4 font-medium text-gray-500">Week</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Target Invest.</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Actual Invest.</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Target Leads</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">Actual Leads</th>
                    <th className="text-right py-2.5 px-3 font-medium text-gray-500">% to Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {weeklyTargets.map((t, i) => {
                    const actual = actuals.find(a => a.week_number === t.week);
                    const pct = actual?.leads_actual && t.leads > 0 ? Math.round((actual.leads_actual / t.leads) * 100) : null;
                    return (
                      <tr key={i}>
                        <td className="py-2.5 px-4 font-medium">Week {t.week}</td>
                        <td className="py-2.5 px-3 text-right">R${Math.round(t.investment).toLocaleString('pt-BR')}</td>
                        <td className="py-2.5 px-3 text-right">{actual ? `R$${(actual.investment_actual || 0).toLocaleString('pt-BR')}` : '—'}</td>
                        <td className="py-2.5 px-3 text-right">{t.leads}</td>
                        <td className="py-2.5 px-3 text-right">{actual?.leads_actual ?? '—'}</td>
                        <td className="py-2.5 px-3 text-right">
                          {pct !== null ? (
                            <span className={`font-semibold ${pct >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>{pct}%</span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Action Recommendations</h3>
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const style = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.low;
                const Icon = style.icon;
                return (
                  <div key={i} className={`flex gap-3 p-4 rounded-lg border ${style.bg} ${style.border}`}>
                    <Icon className={`w-4 h-4 mt-0.5 ${style.text} flex-shrink-0`} />
                    <div>
                      <p className={`text-sm ${style.text}`}>{rec.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{rec.suggested_action}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}