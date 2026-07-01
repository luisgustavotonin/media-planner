import React from 'react';

const COLORS = ['#312B1D', '#5C4531', '#7E6951', '#A68C6D', '#C4A882', '#E2CCAF'];

export default function FunnelVisual({ stages, benchmarkStages }) {
  if (!stages || stages.length === 0) return null;

  const n = stages.length;
  const hasBenchmark = benchmarkStages && benchmarkStages.length === n;
  const getWidth = (i) => Math.round(100 - (i * (80 / Math.max(n - 1, 1))));

  return (
    <div className="flex flex-col items-center w-full py-4">
      {stages.map((stage, i) => {
        const topW = getWidth(i);
        const step = Math.round(80 / Math.max(n - 1, 1));
        const botW = i === n - 1 ? Math.max(10, topW - step) : getWidth(i + 1);
        const isLast = i === stages.length - 1;
        const bm = hasBenchmark ? benchmarkStages[i] : null;
        const fmt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

        return (
          <div
            key={i}
            className="flex items-center justify-center relative"
            style={{
              width: '100%',
              maxWidth: 480,
              height: 80,
              clipPath: `polygon(${(100 - topW) / 2}% 0%, ${(100 + topW) / 2}% 0%, ${(100 + botW) / 2}% 100%, ${(100 - botW) / 2}% 100%)`,
              background: COLORS[i % COLORS.length],
              marginBottom: isLast ? 0 : -1,
            }}
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-white text-xs font-medium opacity-90">{stage.label}</span>
              <span className="text-white text-xl font-bold">{fmt(stage.value)}</span>
              {bm && (
                <span className="text-white/60 text-[10px] font-medium mt-0.5">
                  Benchmark: {fmt(bm.value)}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {hasBenchmark && (
        <p className="text-[10px] text-gray-400 mt-3 text-center">
          Valores em branco = projeção da campanha · Benchmark = taxas de referência do segmento
        </p>
      )}
    </div>
  );
}