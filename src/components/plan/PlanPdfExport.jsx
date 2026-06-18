import { jsPDF } from 'jspdf';

const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const SEGMENTOS = {
  implants: 'Implantes', aesthetics: 'Estetica', orthodontics: 'Ortodontia',
  general: 'Clinica Geral', periodontics: 'Periodontia', endodontics: 'Endodontia',
  pediatric: 'Odontopediatria', other: 'Outros',
};
const STATUS_PT = { draft: 'Rascunho', active: 'Ativo', completed: 'Concluido' };

// jsPDF Helvetica = Latin-1 subset — substitui caracteres fora do range com equivalentes legíveis
const CHAR_MAP = {
  'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a',
  'è':'e','é':'e','ê':'e','ë':'e',
  'ì':'i','í':'i','î':'i','ï':'i',
  'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o',
  'ù':'u','ú':'u','û':'u','ü':'u',
  'ý':'y','ÿ':'y',
  'ñ':'n','ç':'c',
  'À':'A','Á':'A','Â':'A','Ã':'A','Ä':'A','Å':'A',
  'È':'E','É':'E','Ê':'E','Ë':'E',
  'Ì':'I','Í':'I','Î':'I','Ï':'I',
  'Ò':'O','Ó':'O','Ô':'O','Õ':'O','Ö':'O',
  'Ù':'U','Ú':'U','Û':'U','Ü':'U',
  'Ñ':'N','Ç':'C',
  '→':'>','–':'-','—':'-','«':'"','»':'"',
};

function safe(str) {
  if (!str) return '';
  return String(str).split('').map(c => CHAR_MAP[c] ?? (c.charCodeAt(0) > 255 ? '?' : c)).join('');
}

// Paleta U-Trax
const C = {
  marrom:  [49,  43,  29],   // #312B1D
  laranja: [248, 93,  7],    // #F85D07
  crema:   [226, 204, 175],  // #E2CCAF
  linho:   [250, 249, 245],  // #FAF9F5
  savana:  [126, 105, 81],   // #7E6951
  branco:  [255, 255, 255],
  cinza:   [100, 90,  75],
  escuro:  [30,  25,  15],
};

function fmt(v) {
  if (typeof v !== 'number') return '-';
  if (v >= 1000) return 'R$' + Math.round(v).toLocaleString('pt-BR');
  return 'R$' + v.toFixed(2);
}
function fmtN(v) {
  return typeof v === 'number' ? Math.round(v).toLocaleString('pt-BR') : '-';
}
function fmtRoas(revenue, budget) {
  return budget > 0 ? (revenue / budget).toFixed(2) + 'x' : '-';
}
function fmtPct(v) {
  return typeof v === 'number' ? (v * 100).toFixed(1) + '%' : '-';
}

// Abreviacoes legíveis de etapas do funil
const ABBREV_MAP = {
  'lead': 'Leads', 'leads': 'Leads',
  'contato': 'Contato', 'contact': 'Contato',
  'qualificacao': 'Qualif.', 'qualificacao': 'Qualif.', 'qualification': 'Qualif.',
  'agendamento': 'Agenda.', 'agend': 'Agenda.',
  'call': 'Call',
  'realizado': 'Realiz.',
  'proposta': 'Proposta',
  'enviada': 'Enviada',
  'fechamento': 'Fecha.',
  'venda': 'Vendas', 'vendas': 'Vendas', 'sale': 'Vendas',
};

function abbrevStage(label) {
  const s = safe(label || '');
  // Tenta match no mapa por palavra-chave
  const lower = s.toLowerCase();
  for (const [key, val] of Object.entries(ABBREV_MAP)) {
    if (lower.includes(key)) return val;
  }
  return s.length > 9 ? s.substring(0, 8) + '.' : s;
}

