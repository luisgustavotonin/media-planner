import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

function formatDisplay(value) {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function parseValue(str) {
  if (!str) return '';
  // Remove tudo exceto dígitos e vírgula
  const clean = str.replace(/[^\d,]/g, '');
  // Substitui vírgula por ponto para parseFloat
  const num = parseFloat(clean.replace(',', '.'));
  return isNaN(num) ? '' : num;
}

export default function CurrencyInput({ value, onChange, className, placeholder, disabled, prefix = '' }) {
  const [display, setDisplay] = useState(formatDisplay(value));

  useEffect(() => {
    // Só atualiza display se o valor externo mudou de verdade
    const current = parseValue(display);
    if (current !== value && value !== '' && value !== null && value !== undefined) {
      setDisplay(formatDisplay(value));
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    // Permite digitar livremente: só números e vírgula
    const filtered = raw.replace(/[^\d,]/g, '');
    setDisplay(filtered);
    const parsed = parseValue(filtered);
    onChange(parsed === '' ? 0 : parsed);
  };

  const handleBlur = () => {
    const parsed = parseValue(display);
    if (parsed !== '') {
      setDisplay(formatDisplay(parsed));
    }
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{prefix}</span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          prefix && "pl-7",
          className
        )}
      />
    </div>
  );
}