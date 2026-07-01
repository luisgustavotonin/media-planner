import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import CurrencyInput from '../ui-custom/CurrencyInput';
import PercentInput from '../ui-custom/PercentInput';
import ChannelStrategies from './ChannelStrategies';

// Modal para adicionar canal (apenas nome + budget + imposto)
function AddChannelModal({ channels, onAdd, onClose }) {
  const [channelName, setChannelName] = useState(channels[0]?.name || '');
  const [budget, setBudget] = useState(0);
  const [tax, setTax] = useState(0);

  const handleAdd = () => {
    if (!channelName) return;
    onAdd({
      channel_name: channelName,
      budget_value: budget || 0,
      budget_percent: 0,
      tax_percent: tax || 0,
      use_custom_funnel: false,
      strategies: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-900">Adicionar Canal</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Canal *</label>
            {channels.length > 0 ? (
              <Select value={channelName} onValueChange={setChannelName}>
                <SelectTrigger><SelectValue placeholder="Selecione o canal..." /></SelectTrigger>
                <SelectContent>
                  {channels.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-gray-400 p-2 border border-dashed border-gray-200 rounded-lg text-center">
                Nenhum canal cadastrado. Vá em <strong>Config. Campanhas → Canais</strong>.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Budget do Canal (R$)</label>
            <CurrencyInput value={budget} onChange={v => setBudget(v || 0)} prefix="R$" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Imposto (%)</label>
            <input type="number" min="0" max="100" step="0.1" value={tax || ''} placeholder="0"
              onChange={e => setTax(parseFloat(e.target.value) || 0)}
              className="w-full h-9 border border-gray-200 rounded-md text-sm px-2 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="px-3 py-2.5 bg-secondary/40 rounded-lg border border-border">
            <p className="text-[11px] text-muted-foreground">As campanhas e seus KPIs são configurados ao expandir o canal abaixo.</p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleAdd} disabled={!channelName} className="flex-1 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" /> Adicionar
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

export default function ChannelEditor({ channels, onChange, totalInvestment, readOnly, days = 30, funnelStages = [], funnelTypes = [], benchmarks = [], segment = '', planFunnelTypeId = '' }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: dbChannels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => base44.entities.Channel.filter({ is_active: true }),
  });

  const { data: dbObjectives = [] } = useQuery({
    queryKey: ['campaign-objectives'],
    queryFn: () => base44.entities.CampaignObjective.filter({ is_active: true }),
  });

  const updateChannel = (idx, field, value) => {
    if (readOnly) return;
    const updated = channels.map((ch, i) => i !== idx ? ch : { ...ch, [field]: value });
    const total = updated.reduce((s, c) => s + (c.budget_value || 0), 0);
    onChange(updated.map(ch => ({ ...ch, budget_percent: total > 0 ? (ch.budget_value / total) * 100 : 0 })));
  };

  const handleBudgetChange = (idx, value) => {
    updateChannel(idx, 'budget_value', value);
  };

  const handleAdd = (newChannel) => {
    onChange([...channels, newChannel]);
  };

  const removeChannel = (idx) => {
    if (readOnly) return;
    const updated = channels.filter((_, i) => i !== idx);
    const total = updated.reduce((s, c) => s + (c.budget_value || 0), 0);
    onChange(updated.map(ch => ({ ...ch, budget_percent: total > 0 ? (ch.budget_value / total) * 100 : 0 })));
  };

  return (
    <div className="space-y-3">
      {showModal && (
        <AddChannelModal
          channels={dbChannels}
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Alocação de Canais</h3>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={() => setShowModal(true)} className="text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar Canal
          </Button>
        )}
      </div>

      {/* Labels */}
      <div className="hidden sm:grid grid-cols-[1fr_1fr_60px_80px_36px] gap-3 px-4 text-[10px] text-gray-400 uppercase tracking-wider">
        <span>Canal</span><span>Budget (R$)</span><span className="text-center">%</span><span>Imposto</span><span></span>
      </div>

      <div className="space-y-2">
        {channels.map((ch, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-[1fr_1fr_60px_80px] gap-3 items-center">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border text-xs font-medium text-secondary-foreground">
                    {ch.channel_name}
                  </span>
                </div>
                <div>
                  <CurrencyInput value={ch.budget_value || 0} onChange={v => handleBudgetChange(idx, v)}
                    placeholder="Budget R$" prefix="R$" className="text-xs" disabled={readOnly} />
                </div>
                <div className="text-center">
                  <span className="text-xs font-medium text-gray-500">{(ch.budget_percent || 0).toFixed(1)}%</span>
                </div>
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.1" value={ch.tax_percent || ''} placeholder="0"
                    onChange={e => updateChannel(idx, 'tax_percent', parseFloat(e.target.value) || 0)} disabled={readOnly}
                    className="w-full h-9 border border-gray-200 rounded-md text-xs px-2 pr-6 focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)} className="p-1.5 rounded-md hover:bg-gray-100">
                  {expandedIdx === idx ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                </button>
                {!readOnly && (
                  <button onClick={() => removeChannel(idx)} className="p-1.5 rounded-md hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
            </div>

            {expandedIdx === idx && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-50 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-3">
                  <Switch checked={ch.use_custom_funnel || false} onCheckedChange={v => updateChannel(idx, 'use_custom_funnel', v)} disabled={readOnly} />
                  <span className="text-xs text-gray-600">Taxas de funil personalizadas para este canal</span>
                </div>
                {ch.use_custom_funnel && (
                  <div className="mb-4">
                    {funnelStages.length >= 2 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {funnelStages.slice(0, -1).map((stage, si) => {
                          const nextStage = funnelStages[si + 1];
                          const overrides = ch.conversion_rate_overrides || [];
                          return (
                            <div key={si}>
                              <label className="text-[10px] text-gray-400">{stage.label}→{nextStage.label}</label>
                              <PercentInput
                                value={overrides[si] ?? 0}
                                onChange={v => {
                                  const updated = [...(ch.conversion_rate_overrides || funnelStages.slice(0, -1).map(() => 0))];
                                  updated[si] = v;
                                  updateChannel(idx, 'conversion_rate_overrides', updated);
                                }}
                                className="h-8 text-xs" disabled={readOnly}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400">Lead→Agend.</label>
                          <PercentInput value={ch.lead_to_appointment_rate_override || 0} onChange={v => updateChannel(idx, 'lead_to_appointment_rate_override', v)} className="h-8 text-xs" disabled={readOnly} />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400">Agend.→Compar.</label>
                          <PercentInput value={ch.appointment_to_show_rate_override || 0} onChange={v => updateChannel(idx, 'appointment_to_show_rate_override', v)} className="h-8 text-xs" disabled={readOnly} />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400">Compar.→Venda</label>
                          <PercentInput value={ch.show_to_sale_rate_override || 0} onChange={v => updateChannel(idx, 'show_to_sale_rate_override', v)} className="h-8 text-xs" disabled={readOnly} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <ChannelStrategies
                  strategies={ch.strategies || []}
                  channelBudget={ch.budget_value || 0}
                  taxPercent={ch.tax_percent || 0}
                  days={days}
                  readOnly={readOnly}
                  channelName={ch.channel_name}
                  objectives={dbObjectives}
                  funnelTypes={funnelTypes}
                  benchmarks={benchmarks}
                  segment={segment}
                  planFunnelTypeId={planFunnelTypeId}
                  onChange={(newStrategies) => updateChannel(idx, 'strategies', newStrategies)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}