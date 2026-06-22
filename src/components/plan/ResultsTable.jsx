import React from 'react';
import ChannelBadge from '../ui-custom/ChannelBadge';

const DEFAULT_MIDDLE_COLS = [
  { label: 'Agendamentos', metricKey: 'appointments' },
  { label: 'Comparecimentos', metricKey: 'showups' },
];

export default function ResultsTable({ channelResults, totals, blended, funnelStages }) {
  const fmt = v => typeof v === 'number' ? (v >= 1000 ? `R$${Math.round(v).toLocaleString('pt-BR')}` : `R$${v.toFixed(2)}`) : '—';
  const fmtN = v => typeof v === 'number' ? Math.round(v).toLocaleString('pt-BR') : '—';
  const fmtRoas = (revenue, budget) => (budget > 0 ? (revenue / budget).toFixed(2) + 'x' : '—');
  const netBudget = (ch) => { const tax = (ch.tax_percent || 0) / 100; return (ch.budget_value || 0) * (1 - tax); };

  // Colunas intermediárias dinâmicas: etapas entre Leads (índice 0) e Vendas (última)
  const middleCols = funnelStages && funnelStages.length >= 2
    ? funnelStages.slice(1, -1).map((s, i) => ({ label: s.label, stageIndex: i + 1 }))
    : DEFAULT_MIDDLE_COLS;

  const getMiddleValue = (ch, col) => {
    if (col.stageIndex !== undefined) {
      // Dinâmico: usa stageValues
      return fmtN(ch.metrics.stageValues?.[col.stageIndex]);
    }
    // Fallback fixo
    return fmtN(ch.metrics[col.metricKey]);
  };

  const getTotalMiddleValue = (col) => {
    if (col.stageIndex !== undefined) {
      return fmtN(totals?.stageValues?.[col.stageIndex]);
    }
    return col.metricKey === 'appointments'
      ? fmtN(totals?.total_appointments)
      : fmtN(totals?.total_showups);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Resultados Projetados</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="text-left py-2.5 px-4 font-medium text-gray-500">Canal</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Budget</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Leads</th>
              {middleCols.map((col, i) => (
                <th key={i} className="text-right py-2.5 px-3 font-medium text-gray-500">{col.label}</th>
              ))}
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Vendas</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Receita</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">CPL</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">CAC</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {channelResults?.map((ch, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="py-2.5 px-4"><ChannelBadge channel={ch.channel_name} /></td>
                <td className="py-2.5 px-3 text-right font-medium">{fmt(netBudget(ch))}</td>
                <td className="py-2.5 px-3 text-right">{fmtN(ch.metrics.leads)}</td>
                {middleCols.map((col, j) => (
                  <td key={j} className="py-2.5 px-3 text-right">{getMiddleValue(ch, col)}</td>
                ))}
                <td className="py-2.5 px-3 text-right">{fmtN(ch.metrics.sales)}</td>
                <td className="py-2.5 px-3 text-right font-medium text-primary">{fmt(ch.metrics.revenue)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(ch.metrics.cost_per_lead)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(ch.metrics.cost_per_sale)}</td>
                <td className="py-2.5 px-3 text-right font-medium text-secondary-foreground">{fmtRoas(ch.metrics.revenue, netBudget(ch))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
              <td className="py-3 px-4 text-gray-900">Total</td>
              <td className="py-3 px-3 text-right">{fmt(totals?.total_net_budget ?? totals?.total_budget)}</td>
              <td className="py-3 px-3 text-right">{fmtN(totals?.total_leads)}</td>
              {middleCols.map((col, j) => (
                <td key={j} className="py-3 px-3 text-right">{getTotalMiddleValue(col)}</td>
              ))}
              <td className="py-3 px-3 text-right">{fmtN(totals?.total_sales)}</td>
              <td className="py-3 px-3 text-right text-primary">{fmt(totals?.total_revenue)}</td>
              <td className="py-3 px-3 text-right">{fmt(blended?.blended_cpl)}</td>
              <td className="py-3 px-3 text-right">{fmt(blended?.blended_cost_per_sale)}</td>
              <td className="py-3 px-3 text-right text-secondary-foreground">{fmtRoas(totals?.total_revenue, totals?.total_net_budget ?? totals?.total_budget)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}