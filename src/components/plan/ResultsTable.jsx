import React from 'react';
import ChannelBadge from '../ui-custom/ChannelBadge';

const QUANTITY_BASED_TYPES = ['reativacao', 'resgate'];

const DEFAULT_MIDDLE_COLS = [
  { label: 'Agendamentos', metricKey: 'appointments' },
  { label: 'Comparecimentos', metricKey: 'showups' },
];

export default function ResultsTable({ channelResults, totals, blended, funnelStages, objectives = [], funnelTypes = [] }) {
  const fmt = v => typeof v === 'number' ? (v >= 1000 ? `R$${Math.round(v).toLocaleString('pt-BR')}` : `R$${v.toFixed(2)}`) : '—';
  const fmtN = v => typeof v === 'number' ? Math.round(v).toLocaleString('pt-BR') : '—';
  const fmtRoas = (revenue, budget) => (budget > 0 ? (revenue / budget).toFixed(2) + 'x' : '—');

  // Detecta canal baseado em quantidade (todas as campanhas são reativação/resgate)
  const isQuantityChannel = (ch) => {
    const camps = ch.strategies || [];
    if (camps.length === 0) return false;
    return camps.every(camp => {
      const obj = objectives.find(o => o.name === camp.objective);
      return obj && QUANTITY_BASED_TYPES.includes(obj.type);
    });
  };

  // Rótulos das etapas do funil do canal (primeira campanha)
  const getChannelStageLabels = (ch) => {
    const firstCamp = (ch.strategies || [])[0];
    const ft = funnelTypes.find(f => f.id === firstCamp?.funnel_type_id);
    return ft?.stages || [];
  };

  const investChannels = (channelResults || []).filter(ch => !isQuantityChannel(ch));
  const qtyChannels = (channelResults || []).filter(ch => isQuantityChannel(ch));

  // Colunas intermediárias do plano (canais de investimento)
  const middleCols = funnelStages && funnelStages.length >= 2
    ? funnelStages.slice(1, -1).map((s, i) => ({ label: s.label, stageIndex: i + 1 }))
    : DEFAULT_MIDDLE_COLS;

  const getMiddleValue = (ch, col) => {
    if (col.stageIndex !== undefined) return fmtN(ch.metrics.stageValues?.[col.stageIndex]);
    return fmtN(ch.metrics[col.metricKey]);
  };

  // Totais do grupo de investimento (apenas canais de investimento)
  const invTotals = investChannels.reduce((acc, ch) => {
    ch.metrics.stageValues?.forEach((v, i) => { acc.stageValues[i] = (acc.stageValues[i] || 0) + v; });
    return {
      budget: acc.budget + (ch.budget_value || 0),
      leads: acc.leads + ch.metrics.leads,
      appointments: acc.appointments + ch.metrics.appointments,
      showups: acc.showups + ch.metrics.showups,
      sales: acc.sales + ch.metrics.sales,
      revenue: acc.revenue + ch.metrics.revenue,
      stageValues: acc.stageValues,
    };
  }, { budget: 0, leads: 0, appointments: 0, showups: 0, sales: 0, revenue: 0, stageValues: [] });
  const invBlendedCpl = invTotals.leads > 0 ? invTotals.budget / invTotals.leads : 0;
  const invBlendedCps = invTotals.sales > 0 ? invTotals.budget / invTotals.sales : 0;

  // Colunas de etapas para a tabela de quantidade (funil do primeiro canal de quantidade)
  const qtyStageLabels = qtyChannels.length > 0 ? getChannelStageLabels(qtyChannels[0]) : [];
  const qtyStageCols = qtyStageLabels.length >= 2 ? qtyStageLabels.slice(0, -1) : [];

  // Totais do grupo de quantidade
  const qtyTotals = qtyChannels.reduce((acc, ch) => {
    const sv = ch.metrics.stageValues || [];
    for (let i = 0; i < qtyStageCols.length; i++) acc.stageValues[i] = (acc.stageValues[i] || 0) + (sv[i] || 0);
    return {
      meta: acc.meta + (ch.budget_value || 0),
      revenue: acc.revenue + (ch.metrics.revenue || 0),
      sales: acc.sales + (ch.metrics.sales || 0),
      stageValues: acc.stageValues,
    };
  }, { meta: 0, revenue: 0, sales: 0, stageValues: [] });
  qtyTotals.ticket = qtyTotals.sales > 0 ? qtyTotals.revenue / qtyTotals.sales : 0;

  return (
    <div className="space-y-4">
      {investChannels.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Resultados projetados por canal</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left py-2.5 px-4 font-medium text-gray-500">Canal</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-500">Investimento</th>
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
                {investChannels.map((ch, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-4"><ChannelBadge channel={ch.channel_name} /></td>
                    <td className="py-2.5 px-3 text-right font-medium">{fmt(ch.budget_value || 0)}</td>
                    <td className="py-2.5 px-3 text-right">{fmtN(ch.metrics.leads)}</td>
                    {middleCols.map((col, j) => (
                      <td key={j} className="py-2.5 px-3 text-right">{getMiddleValue(ch, col)}</td>
                    ))}
                    <td className="py-2.5 px-3 text-right">{fmtN(ch.metrics.sales)}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-primary">{fmt(ch.metrics.revenue)}</td>
                    <td className="py-2.5 px-3 text-right">{fmt(ch.metrics.cost_per_lead)}</td>
                    <td className="py-2.5 px-3 text-right">{fmt(ch.metrics.cost_per_sale)}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-secondary-foreground">{fmtRoas(ch.metrics.revenue, ch.budget_value || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td className="py-3 px-4 text-gray-900">Total</td>
                  <td className="py-3 px-3 text-right">{fmt(invTotals.budget)}</td>
                  <td className="py-3 px-3 text-right">{fmtN(invTotals.leads)}</td>
                  {middleCols.map((col, j) => (
                    <td key={j} className="py-3 px-3 text-right">
                      {col.stageIndex !== undefined ? fmtN(invTotals.stageValues[col.stageIndex]) : fmtN(col.metricKey === 'appointments' ? invTotals.appointments : invTotals.showups)}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-right">{fmtN(invTotals.sales)}</td>
                  <td className="py-3 px-3 text-right text-primary">{fmt(invTotals.revenue)}</td>
                  <td className="py-3 px-3 text-right">{fmt(invBlendedCpl)}</td>
                  <td className="py-3 px-3 text-right">{fmt(invBlendedCps)}</td>
                  <td className="py-3 px-3 text-right text-secondary-foreground">{fmtRoas(invTotals.revenue, invTotals.budget)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {qtyChannels.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Resultados projetados — Reativação & Resgate</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left py-2.5 px-4 font-medium text-gray-500">Canal</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-500">Meta de Clientes</th>
                  {qtyStageCols.map((s, i) => (
                    <th key={i} className="text-right py-2.5 px-3 font-medium text-gray-500">{s.label}</th>
                  ))}
                  <th className="text-right py-2.5 px-3 font-medium text-gray-500">Receita</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-500">Ticket Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {qtyChannels.map((ch, i) => {
                  const sv = ch.metrics.stageValues || [];
                  const ticket = ch.metrics.sales > 0 ? ch.metrics.revenue / ch.metrics.sales : 0;
                  return (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4"><ChannelBadge channel={ch.channel_name} /></td>
                      <td className="py-2.5 px-3 text-right font-medium">{fmtN(ch.budget_value || 0)}</td>
                      {qtyStageCols.map((s, j) => (
                        <td key={j} className="py-2.5 px-3 text-right">{fmtN(sv[j])}</td>
                      ))}
                      <td className="py-2.5 px-3 text-right font-medium text-primary">{fmt(ch.metrics.revenue)}</td>
                      <td className="py-2.5 px-3 text-right">{fmt(ticket)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td className="py-3 px-4 text-gray-900">Total</td>
                  <td className="py-3 px-3 text-right">{fmtN(qtyTotals.meta)}</td>
                  {qtyStageCols.map((s, j) => (
                    <td key={j} className="py-3 px-3 text-right">{fmtN(qtyTotals.stageValues[j])}</td>
                  ))}
                  <td className="py-3 px-3 text-right text-primary">{fmt(qtyTotals.revenue)}</td>
                  <td className="py-3 px-3 text-right">{fmt(qtyTotals.ticket)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}