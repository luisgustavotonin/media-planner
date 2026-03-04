import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FunnelChart({ data, title }) {
  const funnelData = [
    { stage: 'Leads', value: data?.total_leads || 0, fill: '#3b82f6' },
    { stage: 'Appointments', value: data?.total_appointments || 0, fill: '#6366f1' },
    { stage: 'Show-ups', value: data?.total_showups || 0, fill: '#8b5cf6' },
    { stage: 'Sales', value: Math.round(data?.total_sales || 0), fill: '#10b981' },
  ];

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
            <Bar dataKey="value" radius={[6, 6, 0, 0]} />
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