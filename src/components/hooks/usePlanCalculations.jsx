// Calcula métricas de um canal aplicando todas as taxas do funil em cascata
// Retorna também stageValues: array com o volume em cada etapa [leads, stage1, stage2, ..., sales]
export function calculateChannelMetrics(channel, conversionRates, averageTicket) {
  // Se o canal tem taxas personalizadas ativas, usa os overrides do canal
  let rates = Array.isArray(conversionRates) ? conversionRates : [];
  if (channel.use_custom_funnel) {
    const overrides = [
      channel.lead_to_appointment_rate_override,
      channel.appointment_to_show_rate_override,
      channel.show_to_sale_rate_override,
    ];
    // PercentInput devolve 0-1, assim como conversionRates — usa diretamente
    rates = rates.map((r, i) => {
      const ov = overrides[i];
      return (ov !== undefined && ov !== null) ? ov : r;
    });
  }
  const budget = channel.budget_value || 0;
  const taxRate = (channel.tax_percent || 0) / 100;
  const netBudget = budget * (1 - taxRate);
  const cpl = channel.expected_cpl || 1;

  const leads = netBudget / cpl;

  // Calcula volume de cada etapa intermediária dinamicamente
  const stageValues = [leads];
  for (let i = 0; i < rates.length; i++) {
    stageValues.push(stageValues[i] * (rates[i] || 0));
  }
  const salesRaw = stageValues[stageValues.length - 1];
  const salesRounded = Math.round(salesRaw);
  const revenue = salesRounded * averageTicket;

  // Retrocompatibilidade
  const appointments = stageValues[1] || 0;
  const showups = stageValues[2] || 0;

  return {
    leads: Math.round(leads),
    appointments: Math.round(appointments),
    showups: Math.round(showups),
    stageValues: stageValues.map(v => Math.round(v)),
    sales: salesRounded,
    revenue,
    cost_per_lead: leads > 0 ? budget / leads : 0,
    cost_per_appointment: appointments > 0 ? budget / appointments : 0,
    cost_per_showup: showups > 0 ? budget / showups : 0,
    cost_per_sale: salesRounded > 0 ? budget / salesRounded : 0,
    roi: budget > 0 ? ((revenue - budget) / budget) * 100 : 0,
  };
}

export function calculateConsolidated(channels, conversionRates, averageTicket) {
  const channelResults = channels.map(ch => ({
    ...ch,
    metrics: calculateChannelMetrics(ch, conversionRates, averageTicket),
  }));

  const stageCount = (conversionRates || []).length + 1; // leads + N stages
  const totalStageValues = Array(stageCount).fill(0);

  const totals = channelResults.reduce((acc, ch) => {
    ch.metrics.stageValues?.forEach((v, i) => { totalStageValues[i] = (totalStageValues[i] || 0) + v; });
    const taxRate = (ch.tax_percent || 0) / 100;
    const net = (ch.budget_value || 0) * (1 - taxRate);
    return {
      total_budget: acc.total_budget + (ch.budget_value || 0),
      total_net_budget: acc.total_net_budget + net,
      total_leads: acc.total_leads + ch.metrics.leads,
      total_appointments: acc.total_appointments + ch.metrics.appointments,
      total_showups: acc.total_showups + ch.metrics.showups,
      total_sales: acc.total_sales + ch.metrics.sales,
      total_revenue: acc.total_revenue + ch.metrics.revenue,
    };
  }, { total_budget: 0, total_net_budget: 0, total_leads: 0, total_appointments: 0, total_showups: 0, total_sales: 0, total_revenue: 0 });

  totals.stageValues = totalStageValues;

  return {
    channelResults,
    totals,
    blended_cpl: totals.total_leads > 0 ? totals.total_net_budget / totals.total_leads : 0,
    blended_cpa: totals.total_appointments > 0 ? totals.total_net_budget / totals.total_appointments : 0,
    blended_cps: totals.total_showups > 0 ? totals.total_net_budget / totals.total_showups : 0,
    blended_cost_per_sale: totals.total_sales > 0 ? totals.total_net_budget / totals.total_sales : 0,
    overall_roi: totals.total_net_budget > 0 ? ((totals.total_revenue - totals.total_net_budget) / totals.total_net_budget) * 100 : 0,
  };
}

