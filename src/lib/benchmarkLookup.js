// Helper compartilhado para lookup de benchmarks.
// Chave do benchmark: funil + canal + objetivo + segmento (com fallbacks em cascata).

// Encontra o benchmark mais específico disponível.
// Ordem de precedência:
//   1) funil + canal + objetivo + segmento (exato)
//   2) funil + canal + objetivo (sem segmento)
//   3) funil + canal + segmento (sem objetivo)
//   4) funil + canal (sem objetivo nem segmento)
//   5) legado: funil + segmento (sem canal/objetivo)
export function findBenchmark({ benchmarks = [], funnelTypeId, channelName, objectiveId, segment } = {}) {
  if (!benchmarks.length) return null;
  const match = (b) => {
    if (funnelTypeId && b.funnel_type_id !== funnelTypeId) return false;
    if (channelName && (b.channel_name || '') !== channelName) return false;
    if (objectiveId && (b.objective_id || '') !== objectiveId) return false;
    if (segment !== undefined && (b.segment || '') !== segment) return false;
    return true;
  };
  // 1 — exato
  let b = benchmarks.find(x =>
    x.funnel_type_id === funnelTypeId &&
    (x.channel_name || '') === channelName &&
    (x.objective_id || '') === objectiveId &&
    (x.segment || '') === segment
  );
  if (b) return b;
  // 2 — sem segmento
  b = benchmarks.find(x =>
    x.funnel_type_id === funnelTypeId &&
    (x.channel_name || '') === channelName &&
    (x.objective_id || '') === objectiveId &&
    !x.segment
  );
  if (b) return b;
  // 3 — sem objetivo
  b = benchmarks.find(x =>
    x.funnel_type_id === funnelTypeId &&
    (x.channel_name || '') === channelName &&
    (x.segment || '') === segment &&
    !x.objective_id
  );
  if (b) return b;
  // 4 — só funil + canal
  b = benchmarks.find(x =>
    x.funnel_type_id === funnelTypeId &&
    (x.channel_name || '') === channelName &&
    !x.objective_id &&
    !x.segment
  );
  if (b) return b;
  // 5 — legado: funil + segmento (sem canal)
  b = benchmarks.find(x =>
    x.funnel_type_id === funnelTypeId &&
    !x.channel_name &&
    (x.segment || '') === segment
  );
  if (b) return b;
  // 6 — legado: só funil
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