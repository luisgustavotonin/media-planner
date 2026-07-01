// Calcula métricas de um canal agregando os KPIs das campanhas (strategies)
// Cada campanha tem: objective, kpi_value (custo por unidade na 1ª etapa do funil), budget_value
// Retorna também stageValues: array com o volume em cada etapa [leads, stage1, stage2, ..., sales]
export function calculateChannelMetrics(channel, conversionRates, averageTicket, objectives = []) {
  let rates = Array.isArray(conversionRates) ? conversionRates : [];
  if (channel.use_custom_funnel) {
    const overrides = channel.conversion_rate_overrides || [];
    rates = rates.map((r, i) => {
      const ov = overrides[i];
      return (ov !== undefined && ov !== null) ? ov : r;
    });
  }
  const budget = channel.budget_value || 0;
  const taxRate = (channel.tax_percent || 0) / 100;
  const netBudget = budget * (1 - taxRate);

  let leads = 0;
  let sales = 0;
  let revenue = 0;
  const totalStageValues = [];
  let branding = { impressions: 0, clicks: 0, reach: 0, investment: 0 };
  const campaigns = channel.strategies || [];

  for (const camp of campaigns) {
    const campBudget = camp.budget_value
      || (camp.adsets || []).reduce((s, a) => s + (a.budget_value || 0), 0);
    const campNetBudget = campBudget * (1 - taxRate);
    const obj = objectives.find(o => o.name === camp.objective);
    const objType = obj?.type || 'performance';
    const campAvgTicket = obj?.average_ticket || averageTicket;

    const costKpi = (camp.kpi_values || []).find(kv => kv.unit === 'moeda' && kv.value > 0);
    const costKpiLabel = (costKpi?.label || '').toLowerCase();
    const kpiValue = costKpi?.value || camp.kpi_value || 0;

    if (objType === 'branding') {
      branding.investment += campBudget;
      let campImpressions = 0;
      if (kpiValue > 0) {
        if (costKpiLabel.includes('cpm') || costKpiLabel.includes('impress') || costKpiLabel.includes('mil')) {
          campImpressions = (campNetBudget / kpiValue) * 1000;
          branding.impressions += campImpressions;
        } else if (costKpiLabel.includes('cpc') || costKpiLabel.includes('click') || costKpiLabel.includes('clique')) {
          branding.clicks += campNetBudget / kpiValue;
        }
      }
      const freqKpi = (camp.kpi_values || []).find(kv =>
        kv.unit === 'numero' && (kv.label || '').toLowerCase().includes('freq'));
      if (freqKpi && freqKpi.value > 0 && campImpressions > 0) {
        branding.reach += campImpressions / freqKpi.value;
      }
    } else {
      if (kpiValue > 0) {
        const campLeads = campNetBudget / kpiValue;
        leads += campLeads;
        // Usa taxas do funil da campanha se disponível, senão usa as do plano (legacy)
        const campRates = camp.funnel_rates?.length ? camp.funnel_rates : (rates.length > 0 ? rates : null);
        if (campRates && campRates.length > 0) {
          const campStages = [campLeads];
          for (let i = 0; i < campRates.length; i++) {
            campStages.push(campStages[i] * (campRates[i] || 0));
          }
          const campSales = campStages[campStages.length - 1];
          sales += campSales;
          revenue += campSales * campAvgTicket;
          campStages.forEach((v, i) => { totalStageValues[i] = (totalStageValues[i] || 0) + v; });
        }
      }
    }
  }

  // Retrocompatibilidade: se não há campanhas com KPI, usa expected_cpl do canal
  if (leads === 0 && channel.expected_cpl) {
    leads = netBudget / channel.expected_cpl;
    if (rates.length > 0) {
      const stageValues = [leads];
      for (let i = 0; i < rates.length; i++) {
        stageValues.push(stageValues[i] * (rates[i] || 0));
      }
      sales = stageValues[stageValues.length - 1];
      revenue = Math.round(sales) * averageTicket;
      stageValues.forEach((v, i) => { totalStageValues[i] = (totalStageValues[i] || 0) + v; });
    }
  }

  const salesRounded = Math.round(sales);
  const appointments = totalStageValues[1] || 0;
  const showups = totalStageValues[2] || 0;

  return {
    leads: Math.round(leads),
    appointments: Math.round(appointments),
    showups: Math.round(showups),
    stageValues: totalStageValues.map(v => Math.round(v)),
    sales: salesRounded,
    revenue: Math.round(revenue),
    cost_per_lead: leads > 0 ? budget / leads : 0,
    cost_per_appointment: appointments > 0 ? budget / appointments : 0,
    cost_per_showup: showups > 0 ? budget / showups : 0,
    cost_per_sale: salesRounded > 0 ? budget / salesRounded : 0,
    roi: budget > 0 ? ((revenue - budget) / budget) * 100 : 0,
    branding: {
      impressions: Math.round(branding.impressions),
      clicks: Math.round(branding.clicks),
      reach: Math.round(branding.reach),
      investment: branding.investment,
    },
  };
}

