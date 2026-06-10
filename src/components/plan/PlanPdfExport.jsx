import { jsPDF } from 'jspdf';

const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// jsPDF default font (Helvetica) only handles Latin-1 — strip diacritics to avoid garbled chars
function safe(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove combining diacritics
    .replace(/[^\x00-\xFF]/g, '?');   // replace any remaining non-Latin chars
}

function fmt(v) {
  if (typeof v !== 'number') return '—';
  return v >= 1000 ? `R$${Math.round(v).toLocaleString('pt-BR')}` : `R$${v.toFixed(2)}`;
}
function fmtN(v) {
  return typeof v === 'number' ? Math.round(v).toLocaleString('pt-BR') : '—';
}
function fmtRoas(revenue, budget) {
  return budget > 0 ? (revenue / budget).toFixed(2) + 'x' : '—';
}
function fmtPct(v) {
  return typeof v === 'number' ? (v * 100).toFixed(1) + '%' : '—';
}

function drawTable(doc, { startY, headers, rows, colWidths, pageW, marginL = 14 }) {
  const rowH = 7;
  const headerH = 8;
  let y = startY;

  // Header row
  doc.setFillColor(37, 99, 235);
  doc.rect(marginL, y, pageW - marginL * 2, headerH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont(undefined, 'bold');
  let x = marginL;
  headers.forEach((h, i) => {
    const align = i === 0 ? 'left' : 'right';
    const textX = align === 'left' ? x + 2 : x + colWidths[i] - 2;
    doc.text(safe(h), textX, y + 5.5, { align });
    x += colWidths[i];
  });
  y += headerH;

  // Data rows
  doc.setFont(undefined, 'normal');
  rows.forEach((row, ri) => {
    // Alternate background
    if (ri % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginL, y, pageW - marginL * 2, rowH, 'F');
    }
    // Bold last row (total)
    const isTotal = ri === rows.length - 1;
    if (isTotal) {
      doc.setFillColor(237, 242, 255);
      doc.rect(marginL, y, pageW - marginL * 2, rowH, 'F');
      doc.setFont(undefined, 'bold');
    }

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(6.5);
    let cx = marginL;
    row.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'right';
      const textX = align === 'left' ? cx + 2 : cx + colWidths[i] - 2;
      doc.text(safe(String(cell)), textX, y + 5, { align });
      cx += colWidths[i];
    });

    if (isTotal) doc.setFont(undefined, 'normal');

    // Row border
    doc.setDrawColor(226, 232, 240);
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
  const titulo = `${localPlan.client_name || 'Cliente'} — ${mes} ${localPlan.period_year}`;

  // ── Header azul ──────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(safe(titulo), marginL, 10);
  doc.setFontSize(7.5);
  doc.setFont(undefined, 'normal');
  doc.text(
    safe(`Segmento: ${localPlan.segment || 'Geral'}  -  Status: ${localPlan.status || 'draft'}  -  Gerado em: ${new Date().toLocaleDateString('pt-BR')}`),
    marginL, 17
  );

  let y = 30;

  // ── Cards de resumo ──────────────────────────────────────
  const netInvestment = (localPlan.channels || []).reduce((s, c) => {
    const tax = (c.tax_percent || 0) / 100;
    return s + (c.budget_value || 0) * (1 - tax);
  }, 0);
  const hasAnyTax = (localPlan.channels || []).some(c => (c.tax_percent || 0) > 0);
  const cards = [
    { label: 'Investimento Bruto', value: `R$${totalInvestment.toLocaleString('pt-BR')}` },
    ...(hasAnyTax ? [{ label: 'Investimento Liquido', value: `R$${Math.round(netInvestment).toLocaleString('pt-BR')}` }] : []),
    { label: 'Leads Esperados', value: fmtN(consolidated.totals.total_leads) },
    { label: 'Vendas Esperadas', value: fmtN(consolidated.totals.total_sales) },
    { label: 'Receita Projetada', value: `R$${Math.round(consolidated.totals.total_revenue).toLocaleString('pt-BR')}` },
  ];
  const cardW = (pageW - marginL * 2 - 6) / cards.length;
  cards.forEach((c, i) => {
    const cx = marginL + i * (cardW + 2);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardW, 16, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont(undefined, 'normal');
    doc.text(safe(c.label), cx + 4, y + 6);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'bold');
    doc.text(safe(c.value), cx + 4, y + 13);
  });
  y += 22;

  // ── Premissas do Funil ───────────────────────────────────
  if (conversionPairs && conversionPairs.length > 0) {
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Premissas do Funil', marginL, y);
    y += 3;

    // Use only the destination stage name (strip arrows like "Lead → Contato" → "Contato")
    const cleanLabel = (l) => {
      const parts = String(l).split(/[-–—>→]+/);
      const dest = parts[parts.length - 1].trim();
      const short = dest.length > 12 ? dest.substring(0, 11) + '.' : dest;
      return safe(short);
    };
    const premHeaders = [...conversionPairs.map(p => cleanLabel(p.label)), 'Ticket Medio'];
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
    });
    y += 6;
  }

  // ── Tabela de Resultados por Canal ───────────────────────
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Resultados Projetados por Canal', marginL, y); // ASCII only — ok
  y += 3;

  const middleCols = funnelStages && funnelStages.length >= 2
    ? funnelStages.slice(1, -1).map((s, i) => ({ label: s.label, stageIndex: i + 1 }))
    : [{ label: 'Agendamentos', stageIndex: 1 }, { label: 'Comparecimentos', stageIndex: 2 }];

  // Abreviar nomes longos de etapas para caber no PDF (sem acentos)
  const abbrev = (label) => {
    const s = safe(label);
    return s.length > 9 ? s.substring(0, 8) + '.' : s;
  };
  const tableHeaders = ['Canal', 'Budget', 'Leads', ...middleCols.map(c => abbrev(c.label)), 'Vendas', 'Receita', 'CPL', 'CAC', 'ROAS'];
  const totalTableW = pageW - marginL * 2;
  // Canal col wider, Receita slightly wider, rest equal
  const canalW = 30;
  const receitaW = 22;
  const budgetW = 20;
  const otherCount = tableHeaders.length - 3; // all except Canal, Budget, Receita
  const otherW = (totalTableW - canalW - receitaW - budgetW) / otherCount;
  // Build colWidths: Canal, Budget, Leads, ...middles, Vendas, Receita, CPL, CAC, ROAS
  const colWidths = [
    canalW,
    budgetW,
    ...tableHeaders.slice(2, -4).map(() => otherW), // Leads + middles
    otherW, // Vendas
    receitaW, // Receita
    otherW, // CPL
    otherW, // CAC
    otherW, // ROAS
  ];

  const tableRows = (consolidated.channelResults || []).map(ch => [
    safe(ch.channel_name || '-'),
    fmt(ch.budget_value),
    fmtN(ch.metrics.leads),
    ...middleCols.map(col => fmtN(ch.metrics.stageValues?.[col.stageIndex])),
    fmtN(ch.metrics.sales),
    fmt(ch.metrics.revenue),
    fmt(ch.metrics.cost_per_lead),
    fmt(ch.metrics.cost_per_sale),
    fmtRoas(ch.metrics.revenue, ch.budget_value),
  ]);

  tableRows.push([
    'Total', // ASCII — ok
    fmt(consolidated.totals?.total_budget),
    fmtN(consolidated.totals?.total_leads),
    ...middleCols.map(col => fmtN(consolidated.totals?.stageValues?.[col.stageIndex])),
    fmtN(consolidated.totals?.total_sales),
    fmt(consolidated.totals?.total_revenue),
    fmt(consolidated.blended_cpl),
    fmt(consolidated.blended_cost_per_sale),
    fmtRoas(consolidated.totals?.total_revenue, consolidated.totals?.total_budget),
  ]);

  y = drawTable(doc, { startY: y, headers: tableHeaders, rows: tableRows, colWidths, pageW, marginL });

  // ── Footer ───────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    doc.text(`Pagina ${i} de ${pageCount}`, pageW - marginL, pageH - 5, { align: 'right' });
    doc.text('Media Planner - Performance Clinic', marginL, pageH - 5);
  }

  const fileName = `plano_${(localPlan.client_name || 'cliente').replace(/\s+/g, '_')}_${mes}_${localPlan.period_year}.pdf`;
  doc.save(fileName);
}