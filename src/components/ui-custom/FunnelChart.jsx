import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';

const FILLS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#10b981'];

const DEFAULT_STAGES = ['Leads', 'Agendamentos', 'Comparecimentos', 'Vendas'];
const DEFAULT_KEYS = ['total_leads', 'total_appointments', 'total_showups', 'total_sales'];

export default function FunnelChart({ data, title, funnelStages }) {
  // funnelStages: array of { label } from FunnelType.stages
  // data.stageValues: dynamic array [leads, s1, s2, ..., sales] from calculateConsolidated
  
  let funnelData;

  if (funnelStages && funnelStages.length >= 2 && data?.stageValues?.length === funnelStages.length) {
    // Modo dinâmico: usa stageValues + labels do funil
    funnelData = funnelStages.map((s, i) => ({
      stage: s.label,
      value: data.stageValues[i] || 0,
      fill: FILLS[i % FILLS.length],
    }));
  } else {
    // Fallback: 4 etapas fixas
    const labels = funnelStages?.length >= 2 ? funnelStages.map(s => s.label) : DEFAULT_STAGES;
    funnelData = DEFAULT_KEYS.map((key, i) => ({
      stage: labels[i] || DEFAULT_STAGES[i],
      value: Math.round(data?.[key] || 0),
      fill: FILLS[i % FILLS.length],
    }));
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      {title && <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={funnelData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              formatter={(value) => [value.toLocaleString(), '']}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {funnelData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v) => v > 0 ? v.toLocaleString('pt-BR') : ''}
                style={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Conversion rates between stages */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-50 flex-wrap">
        {funnelData.slice(0, -1).map((stage, i) => {
          const next = funnelData[i + 1];
          const rate = stage.value > 0 ? ((next.value / stage.value) * 100).toFixed(1) : 0;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400">{stage.stage} → {next.stage}</span>
              <span className="text-[11px] font-semibold text-gray-700">{rate}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}