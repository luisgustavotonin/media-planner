// Helpers de formatação para o dashboard e relatórios
export const formatCurrency = (v) =>
  `R$ ${Math.round(v || 0).toLocaleString('pt-BR')}`;

export const formatInt = (v) =>
  Math.round(v || 0).toLocaleString('pt-BR');

export const formatPercent = (v, d = 1) =>
  `${(v || 0).toFixed(d)}%`;

export const formatDecimal = (v, d = 2) =>
  (v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });