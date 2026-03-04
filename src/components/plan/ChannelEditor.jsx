import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import ChannelBadge from '../ui-custom/ChannelBadge';

const CHANNELS = ['Meta', 'Google', 'TikTok', 'YouTube', 'Other'];
const OBJECTIVES = ['Leads', 'Remarketing', 'Awareness', 'Traffic'];

export default function ChannelEditor({ channels, onChange, totalInvestment, readOnly }) {
  const [expandedIdx, setExpandedIdx] = React.useState(null);

  const updateChannel = (idx, field, value) => {
    if (readOnly) return;
    const updated = channels.map((ch, i) => {
      if (i !== idx) return ch;
      const newCh = { ...ch, [field]: value };
      if (field === 'budget_value') {
        const newTotal = channels.reduce((s, c, j) => s + (j === idx ? Number(value) : (c.budget_value || 0)), 0);
        newCh.budget_percent = newTotal > 0 ? (Number(value) / newTotal) * 100 : 0;
      }
      return newCh;
    });
    // Recalculate all percents
    const total = updated.reduce((s, c) => s + (c.budget_value || 0), 0);
    const withPercents = updated.map(ch => ({ ...ch, budget_percent: total > 0 ? (ch.budget_value / total) * 100 : 0 }));
    onChange(withPercents);
  };

  const addChannel = () => {
    if (readOnly) return;
    onChange([...channels, { channel_name: 'Meta', channel_objective: 'Leads', budget_value: 0, budget_percent: 0, expected_cpl: 40, use_custom_funnel: false }]);
  };

  const removeChannel = (idx) => {
    if (readOnly) return;
    const updated = channels.filter((_, i) => i !== idx);
    const total = updated.reduce((s, c) => s + (c.budget_value || 0), 0);
    onChange(updated.map(ch => ({ ...ch, budget_percent: total > 0 ? (ch.budget_value / total) * 100 : 0 })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Alocação de Canais</h3>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addChannel} className="text-xs">
            + Adicionar Canal
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {channels.map((ch, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
                <div>
                  {readOnly ? <ChannelBadge channel={ch.channel_name} /> : (
                    <Select value={ch.channel_name} onValueChange={v => updateChannel(idx, 'channel_name', v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  {readOnly ? <span className="text-xs text-gray-500">{ch.channel_objective}</span> : (
                    <Select value={ch.channel_objective} onValueChange={v => updateChannel(idx, 'channel_objective', v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Input type="number" value={ch.budget_value || ''} onChange={e => updateChannel(idx, 'budget_value', Number(e.target.value))}
                    placeholder="Budget R$" className="h-9 text-xs" disabled={readOnly} />
                </div>
                <div className="text-center">
                  <span className="text-xs font-medium text-gray-500">{(ch.budget_percent || 0).toFixed(1)}%</span>
                </div>
                <div>
                  <Input type="number" value={ch.expected_cpl || ''} onChange={e => updateChannel(idx, 'expected_cpl', Number(e.target.value))}
                    placeholder="CPL R$" className="h-9 text-xs" disabled={readOnly} />
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
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400">Lead→Agend.</label>
                      <Input type="number" step="0.01" min="0" max="1" value={ch.lead_to_appointment_rate_override || ''} onChange={e => updateChannel(idx, 'lead_to_appointment_rate_override', Number(e.target.value))} className="h-8 text-xs" disabled={readOnly} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">Agend.→Compar.</label>
                      <Input type="number" step="0.01" min="0" max="1" value={ch.appointment_to_show_rate_override || ''} onChange={e => updateChannel(idx, 'appointment_to_show_rate_override', Number(e.target.value))} className="h-8 text-xs" disabled={readOnly} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">Compar.→Venda</label>
                      <Input type="number" step="0.01" min="0" max="1" value={ch.show_to_sale_rate_override || ''} onChange={e => updateChannel(idx, 'show_to_sale_rate_override', Number(e.target.value))} className="h-8 text-xs" disabled={readOnly} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Column Labels */}
      <div className="hidden sm:grid grid-cols-5 gap-3 px-4 text-[10px] text-gray-400 uppercase tracking-wider">
        <span>Canal</span><span>Objetivo</span><span>Budget (R$)</span><span className="text-center">%</span><span>CPL (R$)</span>
      </div>
    </div>
  );
}