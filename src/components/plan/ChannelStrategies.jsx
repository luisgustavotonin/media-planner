import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import CurrencyInput from '../ui-custom/CurrencyInput';
import PercentInput from '../ui-custom/PercentInput';

const fmtBRL = (n) => `R$ ${(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDaily = (budget, days) => days > 0 ? fmtBRL(budget / days) : fmtBRL(0);

// Retorna info do objetivo selecionado: tipo, unidade do KPI e rótulo
function getObjectiveInfo(objectiveName, objectives) {
  const obj = objectives.find(o => o.name === objectiveName);
  if (!obj) return { type: 'performance', kpiUnit: 'moeda', kpiLabel: 'Custo' };
  const primaryMetric = (obj.metrics || []).find(m => m.is_primary);
  let kpiLabel = obj.primary_kpi_label || 'Custo';
  if (primaryMetric?.key === 'leads') kpiLabel = 'CPL';
  else if (primaryMetric?.key === 'clicks') kpiLabel = 'CPC';
  else if (primaryMetric?.key === 'impressions') kpiLabel = 'CPM';
  else if (primaryMetric?.key === 'ctr') kpiLabel = 'CTR';
  return { type: obj.type || 'performance', kpiUnit: obj.kpi_unit || 'moeda', kpiLabel };
}

// ─── Ad Set (Conjunto de Anúncios) ───────────────────────────────────────────
function AdSet({ adset, days, onChange, onRemove, readOnly, maxBudget }) {
  const [open, setOpen] = useState(false);
  const updateField = (field, val) => onChange({ ...adset, [field]: val });
  const updateParam = (field, val) => onChange({ ...adset, params: { ...(adset.params || {}), [field]: val } });
  const isOver = maxBudget !== undefined && (adset.budget_value || 0) > maxBudget + 0.01;

  return (
    <div className="border border-gray-100 rounded-lg bg-gray-50/50 overflow-hidden">
      <div className="flex items-center gap-2 p-2">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-gray-400 hover:text-gray-600">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <input type="text" value={adset.name || ''} onChange={e => updateField('name', e.target.value)}
          placeholder="Nome do conjunto de anúncios" disabled={readOnly}
          className="flex-1 h-7 border border-gray-200 rounded-md text-xs px-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50" />
        <div className="w-36">
          <CurrencyInput value={adset.budget_value || 0}
            onChange={v => updateField('budget_value', Number(v))}
            prefix="R$" className={`text-xs h-7 ${isOver ? 'border-red-400 ring-1 ring-red-300' : ''}`} disabled={readOnly} />
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
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={readOnly}
        className="w-full h-7 border border-gray-200 rounded-md text-xs px-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50" />
    </div>
  );
}

// ─── Campaign (Meta) ─────────────────────────────────────────────────────────
function Campaign({ campaign, days, onChange, onRemove, readOnly, maxCampaignBudget, objectives, availableObjectives }) {
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

  const campaignBudget = campaign.budget_value || 0;
  const adsetTotal = (campaign.adsets || []).reduce((s, a) => s + (a.budget_value || 0), 0);
  const campaignRemaining = campaignBudget - adsetTotal;
  const objInfo = getObjectiveInfo(campaign.objective, objectives);
  const isBranding = objInfo.type === 'branding';
  const isCampaignOver = maxCampaignBudget !== undefined && campaignBudget > maxCampaignBudget + 0.01;
  const isAdsetOver = adsetTotal > campaignBudget + 0.01;

  const renderKpiInput = () => {
    const label = isBranding ? `Meta (${objInfo.kpiLabel})` : `Valor do KPI (${objInfo.kpiLabel})`;
    if (readOnly) {
      const display = objInfo.kpiUnit === 'percentual'
        ? `${((campaign.kpi_value || 0) * 100).toFixed(1)}%`
        : objInfo.kpiUnit === 'numero'
          ? (campaign.kpi_value || 0).toLocaleString('pt-BR')
          : fmtBRL(campaign.kpi_value || 0);
      return (
        <div className="w-24 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
          <span className="text-xs font-semibold text-gray-700">{display}</span>
        </div>
      );
    }
    if (objInfo.kpiUnit === 'percentual') {
      return (
        <div className="w-24 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
          <PercentInput value={campaign.kpi_value || 0} onChange={v => updateField('kpi_value', v)} className="h-8 text-xs" />
        </div>
      );
    }
    if (objInfo.kpiUnit === 'numero') {
      return (
        <div className="w-24 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
          <input type="number" min="0" value={campaign.kpi_value || ''} placeholder="Meta"
            onChange={e => updateField('kpi_value', parseFloat(e.target.value) || 0)}
            className="w-full h-8 border border-gray-200 rounded-md text-xs px-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      );
    }
    return (
      <div className="w-24 shrink-0">
        <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
        <CurrencyInput value={campaign.kpi_value || 0} onChange={v => updateField('kpi_value', v)}
          prefix="R$" className="text-xs h-8" placeholder="KPI" />
      </div>
    );
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${isCampaignOver ? 'border-red-300' : 'border-gray-200'}`}>
      {/* Campaign header */}
      <div className="flex items-end gap-2 p-3 bg-white flex-wrap">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-gray-400 hover:text-gray-600 mb-1.5">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] text-gray-400 block mb-1">Nome da campanha</label>
          <input type="text" value={campaign.name || ''} onChange={e => updateField('name', e.target.value)}
            placeholder="Ex: Topo de funil" disabled={readOnly}
            className="w-full h-8 border border-gray-200 rounded-md text-xs px-2 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50" />
        </div>
        <div className="w-32 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">Valor da campanha</label>
          <CurrencyInput value={campaignBudget} onChange={v => updateField('budget_value', Number(v))}
            prefix="R$" className={`text-xs h-8 ${isCampaignOver ? 'border-red-400 ring-1 ring-red-300' : ''}`}
            disabled={readOnly} placeholder="Budget" />
        </div>
        <div className="w-28 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">Objetivo</label>
          {readOnly ? (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full border bg-secondary/60 text-secondary-foreground border-border whitespace-nowrap">
              {campaign.objective || '—'}
            </span>
          ) : (
            <Select value={campaign.objective || ''} onValueChange={v => updateField('objective', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Objetivo" /></SelectTrigger>
              <SelectContent>
                {(availableObjectives || objectives).map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        {renderKpiInput()}
        {!readOnly && (
          <button onClick={onRemove} className="p-1.5 rounded hover:bg-red-50 ml-1 mb-1.5">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        )}
      </div>

      {/* Ad sets */}
      {open && (
        <div className="p-3 pt-2 bg-gray-50/70 space-y-2 border-t border-gray-100">
          <div className="flex items-center justify-between pt-1 pb-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3" /> Conjuntos de anúncios
            </span>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-medium ${isAdsetOver ? 'text-red-500' : 'text-gray-400'}`}>
                Alocado {fmtBRL(adsetTotal)} de {fmtBRL(campaignBudget)} · Restante {fmtBRL(campaignRemaining)}
              </span>
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={addAdSet} className="h-6 text-[10px] gap-1 px-2">
                  <Plus className="w-3 h-3" /> Conjunto
                </Button>
              )}
            </div>
          </div>
          {isAdsetOver && (
            <p className="text-[11px] text-red-500 font-medium">⚠ A soma dos conjuntos excede o budget da campanha.</p>
          )}
          {(campaign.adsets || []).length === 0 && (
            <p className="text-[11px] text-gray-400">Nenhum conjunto adicionado.</p>
          )}
          {(campaign.adsets || []).map((adset, idx) => {
            // O máximo que este adset pode ter = budget da campanha - soma dos outros adsets
            const otherAdsetsTotal = adsetTotal - (adset.budget_value || 0);
            const maxForAdset = campaignBudget - otherAdsetsTotal;
            return (
              <AdSet key={idx} adset={adset} days={days}
                onChange={updated => updateAdSet(idx, updated)} onRemove={() => removeAdSet(idx)}
                readOnly={readOnly} maxBudget={maxForAdset} />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Google Campaign ──────────────────────────────────────────────────────────
function GoogleCampaign({ campaign, days, onChange, onRemove, readOnly, maxCampaignBudget, objectives, availableObjectives }) {
  const [open, setOpen] = useState(true);
  const updateField = (field, val) => onChange({ ...campaign, [field]: val });
  const updateParam = (field, val) => onChange({ ...campaign, params: { ...(campaign.params || {}), [field]: val } });
  const objInfo = getObjectiveInfo(campaign.objective, objectives);
  const isBranding = objInfo.type === 'branding';
  const isOver = maxCampaignBudget !== undefined && (campaign.budget_value || 0) > maxCampaignBudget + 0.01;

  const renderKpiInput = () => {
    const label = isBranding ? `Meta (${objInfo.kpiLabel})` : `Valor do KPI (${objInfo.kpiLabel})`;
    if (readOnly) {
      const display = objInfo.kpiUnit === 'percentual'
        ? `${((campaign.kpi_value || 0) * 100).toFixed(1)}%`
        : objInfo.kpiUnit === 'numero'
          ? (campaign.kpi_value || 0).toLocaleString('pt-BR')
          : fmtBRL(campaign.kpi_value || 0);
      return (
        <div className="w-24 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
          <span className="text-xs font-semibold text-gray-700">{display}</span>
        </div>
      );
    }
    if (objInfo.kpiUnit === 'percentual') {
      return (
        <div className="w-24 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
          <PercentInput value={campaign.kpi_value || 0} onChange={v => updateField('kpi_value', v)} className="h-8 text-xs" />
        </div>
      );
    }
    if (objInfo.kpiUnit === 'numero') {
      return (
        <div className="w-24 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
          <input type="number" min="0" value={campaign.kpi_value || ''} placeholder="Meta"
            onChange={e => updateField('kpi_value', parseFloat(e.target.value) || 0)}
            className="w-full h-8 border border-gray-200 rounded-md text-xs px-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      );
    }
    return (
      <div className="w-24 shrink-0">
        <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
        <CurrencyInput value={campaign.kpi_value || 0} onChange={v => updateField('kpi_value', v)}
          prefix="R$" className="text-xs h-8" placeholder="KPI" />
      </div>
    );
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${isOver ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="flex items-end gap-2 p-3 bg-white flex-wrap">
        <button onClick={() => setOpen(o => !o)} className="p-0.5 text-gray-400 hover:text-gray-600 mb-1.5">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] text-gray-400 block mb-1">Nome da campanha</label>
          <input type="text" value={campaign.name || ''} onChange={e => updateField('name', e.target.value)}
            placeholder="Ex: Topo de funil" disabled={readOnly}
            className="w-full h-8 border border-gray-200 rounded-md text-xs px-2 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50" />
        </div>
        <div className="w-28 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">Objetivo</label>
          {readOnly ? (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full border bg-secondary/60 text-secondary-foreground border-border whitespace-nowrap">
              {campaign.objective || '—'}
            </span>
          ) : (
            <Select value={campaign.objective || ''} onValueChange={v => updateField('objective', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Objetivo" /></SelectTrigger>
              <SelectContent>
                {(availableObjectives || objectives).map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        {renderKpiInput()}
        <div className="w-28 shrink-0">
          <label className="text-[10px] text-gray-400 block mb-1">Valor da campanha</label>
          <CurrencyInput value={campaign.budget_value || 0} onChange={v => updateField('budget_value', Number(v))}
            prefix="R$" className={`text-xs h-8 ${isOver ? 'border-red-400 ring-1 ring-red-300' : ''}`} disabled={readOnly} />
        </div>
        <div className="text-right w-16 shrink-0">
          <span className="text-[10px] text-gray-400">por dia</span>
          <p className="text-[11px] font-medium text-gray-600">{fmtDaily(campaign.budget_value || 0, days)}</p>
        </div>
        {!readOnly && (
          <button onClick={onRemove} className="p-1.5 rounded hover:bg-red-50 ml-1 mb-1.5">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        )}
      </div>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ParamField label="Público-alvo" value={campaign.params?.publico || ''} onChange={v => updateParam('publico', v)} placeholder="Ex: Visitantes do site, Lookalike" readOnly={readOnly} />
            <ParamField label="Faixa etária" value={campaign.params?.faixa_etaria || ''} onChange={v => updateParam('faixa_etaria', v)} placeholder="Ex: 30-55" readOnly={readOnly} />
            <ParamField label="Gênero" value={campaign.params?.genero || ''} onChange={v => updateParam('genero', v)} placeholder="Ex: Todos, Feminino, Masculino" readOnly={readOnly} />
            <ParamField label="Localização" value={campaign.params?.localizacao || ''} onChange={v => updateParam('localizacao', v)} placeholder="Ex: Florianópolis, SC — 15km" readOnly={readOnly} />
            <ParamField label="Palavras-chave" value={campaign.params?.palavras_chave || ''} onChange={v => updateParam('palavras_chave', v)} placeholder="Ex: implante dentário..." readOnly={readOnly} />
            <ParamField label="Formato do anúncio" value={campaign.params?.formato || ''} onChange={v => updateParam('formato', v)} placeholder="Ex: Display, Responsivo" readOnly={readOnly} />
            <ParamField label="Interesses" value={campaign.params?.interesses || ''} onChange={v => updateParam('interesses', v)} placeholder="Ex: Saúde, Bem-estar" readOnly={readOnly} />
            <ParamField label="Observações" value={campaign.params?.observacoes || ''} onChange={v => updateParam('observacoes', v)} placeholder="Notas adicionais" readOnly={readOnly} />
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleStrategies({ strategies = [], channelBudget = 0, days = 30, onChange, readOnly, objectives, availableObjectives }) {
  const totalAllocated = strategies.reduce((s, c) => s + (c.budget_value || 0), 0);
  const remaining = channelBudget - totalAllocated;

  const addCampaign = () => {
    if (readOnly) return;
    onChange([...strategies, { name: '', objective: '', kpi_value: 0, budget_value: 0, params: {} }]);
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
      {remaining < -0.01 && (
        <p className="text-[11px] text-red-500 font-medium">⚠ A soma das campanhas excede o budget do canal.</p>
      )}
      {strategies.length === 0 && (
        <p className="text-[11px] text-gray-400 py-1">Nenhuma campanha adicionada.</p>
      )}
      <div className="space-y-3">
        {strategies.map((camp, idx) => {
          const otherTotal = totalAllocated - (camp.budget_value || 0);
          const maxForCampaign = channelBudget - otherTotal;
          return (
            <GoogleCampaign key={idx} campaign={camp} days={days}
              onChange={updated => updateCampaign(idx, updated)} onRemove={() => removeCampaign(idx)}
              readOnly={readOnly} maxCampaignBudget={maxForCampaign} objectives={objectives} availableObjectives={availableObjectives} />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChannelStrategies({ strategies = [], channelBudget = 0, taxPercent = 0, days = 30, onChange, readOnly, channelName = 'Meta', objectives = [] }) {
  // Filtra objetivos aplicáveis a este canal (sem channels = disponível para todos)
  const availableObjectives = objectives.filter(o => !o.channels || o.channels.length === 0 || o.channels.includes(channelName));

  // Total alocado = soma dos budgets das campanhas (cada campanha tem seu próprio budget)
  const totalAllocated = strategies.reduce((s, camp) => s + (camp.budget_value || 0), 0);
  const remaining = (channelBudget || 0) - totalAllocated;

  const addCampaign = () => {
    if (readOnly) return;
    onChange([...strategies, { name: '', objective: '', kpi_value: 0, budget_value: 0, adsets: [] }]);
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
      <GoogleStrategies strategies={strategies} channelBudget={channelBudget} days={days}
        onChange={onChange} readOnly={readOnly} objectives={objectives} availableObjectives={availableObjectives} />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Campanhas</span>
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
      {remaining < -0.01 && (
        <p className="text-[11px] text-red-500 font-medium">⚠ A soma das campanhas excede o budget do canal.</p>
      )}
      {strategies.length === 0 && (
        <p className="text-[11px] text-gray-400 py-1">Nenhuma campanha adicionada. Cada campanha tem seu próprio objetivo e KPI de custo.</p>
      )}
      <div className="space-y-3">
        {strategies.map((camp, idx) => {
          // O máximo que esta campanha pode ter = budget do canal - soma das outras campanhas
          const otherTotal = totalAllocated - (camp.budget_value || 0);
          const maxForCampaign = channelBudget - otherTotal;
          return (
            <Campaign key={idx} campaign={camp} days={days}
              onChange={updated => updateCampaign(idx, updated)} onRemove={() => removeCampaign(idx)}
              readOnly={readOnly} maxCampaignBudget={maxForCampaign} objectives={objectives} availableObjectives={availableObjectives} />
          );
        })}
      </div>
    </div>
  );
}