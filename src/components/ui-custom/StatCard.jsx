import React from 'react';

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

export default function StatCard({ label, value, sublabel, icon: Icon, trend, color = 'blue' }) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.blue;
  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-5 hover:shadow-sm transition-shadow min-h-[90px] flex flex-col justify-between">
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