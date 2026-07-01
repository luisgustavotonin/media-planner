import React from 'react';

export default function FunnelVisual({ stages, benchmarkStages, funnelName }) {
  if (!stages || stages.length === 0) return null;

  const hasBenchmark = benchmarkStages && benchmarkStages.length === stages.length;
  const fmt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
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
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider w-12 text-right">Projeção</span>
          {hasBenchmark && (
            <>
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider w-12 text-right">Bench</span>
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider w-14 text-right">Delta</span>
            </>
          )}
        </div>
      </div>

      {/* Stage rows */}
      <div className="space-y-2">
        {stages.map((stage, i) => {
          const val = stage.value || 0;
          const bm = hasBenchmark ? (benchmarkStages[i]?.value || 0) : 0;
          const delta = hasBenchmark ? val - bm : 0;
          const valW = Math.round((val / maxVal) * 100);
          const bmW = Math.round((bm / maxVal) * 100);
          const isPositive = delta >= 0;

          return (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-gray-600 w-24 truncate">{stage.label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-foreground tabular-nums w-12 text-right">{fmt(val)}</span>
                  {hasBenchmark && (
                    <>
                      <span className="text-[10px] text-gray-400 tabular-nums w-12 text-right">{fmt(bm)}</span>
                      <span className={`text-[10px] font-medium tabular-nums w-14 text-right ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{fmt(delta)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="pl-1 space-y-0.5">
                <div className="h-4 bg-gray-100 rounded-sm overflow-hidden">
                  <div className="h-full bg-primary rounded-sm transition-all duration-300" style={{ width: `${valW}%` }} />
                </div>
                {hasBenchmark && (
                  <div className="h-3 bg-gray-50 rounded-sm overflow-hidden">
                    <div className="h-full bg-secondary rounded-sm transition-all duration-300" style={{ width: `${bmW}%` }} />
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