export function calculateReversePlan(targetRevenue, averageTicket, conversionRates, channelDistribution) {
  const rates = conversionRates || [];
  const finalRate = rates.reduce((acc, r) => acc * (r || 0), 1);
  const requiredSales = averageTicket > 0 ? targetRevenue / averageTicket : 0;
  const requiredLeads = finalRate > 0 ? requiredSales / finalRate : 0;

  // Calcula todas as etapas intermediárias dinamicamente (do topo para o fundo)
  const stageValues = [Math.round(requiredLeads)];
  let current = requiredLeads;
  for (let i = 0; i < rates.length - 1; i++) {
    current = current * (rates[i] || 0);
    stageValues.push(Math.round(current));
  }
  stageValues.push(Math.round(requiredSales));

  const channelBudgets = channelDistribution.map(ch => {
    const chLeads = requiredLeads * (ch.percent / 100);
    const chBudget = chLeads * ch.expected_cpl;
    return { ...ch, required_leads: Math.round(chLeads), required_budget: Math.round(chBudget) };
  });

  const totalInvestment = channelBudgets.reduce((sum, ch) => sum + ch.required_budget, 0);

  return {
    required_sales: Math.round(requiredSales * 10) / 10,
    required_leads: Math.round(requiredLeads),
    stage_values: stageValues, // array dinâmico com todas as etapas
    // retrocompatibilidade
    required_appointments: Math.round(requiredLeads * (rates[0] || 0)),
    required_showups: Math.round(requiredLeads * (rates[0] || 0) * (rates[1] || 0)),
    channel_budgets: channelBudgets,
    total_investment: totalInvestment,
  };
}

export function calculateScenarios(channels, conversionRates, averageTicket, adjustments) {
  const optCplAdj = adjustments?.optimistic_cpl_adj ?? -0.20;
  const conCplAdj = adjustments?.conservative_cpl_adj ?? 0.25;
  const optConvAdj = adjustments?.optimistic_conv_adj ?? 0.05;
  const conConvAdj = adjustments?.conservative_conv_adj ?? -0.05;

  const makeScenario = (cplMult, convAdj, label) => {
    const adjChannels = channels.map(ch => ({
      ...ch,
      expected_cpl: (ch.expected_cpl || 0) * (1 + cplMult),
    }));
    const adjRates = (conversionRates || []).map(r => Math.min(1, Math.max(0, r + convAdj)));
    return { label, ...calculateConsolidated(adjChannels, adjRates, averageTicket) };
  };

  return {
    optimistic: makeScenario(optCplAdj, optConvAdj, 'Optimistic'),
    realistic: makeScenario(0, 0, 'Realistic'),
    conservative: makeScenario(conCplAdj, conConvAdj, 'Conservative'),
  };
}

export function generateRecommendations(channelResults, weeklyActuals, weeklyTargets) {
  const recommendations = [];
  
  if (!channelResults || channelResults.length === 0) return recommendations;

  const bestChannel = [...channelResults].sort((a, b) => a.metrics.cost_per_lead - b.metrics.cost_per_lead)[0];
  const worstChannel = [...channelResults].sort((a, b) => b.metrics.cost_per_lead - a.metrics.cost_per_lead)[0];

  if (worstChannel && bestChannel && worstChannel.channel_name !== bestChannel.channel_name) {
    const cplDiff = worstChannel.metrics.cost_per_lead / bestChannel.metrics.cost_per_lead;
    if (cplDiff > 1.5) {
      recommendations.push({
        type: 'budget_shift',
        severity: 'high',
        message: `CPL de ${worstChannel.channel_name} está ${Math.round((cplDiff - 1) * 100)}% mais alto que ${bestChannel.channel_name}. Considere migrar 15-20% do budget de ${worstChannel.channel_name} para ${bestChannel.channel_name}.`,
        suggested_action: `Mover R$${Math.round(worstChannel.budget_value * 0.15)} de ${worstChannel.channel_name} para ${bestChannel.channel_name}`,
      });
    }
  }

  if (weeklyActuals && weeklyTargets) {
    const totalActualLeads = weeklyActuals.reduce((s, w) => s + (w.leads_actual || 0), 0);
    const weeksElapsed = weeklyActuals.length;
    const expectedLeads = weeklyTargets.slice(0, weeksElapsed).reduce((s, t) => s + t.leads, 0);
    
    if (expectedLeads > 0 && totalActualLeads < expectedLeads * 0.8) {
      recommendations.push({
        type: 'volume_low',
        severity: 'high',
        message: `Total de leads está ${Math.round((1 - totalActualLeads / expectedLeads) * 100)}% abaixo da meta semanal. Considere aumentar o budget ou expandir segmentação e criativos.`,
        suggested_action: 'Aumentar o budget diário em 10-15% e revisar o desempenho dos criativos.',
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'on_track',
      severity: 'low',
      message: 'Todos os canais estão performando dentro dos parâmetros esperados. Continue monitorando semanalmente.',
      suggested_action: 'Manter a alocação atual e revisar na próxima semana.',
    });
  }

  return recommendations;
}