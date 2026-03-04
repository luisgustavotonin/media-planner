import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Recebe valor entre 0 e 1 (ex: 0.35), exibe como percentual (ex: 35)
// Devolve valor entre 0 e 1

export default function PercentInput({ value, onChange, className, disabled }) {
  const toDisplay = (v) => {
    if (v === '' || v === null || v === undefined) return '';
    const num = typeof v === 'number' ? v * 100 : parseFloat(v) * 100;
    return isNaN(num) ? '' : parseFloat(num.toFixed(4)).toString().replace('.', ',');
  };

  const [display, setDisplay] = useState(toDisplay(value));

  useEffect(() => {
    const currentParsed = parseFloat(display.replace(',', '.')) / 100;
    if (Math.abs(currentParsed - value) > 0.0001) {
      setDisplay(toDisplay(value));
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d,]/g, '');
    setDisplay(raw);
    const parsed = parseFloat(raw.replace(',', '.'));
    if (!isNaN(parsed)) onChange(Math.min(1, parsed / 100));
  };

  const handleBlur = () => {
    const parsed = parseFloat(display.replace(',', '.'));
    if (!isNaN(parsed)) setDisplay(parseFloat(parsed.toFixed(2)).toString().replace('.', ','));
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="0"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-7 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
    </div>
  );
}