function drawTable(doc, { startY, headers, rows, colWidths, pageW, marginL = 14, lastRowBold = true }) {
  const rowH = 7.5;
  const headerH = 9;
  let y = startY;
  const tableW = pageW - marginL * 2;

  // Header row — marrom escuro
  doc.setFillColor(...C.marrom);
  doc.rect(marginL, y, tableW, headerH, 'F');
  doc.setTextColor(...C.crema);
  doc.setFontSize(6.5);
  doc.setFont(undefined, 'bold');
  let x = marginL;
  headers.forEach((h, i) => {
    const align = i === 0 ? 'left' : 'right';
    const textX = align === 'left' ? x + 3 : x + colWidths[i] - 2;
    doc.text(safe(h), textX, y + 6, { align });
    x += colWidths[i];
  });
  y += headerH;

  // Data rows
  rows.forEach((row, ri) => {
    const isLast = ri === rows.length - 1;
    if (isLast && lastRowBold) {
      doc.setFillColor(...C.crema);
      doc.rect(marginL, y, tableW, rowH, 'F');
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...C.marrom);
    } else if (ri % 2 === 0) {
      doc.setFillColor(...C.linho);
      doc.rect(marginL, y, tableW, rowH, 'F');
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...C.escuro);
    } else {
      doc.setFillColor(240, 237, 230);
      doc.rect(marginL, y, tableW, rowH, 'F');
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...C.escuro);
    }

    doc.setFontSize(6.5);
    let cx = marginL;
    row.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'right';
      const textX = align === 'left' ? cx + 3 : cx + colWidths[i] - 2;
      doc.text(safe(String(cell)), textX, y + 5.2, { align });
      cx += colWidths[i];
    });

    if (isLast && lastRowBold) doc.setFont(undefined, 'normal');

    // Linha separadora sutil
    doc.setDrawColor(...C.crema);
    doc.line(marginL, y + rowH, pageW - marginL, y + rowH);
    y += rowH;
  });

  return y;
}

