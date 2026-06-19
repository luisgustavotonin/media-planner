import React from 'react';

const PLAN_COLOR = '#3b82f6';
const BENCH_COLOR = '#f59e0b';
const STAGE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#10b981'];

const DEFAULT_STAGES = ['Lead', 'Agendamento', 'Comparecimento', 'Venda'];
const DEFAULT_KEYS = ['total_leads', 'total_appointments', 'total_showups', 'total_sales'];

export default function FunnelChart({ data, title, funnelStages, benchmark, conversionRates }) {
  let funnelData;

  if (funnelStages && funnelStages.length >= 2 && data?.stageValues?.length === funnelStages.length) {
    funnelData = funnelStages.map((s, i) => ({
      stage: s.label,
      value: Math.round(data.stageValues[i] || 0),
      color: STAGE_COLORS[i % STAGE_COLORS.length],
    }));
  } else {
    const labels = funnelStages?.length >= 2 ? funnelStages.map(s => s.label) : DEFAULT_STAGES;
    funnelData = DEFAULT_KEYS.map((key, i) => ({
      stage: labels[i] || DEFAULT_STAGES[i],
      value: Math.round(data?.[key] || 0),
      color: STAGE_COLORS[i % STAGE_COLORS.length],
    }));
  }

  const maxValue = Math.max(...funnelData.map(d => d.value), 1);

  // Benchmark values as leads (benchmark conversion rates applied to same total leads)
  let benchmarkData = null;
  if (benchmark && funnelData.length >= 1) {
    const totalLeads = funnelData[0].value;
    // Prefer dynamic conversion_rates, fallback to legacy fields
    const hasRates = Array.isArray(benchmark.conversion_rates) && benchmark.conversion_rates.length > 0;
    const bmRates = hasRates
      ? benchmark.conversion_rates
      : [
          benchmark.lead_to_appointment_rate || 0,
          benchmark.appointment_to_show_rate || 0,
          benchmark.show_to_sale_rate || 0,
        ];
    benchmarkData = funnelData.map((d, i) => {
      if (i === 0) return totalLeads;
      let bm = totalLeads;
      for (let r = 0; r < i && r < bmRates.length; r++) bm = bm * bmRates[r];
      return Math.round(bm);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      {title && (
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {benchmark && (
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: PLAN_COLOR }} />
                Plano
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: BENCH_COLOR }} />
                Benchmark
              </span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {funnelData.map((item, i) => {
          const planPct = (item.value / maxValue) * 100;
          const bmValue = benchmarkData ? benchmarkData[i] : null;
          const bmPct = bmValue != null ? (bmValue / maxValue) * 100 : null;
          const delta = bmValue != null && bmValue > 0 ? ((item.value - bmValue) / bmValue * 100) : null;
          const isGood = delta !== null && delta >= 0;
          const hasGap = delta !== null && Math.abs(delta) >= 1;

          return (
            <div key={i} className="flex items-center gap-3">
              {/* Stage label */}
              <div className="w-28 text-right">
                <span className="text-xs font-medium text-gray-600">{item.stage}</span>
              </div>

              {/* Bar area */}
              <div className="flex-1 flex flex-col gap-1">
                {/* Plan bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${planPct}%`, backgroundColor: item.color, minWidth: item.value > 0 ? '32px' : '0' }}
                    >
                      <span className="text-white text-[10px] font-bold whitespace-nowrap">{item.value.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                {/* Benchmark bar */}
                {bmPct != null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500 opacity-70"
                        style={{ width: `${bmPct}%`, backgroundColor: BENCH_COLOR, minWidth: bmValue > 0 ? '24px' : '0' }}
                      >
                        <span className="text-white text-[9px] font-semibold whitespace-nowrap">{bmValue.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delta */}
              <div className="w-16 text-right">
                {hasGap ? (
                  <span className={`text-xs font-semibold ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                  </span>
                ) : delta !== null ? (
                  <span className="text-xs text-gray-400">Na meta</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion rates footer */}
      <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-gray-50 flex-wrap">
        {funnelData.slice(0, -1).map((stage, i) => {
          const next = funnelData[i + 1];
          const rate = stage.value > 0 ? ((next.value / stage.value) * 100).toFixed(1) : 0;
          const bmRate = benchmarkData && benchmarkData[i] > 0
            ? ((benchmarkData[i + 1] / benchmarkData[i]) * 100).toFixed(0)
            : null;
          return (
            <div key={i} className="text-center">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400">{stage.stage} → {next.stage}</span>
                <span className="text-[11px] font-semibold text-gray-700">{rate}%</span>
                {bmRate && (
                  <span className="text-[10px] text-amber-600 font-medium">(meta: {bmRate}%)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}