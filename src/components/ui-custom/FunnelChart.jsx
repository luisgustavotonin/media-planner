import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';

const DEFAULT_STAGES = [
  { label: 'Leads', key: 'total_leads', fill: '#3b82f6' },
  { label: 'Agendamentos', key: 'total_appointments', fill: '#6366f1' },
  { label: 'Comparecimentos', key: 'total_showups', fill: '#8b5cf6' },
  { label: 'Vendas', key: 'total_sales', fill: '#10b981' },
];

const FILLS = ['#3b82f6', '#6366f1', '#8b5cf6', '#10b981'];

export default function FunnelChart({ data, title, funnelStages }) {
  // funnelStages: array of { label } from FunnelType.stages
  // Map funnel stages to data keys in order
  const stages = funnelStages && funnelStages.length >= 2
    ? funnelStages.map((s, i) => ({
        label: s.label,
        fill: FILLS[i] || '#94a3b8',
        key: DEFAULT_STAGES[i]?.key || null,
      }))
    : DEFAULT_STAGES;

  const funnelData = stages.map(s => ({
    stage: s.label,
    value: s.key ? Math.round(data?.[s.key] || 0) : 0,
    fill: s.fill,
  }));

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
      {/* Conversion rates */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-50">
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