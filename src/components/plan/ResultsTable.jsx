import React from 'react';
import ChannelBadge from '../ui-custom/ChannelBadge';

export default function ResultsTable({ channelResults, totals, blended }) {
  const fmt = v => typeof v === 'number' ? (v >= 1000 ? `R$${Math.round(v).toLocaleString('pt-BR')}` : `R$${v.toFixed(2)}`) : '—';
  const fmtN = v => typeof v === 'number' ? Math.round(v).toLocaleString('pt-BR') : '—';

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Projection Results</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="text-left py-2.5 px-4 font-medium text-gray-500">Channel</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Budget</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Leads</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Appts</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Show-ups</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Sales</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Revenue</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">CPL</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">CPA</th>
              <th className="text-right py-2.5 px-3 font-medium text-gray-500">Cost/Sale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {channelResults?.map((ch, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="py-2.5 px-4"><ChannelBadge channel={ch.channel_name} /></td>
                <td className="py-2.5 px-3 text-right font-medium">{fmt(ch.budget_value)}</td>
                <td className="py-2.5 px-3 text-right">{fmtN(ch.metrics.leads)}</td>
                <td className="py-2.5 px-3 text-right">{fmtN(ch.metrics.appointments)}</td>
                <td className="py-2.5 px-3 text-right">{fmtN(ch.metrics.showups)}</td>
                <td className="py-2.5 px-3 text-right">{fmtN(ch.metrics.sales)}</td>
                <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{fmt(ch.metrics.revenue)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(ch.metrics.cost_per_lead)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(ch.metrics.cost_per_appointment)}</td>
                <td className="py-2.5 px-3 text-right">{fmt(ch.metrics.cost_per_sale)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
              <td className="py-3 px-4 text-gray-900">Total</td>
              <td className="py-3 px-3 text-right">{fmt(totals?.total_budget)}</td>
              <td className="py-3 px-3 text-right">{fmtN(totals?.total_leads)}</td>
              <td className="py-3 px-3 text-right">{fmtN(totals?.total_appointments)}</td>
              <td className="py-3 px-3 text-right">{fmtN(totals?.total_showups)}</td>
              <td className="py-3 px-3 text-right">{fmtN(totals?.total_sales)}</td>
              <td className="py-3 px-3 text-right text-emerald-600">{fmt(totals?.total_revenue)}</td>
              <td className="py-3 px-3 text-right">{fmt(blended?.blended_cpl)}</td>
              <td className="py-3 px-3 text-right">{fmt(blended?.blended_cpa)}</td>
              <td className="py-3 px-3 text-right">{fmt(blended?.blended_cost_per_sale)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}