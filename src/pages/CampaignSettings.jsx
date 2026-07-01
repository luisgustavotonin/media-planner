import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, X, Check, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { sanitizeVar } from '@/lib/formulaEvaluator';

const UNIT_LABELS = { numero: 'Número', moeda: 'Moeda (R$)', percentual: 'Percentual (%)' };
const UNIT_SHORT = { numero: 'nº', moeda: 'R$', percentual: '%' };

const PRESET_CHANNELS = ['Meta', 'Google', 'TikTok', 'YouTube', 'LinkedIn'];
const PRESET_OBJECTIVES = [
  {
    name: 'Lead',
    description: 'Captação de leads via formulários ou landing pages.',
    type: 'performance',
    kpis: [{ label: 'CPL', unit: 'moeda' }],
    channels: [],
    is_active: true,
  },
  {
    name: 'Tráfego',
    description: 'Direcionar usuários para uma página ou site.',
    type: 'branding',
    kpis: [
      { label: 'CPC', unit: 'moeda' },
      { label: 'Cliques', unit: 'numero' },
      { label: 'CTR', unit: 'percentual' },
    ],
    channels: [],
    is_active: true,
  },
  {
    name: 'Awareness',
    description: 'Alcance e reconhecimento de marca.',
    type: 'branding',
    kpis: [
      { label: 'CPM', unit: 'moeda' },
      { label: 'Impressões', unit: 'numero' },
      { label: 'Alcance', unit: 'numero' },
    ],
    channels: [],
    is_active: true,
  },
  {
    name: 'Engajamento',
    description: 'Engajamento e taxa de cliques (CTR).',
    type: 'branding',
    kpis: [
      { label: 'CTR', unit: 'percentual' },
      { label: 'CPC', unit: 'moeda' },
      { label: 'Cliques', unit: 'numero' },
    ],
    channels: [],
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
function ObjectiveForm({ initial, onSave, onCancel, saving, channels = [], funnelTypes = [] }) {
  const [form, setForm] = useState(initial);

  const toggleChannel = (ch) => setForm(f => {
    const list = f.channels || [];
    return { ...f, channels: list.includes(ch) ? list.filter(c => c !== ch) : [...list, ch] };
  });
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addKpi = () => setForm(f => ({ ...f, kpis: [...(f.kpis || []), { label: '', unit: 'moeda' }] }));
  const updateKpi = (i, k, v) => setForm(f => ({ ...f, kpis: f.kpis.map((kp, j) => j === i ? { ...kp, [k]: v } : kp) }));
  const removeKpi = (i) => setForm(f => ({ ...f, kpis: f.kpis.filter((_, j) => j !== i) }));

  const addCalcMetric = () => setForm(f => ({ ...f, calculated_metrics: [...(f.calculated_metrics || []), { label: '', formula: '', unit: 'numero' }] }));
  const updateCalcMetric = (i, k, v) => setForm(f => ({ ...f, calculated_metrics: (f.calculated_metrics || []).map((m, j) => j === i ? { ...m, [k]: v } : m) }));
  const removeCalcMetric = (i) => setForm(f => ({ ...f, calculated_metrics: (f.calculated_metrics || []).filter((_, j) => j !== i) }));

  const activeChannels = channels.filter(c => c.is_active);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome do Objetivo *</Label>
          <input className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: Lead, Tráfego, Awareness..." value={form.name} onChange={e => setField('name', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo do Objetivo</Label>
          <div className="flex gap-2 mt-1.5">
            <button type="button" onClick={() => setField('type', 'performance')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${form.type === 'performance' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              Performance (Funil)
            </button>
            <button type="button" onClick={() => setField('type', 'branding')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${form.type === 'branding' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              Branding (Awareness)
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {form.type === 'branding' ? 'Não passa pelo funil de vendas — apenas métricas de eficiência (CPM, CTR, etc.).' : 'Passa pelo funil de vendas (leads → agendamento → venda).'}
          </p>
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Funil Associado</Label>
        <p className="text-[10px] text-gray-400 mb-2">
          {form.type === 'performance'
            ? 'Selecione o funil que este objetivo usa. Ao escolher este objetivo numa campanha, o funil e suas taxas vêm automaticamente do benchmark.'
            : 'Selecione o funil de etapas deste objetivo (ex: Impressões → Cliques → Engajamentos). Opcional para branding.'}
        </p>
        <Select value={form.funnel_type_id || 'none'} onValueChange={v => setField('funnel_type_id', v === 'none' ? '' : v)}>
          <SelectTrigger className="w-full h-10 text-sm"><SelectValue placeholder="Selecione um funil..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {funnelTypes.map(ft => <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Descrição</Label>
        <input className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Breve descrição..." value={form.description || ''} onChange={e => setField('description', e.target.value)} />
      </div>

      {form.type === 'performance' && (
        <div className="max-w-xs">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Ticket Médio (R$)</Label>
          <p className="text-[10px] text-gray-400 mb-1.5">Usado no cálculo de receita do funil para este objetivo.</p>
          <input type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: 7500" value={form.average_ticket || ''} onChange={e => setField('average_ticket', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
      )}

      {/* KPIs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">KPIs</Label>
            <p className="text-[10px] text-gray-400 mt-0.5">Cadastre os KPIs deste objetivo. Eles aparecem no plano de mídia para preenchimento. Só KPIs com valor preenchido aparecem no acompanhamento semanal.</p>
          </div>
          <button onClick={addKpi} type="button" className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
            <Plus className="w-3.5 h-3.5" /> Adicionar KPI
          </button>
        </div>
        <div className="space-y-2">
          {(form.kpis || []).length === 0 && (
            <p className="text-xs text-gray-400 italic py-2">Nenhum KPI cadastrado. Clique em "Adicionar KPI".</p>
          )}
          {(form.kpis || []).map((kpi, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="flex-1 border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Nome do KPI (ex: CPL, CPC, CPM, CTR...)" value={kpi.label}
                onChange={e => updateKpi(i, 'label', e.target.value)} />
              <select className="w-40 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                value={kpi.unit} onChange={e => updateKpi(i, 'unit', e.target.value)}>
                {Object.entries(UNIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={() => removeKpi(i)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas Calculadas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Métricas Calculadas</Label>
            <p className="text-[10px] text-gray-400 mt-0.5">Configure os cards calculados que aparecem no resumo do plano. Use as variáveis abaixo para construir a fórmula. Operadores: + - * / e parênteses.</p>
          </div>
          <button onClick={addCalcMetric} type="button" className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
            <Plus className="w-3.5 h-3.5" /> Adicionar Métrica
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-[10px] text-gray-400">Variáveis:</span>
          {['investimento', 'investimento_liquido',
            ...(form.type === 'performance' ? ['receita', 'vendas', 'leads', 'ticket_medio'] : []),
            ...(form.kpis || []).filter(k => k.label).map(k => sanitizeVar(k.label)),
            ...(form.calculated_metrics || []).filter(m => m.label).map(m => sanitizeVar(m.label))
          ].map((v, i) => (
            <code key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">{v}</code>
          ))}
        </div>
        <div className="space-y-2">
          {(form.calculated_metrics || []).length === 0 && (
            <p className="text-xs text-gray-400 italic py-2">Nenhuma métrica calculada. Os cards do resumo mostrarão apenas os KPIs preenchidos.</p>
          )}
          {(form.calculated_metrics || []).map((metric, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="w-36 border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Nome (ex: Impressões)" value={metric.label}
                onChange={e => updateCalcMetric(i, 'label', e.target.value)} />
              <select className="w-32 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                value={metric.unit} onChange={e => updateCalcMetric(i, 'unit', e.target.value)}>
                {Object.entries(UNIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input className="flex-1 border border-gray-200 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="investimento_liquido / cpm * 1000" value={metric.formula}
                onChange={e => updateCalcMetric(i, 'formula', e.target.value)} />
              <button onClick={() => removeCalcMetric(i)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Canais */}
      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Canais Aplicáveis</Label>
        <p className="text-[10px] text-gray-400 mb-2">Selecione em quais canais este objetivo pode ser usado. Deixe vazio para todos.</p>
        {activeChannels.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Nenhum canal ativo. Cadastre canais na aba "Canais".</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeChannels.map(ch => {
              const selected = (form.channels || []).includes(ch.name);
              return (
                <button key={ch.id} type="button" onClick={() => toggleChannel(ch.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {ch.name}
                </button>
              );
            })}
          </div>
        )}
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
  const [selectedChannel, setSelectedChannel] = useState('');

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['campaign-objectives'],
    queryFn: () => base44.entities.CampaignObjective.list(),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => base44.entities.Channel.list(),
  });

  const { data: funnelTypes = [] } = useQuery({
    queryKey: ['funnelTypes'],
    queryFn: () => base44.entities.FunnelType.list(),
  });

  const activeChannels = channels.filter(c => c.is_active);
  const activeChannelNames = activeChannels.map(c => c.name);
  const filteredObjectives = selectedChannel
    ? objectives.filter(o => !o.channels?.length || o.channels.includes(selectedChannel))
    : objectives;

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.CampaignObjective.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign-objectives'] }); setEditingId(null); toast({ title: 'Objetivo criado!' }); },
  });
  const updateMut = useMutation({
    mutationFn: async ({ id, data, oldName, newName }) => {
      await base44.entities.CampaignObjective.update(id, data);
      // Se o nome mudou, propaga para todos os planos de mídia que referenciam o nome antigo
      if (oldName && newName && oldName !== newName) {
        const plans = await base44.entities.MediaPlan.list();
        for (const plan of plans) {
          let changed = false;
          const updatedChannels = (plan.channels || []).map(ch => {
            const strategies = (ch.strategies || []).map(camp => {
              if (camp.objective === oldName) {
                changed = true;
                return { ...camp, objective: newName };
              }
              return camp;
            });
            return { ...ch, strategies };
          });
          if (changed) {
            await base44.entities.MediaPlan.update(plan.id, { channels: updatedChannels });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      setEditingId(null);
      toast({ title: 'Objetivo atualizado!' });
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.CampaignObjective.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign-objectives'] }); toast({ title: 'Objetivo removido.' }); },
  });

  const toggleActive = (obj) => updateMut.mutate({ id: obj.id, data: { is_active: !obj.is_active } });

  const handleSave = (form) => {
    // Limpa campos legados
    const { primary_kpi_label, kpi_unit, metrics, ...cleanForm } = form;
    if (editingId === 'new') createMut.mutate(cleanForm);
    else updateMut.mutate({ id: editingId, data: cleanForm, oldName: editingObj?.name, newName: cleanForm.name });
  };

  const addPresets = async () => {
    for (const p of PRESET_OBJECTIVES) {
      if (!objectives.find(o => o.name.toLowerCase() === p.name.toLowerCase())) {
        await base44.entities.CampaignObjective.create(p);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['campaign-objectives'] });
    toast({ title: 'Objetivos padrão adicionados!' });
  };

  const editingObj = editingId && editingId !== 'new' ? objectives.find(o => o.id === editingId) : null;

  // Converte formato legado para novo ao editar
  const getInitialForEdit = () => {
    if (!editingObj) return {};
    const kpis = editingObj.kpis?.length
      ? editingObj.kpis
      : editingObj.metrics?.length
        ? editingObj.metrics.map(m => ({ label: m.label, unit: m.unit }))
        : editingObj.primary_kpi_label
          ? [{ label: editingObj.primary_kpi_label, unit: editingObj.kpi_unit || 'moeda' }]
          : [];
    return { ...editingObj, kpis };
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider mr-1">Filtrar por canal:</span>
        <button onClick={() => setSelectedChannel('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!selectedChannel ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          Todos
        </button>
        {activeChannels.map(ch => (
          <button key={ch.id} onClick={() => setSelectedChannel(ch.name)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedChannel === ch.name ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {ch.name}
          </button>
        ))}
      </div>

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
            initial={editingId === 'new'
              ? { name: '', description: '', type: 'performance', kpis: [], channels: selectedChannel ? [selectedChannel] : [], is_active: true }
              : getInitialForEdit()}
            onSave={handleSave} onCancel={() => setEditingId(null)} saving={createMut.isPending || updateMut.isPending}
            channels={channels} funnelTypes={funnelTypes}
          />
        </div>
      )}

      {filteredObjectives.length === 0 && !editingId ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 font-medium mb-1">{selectedChannel ? `Nenhum objetivo para ${selectedChannel}` : 'Nenhum objetivo configurado'}</p>
          <p className="text-gray-400 text-sm mb-4">{selectedChannel ? `Crie um novo objetivo para o canal ${selectedChannel}.` : 'Clique em "Adicionar Padrões" para começar com Lead, Tráfego e Awareness.'}</p>
          {objectives.length === 0
            ? <Button onClick={addPresets} className="gap-2 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> Adicionar Padrões</Button>
            : <Button onClick={() => setEditingId('new')} className="gap-2 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4" /> Novo Objetivo</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredObjectives.map(obj => {
            const isExpanded = expanded[obj.id];
            const kpis = obj.kpis || [];
            return (
              <div key={obj.id} className={`bg-white rounded-xl border border-gray-100 ${!obj.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{obj.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${obj.type === 'branding' ? 'bg-secondary/60 text-secondary-foreground border border-border' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                        {obj.type === 'branding' ? 'Branding' : 'Performance'}
                      </span>
                      {!obj.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inativo</span>}
                    </div>
                    {obj.description && <p className="text-xs text-gray-400 mt-0.5">{obj.description}</p>}
                    {kpis.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {kpis.map((kpi, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary font-medium">
                            {kpi.label} · {UNIT_SHORT[kpi.unit]}
                          </span>
                        ))}
                      </div>
                    )}
                    {obj.channels?.filter(ch => activeChannelNames.includes(ch)).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {obj.channels.filter(ch => activeChannelNames.includes(ch)).map(ch => (
                          <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-500">{ch}</span>
                        ))}
                      </div>
                    )}
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