export function calculateConsolidated(channels, conversionRates, averageTicket, objectives = []) {
  const channelResults = channels.map(ch => ({
    ...ch,
    metrics: calculateChannelMetrics(ch, conversionRates, averageTicket, objectives),
  }));

  let stageCount = (conversionRates || []).length + 1;
  for (const ch of channels) {
    for (const camp of (ch.strategies || [])) {
      if (camp.funnel_rates?.length) {
        stageCount = Math.max(stageCount, camp.funnel_rates.length + 1);
      }
    }
  }
  const totalStageValues = Array(stageCount).fill(0);
  let brandingImpressions = 0, brandingClicks = 0, brandingReach = 0, brandingInvestment = 0;

  const totals = channelResults.reduce((acc, ch) => {
    ch.metrics.stageValues?.forEach((v, i) => { totalStageValues[i] = (totalStageValues[i] || 0) + v; });
    const taxRate = (ch.tax_percent || 0) / 100;
    const net = (ch.budget_value || 0) * (1 - taxRate);
    if (ch.metrics.branding) {
      brandingImpressions += ch.metrics.branding.impressions || 0;
      brandingClicks += ch.metrics.branding.clicks || 0;
      brandingReach += ch.metrics.branding.reach || 0;
      brandingInvestment += ch.metrics.branding.investment || 0;
    }
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
  totals.branding = {
    impressions: Math.round(brandingImpressions),
    clicks: Math.round(brandingClicks),
    reach: Math.round(brandingReach),
    investment: brandingInvestment,
  };

  // Agrega todos os KPIs preenchidos nas campanhas (kpi_values com value > 0)
  // Separa por tipo de objetivo (performance vs branding)
  const kpiMap = {};
  for (const ch of channels) {
    for (const camp of ch.strategies || []) {
      const obj = objectives.find(o => o.name === camp.objective);
      const objType = obj?.type || 'performance';
      const campBudget = camp.budget_value || 0;
      for (const kv of camp.kpi_values || []) {
        if (kv.value > 0) {
          const key = `${kv.label}__${objType}`;
          if (!kpiMap[key]) {
            kpiMap[key] = { label: kv.label, unit: kv.unit, totalValue: 0, totalBudget: 0, count: 0, type: objType };
          }
          if (kv.unit === 'numero') {
            kpiMap[key].totalValue += kv.value;
          } else {
            kpiMap[key].totalValue += kv.value * campBudget;
            kpiMap[key].totalBudget += campBudget;
          }
          kpiMap[key].count++;
        }
      }
    }
  }
  const kpiList = Object.values(kpiMap).map(k => ({
    label: k.label,
    unit: k.unit,
    type: k.type,
    value: k.unit === 'numero'
      ? k.totalValue
      : (k.totalBudget > 0 ? k.totalValue / k.totalBudget : (k.count > 0 ? k.totalValue / k.count : 0)),
  }));
  totals.kpi_totals = kpiList;
  totals.kpi_totals_performance = kpiList.filter(k => k.type === 'performance');
  totals.kpi_totals_branding = kpiList.filter(k => k.type === 'branding');

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
    const chBudget = chLeads * (ch.expected_cpl || 0);
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

export function calculateScenarios(channels, conversionRates, averageTicket, adjustments, objectives = []) {
  const optCplAdj = adjustments?.optimistic_cpl_adj ?? -0.20;
  const conCplAdj = adjustments?.conservative_cpl_adj ?? 0.25;
  const optConvAdj = adjustments?.optimistic_conv_adj ?? 0.05;
  const conConvAdj = adjustments?.conservative_conv_adj ?? -0.05;

  const makeScenario = (cplMult, convAdj, label) => {
    // Ajusta o kpi_value de cada campanha dentro de cada canal
    const adjChannels = channels.map(ch => ({
      ...ch,
      strategies: (ch.strategies || []).map(camp => ({
        ...camp,
        kpi_value: (camp.kpi_value || 0) * (1 + cplMult),
        kpi_values: (camp.kpi_values || []).map(kv =>
          kv.unit === 'moeda' ? { ...kv, value: (kv.value || 0) * (1 + cplMult) } : kv
        ),
      })),
      // Retrocompatibilidade: ajusta expected_cpl também
      expected_cpl: (ch.expected_cpl || 0) * (1 + cplMult),
    }));
    const adjRates = (conversionRates || []).map(r => Math.min(1, Math.max(0, r + convAdj)));
    return { label, ...calculateConsolidated(adjChannels, adjRates, averageTicket, objectives) };
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

// Calcula um KPI blended (custo por unidade na 1ª etapa) para um canal a partir de suas campanhas
export function getChannelBlendedKpi(channel) {
  const campaigns = channel.strategies || [];
  let totalBudget = 0;
  let totalUnits = 0;
  for (const camp of campaigns) {
    const campBudget = camp.budget_value
      || (camp.adsets || []).reduce((s, a) => s + (a.budget_value || 0), 0);
    const costKpi = (camp.kpi_values || []).find(kv => kv.unit === 'moeda' && kv.value > 0);
    const kpiValue = costKpi?.value || camp.kpi_value || 0;
    totalBudget += campBudget;
    if (kpiValue > 0) totalUnits += campBudget / kpiValue;
  }
  return totalUnits > 0 ? totalBudget / totalUnits : (channel.expected_cpl || 0);
}