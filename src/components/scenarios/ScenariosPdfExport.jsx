import { jsPDF } from 'jspdf';

const COLORS = {
  emerald: [16, 185, 129],
  blue: [59, 130, 246],
  amber: [245, 158, 11],
  gray: [100, 116, 139],
  lightGray: [248, 250, 252],
  border: [226, 232, 240],
  text: [15, 23, 42],
  muted: [100, 116, 139],
};

const fmt = v => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const fmtN = v => Math.round(v).toLocaleString('pt-BR');

function calcRoas(revenue, budget) {
  return budget > 0 ? (revenue / budget) : 0;
}

export function exportScenariosPdf({ plan, scenarios, stageLabels, clientName, MESES_SHORT }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 0;

  // Header
  doc.setFillColor(...[15, 23, 42]);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Simulador de Cenários', margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const planLabel = `${clientName} — ${MESES_SHORT[(plan.period_month || 1) - 1]}/${plan.period_year}`;
  doc.text(planLabel, margin, 20);
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageW - margin, 20, { align: 'right' });
  y = 36;

  const scenarioConfigs = [
    { key: 'optimistic', label: 'Otimista', color: COLORS.emerald },
    { key: 'realistic', label: 'Realista', color: COLORS.blue },
    { key: 'conservative', label: 'Conservador', color: COLORS.amber },
  ];

  // ---- Resumo comparativo ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text('Resumo Comparativo', margin, y);
  y += 6;

  // Tabela de resumo
  const colW = contentW / 4;
  const headers = ['', 'Otimista', 'Realista', 'Conservador'];
  const rowData = [
    ['Receita', ...scenarioConfigs.map(sc => fmt(scenarios[sc.key].totals.total_revenue))],
    ['Investimento', ...scenarioConfigs.map(sc => fmt(scenarios[sc.key].totals.total_budget))],
    ['ROAS', ...scenarioConfigs.map(sc => `${calcRoas(scenarios[sc.key].totals.total_revenue, scenarios[sc.key].totals.total_budget).toFixed(2)}x`)],
    ['ROI', ...scenarioConfigs.map(sc => `${scenarios[sc.key].overall_roi.toFixed(0)}%`)],
    ['CPL Médio', ...scenarioConfigs.map(sc => fmt(scenarios[sc.key].blended_cpl))],
    ...stageLabels.map((label, i) => [label, ...scenarioConfigs.map(sc => fmtN(scenarios[sc.key].totals.stageValues?.[i] ?? 0))]),
  ];

  // Header row
  doc.setFillColor(...[30, 41, 59]);
  doc.rect(margin, y, contentW, 7, 'F');
  headers.forEach((h, i) => {
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(h, margin + i * colW + (i === 0 ? 2 : colW / 2), y + 4.5, { align: i === 0 ? 'left' : 'center' });
  });
  y += 7;

  rowData.forEach((row, ri) => {
    if (ri % 2 === 0) {
      doc.setFillColor(...COLORS.lightGray);
      doc.rect(margin, y, contentW, 6.5, 'F');
    }
    row.forEach((cell, ci) => {
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', ci === 0 ? 'bold' : 'normal');
      doc.setFontSize(8);
      // Colorir a célula de Receita e ROAS com cor do cenário
      if (ci > 0 && (row[0] === 'Receita' || row[0] === 'ROAS')) {
        doc.setTextColor(...scenarioConfigs[ci - 1].color);
      }
      doc.text(cell, margin + ci * colW + (ci === 0 ? 2 : colW / 2), y + 4.5, { align: ci === 0 ? 'left' : 'center' });
    });
    // border bottom
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, y + 6.5, margin + contentW, y + 6.5);
    y += 6.5;
  });

  y += 10;

  // ---- Cards por cenário ----
  scenarioConfigs.forEach(sc => {
    const s = scenarios[sc.key];
    if (y > 240) { doc.addPage(); y = 20; }

    // Título do cenário
    doc.setFillColor(...sc.color);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Cenário ${sc.label}`, margin + 3, y + 4.8);
    y += 7;

    // Sub-header canais
    const chHeaders = ['Canal', 'Budget', 'Leads', 'Vendas', 'Receita', 'CPL', 'ROAS'];
    const chColW = [38, 25, 18, 18, 28, 22, 18];

    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, contentW, 6, 'F');
    let cx = margin;
    chHeaders.forEach((h, i) => {
      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(h, cx + (i === 0 ? 2 : chColW[i] / 2), y + 4, { align: i === 0 ? 'left' : 'center' });
      cx += chColW[i];
    });
    y += 6;

    s.channelResults.forEach((ch, ri) => {
      if (ri % 2 === 0) {
        doc.setFillColor(252, 252, 253);
        doc.rect(margin, y, contentW, 6, 'F');
      }
      const roas = calcRoas(ch.metrics.revenue, ch.budget_value || 0);
      const cells = [
        ch.channel_name,
        fmt(ch.budget_value || 0),
        fmtN(ch.metrics.leads),
        fmtN(ch.metrics.sales),
        fmt(ch.metrics.revenue),
        fmt(ch.metrics.cost_per_lead),
        `${roas.toFixed(2)}x`,
      ];
      cx = margin;
      cells.forEach((cell, ci) => {
        doc.setTextColor(...COLORS.text);
        doc.setFont('helvetica', ci === 0 ? 'bold' : 'normal');
        doc.setFontSize(7.5);
        doc.text(cell, cx + (ci === 0 ? 2 : chColW[ci] / 2), y + 4, { align: ci === 0 ? 'left' : 'center' });
        cx += chColW[ci];
      });
      doc.setDrawColor(...COLORS.border);
      doc.line(margin, y + 6, margin + contentW, y + 6);
      y += 6;
    });

    y += 8;
  });

  // Footer
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 285, pageW, 12, 'F');
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('LVL Performance — Media Planner', margin, 292);
  doc.text(`Página 1`, pageW - margin, 292, { align: 'right' });

  doc.save(`cenarios_${clientName.replace(/\s+/g, '_')}_${MESES_SHORT[(plan.period_month || 1) - 1]}${plan.period_year}.pdf`);
}