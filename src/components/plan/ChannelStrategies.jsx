import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import CurrencyInput from '../ui-custom/CurrencyInput';

const FUNNEL_STAGES = [
  { value: 'topo', label: 'Topo (Reconhecimento)' },
  { value: 'meio', label: 'Meio (Consideração)' },
  { value: 'fundo', label: 'Fundo (Conversão)' },
];

const STAGE_COLORS = {
  topo: 'bg-secondary/60 text-secondary-foreground border-border',
  meio: 'bg-secondary/60 text-secondary-foreground border-border',
  fundo: 'bg-secondary/60 text-secondary-foreground border-border',
};

const fmtBRL = (n) => `R$ ${(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDaily = (budget, days) => days > 0 ? fmtBRL(budget / days) : fmtBRL(0);

// ─── Ad Set (Conjunto de Anúncios) ───────────────────────────────────────────
function AdSet({ adset, days, onChange, onRemove, readOnly, maxBudget }) {
  const [open, setOpen] = useState(false);

  const updateField = (field, val) => onChange({ ...adset, [field]: val });
  const updateParam = (field, val) => onChange({ ...adset, params: { ...(adset.params || {}), [field]: val } });

  return (
    <div className="border border-gray-100 rounded-lg bg-gray-50/50 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 p-2">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-gray-400 hover:text-gray-600">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <input
          type="text"
          value={adset.name || ''}
          onChange={e => updateField('name', e.target.value)}
          placeholder="Nome do conjunto de anúncios"
          disabled={readOnly}
          className="flex-1 h-7 border border-gray-200 rounded-md text-xs px-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50"
        />
        <div className="w-36">
          <CurrencyInput
            value={adset.budget_value || 0}
            onChange={v => {
              const capped = maxBudget !== undefined ? Math.min(Number(v), maxBudget) : Number(v);
              updateField('budget_value', capped);
            }}
            prefix="R$"
            className={`text-xs h-7 ${maxBudget !== undefined && (adset.budget_value || 0) > maxBudget ? 'border-red-400' : ''}`}
            disabled={readOnly}
          />
        </div>
        <div className="text-right w-24 shrink-0">
          <span className="text-[10px] text-gray-400">por dia</span>
          <p className="text-[11px] font-medium text-gray-600">{fmtDaily(adset.budget_value || 0, days)}</p>
        </div>
        {!readOnly && (
          <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 ml-1">
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        )}
      </div>

      {/* Parametrizações expandidas */}
      {open && (
        <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-gray-100 mt-1">
          <ParamField label="Objetivo do conjunto" value={adset.params?.objetivo || ''} onChange={v => updateParam('objetivo', v)} placeholder="Ex: Leads, Tráfego, Conversão" readOnly={readOnly} />
          <ParamField label="Público-alvo" value={adset.params?.publico || ''} onChange={v => updateParam('publico', v)} placeholder="Ex: Interesses, Lookalike" readOnly={readOnly} />
          <ParamField label="Faixa etária" value={adset.params?.faixa_etaria || ''} onChange={v => updateParam('faixa_etaria', v)} placeholder="Ex: 30-55" readOnly={readOnly} />
          <ParamField label="Gênero" value={adset.params?.genero || ''} onChange={v => updateParam('genero', v)} placeholder="Ex: Todos, Feminino, Masculino" readOnly={readOnly} />
          <ParamField label="Localização" value={adset.params?.localizacao || ''} onChange={v => updateParam('localizacao', v)} placeholder="Ex: Florianópolis, SC — 15km" readOnly={readOnly} />
          <ParamField label="Formato do anúncio" value={adset.params?.formato || ''} onChange={v => updateParam('formato', v)} placeholder="Ex: Carrossel, Vídeo, Imagem" readOnly={readOnly} />
          <ParamField label="Interesses" value={adset.params?.interesses || ''} onChange={v => updateParam('interesses', v)} placeholder="Ex: Odontologia, Estética" readOnly={readOnly} />
          <ParamField label="Comportamento" value={adset.params?.comportamento || ''} onChange={v => updateParam('comportamento', v)} placeholder="Ex: Engajamento recente" readOnly={readOnly} />
          <ParamField label="Observações" value={adset.params?.observacoes || ''} onChange={v => updateParam('observacoes', v)} placeholder="Notas adicionais" readOnly={readOnly} />
        </div>
      )}
    </div>
  );
}

function ParamField({ label, value, onChange, placeholder, readOnly }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={readOnly}
        className="w-full h-7 border border-gray-200 rounded-md text-xs px-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50"
      />
    </div>
  );
}

// ─── Campaign ────────────────────────────────────────────────────────────────
function Campaign({ campaign, days, onChange, onRemove, readOnly, channelRemaining = 0 }) {
  const [open, setOpen] = useState(true);

  const updateField = (field, val) => onChange({ ...campaign, [field]: val });

  const updateAdSet = (idx, updated) => {
    const adsets = (campaign.adsets || []).map((a, i) => i === idx ? updated : a);
    onChange({ ...campaign, adsets });
  };

  const removeAdSet = (idx) => {
    onChange({ ...campaign, adsets: (campaign.adsets || []).filter((_, i) => i !== idx) });
  };

  const addAdSet = () => {
    onChange({ ...campaign, adsets: [...(campaign.adsets || []), { name: '', budget_value: 0, params: {} }] });
  };

  const totalBudget = (campaign.adsets || []).reduce((s, a) => s + (a.budget_value || 0), 0);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Campaign header */}
      <div className="flex items-center gap-2 p-3 bg-white">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-gray-400 hover:text-gray-600">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <input
          type="text"
          value={campaign.name || ''}
          onChange={e => updateField('name', e.target.value)}
          placeholder="Nome da campanha"
          disabled={readOnly}
          className="flex-1 h-8 border border-gray-200 rounded-md text-xs px-2 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50"
        />
        {readOnly ? (
          <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${STAGE_COLORS[campaign.funnel_stage] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
            {FUNNEL_STAGES.find(f => f.value === campaign.funnel_stage)?.label || campaign.funnel_stage}
          </span>
        ) : (
          <div className="w-48">
            <Select value={campaign.funnel_stage || 'topo'} onValueChange={v => updateField('funnel_stage', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{FUNNEL_STAGES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="text-right w-24 shrink-0">
          <span className="text-[10px] text-gray-400">total conjuntos</span>
          <p className="text-xs font-semibold text-gray-700">{fmtBRL(totalBudget)}</p>
        </div>
        {!readOnly && (
          <button onClick={onRemove} className="p-1.5 rounded hover:bg-red-50 ml-1">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        )}
      </div>

      {/* Ad sets */}
      {open && (
        <div className="p-3 pt-0 bg-gray-50/70 space-y-2 border-t border-gray-100">
          <div className="flex items-center justify-between pt-2 pb-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3" /> Conjuntos de anúncios
            </span>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={addAdSet} className="h-6 text-[10px] gap-1 px-2">
                <Plus className="w-3 h-3" /> Conjunto
              </Button>
            )}
          </div>
          {(campaign.adsets || []).length === 0 && (
            <p className="text-[11px] text-gray-400">Nenhum conjunto adicionado.</p>
          )}
          {(campaign.adsets || []).map((adset, idx) => {
            const maxForAdset = (adset.budget_value || 0) + Math.max(0, channelRemaining);
            return (
              <AdSet
                key={idx}
                adset={adset}
                days={days}
                onChange={updated => updateAdSet(idx, updated)}
                onRemove={() => removeAdSet(idx)}
                readOnly={readOnly}
                maxBudget={maxForAdset}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Google Campaign ──────────────────────────────────────────────────────────
const GOOGLE_CAMPAIGN_TYPES = [
  { value: 'pesquisa', label: 'Campanha de Pesquisa' },
  { value: 'remarketing', label: 'Campanha de Remarketing' },
];

function GoogleCampaign({ campaign, days, onChange, onRemove, readOnly }) {
  const [open, setOpen] = useState(true);
  const updateField = (field, val) => onChange({ ...campaign, [field]: val });
  const updateParam = (field, val) => onChange({ ...campaign, params: { ...(campaign.params || {}), [field]: val } });

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-white">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-gray-400 hover:text-gray-600">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <input
          type="text"
          value={campaign.name || ''}
          onChange={e => updateField('name', e.target.value)}
          placeholder="Nome da campanha"
          disabled={readOnly}
          className="flex-1 h-8 border border-gray-200 rounded-md text-xs px-2 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50"
        />
        {readOnly ? (
          <span className="text-[10px] font-medium px-2 py-1 rounded-full border bg-secondary/60 text-secondary-foreground border-border">
            {GOOGLE_CAMPAIGN_TYPES.find(t => t.value === campaign.type)?.label || campaign.type}
          </span>
        ) : (
          <div className="w-52">
            <Select value={campaign.type || 'pesquisa'} onValueChange={v => updateField('type', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{GOOGLE_CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="w-32">
          <CurrencyInput value={campaign.budget_value || 0} onChange={v => updateField('budget_value', Number(v))} prefix="R$" className="text-xs h-8" disabled={readOnly} />
        </div>
        <div className="text-right w-20 shrink-0">
          <span className="text-[10px] text-gray-400">por dia</span>
          <p className="text-[11px] font-medium text-gray-600">{fmtDaily(campaign.budget_value || 0, days)}</p>
        </div>
        {!readOnly && (
          <button onClick={onRemove} className="p-1.5 rounded hover:bg-red-50 ml-1">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        )}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
          {(campaign.type || 'pesquisa') === 'pesquisa' ? (
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Palavras-chave</p>
              <textarea
                value={campaign.params?.palavras_chave || ''}
                onChange={e => updateParam('palavras_chave', e.target.value)}
                placeholder="Ex: implante dentário, clínica de implantes SP..."
                disabled={readOnly}
                rows={3}
                className="w-full border border-gray-200 rounded-md text-xs px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 resize-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ParamField label="Público-alvo" value={campaign.params?.publico || ''} onChange={v => updateParam('publico', v)} placeholder="Ex: Visitantes do site, Lookalike" readOnly={readOnly} />
              <ParamField label="Faixa etária" value={campaign.params?.faixa_etaria || ''} onChange={v => updateParam('faixa_etaria', v)} placeholder="Ex: 30-55" readOnly={readOnly} />
              <ParamField label="Gênero" value={campaign.params?.genero || ''} onChange={v => updateParam('genero', v)} placeholder="Ex: Todos, Feminino, Masculino" readOnly={readOnly} />
              <ParamField label="Localização" value={campaign.params?.localizacao || ''} onChange={v => updateParam('localizacao', v)} placeholder="Ex: Florianópolis, SC — 15km" readOnly={readOnly} />
              <ParamField label="Formato do anúncio" value={campaign.params?.formato || ''} onChange={v => updateParam('formato', v)} placeholder="Ex: Display, Responsivo" readOnly={readOnly} />
              <ParamField label="Interesses" value={campaign.params?.interesses || ''} onChange={v => updateParam('interesses', v)} placeholder="Ex: Saúde, Bem-estar" readOnly={readOnly} />
              <ParamField label="Comportamento" value={campaign.params?.comportamento || ''} onChange={v => updateParam('comportamento', v)} placeholder="Ex: Engajamento recente" readOnly={readOnly} />
              <ParamField label="Observações" value={campaign.params?.observacoes || ''} onChange={v => updateParam('observacoes', v)} placeholder="Notas adicionais" readOnly={readOnly} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoogleStrategies({ strategies = [], channelBudget = 0, days = 30, onChange, readOnly }) {
  const totalAllocated = strategies.reduce((s, c) => s + (c.budget_value || 0), 0);
  const remaining = channelBudget - totalAllocated;

  const addCampaign = () => {
    if (readOnly) return;
    onChange([...strategies, { name: '', type: 'pesquisa', budget_value: 0, params: {} }]);
  };

  const updateCampaign = (idx, updated) => {
    if (readOnly) return;
    onChange(strategies.map((c, i) => i === idx ? updated : c));
  };

  const removeCampaign = (idx) => {
    if (readOnly) return;
    onChange(strategies.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Campanhas Google</span>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-medium ${remaining < -0.01 ? 'text-red-500' : 'text-gray-400'}`}>
            Alocado {fmtBRL(totalAllocated)} de {fmtBRL(channelBudget)} · Restante {fmtBRL(remaining)}
          </span>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addCampaign} className="h-7 text-[11px] gap-1">
              <Plus className="w-3 h-3" /> Campanha
            </Button>
          )}
        </div>
      </div>
      {strategies.length === 0 && (
        <p className="text-[11px] text-gray-400 py-1">Nenhuma campanha adicionada. Adicione campanhas de Pesquisa ou Remarketing.</p>
      )}
      <div className="space-y-3">
        {strategies.map((camp, idx) => (
          <GoogleCampaign
            key={idx}
            campaign={camp}
            days={days}
            onChange={updated => updateCampaign(idx, updated)}
            onRemove={() => removeCampaign(idx)}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChannelStrategies({ strategies = [], channelBudget = 0, days = 30, onChange, readOnly, channelName = 'Meta' }) {
  const totalAllocated = strategies.reduce((s, camp) =>
    s + (camp.adsets || []).reduce((ss, a) => ss + (a.budget_value || 0), 0), 0
  );
  const remaining = (channelBudget || 0) - totalAllocated;

  const addCampaign = () => {
    if (readOnly) return;
    onChange([...strategies, { name: '', funnel_stage: 'topo', adsets: [] }]);
  };

  const updateCampaign = (idx, updated) => {
    if (readOnly) return;
    onChange(strategies.map((c, i) => i === idx ? updated : c));
  };

  const removeCampaign = (idx) => {
    if (readOnly) return;
    onChange(strategies.filter((_, i) => i !== idx));
  };

  if (channelName === 'Google') {
    return (
      <GoogleStrategies
        strategies={strategies}
        channelBudget={channelBudget}
        days={days}
        onChange={onChange}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Campanhas / Etapas do Funil</span>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-medium ${remaining < -0.01 ? 'text-red-500' : 'text-gray-400'}`}>
            Alocado {fmtBRL(totalAllocated)} de {fmtBRL(channelBudget)} · Restante {fmtBRL(remaining)}
          </span>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addCampaign} className="h-7 text-[11px] gap-1">
              <Plus className="w-3 h-3" /> Campanha
            </Button>
          )}
        </div>
      </div>

      {strategies.length === 0 && (
        <p className="text-[11px] text-gray-400 py-1">Nenhuma campanha adicionada. Divida o canal por campanha e etapa do funil.</p>
      )}

      <div className="space-y-3">
        {strategies.map((camp, idx) => (
          <Campaign
            key={idx}
            campaign={camp}
            days={days}
            onChange={updated => updateCampaign(idx, updated)}
            onRemove={() => removeCampaign(idx)}
            readOnly={readOnly}
            channelRemaining={remaining}
          />
        ))}
      </div>
    </div>
  );
}