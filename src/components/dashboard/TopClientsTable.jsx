import React from 'react';
import { formatCurrency, formatInt } from '@/lib/format';

export default function TopClientsTable({ data }) {
  // data: [{ name, planCount, investment, leads, sales, revenue }]
  const sorted = [...data].sort((a, b) => b.investment - a.investment).slice(0, 8);

  if (!sorted.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Top Clientes</h3>
        <p className="text-xs text-muted-foreground/70 py-8 text-center">Sem clientes neste mês</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Top Clientes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider">Cliente</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">Planos</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">Investimento</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">Leads</th>
              <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">Vendas</th>
              <th className="px-5 py-2.5 font-semibold uppercase tracking-wider text-right">Receita</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => (
              <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors">
                <td className="px-5 py-3 font-medium text-foreground truncate max-w-[200px]">{d.name}</td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground/70">{d.planCount}</td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground/80">{formatCurrency(d.investment)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground/80">{formatInt(d.leads)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground/80">{formatInt(d.sales)}</td>
                <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground">{formatCurrency(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}