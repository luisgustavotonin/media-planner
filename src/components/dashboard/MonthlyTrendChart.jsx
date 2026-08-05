import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { formatCurrency, formatInt } from '@/lib/format';

export default function MonthlyTrendChart({ data }) {
  // data: [{ label, investment, revenue }]
  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
        <h3 className="text-sm font-semibold text-foreground">Tendência Mensal</h3>
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/70 py-10">
          Sem histórico suficiente
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Tendência Mensal</h3>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f85d07]" />
            <span className="text-muted-foreground">Investimento</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7e6951]" />
            <span className="text-muted-foreground">Receita</span>
          </span>
        </div>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f85d07" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f85d07" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7e6951" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#7e6951" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              formatter={(v, name) => [name === 'investment' ? formatCurrency(v) : formatCurrency(v), name === 'investment' ? 'Investimento' : 'Receita']}
              labelFormatter={(l) => `Mês: ${l}`}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
            />
            <Area type="monotone" dataKey="investment" stroke="#f85d07" strokeWidth={2} fill="url(#gInv)" />
            <Area type="monotone" dataKey="revenue" stroke="#7e6951" strokeWidth={2} fill="url(#gRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}