import React from 'react';

const COLOR_STYLES = {
  blue: {
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    accent: 'border-blue-200',
  },
  orange: {
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
    accent: 'border-orange-200',
  },
  green: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    accent: 'border-emerald-200',
  },
  purple: {
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600',
    accent: 'border-violet-200',
  },
  amber: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    accent: 'border-amber-200',
  },
  indigo: {
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    accent: 'border-indigo-200',
  },
  teal: {
    iconBg: 'bg-teal-100',
    iconText: 'text-teal-600',
    accent: 'border-teal-200',
  },
  rose: {
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    accent: 'border-rose-200',
  },
};

export default function StatCard({ label, value, sublabel, icon: Icon, trend, color = 'blue' }) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.blue;
  return (
    <div className={`bg-card rounded-xl border border-border p-4 sm:p-5 hover:shadow-sm transition-shadow min-h-[90px] flex flex-col justify-between ${styles.accent}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight break-words">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground truncate">{sublabel}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${styles.iconText}`} />
          </div>
        )}
      </div>
      {trend !== undefined && trend !== null && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-muted-foreground">vs meta</span>
        </div>
      )}
    </div>
  );
}