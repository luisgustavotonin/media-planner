import { jsPDF } from 'jspdf';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const C = {
  marrom:  [49, 43, 29],
  laranja: [248, 93, 7],
  crema:   [226, 204, 175],
  linho:   [250, 249, 245],
  savana:  [126, 105, 81],
  branco:  [255, 255, 255],
  cinza:   [100, 90, 75],
  cinzaClaro: [230, 228, 224],
  cinzaBar: [180, 178, 174],
  verde:   [52, 168, 83],
  vermelho:[217, 48, 37],
};

function safe(str) {
  if (!str) return '';
  return String(str).replace(/→/g, '>').replace(/[–—]/g, '-');
}
function fmtN(v) {
  return typeof v === 'number' ? Math.round(v).toLocaleString('pt-BR') : '-';
}
function fmtCur(v) {
  if (typeof v !== 'number') return '-';
  return 'R$' + Math.round(v).toLocaleString('pt-BR');
}
function fmtPct(v) {
  if (typeof v !== 'number' || !isFinite(v)) return '-';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(1)}%`;
}
function trunc(doc, text, maxWidth) {
  let t = safe(text || '');
  while (doc.getTextWidth(t) > maxWidth && t.length > 0) t = t.slice(0, -1);
  return t.length < (text || '').length ? t + '…' : t;
}

function drawHeader(doc, clientName, planLabel, referenceDate) {
  doc.setFillColor(...C.linho);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 52, 'F');
  doc.setFillColor(...C.laranja);
  doc.rect(0, 0, 6, 52, 'F');
  doc.setTextColor(...C.marrom);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Acompanhamento de Resultados', 16, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.savana);
  const sub = [
    clientName ? safe(clientName) : '',
    planLabel,
    referenceDate ? `Realizado até ${new Date(referenceDate + 'T00:00:00').toLocaleDateString('pt-BR')}` : '',
  ].filter(Boolean).join('   ·   ');
  doc.text(trunc(doc, sub, doc.internal.pageSize.getWidth() - 32), 16, 40);
}

function drawFooter(doc, page, pages) {
  doc.setFontSize(8);
  doc.setTextColor(...C.savana);
  doc.text(`${page} / ${pages}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 12, { align: 'right' });
}

// Desenha funil horizontal (Realizado vs Meta) + coluna de desvio.
// y = topo onde iniciar. Retorna y após desenho.
function drawFunnel(doc, x, y, w, stageLabels, realizado, meta) {
  const labelW = 70;
  const barAreaW = w - labelW - 50;
  const barX = x + labelW;
  const deltaX = x + w - 44;

  const n = stageLabels.length;
  const maxVal = Math.max(...realizado, ...meta, 1);

  for (let i = 0; i < n; i++) {
    const ry = y + i * 26;
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.marrom);
    doc.text(trunc(doc, stageLabels[i], labelW - 6), x, ry + 4);

    const rv = realizado[i] || 0;
    const mv = meta[i] || 0;
    const rW = (rv / maxVal) * barAreaW;
    const mW = (mv / maxVal) * barAreaW;

    // Meta (barra cinza de fundo)
    doc.setFillColor(...C.cinzaBar);
    doc.roundedRect(barX, ry + 6, Math.max(mW, 2), 5, 1, 1, 'F');
    // Realizado (barra laranja)
    doc.setFillColor(...C.laranja);
    doc.roundedRect(barX, ry, Math.max(rW, 2), 5, 1, 1, 'F');

    // Valores
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.marrom);
    doc.text(fmtN(rv), barX + Math.max(rW, 2) + 3, ry + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.savana);
    doc.text(fmtN(mv), barX + Math.max(mW, 2) + 3, ry + 10);

    // Desvio
    const deltaPct = mv > 0 ? (rv - mv) / mv : 0;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(deltaPct >= 0 ? C.verde : C.vermelho));
    doc.text(fmtPct(deltaPct), deltaX + 40, ry + 5, { align: 'right' });
  }

  // Legenda
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.savana);
  doc.setFillColor(...C.laranja);
  doc.rect(barX, y + n * 26 + 4, 6, 4, 'F');
  doc.text('Realizado', barX + 9, y + n * 26 + 8);
  doc.setFillColor(...C.cinzaBar);
  doc.rect(barX + 70, y + n * 26 + 4, 6, 4, 'F');
  doc.text('Meta', barX + 79, y + n * 26 + 8);

  return y + n * 26 + 16;
}

