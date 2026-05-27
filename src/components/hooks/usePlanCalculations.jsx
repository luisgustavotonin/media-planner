// Calcula métricas de um canal aplicando todas as taxas do funil em cascata
// Retorna também stageValues: array com o volume em cada etapa [leads, stage1, stage2, ..., sales]
export function calculateChannelMetrics(channel, conversionRates, averageTicket) {
  const rates = conversionRates || [];
  const budget = channel.budget_value || 0;
  const cpl = channel.expected_cpl || 1;

  const leads = budget / cpl;

  // Calcula volume de cada etapa intermediária dinamicamente
  const stageValues = [leads];
  for (let i = 0; i < rates.length; i++) {
    stageValues.push(stageValues[i] * (rates[i] || 0));
  }
  const sales = stageValues[stageValues.length - 1];
  const revenue = sales * averageTicket;

  // Retrocompatibilidade
  const appointments = stageValues[1] || 0;
  const showups = stageValues[2] || 0;

  return {
    leads: Math.round(leads),
    appointments: Math.round(appointments),
    showups: Math.round(showups),
    stageValues: stageValues.map(v => Math.round(v)),
    sales: Math.round(sales * 10) / 10,
    revenue: Math.round(revenue),
    cost_per_lead: leads > 0 ? budget / leads : 0,
    cost_per_appointment: appointments > 0 ? budget / appointments : 0,
    cost_per_showup: showups > 0 ? budget / showups : 0,
    cost_per_sale: sales > 0 ? budget / sales : 0,
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
    return {
      total_budget: acc.total_budget + (ch.budget_value || 0),
      total_leads: acc.total_leads + ch.metrics.leads,
      total_appointments: acc.total_appointments + ch.metrics.appointments,
      total_showups: acc.total_showups + ch.metrics.showups,
      total_sales: acc.total_sales + ch.metrics.sales,
      total_revenue: acc.total_revenue + ch.metrics.revenue,
    };
  }, { total_budget: 0, total_leads: 0, total_appointments: 0, total_showups: 0, total_sales: 0, total_revenue: 0 });

  totals.stageValues = totalStageValues;

  return {
    channelResults,
    totals,
    blended_cpl: totals.total_leads > 0 ? totals.total_budget / totals.total_leads : 0,
    blended_cpa: totals.total_appointments > 0 ? totals.total_budget / totals.total_appointments : 0,
    blended_cps: totals.total_showups > 0 ? totals.total_budget / totals.total_showups : 0,
    blended_cost_per_sale: totals.total_sales > 0 ? totals.total_budget / totals.total_sales : 0,
    overall_roi: totals.total_budget > 0 ? ((totals.total_revenue - totals.total_budget) / totals.total_budget) * 100 : 0,
  };
}

export function calculateReversePlan(targetRevenue, averageTicket, conversionRates, channelDistribution) {
  const finalRate = (conversionRates || []).reduce((acc, r) => acc * (r || 0), 1);
  const requiredSales = targetRevenue / averageTicket;
  const requiredLeads = finalRate > 0 ? requiredSales / finalRate : 0;

  // Para exibição intermediária (usa os 3 primeiros se disponíveis)
  const r0 = conversionRates?.[0] || 0;
  const r1 = conversionRates?.[1] || 0;
  const requiredAppointments = requiredLeads * r0;
  const requiredShowups = requiredAppointments * r1;

  const channelBudgets = channelDistribution.map(ch => {
    const chLeads = requiredLeads * (ch.percent / 100);
    const chBudget = chLeads * ch.expected_cpl;
    return { ...ch, required_leads: Math.round(chLeads), required_budget: Math.round(chBudget) };
  });

  const totalInvestment = channelBudgets.reduce((sum, ch) => sum + ch.required_budget, 0);

  return {
    required_sales: Math.round(requiredSales * 10) / 10,
    required_showups: Math.round(requiredShowups),
    required_appointments: Math.round(requiredAppointments),
    required_leads: Math.round(requiredLeads),
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
        message: `${worstChannel.channel_name} CPL is ${Math.round((cplDiff - 1) * 100)}% higher than ${bestChannel.channel_name}. Consider shifting 15-20% of ${worstChannel.channel_name} budget to ${bestChannel.channel_name}.`,
        suggested_action: `Move R$${Math.round(worstChannel.budget_value * 0.15)} from ${worstChannel.channel_name} to ${bestChannel.channel_name}`,
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
        message: `Total leads are ${Math.round((1 - totalActualLeads / expectedLeads) * 100)}% below weekly target. Consider increasing budget or expanding targeting/creatives.`,
        suggested_action: 'Increase daily budget by 10-15% and review ad creative performance.',
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'on_track',
      severity: 'low',
      message: 'All channels are performing within expected parameters. Continue monitoring weekly.',
      suggested_action: 'Maintain current allocation and review next week.',
    });
  }

  return recommendations;
}