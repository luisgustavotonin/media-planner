import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid } from 'recharts';
import { formatInt } from '@/lib/format';

const DEFAULT_LABELS = ['Leads', 'Agendamentos', 'Comparecimentos', 'Vendas'];
const BARS = ['#f85d07', '#c2410c', '#7e6951', '#92400e'];

export default function FunnelProjectionChart({ data }) {
  // data: array of stage values (numbers)
  const stages = (data || []).map((v, i) => ({
    stage: DEFAULT_LABELS[i] || `Etapa ${i + 1}`,
    value: v || 0,
  }));

  if (!stages.length || stages.every(s => s.value === 0)) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
        <h3 className="text-sm font-semibold text-foreground">Funil de Conversão Projetado</h3>
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/70 py-10">
          Sem projeção de funil
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-foreground mb-3">Funil de Conversão Projetado</h3>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stages} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              formatter={(v) => [formatInt(v), 'Volume']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {stages.map((_, i) => (
                <Cell key={i} fill={BARS[i % BARS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}