import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import PageHeader from '../components/ui-custom/PageHeader';
import EmptyState from '../components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart3, Plus, Search, Target, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SPECIALTIES = ['implants', 'aesthetics', 'orthodontics', 'general', 'periodontics', 'endodontics', 'pediatric', 'other'];

export default function MediaPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.MediaPlan.list('-created_date'),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });
  const { data: benchmarks = [] } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => base44.entities.Benchmark.list(),
  });

  const [form, setForm] = useState({
    client_id: '', period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(),
    segment: 'general', status: 'draft',
  });

  const createMut = useMutation({
    mutationFn: async (d) => {
      const client = clients.find(c => c.id === d.client_id);
      const bm = benchmarks.find(b => b.segment === d.segment);
      return base44.entities.MediaPlan.create({
        ...d,
        client_name: client?.clinic_name || '',
        average_ticket: client?.average_ticket || 5000,
        lead_to_appointment_rate: bm?.lead_to_appointment_rate || 0.35,
        appointment_to_show_rate: bm?.appointment_to_show_rate || 0.7,
        show_to_sale_rate: bm?.show_to_sale_rate || 0.35,
        channels: [
          { channel_name: 'Meta', channel_objective: 'Leads', budget_value: 0, budget_percent: 0, expected_cpl: bm?.meta_default_cpl || 40, use_custom_funnel: false },
          { channel_name: 'Google', channel_objective: 'Leads', budget_value: 0, budget_percent: 0, expected_cpl: bm?.google_default_cpl || 60, use_custom_funnel: false },
        ],
        total_investment: 0,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['plans'] }); setOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.MediaPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });

  const isClientRole = user?.role === 'client';
  const myPlans = user?.role === 'admin' ? plans :
    isClientRole ? plans.filter(p => p.client_id === user?.assigned_client_id) :
    plans.filter(p => p.created_by === user?.email);

  const filtered = myPlans.filter(p => (p.client_name || '').toLowerCase().includes(search.toLowerCase()));

  const myClients = user?.role === 'admin' ? clients : clients.filter(c => c.created_by === user?.email);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Media Plans"
        description="Create and manage multi-channel media plans."
        actions={!isClientRole && (
          <Button onClick={() => setOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Plan
          </Button>
        )}
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search plans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-white" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BarChart3} title="No media plans" description="Create your first media plan to start projecting results." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {filtered.map(plan => (
            <div key={plan.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors group">
              <Link to={createPageUrl(`PlanDetail?id=${plan.id}`)} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{plan.client_name || 'Unnamed'}</p>
                  <p className="text-xs text-gray-400">
                    {MONTHS[(plan.period_month || 1) - 1]} {plan.period_year} · {plan.segment || 'General'} · {plan.channels?.length || 0} channels
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">R${(plan.total_investment || 0).toLocaleString('pt-BR')}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    plan.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    plan.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {plan.status || 'draft'}
                  </span>
                </div>
                {!isClientRole && (
                  <button onClick={(e) => { e.stopPropagation(); deleteMut.mutate(plan.id); }}
                    className="p-1.5 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Media Plan</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Client *</Label>
              <Select value={form.client_id} onValueChange={v => setForm({...form, client_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {myClients.map(c => <SelectItem key={c.id} value={c.id}>{c.clinic_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Month</Label>
                <Select value={String(form.period_month)} onValueChange={v => setForm({...form, period_month: Number(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Year</Label>
                <Input type="number" value={form.period_year} onChange={e => setForm({...form, period_year: Number(e.target.value)})} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Segment</Label>
              <Select value={form.segment} onValueChange={v => setForm({...form, segment: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMut.mutate(form)} className="w-full bg-blue-600 hover:bg-blue-700" disabled={!form.client_id || createMut.isPending}>
              Create Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}