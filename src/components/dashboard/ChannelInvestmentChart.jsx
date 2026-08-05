import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/format';

const PALETTE = ['#f85d07', '#c2410c', '#7e6951', '#d97706', '#92400e', '#b45309', '#a16207', '#78350f'];

export default function ChannelInvestmentChart({ data }) {
  // data: [{ name, value }]
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  if (!sorted.length || total === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
        <h3 className="text-sm font-semibold text-foreground">Investimento por Canal</h3>
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/70 py-10">
          Sem dados de investimento
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-foreground mb-1">Investimento por Canal</h3>
      <p className="text-[11px] text-muted-foreground mb-3">Total: {formatCurrency(total)}</p>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sorted}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {sorted.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [formatCurrency(v), 'Investimento']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-1.5">
        {sorted.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="text-foreground/80 truncate flex-1">{d.name}</span>
              <span className="text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
              <span className="font-medium text-foreground tabular-nums w-20 text-right">{formatCurrency(d.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}