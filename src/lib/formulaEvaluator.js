// Utilitário para avaliar fórmulas matemáticas dinâmicas configuradas pelo usuário.
// Usado para os "Métricas Calculadas" dos objetivos de campanha.

// Converte um label (ex: "Custo por Seguidor", "Frequência") em nome de variável válido
// (ex: "custo_por_seguidor", "frequencia") — sem acentos, lowercase, underscores.
export const sanitizeVar = (label) =>
  (label || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// Avalia uma fórmula string usando o contexto de variáveis fornecido.
// Substitui nomes de variáveis pelos valores, valida a expressão e calcula o resultado.
export function evaluateFormula(formula, context) {
  if (!formula) return 0;

  // Normaliza a fórmula: lowercase + remove acentos
  let expr = formula
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Ordena variáveis por tamanho (maior primeiro) para evitar substituições parciais
  const sortedVars = Object.keys(context).sort((a, b) => b.length - a.length);

  // Substitui cada variável pelo seu valor (entre parênteses para segurança)
  for (const v of sortedVars) {
    const regex = new RegExp(`\\b${v}\\b`, 'g');
    expr = expr.replace(regex, `(${context[v]})`);
  }

  // Substitui variáveis desconhecidas por 0 (ex: receita que não está mais no contexto)
  expr = expr.replace(/[a-z_][a-z0-9_]*/g, '0');

  // Validação: só permite números, operadores, parênteses e espaços
  if (!/^[\d+\-*/().\s]+$/.test(expr)) {
    return 0;
  }

  try {
    const result = new Function(`return ${expr}`)();
    return typeof result === 'number' && isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

// Avalia uma lista de métricas calculadas em sequência.
// Cada métrica pode referenciar variáveis do contexto + resultados das métricas anteriores.
export function evaluateCalculatedMetrics(metrics, context) {
  if (!metrics || !metrics.length) return [];

  const results = [];
  const ctx = { ...context };

  for (const m of metrics) {
    const value = evaluateFormula(m.formula, ctx);
    results.push({ label: m.label, value, unit: m.unit || 'numero' });
    // Adiciona o resultado ao contexto para que métricas subsequentes possam referenciá-lo
    ctx[sanitizeVar(m.label)] = value;
  }

  return results;
}