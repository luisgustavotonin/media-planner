import React from 'react';

// Funil de acompanhamento: Realizado vs Meta, com desvio por etapa.
// stages = realizado [{ label, value }], metaStages = projetado [{ label, value }]
export default function ResultsFunnel({ stages, metaStages, compact }) {
  if (!stages || stages.length === 0) return null;
  const hasMeta = metaStages && metaStages.length === stages.length;

  const fmt = (v) => Math.round(v || 0).toLocaleString('pt-BR');
  const fmtPct = (v) => {
    const sign = v >= 0 ? '+' : '';
    return `${sign}${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  };

  const maxVal = Math.max(
    ...stages.map(s => s.value || 0),
    ...(hasMeta ? metaStages.map(s => s.value || 0) : [0]),
    1
  );

  return (
    <div className="w-full py-2">
      {hasMeta && (
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span>
              <span className="text-[9px] text-gray-500">Realizado</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-300"></span>
              <span className="text-[9px] text-gray-500">Meta</span>
            </div>
          </div>
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Desvio</span>
        </div>
      )}

      <div className="space-y-2.5">
        {stages.map((stage, i) => {
          const val = stage.value || 0;
          const meta = hasMeta ? (metaStages[i]?.value || 0) : 0;
          const valW = (val / maxVal) * 100;
          const metaW = (meta / maxVal) * 100;
          const deltaPct = hasMeta && meta > 0 ? ((val - meta) / meta) * 100 : 0;
          const isPositive = deltaPct >= 0;
          const valFull = valW >= 90;

          return (
            <div key={i}>
              <span className="text-[11px] font-medium text-gray-600 block mb-1 px-1">{stage.label}</span>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 space-y-1">
                  {/* Realizado */}
                  <div className="relative bg-gray-100 rounded-sm overflow-visible h-5">
                    <div className="absolute inset-0 bg-gray-100 rounded-sm"></div>
                    <div className="absolute top-0 left-0 h-full bg-primary rounded-sm transition-all duration-300" style={{ width: `${Math.max(valW, 2)}%`, height: '1.25rem' }}>
                      {valFull && (
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white tabular-nums">{fmt(val)}</span>
                      )}
                    </div>
                    {!valFull && (
                      <span className="absolute top-1/2 -translate-y-1/2 text-[9px] font-bold text-primary tabular-nums whitespace-nowrap" style={{ left: `calc(${Math.max(valW, 2)}% + 4px)` }}>{fmt(val)}</span>
                    )}
                  </div>
                  {/* Meta */}
                  {hasMeta && (
                    <div className="relative bg-gray-50 rounded-sm overflow-visible h-4">
                      <div className="absolute inset-0 bg-gray-50 rounded-sm"></div>
                      <div className="absolute top-0 left-0 h-full bg-gray-300 rounded-sm transition-all duration-300" style={{ width: `${Math.max(metaW, 2)}%`, height: '1rem' }}>
                        {metaW >= 90 && (
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-white tabular-nums">{fmt(meta)}</span>
                        )}
                      </div>
                      {metaW < 90 && (
                        <span className="absolute top-1/2 -translate-y-1/2 text-[9px] font-semibold text-gray-400 tabular-nums whitespace-nowrap" style={{ left: `calc(${Math.max(metaW, 2)}% + 4px)` }}>{fmt(meta)}</span>
                      )}
                    </div>
                  )}
                </div>
                {hasMeta && (
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