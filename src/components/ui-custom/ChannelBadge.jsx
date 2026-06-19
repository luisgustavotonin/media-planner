import React from 'react';

// SVG logos oficiais inline
const MetaLogo = () => (
  <svg width="16" height="16" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <path d="M200 60C121 60 60 121 60 200s61 140 140 140 140-61 140-140S279 60 200 60zm0 20c66.3 0 120 53.7 120 120s-53.7 120-120 120S80 266.3 80 200 133.7 80 200 80z" fill="none"/>
    <path d="M98 200c0-35 18-65 42-82 8-5.8 14-8 20-8 9 0 16 5 24 16l52 76 52-76c8-11 15-16 24-16 6 0 12 2.2 20 8 24 17 42 47 42 82 0 22-6 42-16 58-10 15-23 25-36 25-14 0-24-7-38-27l-48-70-48 70c-14 20-24 27-38 27-13 0-26-10-36-25-10-16-16-36-16-58z" fill="url(#metaGrad)"/>
    <defs>
      <linearGradient id="metaGrad" x1="98" y1="200" x2="302" y2="200" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0082FB"/>
        <stop offset="100%" stopColor="#0064E0"/>
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