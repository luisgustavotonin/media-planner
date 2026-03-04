export function calculateChannelMetrics(channel, planFunnel, averageTicket) {
  const ltar = channel.use_custom_funnel && channel.lead_to_appointment_rate_override 
    ? channel.lead_to_appointment_rate_override 
    : planFunnel.lead_to_appointment_rate;
  const atsr = channel.use_custom_funnel && channel.appointment_to_show_rate_override 
    ? channel.appointment_to_show_rate_override 
    : planFunnel.appointment_to_show_rate;
  const stsr = channel.use_custom_funnel && channel.show_to_sale_rate_override 
    ? channel.show_to_sale_rate_override 
    : planFunnel.show_to_sale_rate;

  const budget = channel.budget_value || 0;
  const cpl = channel.expected_cpl || 1;
  
  const leads = budget / cpl;
  const appointments = leads * ltar;
  const showups = appointments * atsr;
  const sales = showups * stsr;
  const revenue = sales * averageTicket;

  return {
    leads: Math.round(leads),
    appointments: Math.round(appointments),
    showups: Math.round(showups),
    sales: Math.round(sales * 10) / 10,
    revenue: Math.round(revenue),
    cost_per_lead: leads > 0 ? budget / leads : 0,
    cost_per_appointment: appointments > 0 ? budget / appointments : 0,
    cost_per_showup: showups > 0 ? budget / showups : 0,
    cost_per_sale: sales > 0 ? budget / sales : 0,
    roi: budget > 0 ? ((revenue - budget) / budget) * 100 : 0,
  };
}

export function calculateConsolidated(channels, planFunnel, averageTicket) {
  const channelResults = channels.map(ch => ({
    ...ch,
    metrics: calculateChannelMetrics(ch, planFunnel, averageTicket),
  }));

  const totals = channelResults.reduce((acc, ch) => ({
    total_budget: acc.total_budget + (ch.budget_value || 0),
    total_leads: acc.total_leads + ch.metrics.leads,
    total_appointments: acc.total_appointments + ch.metrics.appointments,
    total_showups: acc.total_showups + ch.metrics.showups,
    total_sales: acc.total_sales + ch.metrics.sales,
    total_revenue: acc.total_revenue + ch.metrics.revenue,
  }), { total_budget: 0, total_leads: 0, total_appointments: 0, total_showups: 0, total_sales: 0, total_revenue: 0 });

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

export function calculateReversePlan(targetRevenue, averageTicket, planFunnel, channelDistribution) {
  const requiredSales = targetRevenue / averageTicket;
  const requiredShowups = requiredSales / planFunnel.show_to_sale_rate;
  const requiredAppointments = requiredShowups / planFunnel.appointment_to_show_rate;
  const requiredLeads = requiredAppointments / planFunnel.lead_to_appointment_rate;

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

export function calculateScenarios(channels, planFunnel, averageTicket, adjustments) {
  const optCplAdj = adjustments?.optimistic_cpl_adj ?? -0.20;
  const conCplAdj = adjustments?.conservative_cpl_adj ?? 0.25;
  const optConvAdj = adjustments?.optimistic_conv_adj ?? 0.05;
  const conConvAdj = adjustments?.conservative_conv_adj ?? -0.05;

  const makeScenario = (cplMult, convAdj, label) => {
    const adjChannels = channels.map(ch => ({
      ...ch,
      expected_cpl: (ch.expected_cpl || 0) * (1 + cplMult),
    }));
    const adjFunnel = {
      lead_to_appointment_rate: Math.min(1, planFunnel.lead_to_appointment_rate + convAdj),
      appointment_to_show_rate: Math.min(1, planFunnel.appointment_to_show_rate + convAdj),
      show_to_sale_rate: Math.min(1, planFunnel.show_to_sale_rate + convAdj),
    };
    return { label, ...calculateConsolidated(adjChannels, adjFunnel, averageTicket) };
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

  channelResults.forEach(ch => {
    if (ch.channel_name === 'Meta' && ch.metrics.leads > 10) {
      const aptRate = ch.use_custom_funnel ? ch.lead_to_appointment_rate_override : null;
      if (aptRate && aptRate < 0.25) {
        recommendations.push({
          type: 'quality',
          severity: 'medium',
          message: `Meta is generating volume but appointment rate is low (${Math.round(aptRate * 100)}%). Review lead quality and consider adding pre-qualification steps in forms.`,
          suggested_action: 'Add qualifying questions to Meta lead forms and review targeting.',
        });
      }
    }
    if (ch.channel_name === 'Google' && ch.metrics.cost_per_lead > 60) {
      recommendations.push({
        type: 'maintain',
        severity: 'low',
        message: `Google CPL is high (R$${Math.round(ch.metrics.cost_per_lead)}) but typically has higher close rates. Maintain minimum budget for bottom-funnel capture.`,
        suggested_action: 'Keep at least 20% of total budget on Google for high-intent searches.',
      });
    }
  });

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