export async function exportPlanToPdf({ localPlan, consolidated, totalInvestment, funnelStages, conversionPairs, getRate }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const mes = MESES[(localPlan.period_month || 1) - 1];
  const titulo = safe(`${localPlan.client_name || 'Cliente'}  |  ${mes} ${localPlan.period_year}`);

  // ── Header marrom ─────────────────────────────────────────
  const headerH = 30;
  doc.setFillColor(...C.marrom);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Detalhe laranja lateral esquerdo
  doc.setFillColor(...C.laranja);
  doc.rect(0, 0, 4, headerH, 'F');

  // Subtítulo "Plano de Midia"
  doc.setTextColor(...C.laranja);
  doc.setFontSize(7.5);
  doc.setFont(undefined, 'bold');
  doc.text('PLANO DE MIDIA', marginL + 4, 8);

  doc.setTextColor(...C.linho);
  doc.setFontSize(15);
  doc.setFont(undefined, 'bold');
  doc.text(titulo, marginL + 4, 16);

  doc.setFontSize(7.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...C.crema);
  const segLabel = safe(`Segmento: ${SEGMENTOS[localPlan.segment] || localPlan.segment || 'Geral'}   Status: ${STATUS_PT[localPlan.status] || 'Rascunho'}   Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);
  doc.text(segLabel, marginL + 4, 23);

  let y = headerH + 8;

  // ── Cards de resumo ──────────────────────────────────────
  const netInvestment = (localPlan.channels || []).reduce((s, c) => {
    const tax = (c.tax_percent || 0) / 100;
    return s + (c.budget_value || 0) * (1 - tax);
  }, 0);
  const hasAnyTax = (localPlan.channels || []).some(c => (c.tax_percent || 0) > 0);

  const cards = [
    { label: 'Invest. Bruto', value: `R$${Math.round(totalInvestment).toLocaleString('pt-BR')}` },
    ...(hasAnyTax ? [{ label: 'Invest. Liquido', value: `R$${Math.round(netInvestment).toLocaleString('pt-BR')}` }] : []),
    { label: 'Leads Esperados', value: fmtN(consolidated.totals.total_leads) },
    { label: 'Vendas Esperadas', value: fmtN(consolidated.totals.total_sales) },
    { label: 'Receita Projetada', value: `R$${Math.round(consolidated.totals.total_revenue).toLocaleString('pt-BR')}` },
    { label: 'ROAS Geral', value: fmtRoas(consolidated.totals.total_revenue, consolidated.totals.total_net_budget ?? totalInvestment) },
  ];

  const cardW = (pageW - marginL * 2 - (cards.length - 1) * 3) / cards.length;
  const cardH = 18;
  cards.forEach((c, i) => {
    const cx = marginL + i * (cardW + 3);
    // Card bg crema
    doc.setFillColor(...C.linho);
    doc.setDrawColor(...C.crema);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'FD');
    // Topo laranja
    doc.setFillColor(...C.laranja);
    doc.roundedRect(cx, y, cardW, 3, 1, 1, 'F');
    doc.rect(cx, y + 1.5, cardW, 1.5, 'F'); // quadratura do canto inferior da faixa

    doc.setFontSize(6.5);
    doc.setTextColor(...C.savana);
    doc.setFont(undefined, 'normal');
    doc.text(safe(c.label), cx + 4, y + 8);
    doc.setFontSize(11);
    doc.setTextColor(...C.marrom);
    doc.setFont(undefined, 'bold');
    doc.text(safe(c.value), cx + 4, y + 15);
  });
  y += cardH + 8;

  // ── Premissas do Funil ───────────────────────────────────
  if (conversionPairs && conversionPairs.length > 0) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.marrom);
    doc.text('Premissas do Funil', marginL, y);

    // Linha decorativa laranja
    doc.setDrawColor(...C.laranja);
    doc.setLineWidth(0.5);
    doc.line(marginL, y + 1.5, marginL + 50, y + 1.5);
    doc.setLineWidth(0.2);
    y += 5;

    const premHeaders = [...conversionPairs.map(p => {
      // Pega so o destino da seta "Lead > Contato" => "Contato"
      const parts = safe(p.label || '').split(/[>\-]+/);
      const dest = (parts[parts.length - 1] || '').trim();
      return abbrevStage(dest) || abbrevStage(p.label);
    }), 'Ticket Medio'];
    const premValues = [...conversionPairs.map((_, i) => fmtPct(getRate(i))), fmt(localPlan.average_ticket)];
    const premColW = (pageW - marginL * 2) / premHeaders.length;
    const premColWidths = premHeaders.map(() => premColW);

    y = drawTable(doc, {
      startY: y,
      headers: premHeaders,
      rows: [premValues],
      colWidths: premColWidths,
      pageW,
      marginL,
      lastRowBold: false,
    });
    y += 7;
  }

  // ── Tabela de Resultados por Canal ───────────────────────
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text('Resultados Projetados por Canal', marginL, y);

  doc.setDrawColor(...C.laranja);
  doc.setLineWidth(0.5);
  doc.line(marginL, y + 1.5, marginL + 70, y + 1.5);
  doc.setLineWidth(0.2);
  y += 5;

  const middleCols = funnelStages && funnelStages.length >= 2
    ? funnelStages.slice(1, -1).map((s, i) => ({ label: s.label, stageIndex: i + 1 }))
    : [{ label: 'Agendamentos', stageIndex: 1 }, { label: 'Comparecimentos', stageIndex: 2 }];

  const tableHeaders = [
    'Canal', 'Budget', 'Leads',
    ...middleCols.map(c => abbrevStage(c.label)),
    'Vendas', 'Receita', 'CPL', 'CAC', 'ROAS'
  ];

  const totalTableW = pageW - marginL * 2;
  const canalW = 30;
  const budgetW = 22;
  const receitaW = 24;
  const numColsRest = tableHeaders.length - 3; // exceto Canal, Budget, Receita
  const otherW = (totalTableW - canalW - budgetW - receitaW) / numColsRest;

  const colWidths = [
    canalW, budgetW,
    ...tableHeaders.slice(2, -4).map(() => otherW), // Leads + middles
    otherW,    // Vendas
    receitaW,  // Receita
    otherW,    // CPL
    otherW,    // CAC
    otherW,    // ROAS
  ];

  const tableRows = (consolidated.channelResults || []).map(ch => {
    const taxRate = (ch.tax_percent || 0) / 100;
    const net = (ch.budget_value || 0) * (1 - taxRate);
    return [
      safe(ch.channel_name || '-'),
      fmt(net),
      fmtN(ch.metrics.leads),
      ...middleCols.map(col => fmtN(ch.metrics.stageValues?.[col.stageIndex])),
      fmtN(ch.metrics.sales),
      fmt(ch.metrics.revenue),
      fmt(ch.metrics.cost_per_lead),
      fmt(ch.metrics.cost_per_sale),
      fmtRoas(ch.metrics.revenue, net),
    ];
  });

  const totNetBudget = consolidated.totals?.total_net_budget ?? consolidated.totals?.total_budget;
  tableRows.push([
    'Total',
    fmt(totNetBudget),
    fmtN(consolidated.totals?.total_leads),
    ...middleCols.map(col => fmtN(consolidated.totals?.stageValues?.[col.stageIndex])),
    fmtN(consolidated.totals?.total_sales),
    fmt(consolidated.totals?.total_revenue),
    fmt(consolidated.blended_cpl),
    fmt(consolidated.blended_cost_per_sale),
    fmtRoas(consolidated.totals?.total_revenue, totNetBudget),
  ]);

  y = drawTable(doc, { startY: y, headers: tableHeaders, rows: tableRows, colWidths, pageW, marginL });

  // ── Campanhas Meta ───────────────────────────────────────
  const FUNNEL_STAGES_PDF = { topo: 'Topo (Reconhecimento)', meio: 'Meio (Consideracao)', fundo: 'Fundo (Conversao)' };
  const metaChannels = (localPlan.channels || []).filter(c => c.channel_name === 'Meta' && (c.strategies || []).length > 0);
  if (metaChannels.length > 0) {
    doc.addPage();
    let my = 0;

    // Header página Meta
    doc.setFillColor(...C.marrom);
    doc.rect(0, 0, pageW, headerH, 'F');
    doc.setFillColor(...C.laranja);
    doc.rect(0, 0, 4, headerH, 'F');
    doc.setTextColor(...C.laranja);
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.text('PLANO DE MIDIA', marginL + 4, 8);
    doc.setTextColor(...C.linho);
    doc.setFontSize(15);
    doc.text(titulo, marginL + 4, 16);
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.crema);
    doc.text(safe('Estrutura de Campanhas Meta Ads'), marginL + 4, 23);
    my = headerH + 8;

    for (const metaCh of metaChannels) {
      // Título do canal
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...C.marrom);
      doc.text(safe(`Meta Ads — ${metaCh.channel_objective || 'Leads'} | Budget: ${fmt(metaCh.budget_value)}`), marginL, my);
      doc.setDrawColor(...C.laranja);
      doc.setLineWidth(0.5);
      doc.line(marginL, my + 1.5, pageW - marginL, my + 1.5);
      doc.setLineWidth(0.2);
      my += 7;

      for (const camp of (metaCh.strategies || [])) {
        if (my > pageH - 30) { doc.addPage(); my = 14; }

        const stageLabel = FUNNEL_STAGES_PDF[camp.funnel_stage] || safe(camp.funnel_stage || '');
        const campTotal = (camp.adsets || []).reduce((s, a) => s + (a.budget_value || 0), 0);

        // Cabeçalho da campanha
        doc.setFillColor(...C.savana);
        doc.roundedRect(marginL, my, pageW - marginL * 2, 8, 1.5, 1.5, 'F');
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.linho);
        doc.text(safe(camp.name || 'Campanha sem nome'), marginL + 4, my + 5.5);
        doc.text(safe(`${stageLabel} | ${fmt(campTotal)}`), pageW - marginL - 4, my + 5.5, { align: 'right' });
        my += 10;

        if ((camp.adsets || []).length === 0) {
          doc.setFontSize(7);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(...C.savana);
          doc.text('Nenhum conjunto adicionado.', marginL + 4, my + 4);
          my += 8;
          continue;
        }

        // Tabela de conjuntos
        const adsetHeaders = ['Conjunto de Anuncio', 'Budget Mensal', 'Budget/Dia', 'Objetivo', 'Publico', 'Faixa Etaria', 'Formato', 'Posicionamento'];
        const adsetColW = [60, 24, 24, 32, 38, 25, 28, 38]; // total ~269mm = pageW(297) - margins(14*2)
        const adsetRows = (camp.adsets || []).map(a => [
          safe(a.name || '-'),
          fmt(a.budget_value),
          fmt((a.budget_value || 0) / (localPlan.duration_days || 30)),
          safe(a.params?.objetivo || '-'),
          safe(a.params?.publico || '-'),
          safe(a.params?.faixa_etaria || '-'),
          safe(a.params?.formato || '-'),
          safe(a.params?.posicionamento || '-'),
        ]);

        if (my + 9 + adsetRows.length * 7.5 > pageH - 16) { doc.addPage(); my = 14; }
        my = drawTable(doc, { startY: my, headers: adsetHeaders, rows: adsetRows, colWidths: adsetColW, pageW, marginL, lastRowBold: false });
        my += 6;
      }
      my += 4;
    }
  }

  // ── Footer ───────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Linha footer
    doc.setDrawColor(...C.crema);
    doc.line(marginL, pageH - 9, pageW - marginL, pageH - 9);
    doc.setFontSize(6.5);
    doc.setTextColor(...C.savana);
    doc.setFont(undefined, 'normal');
    doc.text(`Pagina ${i} de ${pageCount}`, pageW - marginL, pageH - 5, { align: 'right' });
    doc.text('Media Planner - Performance Clinic', marginL, pageH - 5);
    // Dot laranja no footer
    doc.setFillColor(...C.laranja);
    doc.circle(pageW / 2, pageH - 6, 0.8, 'F');
  }

  const fileName = `plano_${(localPlan.client_name || 'cliente').replace(/\s+/g, '_')}_${mes}_${localPlan.period_year}.pdf`;
  doc.save(fileName);
}