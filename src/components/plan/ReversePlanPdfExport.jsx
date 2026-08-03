import { jsPDF } from 'jspdf';

const GENERIC_STAGE_LABELS = ['Leads', 'Agendamento', 'Comparecimento', 'Venda'];

const C = {
  marrom:  [49, 43, 29],
  laranja: [248, 93, 7],
  crema:   [226, 204, 175],
  linho:   [250, 249, 245],
  savana:  [126, 105, 81],
  branco:  [255, 255, 255],
  escuro:  [30, 25, 15],
  cinzaBench: [180, 180, 180],
  cinzaBenchLight: [240, 240, 240],
  verde: [22, 163, 74],
  vermelho: [220, 38, 38],
};

function safe(str) {
  if (!str) return '';
  return String(str).replace(/→/g, '>').replace(/[–—]/g, '-');
}
function fmt(v) {
  if (typeof v !== 'number') return '-';
  return 'R$' + Math.round(v).toLocaleString('pt-BR');
}
function fmtN(v) {
  return typeof v === 'number' ? Math.round(v).toLocaleString('pt-BR') : '-';
}

function buildFunnelStages(rates, labels, base) {
  const lbls = labels && labels.length >= 2 ? labels : GENERIC_STAGE_LABELS;
  const stages = [{ label: lbls[0], value: Math.round(base) }];
  let cur = base;
  (rates || []).forEach((r, i) => {
    cur = cur * (r || 0);
    stages.push({ label: lbls[i + 1] || `Etapa ${i + 2}`, value: Math.round(cur) });
  });
  return stages;
}

function drawHeader(doc, titulo, subtitulo, pageW) {
  const headerH = 26;
  doc.setFillColor(...C.marrom);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFillColor(...C.laranja);
  doc.rect(0, 0, 5, headerH, 'F');

  doc.setTextColor(...C.linho);
  doc.setFontSize(15);
  doc.setFont(undefined, 'bold');
  doc.text(safe(titulo), 19, 14);

  doc.setFontSize(7.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...C.crema);
  doc.text(safe(subtitulo), 19, 21);
  return headerH;
}

function drawCards(doc, y, cards, pageW, marginL) {
  const cardW = (pageW - marginL * 2 - (cards.length - 1) * 4) / cards.length;
  const cardH = 20;
  cards.forEach((c, i) => {
    const cx = marginL + i * (cardW + 4);
    doc.setFillColor(...C.linho);
    doc.setDrawColor(...C.crema);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'FD');
    doc.setFillColor(...C.laranja);
    doc.roundedRect(cx, y, cardW, 3, 1, 1, 'F');
    doc.rect(cx, y + 1.5, cardW, 1.5, 'F');

    doc.setFontSize(6.5);
    doc.setTextColor(...C.savana);
    doc.setFont(undefined, 'normal');
    doc.text(safe(c.label), cx + 4, y + 8.5);
    doc.setFontSize(11);
    doc.setTextColor(...C.marrom);
    doc.setFont(undefined, 'bold');
    doc.text(safe(c.value), cx + 4, y + 15.5);
    if (c.sub) {
      doc.setFontSize(5.5);
      doc.setTextColor(...C.savana);
      doc.setFont(undefined, 'normal');
      doc.text(safe(c.sub), cx + 4, y + 19);
    }
  });
  return y + cardH + 8;
}