// Tabela de gap: Etapa | Meta | Realizado | Desvio abs | Desvio %
function drawGapTable(doc, x, y, w, stageLabels, meta, realizado) {
  const cols = [
    { label: 'Etapa', w: w * 0.30, align: 'left' },
    { label: 'Meta', w: w * 0.18, align: 'right' },
    { label: 'Realizado', w: w * 0.18, align: 'right' },
    { label: 'Desvio', w: w * 0.16, align: 'right' },
    { label: '%', w: w * 0.18, align: 'right' },
  ];
  // Header
  doc.setFillColor(...C.marrom);
  doc.rect(x, y, w, 16, 'F');
  doc.setTextColor(...C.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  let cx = x;
  cols.forEach(c => {
    doc.text(c.label, c.align === 'right' ? cx + c.w - 4 : cx + 4, y + 11, { align: c.align === 'right' ? 'right' : 'left' });
    cx += c.w;
  });

  let ry = y + 16;
  doc.setFont('helvetica', 'normal');
  stageLabels.forEach((label, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(...C.linho);
      doc.rect(x, ry, w, 15, 'F');
    }
    const m = meta[i] || 0;
    const r = realizado[i] || 0;
    const desvio = r - m;
    const desvioPct = m > 0 ? (r - m) / m : 0;
    doc.setTextColor(...C.marrom);
    doc.setFontSize(8);
    cx = x;
    doc.text(trunc(doc, label, cols[0].w - 8), cx + 4, ry + 10);
    cx += cols[0].w;
    doc.text(fmtN(m), cx + cols[1].w - 4, ry + 10, { align: 'right' });
    cx += cols[1].w;
    doc.text(fmtN(r), cx + cols[2].w - 4, ry + 10, { align: 'right' });
    cx += cols[2].w;
    doc.setTextColor(...(desvio >= 0 ? C.verde : C.vermelho));
    doc.setFont('helvetica', 'bold');
    doc.text((desvio >= 0 ? '+' : '') + fmtN(desvio), cx + cols[3].w - 4, ry + 10, { align: 'right' });
    cx += cols[3].w;
    doc.text(fmtPct(desvioPct), cx + cols[4].w - 4, ry + 10, { align: 'right' });
    ry += 15;
  });

  // Linha investimento
  ry += 2;
  doc.setDrawColor(...C.crema);
  doc.line(x, ry, x + w, ry);
  ry += 4;

  return ry;
}

export function exportResultsPdf({
  clientName,
  planLabel,
  referenceDate,
  stageLabels,
  consolidated,
  channels,
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;

  // Pré-conta páginas: 1 consolidado + 1 por canal (até 2 por página)
  const totalPages = 1 + Math.ceil(channels.length / 2);
  let page = 1;

  // ---- Página 1: Consolidado ----
  drawHeader(doc, clientName, planLabel, referenceDate);
  let y = 62;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.marrom);
  doc.text('Consolidado — Meta vs Realizado', margin, y);
  y += 6;

  y = drawGapTable(doc, margin, y, contentW, stageLabels, consolidated.projected, consolidated.actual);
  // investimento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.marrom);
  doc.text('Investimento', margin + 4, y + 6);
  doc.text(fmtCur(consolidated.projectedInvestment), margin + contentW * 0.30 + contentW * 0.18 - 4, y + 6, { align: 'right' });
  doc.text(fmtCur(consolidated.actualInvestment), margin + contentW * 0.48 + contentW * 0.18 - 4, y + 6, { align: 'right' });
  y += 14;

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.marrom);
  doc.text('Funil Consolidado', margin, y);
  y += 6;
  drawFunnel(doc, margin, y, contentW, stageLabels, consolidated.actual, consolidated.projected);

  drawFooter(doc, page, totalPages);

  // ---- Páginas por canal (2 por página) ----
  for (let i = 0; i < channels.length; i += 2) {
    doc.addPage();
    page++;
    drawHeader(doc, clientName, planLabel, referenceDate);
    let cy = 62;
    for (let j = 0; j < 2 && i + j < channels.length; j++) {
      const ch = channels[i + j];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...C.marrom);
      doc.text(`Canal: ${safe(ch.name)}`, margin, cy);
      cy += 4;

      // Mini gap table
      cy = drawGapTable(doc, margin, cy, contentW, stageLabels, ch.projected, ch.actual);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.marrom);
      doc.text('Investimento', margin + 4, cy + 6);
      doc.text(fmtCur(ch.projectedInvestment), margin + contentW * 0.30 + contentW * 0.18 - 4, cy + 6, { align: 'right' });
      doc.text(fmtCur(ch.actualInvestment), margin + contentW * 0.48 + contentW * 0.18 - 4, cy + 6, { align: 'right' });
      cy += 14;

      cy += 2;
      drawFunnel(doc, margin, cy, contentW, stageLabels, ch.actual, ch.projected);

      cy += stageLabels.length * 26 + 24;
      if (j === 0 && i + 1 < channels.length) {
        cy += 4;
        doc.setDrawColor(...C.crema);
        doc.line(margin, cy, margin + contentW, cy);
        cy += 8;
      }
    }
    drawFooter(doc, page, totalPages);
  }

  doc.save(`acompanhamento-resultados-${(clientName || 'plano').toLowerCase().replace(/\s+/g, '-')}.pdf`);
}