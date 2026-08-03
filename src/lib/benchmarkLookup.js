// Helper compartilhado para lookup de benchmarks.
// Chave do benchmark: funil + canal + objetivo (segmento foi descontinuado).

// Encontra o benchmark mais específico disponível.
// Ordem de precedência:
//   1) funil + canal + objetivo (exato)
//   2) funil + canal (sem objetivo)
//   3) legado: funil (sem canal)
export function findBenchmark({ benchmarks = [], funnelTypeId, channelName, objectiveId } = {}) {
  if (!benchmarks.length) return null;
  // 1 — funil + canal + objetivo (exato)
  let b = benchmarks.find(x =>
    x.funnel_type_id === funnelTypeId &&
    (x.channel_name || '') === (channelName || '') &&
    (x.objective_id || '') === (objectiveId || '')
  );
  if (b) return b;
  // 2 — funil + canal (sem objetivo)
  b = benchmarks.find(x =>
    x.funnel_type_id === funnelTypeId &&
    (x.channel_name || '') === (channelName || '') &&
    !x.objective_id
  );
  if (b) return b;
  // 3 — legado: só funil (sem canal)
  b = benchmarks.find(x => x.funnel_type_id === funnelTypeId && !x.channel_name);
  return b || null;
}

// Extrai o CPL de um benchmark (default_cpl, com fallback para os campos legados)
export function getCplFromBenchmark(benchmark) {
  if (!benchmark) return 0;
  return benchmark.default_cpl
    || benchmark.meta_default_cpl
    || benchmark.google_default_cpl
    || 0;
}

// Resolve as taxas de conversão de um benchmark (array, com fallback legado)
export function getRatesFromBenchmark(benchmark) {
  if (!benchmark) return [];
  if (benchmark.conversion_rates?.length > 0) return [...benchmark.conversion_rates];
  const legacy = [benchmark.lead_to_appointment_rate, benchmark.appointment_to_show_rate, benchmark.show_to_sale_rate];
  return legacy.filter(v => v != null && v > 0);
}