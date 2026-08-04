import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

const COLOR_STYLES = {
  blue: { iconBg: 'bg-blue-50', iconText: 'text-blue-500' },
  orange: { iconBg: 'bg-orange-50', iconText: 'text-orange-500' },
  green: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-500' },
  purple: { iconBg: 'bg-violet-50', iconText: 'text-violet-500' },
  amber: { iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  indigo: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-500' },
  teal: { iconBg: 'bg-teal-50', iconText: 'text-teal-500' },
  rose: { iconBg: 'bg-rose-50', iconText: 'text-rose-500' },
};

// Card de métrica com comparativo discreto vs mês anterior.
// value/previousValue são números; formatValue monta a string exibida.
export default function ComparisonStatCard({
  label,
  value,
  previousValue,
  formatValue = v => v,
  icon: Icon,
  color = 'blue',
  previousLabel = 'mês ant.',
}) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.blue;
  const hasPrev = typeof previousValue === 'number' && !isNaN(previousValue);
  const diff = hasPrev ? value - previousValue : null;
  const pct = hasPrev && previousValue > 0 ? (diff / previousValue) * 100 : null;
  const flat = hasPrev && diff === 0;
  const up = hasPrev && diff > 0;
  const down = hasPrev && diff < 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-5 hover:shadow-sm transition-shadow min-h-[110px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight break-words">{formatValue(value)}</p>
        </div>
        {Icon && (
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${styles.iconText}`} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] leading-none">
        {hasPrev ? (
          <>
            {flat ? (
              <Minus className="w-3 h-3 text-muted-foreground" />
            ) : up ? (
              <ArrowUp className="w-3 h-3 text-emerald-500" />
            ) : down ? (
              <ArrowDown className="w-3 h-3 text-rose-500" />
            ) : null}
            <span className={`font-medium ${flat ? 'text-muted-foreground' : up ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pct !== null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : 'novo'}
            </span>
            <span className="text-muted-foreground/70 truncate">
              · {previousLabel}: {formatValue(previousValue)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground/60">sem mês anterior</span>
        )}
      </div>
    </div>
  );
}