function drawTable(doc, { startY, headers, rows, colWidths, pageW, marginL }) {
  const rowH = 7.5;
  const headerH = 9;
  let y = startY;
  const tableW = pageW - marginL * 2;

  doc.setFillColor(...C.marrom);
  doc.rect(marginL, y, tableW, headerH, 'F');
  doc.setTextColor(...C.crema);
  doc.setFontSize(6);
  doc.setFont(undefined, 'bold');
  let x = marginL;
  headers.forEach((h, i) => {
    const align = i <= 1 ? 'left' : 'right';
    const textX = align === 'left' ? x + 3 : x + colWidths[i] - 2;
    doc.text(safe(h), textX, y + 6, { align });
    x += colWidths[i];
  });
  y += headerH;

  rows.forEach((row, ri) => {
    const isLast = ri === rows.length - 1;
    if (isLast) {
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
    doc.setFontSize(6);
    let cx = marginL;
    row.forEach((cell, i) => {
      const align = i <= 1 ? 'left' : 'right';
      const textX = align === 'left' ? cx + 3 : cx + colWidths[i] - 2;
      doc.text(safe(String(cell ?? '-')), textX, y + 5.2, { align });
      cx += colWidths[i];
    });
    doc.setDrawColor(...C.crema);
    doc.line(marginL, y + rowH, pageW - marginL, y + rowH);
    y += rowH;
  });
  return y;
}

// Funil comparativo: projeção (laranja) x benchmark (cinza) com delta por etapa
function drawComparisonFunnel(doc, { x, y, w, title, stages, benchmarkStages }) {
  const hasBench = benchmarkStages && benchmarkStages.length === stages.length;
  const fmtV = (v) => fmtN(v);

  // Cabeçalho do card
  doc.setFillColor(...C.linho);
  doc.setDrawColor(...C.crema);
  doc.roundedRect(x, y, w, 9, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text(safe(title), x + 3, y + 6);

  // Legenda
  let ly = y + 13;
  doc.setFontSize(5.5);
  doc.setFont(undefined, 'normal');
  doc.setFillColor(...C.laranja);
  doc.rect(x + 3, ly - 2, 3, 3, 'F');
  doc.setTextColor(...C.escuro);
  doc.text('Projeção', x + 8, ly + 0.5);
  if (hasBench) {
    doc.setFillColor(...C.cinzaBench);
    doc.rect(x + 24, ly - 2, 3, 3, 'F');
    doc.text('Benchmark', x + 29, ly + 0.5);
    doc.setTextColor(...C.savana);
    doc.text('Delta', x + w - 12, ly + 0.5);
  }
  ly += 5;

  const maxVal = Math.max(
    ...stages.map(s => s.value || 0),
    ...(hasBench ? benchmarkStages.map(s => s.value || 0) : [0]),
    1
  );
  const barAreaW = hasBench ? w - 18 : w - 6;
  const stageH = 8;
  const gap = 3;

  stages.forEach((stage, i) => {
    const val = stage.value || 0;
    const bm = hasBench ? (benchmarkStages[i]?.value || 0) : 0;
    const sy = ly + i * (stageH + gap);
    const valW = (val / maxVal) * barAreaW;
    const bmW = hasBench ? (bm / maxVal) * barAreaW : 0;

    doc.setFontSize(5.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.marrom);
    doc.text(safe(stage.label), x + 1, sy + 3);

    // Barra projeção
    doc.setFillColor(...C.cinzaBenchLight);
    doc.roundedRect(x + 16, sy, barAreaW, 3, 0.8, 0.8, 'F');
    doc.setFillColor(...C.laranja);
    doc.roundedRect(x + 16, sy, Math.max(valW, 2), 3, 0.8, 0.8, 'F');
    doc.setTextColor(...C.marrom);
    doc.setFontSize(5.5);
    doc.setFont(undefined, 'bold');
    doc.text(fmtV(val), x + 16 + Math.max(valW, 2) + 1.5, sy + 2.5);

    // Barra benchmark
    if (hasBench) {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(x + 16, sy + 3.5, barAreaW, 2.6, 0.6, 0.6, 'F');
      doc.setFillColor(...C.cinzaBench);
      doc.roundedRect(x + 16, sy + 3.5, Math.max(bmW, 2), 2.6, 0.6, 0.6, 'F');
      doc.setTextColor(...C.savana);
      doc.setFontSize(5);
      doc.setFont(undefined, 'normal');
      doc.text(fmtV(bm), x + 16 + Math.max(bmW, 2) + 1.5, sy + 5.5);

      // Delta
      const delta = bm > 0 ? ((val - bm) / bm) * 100 : 0;
      doc.setFontSize(5.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...(delta >= 0 ? C.verde : C.vermelho));
      const sign = delta >= 0 ? '+' : '';
      doc.text(`${sign}${delta.toFixed(1)}%`, x + w - 2, sy + 4, { align: 'right' });
    }
  });

  return ly + stages.length * (stageH + gap) + 4;
}

export async function exportReversePlanToPdf({ clientName, planTitle, targetRevenue, result }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;

  const titulo = safe(clientName || 'Cliente');
  const subtitulo = safe(`Planejamento Reverso${planTitle ? ' · ' + planTitle : ''}   Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);

  let y = drawHeader(doc, titulo, subtitulo, pageW) + 8;

  // Cards
  const cards = [
    { label: 'Investimento Necessário', value: fmt(result.total_with_tax), sub: result.total_tax ? `Inclui ${fmt(result.total_tax)} em impostos` : '' },
    { label: 'Leads Necessários', value: fmtN(result.required_leads) },
    { label: 'Vendas Necessárias', value: fmtN(result.required_sales) },
    { label: 'Meta de Receita', value: fmt(targetRevenue) },
  ];
  y = drawCards(doc, y, cards, pageW, marginL);

  // Tabela Resultado por Canal
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text('Resultado por Canal', marginL, y);
  doc.setDrawColor(...C.laranja);
  doc.setLineWidth(0.5);
  doc.line(marginL, y + 1.5, marginL + 55, y + 1.5);
  doc.setLineWidth(0.2);
  y += 5;

  const headers = ['Canal', 'Objetivo', '%', 'CPL', 'Leads', 'Vendas', 'Inv. Líquido', 'Imposto', 'Inv. Bruto', 'Valor em Vendas', 'ROAS', 'CAC'];
  const totalW = pageW - marginL * 2;
  const colWidths = [28, 40, 12, 16, 16, 16, 24, 20, 24, 30, 16, 16]
    .map(w => (w / 258) * totalW);

  const rows = (result.channel_budgets || []).map(ch => [
    ch.channel_name || '-',
    ch.objective_name || '-',
    `${ch.percent}%`,
    `R$${ch.expected_cpl}`,
    fmtN(ch.required_leads),
    fmtN(ch.required_sales),
    fmt(ch.required_budget),
    ch.tax_value ? fmt(ch.tax_value) : '—',
    fmt(ch.total_with_tax),
    fmt(ch.revenue),
    ch.roas ? `${ch.roas.toFixed(2)}x` : '—',
    ch.cac ? fmt(ch.cac) : '—',
  ]);
  rows.push([
    'Total', '', '', '',
    fmtN(result.required_leads), fmtN(result.required_sales),
    fmt(result.total_investment), result.total_tax ? fmt(result.total_tax) : '—',
    fmt(result.total_with_tax), fmt(result.total_revenue),
    result.total_roas ? `${result.total_roas.toFixed(2)}x` : '—',
    result.total_cac ? fmt(result.total_cac) : '—',
  ]);

  y = drawTable(doc, { startY: y, headers, rows, colWidths, pageW, marginL }) + 8;

  // Projeção do Funil por Canal
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text('Projeção do Funil por Canal', marginL, y);
  doc.setDrawColor(...C.laranja);
  doc.setLineWidth(0.5);
  doc.line(marginL, y + 1.5, marginL + 70, y + 1.5);
  doc.setLineWidth(0.2);
  y += 6;

  const channelsWithFunnel = (result.channel_budgets || []).filter(ch => (ch.stage_values || []).length > 0);
  const colW = (pageW - marginL * 2 - 6) / 2;
  let pairMaxY = y;
  channelsWithFunnel.forEach((ch, i) => {
    const isLeft = i % 2 === 0;
    const cx = marginL + (isLeft ? 0 : colW + 6);

    // New page for every new pair (except the very first)
    if (i > 0 && isLeft) {
      doc.addPage();
      y = 14;
      pairMaxY = y;
    }

    const stages = (ch.funnel_stage_labels && ch.funnel_stage_labels.length === ch.stage_values.length)
      ? ch.funnel_stage_labels.map((l, k) => ({ label: l, value: ch.stage_values[k] }))
      : ch.stage_values.map((v, k) => ({ label: GENERIC_STAGE_LABELS[k] || `Etapa ${k + 1}`, value: v }));
    const hasBench = (ch.benchmark_rates || []).length > 0 && (ch.benchmark_cpl || 0) > 0;
    const benchLead = hasBench ? (ch.required_budget || 0) / ch.benchmark_cpl : 0;
    const benchmarkStages = hasBench
      ? buildFunnelStages(ch.benchmark_rates, ch.funnel_stage_labels, benchLead)
      : null;
    const endY = drawComparisonFunnel(doc, {
      x: cx, y, w: colW,
      title: `${ch.channel_name}  |  ${ch.objective_name || ''}`,
      stages, benchmarkStages,
    });

    pairMaxY = Math.max(pairMaxY, endY);
    // After right column (or last odd channel), advance y past both columns
    if (!isLeft || i === channelsWithFunnel.length - 1) {
      y = pairMaxY + 4;
    }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.crema);
    doc.line(marginL, pageH - 9, pageW - marginL, pageH - 9);
    doc.setFontSize(6.5);
    doc.setTextColor(...C.savana);
    doc.setFont(undefined, 'normal');
    doc.text(`Página ${i} de ${pageCount}`, pageW - marginL, pageH - 5, { align: 'right' });
    doc.text('Media Planner - Estudo da Parametrização', marginL, pageH - 5);
    doc.setFillColor(...C.laranja);
    doc.circle(pageW / 2, pageH - 6, 0.8, 'F');
  }

  const fileName = `planejamento_reverso_${(clientName || 'cliente').replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}