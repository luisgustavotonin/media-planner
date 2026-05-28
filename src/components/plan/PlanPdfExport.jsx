import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

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

export async function exportPlanToPdf({ localPlan, consolidated, totalInvestment, funnelStages, conversionPairs, getRate }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const mes = MESES[(localPlan.period_month || 1) - 1];
  const titulo = `${localPlan.client_name || 'Cliente'} — ${mes} ${localPlan.period_year}`;

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont(undefined, 'bold');
  doc.text(titulo, 14, 10);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(`Segmento: ${localPlan.segment || 'Geral'}  ·  Status: ${localPlan.status || 'draft'}  ·  Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 17);

  let y = 30;

  // ── Cards de resumo ──────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  const cards = [
    { label: 'Investimento Total', value: `R$${totalInvestment.toLocaleString('pt-BR')}` },
    { label: 'Leads Esperados', value: fmtN(consolidated.totals.total_leads) },
    { label: 'Vendas Esperadas', value: fmtN(consolidated.totals.total_sales) },
    { label: 'Receita Projetada', value: `R$${Math.round(consolidated.totals.total_revenue).toLocaleString('pt-BR')}` },
  ];
  const cardW = (pageW - 28) / cards.length;
  cards.forEach((c, i) => {
    const x = 14 + i * (cardW + 2);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, 16, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont(undefined, 'normal');
    doc.text(c.label, x + 4, y + 6);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'bold');
    doc.text(c.value, x + 4, y + 13);
  });

  y += 22;

  // ── Premissas do Funil ───────────────────────────────────
  if (conversionPairs && conversionPairs.length > 0) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Premissas do Funil', 14, y);
    y += 4;

    const premHeaders = [...conversionPairs.map(p => p.label), 'Ticket Médio'];
    const premValues = [...conversionPairs.map((_, i) => fmtPct(getRate(i))), fmt(localPlan.average_ticket)];

    doc.autoTable({
      startY: y,
      head: [premHeaders],
      body: [premValues],
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'center', textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Tabela de Resultados por Canal ───────────────────────
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Resultados Projetados por Canal', 14, y);
  y += 4;

  const middleCols = funnelStages && funnelStages.length >= 2
    ? funnelStages.slice(1, -1).map((s, i) => ({ label: s.label, stageIndex: i + 1 }))
    : [{ label: 'Agendamentos', stageIndex: 1 }, { label: 'Comparecimentos', stageIndex: 2 }];

  const tableHead = ['Canal', 'Budget', 'Leads', ...middleCols.map(c => c.label), 'Vendas', 'Receita', 'CPL', 'CAC', 'ROAS'];

  const tableBody = (consolidated.channelResults || []).map(ch => [
    ch.channel_name || '—',
    fmt(ch.budget_value),
    fmtN(ch.metrics.leads),
    ...middleCols.map(col => fmtN(ch.metrics.stageValues?.[col.stageIndex])),
    fmtN(ch.metrics.sales),
    fmt(ch.metrics.revenue),
    fmt(ch.metrics.cost_per_lead),
    fmt(ch.metrics.cost_per_sale),
    fmtRoas(ch.metrics.revenue, ch.budget_value),
  ]);

  // Linha de total
  tableBody.push([
    'Total',
    fmt(consolidated.totals?.total_budget),
    fmtN(consolidated.totals?.total_leads),
    ...middleCols.map(col => fmtN(consolidated.totals?.stageValues?.[col.stageIndex])),
    fmtN(consolidated.totals?.total_sales),
    fmt(consolidated.totals?.total_revenue),
    fmt(consolidated.blended_cpl),
    fmt(consolidated.blended_cost_per_sale),
    fmtRoas(consolidated.totals?.total_revenue, consolidated.totals?.total_budget),
  ]);

  doc.autoTable({
    startY: y,
    head: [tableHead],
    body: tableBody,
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'right' },
    columnStyles: { 0: { halign: 'left' } },
    bodyStyles: { halign: 'right', textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    // Linha de total em negrito
    didParseCell: (data) => {
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [237, 242, 255];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // ── Footer ───────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    doc.text(`Página ${i} de ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
    doc.text('Media Planner — Performance Clinic', 14, doc.internal.pageSize.getHeight() - 5);
  }

  const fileName = `plano_${(localPlan.client_name || 'cliente').replace(/\s+/g, '_')}_${mes}_${localPlan.period_year}.pdf`;
  doc.save(fileName);
}