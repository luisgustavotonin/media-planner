import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

function fmtNum(val) {
  return Math.round(val || 0).toLocaleString('pt-BR');
}
function fmtCurrency(val) {
  return `R$${Math.round(val || 0).toLocaleString('pt-BR')}`;
}
function fmtPct(val) {
  return `${((val || 0) * 100).toFixed(1)}%`;
}

export default function MonthlyFunnelSummary({ meta, real, stageLabels, dayFraction = 1, referenceDate, periodMonth, periodYear }) {
  const labels = stageLabels && stageLabels.length >= 3
    ? stageLabels
    : ['Leads', 'Agendamentos', 'Comparecimentos'];

  const stages = [
    { key: 'investment', label: 'Investimento', fmt: fmtCurrency },
    { key: 'leads', label: labels[0], fmt: fmtNum },
    { key: 'appointments', label: labels[1], fmt: fmtNum },
    { key: 'showups', label: labels[2], fmt: fmtNum },
    { key: 'sales', label: 'Vendas', fmt: fmtNum },
    { key: 'revenue', label: 'Receita', fmt: fmtCurrency },
  ];

  const indicators = [
    { label: 'Taxa de Agendamento', meta: meta.rates?.[0], real: real.rates?.[0], fmt: fmtPct },
    { label: 'Taxa de Comparecimento', meta: meta.rates?.[1], real: real.rates?.[1], fmt: fmtPct },
    { label: 'Taxa de Conversão', meta: meta.rates?.[2], real: real.rates?.[2], fmt: fmtPct },
    { label: 'Ticket Médio', meta: meta.ticket, real: real.ticket, fmt: fmtCurrency },
    { label: 'CPL', meta: meta.cpl, real: real.cpl, fmt: fmtCurrency, invert: true },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Funil do Mês — Meta vs Realizado</h3>
          {referenceDate && (
            <p className="text-xs text-gray-400 mt-1">
              Realizado até {new Date(referenceDate + 'T00:00:00').toLocaleDateString('pt-BR')} — Proporcional: {dayFraction > 0 ? (dayFraction * 100).toFixed(0) : 0}% do mês
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Etapa</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Meta</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Realizado</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">% Atingimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stages.map(stage => {
                const metaVal = meta[stage.key] || 0;
                const realVal = real[stage.key] || 0;
                const propMeta = metaVal * dayFraction;
                const achievement = propMeta > 0 ? (realVal / propMeta) * 100 : 0;
                return (
                  <tr key={stage.key} className="hover:bg-gray-50/30">
                    <td className="py-3 px-4 font-medium text-gray-900">{stage.label}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{stage.fmt(metaVal)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{stage.fmt(realVal)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                        achievement >= 100 ? 'text-green-600' :
                        achievement >= 80 ? 'text-amber-600' :
                        achievement > 0 ? 'text-red-500' : 'text-gray-300'
                      }`}>
                        {achievement >= 100 ? <TrendingUp className="w-3.5 h-3.5" /> :
                         achievement > 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                        {achievement.toFixed(0)}%
                      </span>
                      {dayFraction < 1 && metaVal > 0 && (
                        <span className="block text-[10px] text-gray-400 mt-0.5">Meta parcial: {stage.fmt(propMeta)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {indicators.map((ind, i) => {
          const hasReal = (ind.real || 0) > 0;
          const isGood = ind.invert ? (ind.real || 0) <= (ind.meta || 0) : (ind.real || 0) >= (ind.meta || 0);
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-2">{ind.label}</p>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Meta</p>
                  <p className="text-sm font-medium text-gray-600">{ind.fmt(ind.meta)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Real</p>
                  <p className={`text-sm font-semibold ${!hasReal ? 'text-gray-300' : isGood ? 'text-green-600' : 'text-red-500'}`}>
                    {hasReal ? ind.fmt(ind.real) : '—'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}