import React from 'react';

const COLORS = ['#4ECDC4', '#FF6B6B', '#FFD166', '#2D4159'];

export default function FunnelVisual({ stages }) {
  if (!stages || stages.length === 0) return null;
  const maxValue = stages[0].value || 1;

  return (
    <div className="flex flex-col items-center gap-0 w-full max-w-sm mx-auto py-2">
      {stages.map((stage, i) => {
        const widthPct = Math.max(15, Math.round((stage.value / maxValue) * 100));
        const isLast = i === stages.length - 1;
        // trapezoid effect: top wider than bottom via clip-path
        const topW = Math.max(20, widthPct);
        const botW = isLast ? Math.max(10, widthPct - 8) : Math.max(20, (stages[i + 1]?.value / maxValue) * 100);
        const topPct = `${(100 - topW) / 2}%`;
        const botPct = `${(100 - botW) / 2}%`;

        return (
          <div key={i} className="w-full flex flex-col items-center" style={{ marginBottom: isLast ? 0 : -1 }}>
            <div
              className="w-full relative flex items-center justify-center"
              style={{
                height: 64,
                clipPath: `polygon(${topPct} 0%, ${100 - parseFloat(topPct)}% 0%, ${100 - parseFloat(botPct)}% 100%, ${botPct} 100%)`,
                background: COLORS[i % COLORS.length],
              }}
            >
              <div className="flex flex-col items-center justify-center z-10">
                <span className="text-white text-[10px] font-medium opacity-90 leading-tight">{stage.label}</span>
                <span className="text-white text-base font-bold leading-tight">
                  {Number(stage.value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}