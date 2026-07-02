import React from 'react';

export default function FunnelVisual({ stages, benchmarkStages, funnelName }) {
  if (!stages || stages.length === 0) return null;

  const hasBenchmark = benchmarkStages && benchmarkStages.length === stages.length;
  const fmt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const fmtPct = (v) => {
    const sign = v >= 0 ? '+' : '';
    return `${sign}${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  };
  const maxVal = Math.max(
    ...stages.map(s => s.value || 0),
    ...(hasBenchmark ? benchmarkStages.map(s => s.value || 0) : [0]),
    1
  );

  return (
    <div className="w-full py-2">
      {/* Legend */}
      {hasBenchmark && (
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span>
              <span className="text-[9px] text-gray-500">Projeção</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-secondary"></span>
              <span className="text-[9px] text-gray-500">Benchmark</span>
            </div>
          </div>
          {hasBenchmark && (
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Delta %</span>
          )}
        </div>
      )}

      {/* Stage rows */}
      <div className="space-y-2.5">
        {stages.map((stage, i) => {
          const val = stage.value || 0;
          const bm = hasBenchmark ? (benchmarkStages[i]?.value || 0) : 0;
          const valW = Math.round((val / maxVal) * 100);
          const bmW = Math.round((bm / maxVal) * 100);
          const deltaPct = hasBenchmark && bm > 0 ? ((val - bm) / bm) * 100 : 0;
          const isPositive = deltaPct >= 0;

          return (
            <div key={i}>
              <span className="text-[11px] font-medium text-gray-600 block mb-1 px-1">{stage.label}</span>
              <div className="flex items-stretch gap-2">
                {/* Bars column */}
                <div className="flex-1 space-y-1">
                  {/* Projeção bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative h-5 bg-gray-100 rounded-sm overflow-hidden flex-1">
                      <div className="h-full bg-primary rounded-sm transition-all duration-300" style={{ width: `${Math.max(valW, 8)}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-primary tabular-nums w-12 text-right flex-shrink-0">{fmt(val)}</span>
                  </div>
                  {/* Benchmark bar */}
                  {hasBenchmark && (
                    <div className="flex items-center gap-1.5">
                      <div className="relative h-4 bg-gray-50 rounded-sm overflow-hidden flex-1">
                        <div className="h-full bg-secondary rounded-sm transition-all duration-300" style={{ width: `${Math.max(bmW, 8)}%` }}></div>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400 tabular-nums w-12 text-right flex-shrink-0">{fmt(bm)}</span>
                    </div>
                  )}
                </div>
                {/* Delta column — vertically centered between the two bars */}
                {hasBenchmark && (
                  <div className="flex items-center w-16 flex-shrink-0">
                    <span className={`text-[11px] font-bold tabular-nums ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                      {fmtPct(deltaPct)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}