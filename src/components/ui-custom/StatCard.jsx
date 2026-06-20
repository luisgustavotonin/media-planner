import React from 'react';

export default function StatCard({ label, value, sublabel, icon: Icon, trend, color = 'blue' }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-violet-500 to-violet-600',
    orange: 'from-orange-500 to-amber-500',
    pink: 'from-pink-500 to-rose-500',
    amber: 'from-amber-400 to-amber-500',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    rose: 'from-rose-500 to-rose-600',
    teal: 'from-teal-500 to-teal-600',
  };

  const gradient = colors[color] || colors.blue;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 hover:shadow-sm transition-shadow min-h-[90px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight break-words">{value}</p>
          {sublabel && <p className="text-xs text-gray-500 truncate">{sublabel}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
        )}
      </div>
      {trend !== undefined && trend !== null && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-gray-400">vs meta</span>
        </div>
      )}
    </div>
  );
}