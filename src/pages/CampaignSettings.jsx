import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, X, Check, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const UNIT_LABELS = { numero: 'Número', moeda: 'Moeda (R$)', percentual: 'Percentual (%)' };

const PRESET_CHANNELS = ['Meta', 'Google', 'TikTok', 'YouTube', 'LinkedIn'];
const PRESET_OBJECTIVES = [
  {
    name: 'Lead',
    description: 'Captação de leads via formulários ou landing pages.',
    primary_kpi_label: 'Custo por Lead (CPL)',
    metrics: [
      { key: 'leads', label: 'Leads', unit: 'numero', is_primary: true },
      { key: 'cost', label: 'Investimento (R$)', unit: 'moeda', is_primary: false },
      { key: 'impressions', label: 'Impressões', unit: 'numero', is_primary: false },
    ],
    is_active: true,
  },
  {
    name: 'Tráfego',
    description: 'Direcionar usuários para uma página ou site.',
    primary_kpi_label: 'Custo por Clique (CPC)',
    metrics: [
      { key: 'clicks', label: 'Cliques', unit: 'numero', is_primary: true },
      { key: 'sessions', label: 'Sessões', unit: 'numero', is_primary: false },
      { key: 'cost', label: 'Investimento (R$)', unit: 'moeda', is_primary: false },
    ],
    is_active: true,
  },
  {
    name: 'Awareness',
    description: 'Alcance e reconhecimento de marca.',
    primary_kpi_label: 'Custo por Mil Impressões (CPM)',
    metrics: [
      { key: 'impressions', label: 'Impressões', unit: 'numero', is_primary: true },
      { key: 'reach', label: 'Alcance', unit: 'numero', is_primary: false },
      { key: 'cost', label: 'Investimento (R$)', unit: 'moeda', is_primary: false },
    ],
    is_active: true,
  },
];

