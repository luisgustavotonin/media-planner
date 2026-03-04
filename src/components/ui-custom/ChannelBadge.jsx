import React from 'react';

const channelConfig = {
  Meta: { color: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
  Google: { color: 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-500' },
  TikTok: { color: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-800' },
  YouTube: { color: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' },
  Other: { color: 'bg-slate-50 text-slate-700 border-slate-100', dot: 'bg-slate-500' },
};

export default function ChannelBadge({ channel }) {
  const config = channelConfig[channel] || channelConfig.Other;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {channel}
    </span>
  );
}