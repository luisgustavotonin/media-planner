import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import CurrencyInput from '../ui-custom/CurrencyInput';

const FUNNEL_STAGES = [
  { value: 'topo', label: 'Topo (Reconhecimento)' },
  { value: 'meio', label: 'Meio (Consideração)' },
  { value: 'fundo', label: 'Fundo (Conversão)' },
  { value: 'remarketing', label: 'Remarketing' },
];

const STAGE_COLORS = {
  topo: 'bg-blue-50 text-blue-600 border-blue-100',
  meio: 'bg-amber-50 text-amber-600 border-amber-100',
  fundo: 'bg-green-50 text-green-600 border-green-100',
  remarketing: 'bg-purple-50 text-purple-600 border-purple-100',
};

const fmt = (n) => `R$ ${(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ChannelStrategies({ strategies = [], channelBudget = 0, days = 30, onChange, readOnly }) {
  const allocated = strategies.reduce((s, st) => s + (st.budget_value || 0), 0);
  const remaining = (channelBudget || 0) - allocated;

  const update = (idx, field, value) => {
    if (readOnly) return;
    onChange(strategies.map((st, i) => (i === idx ? { ...st, [field]: value } : st)));
  };

  const add = () => {
    if (readOnly) return;
    onChange([...strategies, { name: '', funnel_stage: 'topo', budget_value: 0 }]);
  };

  const remove = (idx) => {
    if (readOnly) return;
    onChange(strategies.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Estratégias / Etapas do Funil</span>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-medium ${remaining < -0.01 ? 'text-red-500' : 'text-gray-400'}`}>
            Alocado {fmt(allocated)} de {fmt(channelBudget)} · Restante {fmt(remaining)}
          </span>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={add} className="h-7 text-[11px] gap-1">
              <Plus className="w-3 h-3" /> Estratégia
            </Button>
          )}
        </div>
      </div>

      {strategies.length === 0 && (
        <p className="text-[11px] text-gray-400 py-1">Nenhuma estratégia adicionada. Divida o valor do canal por etapa do funil.</p>
      )}

      <div className="space-y-2">
        {strategies.map((st, idx) => {
          const daily = days > 0 ? (st.budget_value || 0) / days : 0;
          return (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white rounded-lg border border-gray-100 p-2">
              <input
                type="text"
                value={st.name || ''}
                onChange={e => update(idx, 'name', e.target.value)}
                placeholder="Nome da campanha / estratégia"
                disabled={readOnly}
                className="col-span-12 sm:col-span-4 h-8 border border-gray-200 rounded-md text-xs px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
              />
              <div className="col-span-5 sm:col-span-3">
                {readOnly ? (
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${STAGE_COLORS[st.funnel_stage] || ''}`}>
                    {FUNNEL_STAGES.find(f => f.value === st.funnel_stage)?.label || st.funnel_stage}
                  </span>
                ) : (
                  <Select value={st.funnel_stage} onValueChange={v => update(idx, 'funnel_stage', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{FUNNEL_STAGES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div className="col-span-4 sm:col-span-3">
                <CurrencyInput value={st.budget_value || 0} onChange={v => update(idx, 'budget_value', v)} prefix="R$" className="text-xs h-8" disabled={readOnly} />
              </div>
              <div className="col-span-2 sm:col-span-1 text-right">
                <span className="text-[10px] text-gray-400 block leading-tight">/dia</span>
                <span className="text-[11px] font-medium text-gray-600">{fmt(daily)}</span>
              </div>
              <div className="col-span-1 flex justify-end">
                {!readOnly && (
                  <button onClick={() => remove(idx)} className="p-1 rounded hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}