// ── Aba: Canais ──
function ChannelsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => base44.entities.Channel.list(),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Channel.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['channels'] }); setNewName(''); toast({ title: 'Canal criado!' }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Channel.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['channels'] }); toast({ title: 'Canal removido.' }); },
  });

  const toggleActive = (ch) => {
    base44.entities.Channel.update(ch.id, { is_active: !ch.is_active })
      .then(() => queryClient.invalidateQueries({ queryKey: ['channels'] }));
  };

  const addPresets = async () => {
    for (const name of PRESET_CHANNELS) {
      if (!channels.find(c => c.name === name)) {
        await base44.entities.Channel.create({ name, is_active: true });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['channels'] });
    toast({ title: 'Canais padrão adicionados!' });
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (channels.find(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: 'Canal já existe.', variant: 'destructive' });
      return;
    }
    createMut.mutate({ name: trimmed, is_active: true });
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Adicionar canal */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Novo Canal</p>
        <div className="flex gap-2">
          <input
            className="flex-1 max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: Pinterest, Kwai..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={!newName.trim() || createMut.isPending} className="gap-1.5 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
          {channels.length === 0 && (
            <Button variant="outline" onClick={addPresets}>Adicionar Padrões</Button>
          )}
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 font-medium mb-1">Nenhum canal cadastrado</p>
          <p className="text-gray-400 text-sm mb-4">Adicione os canais que sua agência utiliza.</p>
          <Button onClick={addPresets} className="gap-2 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> Adicionar Padrões</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map(ch => (
            <div key={ch.id} className={`bg-white rounded-xl border border-gray-100 px-5 py-3.5 flex items-center justify-between ${!ch.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium text-gray-800">{ch.name}</span>
                {!ch.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inativo</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(ch)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title={ch.is_active ? 'Desativar' : 'Ativar'}>
                  {ch.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteMut.mutate(ch.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Formulário de Objetivo ──
function ObjectiveForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addMetric = () => setForm(f => ({ ...f, metrics: [...(f.metrics || []), { key: '', label: '', unit: 'numero', is_primary: false }] }));
  const updateMetric = (i, k, v) => setForm(f => ({ ...f, metrics: f.metrics.map((m, j) => j === i ? { ...m, [k]: v } : m) }));
  const removeMetric = (i) => setForm(f => ({ ...f, metrics: f.metrics.filter((_, j) => j !== i) }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome do Objetivo *</Label>
          <input className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: Lead, Tráfego, Awareness..." value={form.name} onChange={e => setField('name', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">KPI Principal</Label>
          <input className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: Custo por Lead (CPL)" value={form.primary_kpi_label} onChange={e => setField('primary_kpi_label', e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Descrição</Label>
        <input className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Breve descrição..." value={form.description} onChange={e => setField('description', e.target.value)} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Métricas a Acompanhar no Semanal</Label>
          <button onClick={addMetric} type="button" className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_130px_80px_28px] gap-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1">
            <span>Chave (interno)</span><span>Rótulo exibido</span><span>Unidade</span><span>Principal</span><span></span>
          </div>
          {(form.metrics || []).map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_130px_80px_28px] gap-2 items-center">
              <input className="border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ex: leads" value={m.key} onChange={e => updateMetric(i, 'key', e.target.value.toLowerCase().replace(/\s/g, '_'))} />
              <input className="border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ex: Leads" value={m.label} onChange={e => updateMetric(i, 'label', e.target.value)} />
              <select className="border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                value={m.unit} onChange={e => updateMetric(i, 'unit', e.target.value)}>
                {Object.entries(UNIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <div className="flex justify-center">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={!!m.is_primary} onChange={e => updateMetric(i, 'is_primary', e.target.checked)} />
              </div>
              <button onClick={() => removeMetric(i)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button onClick={() => onSave(form)} disabled={saving || !form.name} className="gap-2 bg-primary hover:bg-primary/90">
          <Check className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Objetivo'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ── Aba: Objetivos ──
function ObjectivesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState({});

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['campaign-objectives'],
    queryFn: () => base44.entities.CampaignObjective.list(),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.CampaignObjective.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign-objectives'] }); setEditingId(null); toast({ title: 'Objetivo criado!' }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampaignObjective.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign-objectives'] }); setEditingId(null); toast({ title: 'Objetivo atualizado!' }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.CampaignObjective.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign-objectives'] }); toast({ title: 'Objetivo removido.' }); },
  });

  const toggleActive = (obj) => updateMut.mutate({ id: obj.id, data: { is_active: !obj.is_active } });
  const handleSave = (form) => {
    if (editingId === 'new') createMut.mutate(form);
    else updateMut.mutate({ id: editingId, data: form });
  };
  const addPresets = async () => {
    for (const p of PRESET_OBJECTIVES) { await base44.entities.CampaignObjective.create(p); }
    queryClient.invalidateQueries({ queryKey: ['campaign-objectives'] });
    toast({ title: 'Objetivos padrão adicionados!' });
  };

  const editingObj = editingId && editingId !== 'new' ? objectives.find(o => o.id === editingId) : null;

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4 gap-2">
        {objectives.length === 0 && <Button variant="outline" onClick={addPresets} className="gap-1.5"><Plus className="w-4 h-4" /> Adicionar Padrões</Button>}
        <Button onClick={() => setEditingId('new')} className="gap-1.5 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> Novo Objetivo</Button>
      </div>

      {editingId && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900">{editingId === 'new' ? 'Novo Objetivo' : `Editar: ${editingObj?.name}`}</h2>
            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <ObjectiveForm
            initial={editingId === 'new' ? { name: '', description: '', primary_kpi_label: '', metrics: [{ key: '', label: '', unit: 'numero', is_primary: true }], is_active: true } : { ...editingObj }}
            onSave={handleSave} onCancel={() => setEditingId(null)} saving={createMut.isPending || updateMut.isPending}
          />
        </div>
      )}

      {objectives.length === 0 && !editingId ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 font-medium mb-1">Nenhum objetivo configurado</p>
          <p className="text-gray-400 text-sm mb-4">Clique em "Adicionar Padrões" para começar com Lead, Tráfego e Awareness.</p>
          <Button onClick={addPresets} className="gap-2 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> Adicionar Padrões</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {objectives.map(obj => {
            const isExpanded = expanded[obj.id];
            return (
              <div key={obj.id} className={`bg-white rounded-xl border border-gray-100 ${!obj.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{obj.name}</p>
                      {!obj.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inativo</span>}
                    </div>
                    {obj.description && <p className="text-xs text-gray-400 mt-0.5">{obj.description}</p>}
                    {obj.primary_kpi_label && <p className="text-[11px] text-primary font-medium mt-1">KPI: {obj.primary_kpi_label}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setExpanded(e => ({ ...e, [obj.id]: !e[obj.id] }))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => toggleActive(obj)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      {obj.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditingId(obj.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteMut.mutate(obj.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {isExpanded && obj.metrics?.length > 0 && (
                  <div className="px-5 pb-4 border-t border-gray-50 pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Métricas do Acompanhamento Semanal</p>
                    <div className="space-y-1">
                      {obj.metrics.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.is_primary ? 'bg-primary' : 'bg-gray-300'}`} />
                          <span className="font-medium">{m.label}</span>
                          <span className="text-gray-400">({UNIT_LABELS[m.unit] || m.unit})</span>
                          {m.is_primary && <span className="text-primary font-medium">— Principal</span>}
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
    </div>
  );
}

// ── Página principal ──
export default function CampaignSettings() {
  const [tab, setTab] = useState('channels');

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto w-full">
      <PageHeader title="Configuração de Campanhas" description="Cadastre os canais e defina os objetivos com seus KPIs para uso no Plano de Mídia e Acompanhamento Semanal." />

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ key: 'channels', label: 'Canais' }, { key: 'objectives', label: 'Objetivos & KPIs' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'channels' && <ChannelsTab />}
      {tab === 'objectives' && <ObjectivesTab />}
    </div>
  );
}