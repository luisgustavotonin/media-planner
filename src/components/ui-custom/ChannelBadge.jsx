import React from 'react';

// SVG logos oficiais inline
const MetaLogo = () => (
  <svg width="16" height="16" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.5 21.5c0 2.485 1.343 4 3.5 4 1.726 0 2.712-.96 3.964-2.668l2.486-3.498-.014.02L20.2 16.07c1.248-1.706 2.237-2.57 3.8-2.57 1.928 0 3.5 1.48 3.5 3.812 0 1.364-.338 2.232-.908 2.896-.57.666-1.38 1.048-2.592 1.048v3.488c2.004 0 3.67-.614 4.84-1.874C29.998 21.61 30.5 19.9 30.5 17.5c0-4.01-2.266-6.5-5.5-6.5-2.27 0-3.726 1.064-5.256 3.18L18 16.6l-1.744-2.42C14.726 12.064 13.27 11 11 11c-3.266 0-5.5 2.49-5.5 6.5z" fill="url(#meta_a)"/>
    <path d="M7.5 17.5c0-2.32 1.062-3.812 2.75-3.812 1.406 0 2.296.742 3.55 2.468l5.2 7.298.014-.02c-.4.554-.79 1.048-1.166 1.452-.668.718-1.256 1.114-2.098 1.114C13.843 25.5 12.5 24.486 12.5 21.5H9c0 4.084 2.352 7 5.75 7 1.81 0 3.136-.75 4.614-2.594L21 23.458l1.636 1.948C24.114 27.25 25.44 28 27.25 28 30.648 28 33 25.084 33 21h-3.5c0 2.986-1.343 4-2.25 4-.842 0-1.43-.396-2.098-1.114a18.84 18.84 0 01-.832-1.056l5.018-7.03C30.592 13.742 31.594 13 33 13v-3c-2.27 0-3.726 1.064-5.256 3.18L18 24.6l-9.744-11.42C6.726 11.064 5.27 10 3 10v3c1.406 0 2.408.742 3.662 2.468L11.68 22.5l-.002-.003A5.6 5.6 0 019 22.5c-.908 0-1.5-1.014-1.5-3z" fill="url(#meta_b)"/>
    <defs>
      <linearGradient id="meta_a" x1="5.5" y1="19.5" x2="30.5" y2="19.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0064E1"/>
        <stop offset=".4" stopColor="#0064E1"/>
        <stop offset=".83" stopColor="#0073EE"/>
        <stop offset="1" stopColor="#0082FB"/>
      </linearGradient>
      <linearGradient id="meta_b" x1="5.5" y1="19" x2="30.5" y2="19" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0082FB"/>
        <stop offset="1" stopColor="#0064E0"/>
      </linearGradient>
    </defs>
  </svg>
);

const GoogleLogo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const TikTokLogo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" fill="#000000"/>
  </svg>
);

const YouTubeLogo = () => (
  <svg width="16" height="12" viewBox="0 0 24 17" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.495 2.205a3.02 3.02 0 00-2.126-2.138C19.505 0 12 0 12 0S4.495 0 2.631.067a3.02 3.02 0 00-2.126 2.138C0 4.066 0 7.927 0 7.927s0 3.862.505 5.722a3.02 3.02 0 002.126 2.138C4.495 16 12 16 12 16s7.505 0 9.369-.213a3.02 3.02 0 002.126-2.138C24 11.79 24 7.928 24 7.928s0-3.862-.505-5.723z" fill="#FF0000"/>
    <path d="M9.545 11.273l6.273-3.345-6.273-3.346v6.691z" fill="white"/>
  </svg>
);

const channelConfig = {
  Meta: { bg: 'bg-blue-50 border-blue-100', Logo: MetaLogo },
  Google: { bg: 'bg-gray-50 border-gray-200', Logo: GoogleLogo },
  TikTok: { bg: 'bg-gray-50 border-gray-200', Logo: TikTokLogo },
  YouTube: { bg: 'bg-red-50 border-red-100', Logo: YouTubeLogo },
};

const fallbackDotColor = {
  Meta: 'bg-blue-500',
  Google: 'bg-red-500',
  TikTok: 'bg-gray-800',
  YouTube: 'bg-rose-500',
};

export default function ChannelBadge({ channel }) {
  const config = channelConfig[channel];

  if (config) {
    const { bg, Logo } = config;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${bg} text-gray-700`}>
        <Logo />
        {channel}
      </span>
    );
  }

  // Fallback genérico para canais não mapeados
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 border-slate-100 text-slate-700">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      {channel}
    </span>
  );
}