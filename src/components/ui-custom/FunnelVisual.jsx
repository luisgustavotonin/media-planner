import React from 'react';

const COLORS = ['#4ECDC4', '#FF6B6B', '#FFD166', '#2D4159'];

// Fixed proportional widths for each stage (top to bottom)
const FIXED_WIDTHS = [100, 72, 50, 32];

export default function FunnelVisual({ stages }) {
  if (!stages || stages.length === 0) return null;

  return (
    <div className="flex flex-col items-center w-full py-4">
      {stages.map((stage, i) => {
        const topW = FIXED_WIDTHS[i] ?? Math.max(20, 100 - i * 20);
        const botW = FIXED_WIDTHS[i + 1] ?? Math.max(10, topW - 20);
        const isLast = i === stages.length - 1;

        return (
          <div
            key={i}
            className="flex items-center justify-center"
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
              <span className="text-white text-xl font-bold">
                {Number(stage.value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}