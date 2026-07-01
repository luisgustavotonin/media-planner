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
        <div className="flex items-center gap-3 mb-1.5 px-1">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span>
            <span className="text-[9px] text-gray-500">Projeção</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-secondary"></span>
            <span className="text-[9px] text-gray-500">Benchmark</span>
          </div>
        </div>
      )}

      {/* Column headers */}
      <div className="flex items-center justify-between px-1 mb-1.5">
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider w-24">Etapa</span>
        <div className="flex-1"></div>
        {hasBenchmark && (
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider w-16 text-right">Delta %</span>
        )}
      </div>

      {/* Stage rows */}
      <div className="space-y-2">
        {stages.map((stage, i) => {
          const val = stage.value || 0;
          const bm = hasBenchmark ? (benchmarkStages[i]?.value || 0) : 0;
          const valW = Math.round((val / maxVal) * 100);
          const bmW = Math.round((bm / maxVal) * 100);
          const deltaPct = hasBenchmark && bm > 0 ? ((val - bm) / bm) * 100 : 0;
          const isPositive = deltaPct >= 0;

          return (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center justify-between px-1 gap-2">
                <span className="text-[11px] font-medium text-gray-600 w-24 flex-shrink-0 truncate">{stage.label}</span>
                <div className="flex-1"></div>
                {hasBenchmark && (
                  <span className={`text-[10px] font-medium tabular-nums w-16 text-right flex-shrink-0 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {fmtPct(deltaPct)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-0.5">
                  {/* Projeção bar */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] font-bold text-primary tabular-nums">{fmt(val)}</span>
                  </div>
                  <div className="relative h-4 bg-gray-100 rounded-sm overflow-hidden">
                    <div className="h-full bg-primary rounded-sm transition-all duration-300" style={{ width: `${Math.max(valW, 8)}%` }}></div>
                  </div>
                  {/* Benchmark bar */}
                  {hasBenchmark && (
                    <>
                      <div className="flex items-center justify-between mb-0.5 mt-0.5">
                        <span className="text-[9px] font-semibold text-gray-400 tabular-nums">{fmt(bm)}</span>
                      </div>
                      <div className="relative h-3 bg-gray-50 rounded-sm overflow-hidden">
                        <div className="h-full bg-secondary rounded-sm transition-all duration-300" style={{ width: `${Math.max(bmW, 8)}%` }}></div>
                      </div>
                    </>
                  )}
                </div>
                <div className="w-16 flex-shrink-0"></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}