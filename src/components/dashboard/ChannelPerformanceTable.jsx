import React from 'react';
import { formatCurrency, formatInt, formatDecimal } from '@/lib/format';

export default function ChannelPerformanceTable({ data }) {
  // data: [{ name, investment, leads, sales, revenue, cpl, roas }]
  const sorted = [...data].sort((a, b) => b.investment - a.investment);

  if (!sorted.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Performance por Canal</h3>
        <p className="text-xs text-muted-foreground/70 py-8 text-center">Sem canais neste mês</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Performance por Canal</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider">Canal</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">Investimento</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">Leads</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">Vendas</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">Receita</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">CPL</th>
              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-right">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => {
              const roasOk = d.roas >= 1;
              return (
                <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{d.name}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/80">{formatCurrency(d.investment)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/80">{formatInt(d.leads)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/80">{formatInt(d.sales)}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium text-foreground">{formatCurrency(d.revenue)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/80">{formatCurrency(d.cpl)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`tabular-nums font-medium ${roasOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatDecimal(d.roas)}x
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}