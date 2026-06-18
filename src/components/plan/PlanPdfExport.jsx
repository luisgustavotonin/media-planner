import { jsPDF } from 'jspdf';

const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const SEGMENTOS = {
  implants: 'Implantes', aesthetics: 'Estetica', orthodontics: 'Ortodontia',
  general: 'Clinica Geral', periodontics: 'Periodontia', endodontics: 'Endodontia',
  pediatric: 'Odontopediatria', other: 'Outros',
};
const STATUS_PT = { draft: 'Rascunho', active: 'Ativo', completed: 'Concluido' };

const CHAR_MAP = {
  'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a',
  'è':'e','é':'e','ê':'e','ë':'e',
  'ì':'i','í':'i','î':'i','ï':'i',
  'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o',
  'ù':'u','ú':'u','û':'u','ü':'u',
  'ý':'y','ÿ':'y','ñ':'n','ç':'c',
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
  marrom:  [49,  43,  29],
  laranja: [248, 93,  7],
  crema:   [226, 204, 175],
  linho:   [250, 249, 245],
  savana:  [126, 105, 81],
  branco:  [255, 255, 255],
  cinza:   [100, 90,  75],
  escuro:  [30,  25,  15],
  azulMeta:[66, 103, 178],
  azulMetaLight:[220, 228, 246],
  verdeStage: [52, 168, 83],
  amareloStage: [251, 188, 4],
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

const ABBREV_MAP = {
  'lead': 'Leads', 'leads': 'Leads',
  'contato': 'Contato', 'contact': 'Contato',
  'qualificacao': 'Qualif.', 'qualification': 'Qualif.',
  'agendamento': 'Agenda.', 'agend': 'Agenda.',
  'call': 'Call',
  'realizado': 'Realiz.',
  'proposta': 'Proposta',
  'enviada': 'Enviada',
  'fechamento': 'Fecha.',
  'venda': 'Vendas', 'vendas': 'Vendas', 'sale': 'Vendas',
  'comparec': 'Comparec.',
};

function abbrevStage(label) {
  const s = safe(label || '');
  const lower = s.toLowerCase();
  for (const [key, val] of Object.entries(ABBREV_MAP)) {
    if (lower.includes(key)) return val;
  }
  return s.length > 9 ? s.substring(0, 8) + '.' : s;
}

// ── Cabeçalho padrão ──────────────────────────────────────────────────────────
function drawHeader(doc, titulo, subtitulo, pageW) {
  const headerH = 32;
  doc.setFillColor(...C.marrom);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFillColor(...C.laranja);
  doc.rect(0, 0, 5, headerH, 'F');

  doc.setTextColor(...C.laranja);
  doc.setFontSize(7.5);
  doc.setFont(undefined, 'bold');
  doc.text('PLANO DE MIDIA', 19, 9);

  doc.setTextColor(...C.linho);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(titulo, 19, 18.5);

  doc.setFontSize(7.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...C.crema);
  doc.text(safe(subtitulo), 19, 25.5);
  return headerH;
}

// ── Tabela genérica ───────────────────────────────────────────────────────────
function drawTable(doc, { startY, headers, rows, colWidths, pageW, marginL = 14, lastRowBold = true }) {
  const rowH = 7.5;
  const headerH = 9;
  let y = startY;
  const tableW = pageW - marginL * 2;

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
      doc.text(safe(String(cell ?? '-')), textX, y + 5.2, { align });
      cx += colWidths[i];
    });
    if (isLast && lastRowBold) doc.setFont(undefined, 'normal');

    doc.setDrawColor(...C.crema);
    doc.line(marginL, y + rowH, pageW - marginL, y + rowH);
    y += rowH;
  });

  return y;
}

// ── Gráfico funil visual (barras decrescentes centradas) ──────────────────────
function drawFunnelChart(doc, { x, y, w, h, stages, values, pageW, marginL }) {
  if (!stages || stages.length === 0) return y;

  const maxVal = Math.max(...values, 1);
  const barH = Math.min(18, (h - 12) / stages.length - 3);
  const labelW = 48;
  const barAreaW = w - labelW - 30;
  const valueW = 30;
  let cy = y;

  // Título seção
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text('Funil de Conversao', marginL, cy);
  doc.setDrawColor(...C.laranja);
  doc.setLineWidth(0.5);
  doc.line(marginL, cy + 1.5, marginL + 55, cy + 1.5);
  doc.setLineWidth(0.2);
  cy += 7;

  const STAGE_COLORS = [
    [248, 93, 7],   // laranja
    [200, 75, 5],
    [160, 60, 4],
    [120, 45, 3],
    [80,  30, 2],
    [50,  18, 1],
  ];

  stages.forEach((stage, i) => {
    const val = values[i] || 0;
    const pct = val / maxVal;
    // Barra trapezóide: cada nível fica ligeiramente menor
    const bw = Math.max(10, barAreaW * pct);
    const bx = x + labelW + (barAreaW - bw) / 2; // centralizado

    const color = STAGE_COLORS[Math.min(i, STAGE_COLORS.length - 1)];
    doc.setFillColor(...color);
    doc.roundedRect(bx, cy, bw, barH - 2, 1.5, 1.5, 'F');

    // Label etapa
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.marrom);
    doc.text(safe(abbrevStage(stage)), x + labelW - 3, cy + barH / 2 + 0.5, { align: 'right' });

    // Valor dentro/fora da barra
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    if (bw > 20) {
      doc.setTextColor(...C.branco);
      doc.text(fmtN(val), bx + bw / 2, cy + barH / 2 + 1, { align: 'center' });
    } else {
      doc.setTextColor(...C.marrom);
      doc.text(fmtN(val), bx + bw + 4, cy + barH / 2 + 1, { align: 'left' });
    }

    // Taxa de conversão entre etapas
    if (i < stages.length - 1) {
      const nextVal = values[i + 1] || 0;
      const rate = val > 0 ? ((nextVal / val) * 100).toFixed(0) + '%' : '-';
      doc.setFontSize(6.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...C.savana);
      const arrowX = x + labelW + barAreaW + 4;
      doc.text(safe('> ' + rate), arrowX, cy + barH / 2 + 1);
    }

    cy += barH + 2;
  });

  return cy + 4;
}

// ── Alocação canais (barras horizontais proporcionais) ────────────────────────
function drawChannelAllocation(doc, { x, y, channels, totalBudget, pageW, marginL, w }) {
  if (!channels || channels.length === 0) return y;

  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text('Alocacao por Canal', x, y);
  doc.setDrawColor(...C.laranja);
  doc.setLineWidth(0.5);
  doc.line(x, y + 1.5, x + 55, y + 1.5);
  doc.setLineWidth(0.2);
  y += 7;

  const BAR_COLORS = [
    [248, 93, 7],
    [66, 103, 178],
    [52, 168, 83],
    [251, 188, 4],
    [234, 67, 53],
    [126, 105, 81],
  ];

  const barH = 11;
  const labelW = 38;
  const barAreaW = w - labelW - 25;
  const pctW = 22;

  channels.forEach((ch, i) => {
    const bv = ch.budget_value || 0;
    const pct = totalBudget > 0 ? bv / totalBudget : 0;
    const bw = Math.max(3, barAreaW * pct);
    const color = BAR_COLORS[i % BAR_COLORS.length];

    // bg track
    doc.setFillColor(235, 232, 225);
    doc.roundedRect(x + labelW, y, barAreaW, barH - 3, 1, 1, 'F');
    // fill
    doc.setFillColor(...color);
    doc.roundedRect(x + labelW, y, bw, barH - 3, 1, 1, 'F');

    // channel name
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.marrom);
    doc.text(safe(ch.channel_name || '-'), x + labelW - 3, y + barH / 2 - 0.5, { align: 'right' });

    // percent + value
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.savana);
    doc.text(safe(Math.round(pct * 100) + '% | ' + fmt(bv)), x + labelW + barAreaW + 3, y + barH / 2 - 0.5);

    y += barH;
  });

  return y + 4;
}

// ── Página Meta: estrutura em cascata ─────────────────────────────────────────
function drawMetaPage(doc, { metaCh, titulo, pageW, pageH, marginL }) {
  const FUNNEL_STAGE_LABELS = {
    topo: 'Topo — Reconhecimento',
    meio: 'Meio — Consideracao',
    fundo: 'Fundo — Conversao',
    remarketing: 'Remarketing',
  };
  const FUNNEL_COLORS = {
    topo:        [248, 93, 7],
    meio:        [126, 105, 81],
    fundo:       [49, 43, 29],
    remarketing: [66, 103, 178],
  };

  doc.addPage();
  const headerH = drawHeader(doc, titulo, 'Estrutura de Campanhas Meta Ads', pageW);
  let my = headerH + 10;

  // ── Badge Meta ──────────────────────────────────────────
  // Ícone "f" do Meta (simplificado como bloco colorido)
  doc.setFillColor(...C.azulMeta);
  doc.roundedRect(marginL, my - 5, 22, 10, 2, 2, 'F');
  doc.setTextColor(...C.branco);
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('Meta Ads', marginL + 11, my + 1, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text(safe(`${metaCh.channel_objective || 'Leads'}  |  Budget: ${fmt(metaCh.budget_value)}`), marginL + 26, my + 1);

  doc.setDrawColor(...C.laranja);
  doc.setLineWidth(0.6);
  doc.line(marginL, my + 4, pageW - marginL, my + 4);
  doc.setLineWidth(0.2);
  my += 12;

  const strategies = metaCh.strategies || [];

  for (const camp of strategies) {
    if (my > pageH - 35) { doc.addPage(); my = 14; }

    const stageKey = camp.funnel_stage || 'topo';
    const stageLabel = safe(FUNNEL_STAGE_LABELS[stageKey] || stageKey);
    const stageColor = FUNNEL_COLORS[stageKey] || C.savana;
    const campBudget = (camp.adsets || []).reduce((s, a) => s + (a.budget_value || 0), 0);

    // ── Nível 1: Campanha ───────────────────────────────────
    // Pill etapa
    doc.setFillColor(...stageColor);
    doc.roundedRect(marginL, my, 55, 7, 2, 2, 'F');
    doc.setTextColor(...C.branco);
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.text(stageLabel, marginL + 27.5, my + 4.8, { align: 'center' });

    // Header campanha
    doc.setFillColor(245, 242, 236);
    doc.setDrawColor(...stageColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginL + 58, my, pageW - marginL * 2 - 58, 7, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.marrom);
    doc.text(safe(camp.name || 'Campanha sem nome'), marginL + 62, my + 5);
    doc.setFontSize(7.5);
    doc.setTextColor(...C.laranja);
    doc.text(safe('Budget: ' + fmt(campBudget)), pageW - marginL - 4, my + 5, { align: 'right' });
    doc.setLineWidth(0.2);
    my += 10;

    if ((camp.adsets || []).length === 0) {
      doc.setFontSize(7);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(...C.savana);
      doc.text('Nenhum conjunto adicionado.', marginL + 8, my + 4);
      my += 8;
      continue;
    }

    // ── Nível 2: Conjuntos ──────────────────────────────────
    for (const [ai, adset] of (camp.adsets || []).entries()) {
      if (my > pageH - 30) { doc.addPage(); my = 14; }

      const adBudget = adset.budget_value || 0;
      const dailyBudget = adBudget / (30);

      // Linha de conexão vertical
      doc.setDrawColor(...C.crema);
      doc.setLineWidth(0.8);
      doc.line(marginL + 6, my, marginL + 6, my + 28);
      doc.line(marginL + 6, my + 14, marginL + 14, my + 14);
      doc.setLineWidth(0.2);

      // Card conjunto
      doc.setFillColor(...C.linho);
      doc.setDrawColor(...C.crema);
      doc.roundedRect(marginL + 14, my, pageW - marginL * 2 - 14, 26, 2, 2, 'FD');

      // Header do conjunto
      doc.setFillColor(...C.crema);
      doc.roundedRect(marginL + 14, my, pageW - marginL * 2 - 14, 8, 2, 2, 'F');
      doc.rect(marginL + 14, my + 5, pageW - marginL * 2 - 14, 3, 'F'); // quadratura canto inferior

      doc.setFontSize(7.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...C.marrom);
      doc.text(safe(adset.name || `Conjunto ${ai + 1}`), marginL + 18, my + 5.5);

      // Budget info à direita
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...C.savana);
      doc.text(safe(`Mensal: ${fmt(adBudget)}  |  Diario: R$${dailyBudget.toFixed(2)}`), pageW - marginL - 18, my + 5.5, { align: 'right' });

      // ── Nível 3: Parametrizações em grid ──────────────────
      const params = adset.params || {};
      const paramItems = [
        { label: 'Objetivo', value: params.objetivo },
        { label: 'Publico', value: params.publico },
        { label: 'Faixa Etaria', value: params.faixa_etaria },
        { label: 'Genero', value: params.genero },
        { label: 'Localizacao', value: params.localizacao },
        { label: 'Formato', value: params.formato },
        { label: 'Posicionamento', value: params.posicionamento },
        { label: 'Observacoes', value: params.observacoes },
      ].filter(p => p.value);

      const paramColW = (pageW - marginL * 2 - 22) / 4;
      let px = marginL + 18;
      let py = my + 12;
      paramItems.forEach((p, pi) => {
        if (pi > 0 && pi % 4 === 0) { px = marginL + 18; py += 8; }
        doc.setFontSize(5.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...C.savana);
        doc.text(safe(p.label + ':'), px, py);
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...C.escuro);
        doc.text(safe(p.value || '-'), px, py + 4);
        px += paramColW;
      });

      if (paramItems.length === 0) {
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...C.savana);
        doc.text('Sem parametrizacoes definidas.', marginL + 18, my + 16);
      }

      my += 30;
    }

    my += 6;
  }

  return my;
}

// ── EXPORT PRINCIPAL ──────────────────────────────────────────────────────────
export async function exportPlanToPdf({ localPlan, consolidated, totalInvestment, funnelStages, conversionPairs, getRate }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const mes = MESES[(localPlan.period_month || 1) - 1];
  const titulo = safe(`${localPlan.client_name || 'Cliente'}  |  ${mes} ${localPlan.period_year}`);
  const subtitulo = safe(`Segmento: ${SEGMENTOS[localPlan.segment] || 'Geral'}   Status: ${STATUS_PT[localPlan.status] || 'Rascunho'}   Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);

  // ═══════════════════════════════════════════════
  // PÁGINA 1 — Resumo, Funil e Canais
  // ═══════════════════════════════════════════════
  const headerH = drawHeader(doc, titulo, subtitulo, pageW);
  let y = headerH + 8;

  // ── Cards KPI ──────────────────────────────────
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
  });
  y += cardH + 10;

  // ── Layout 2 colunas: Funil (esq) | Alocação canais (dir) ──
  const col1W = (pageW - marginL * 2) * 0.52;
  const col2W = (pageW - marginL * 2) * 0.44;
  const col2X = marginL + col1W + (pageW - marginL * 2) * 0.04;

  // Montar dados do funil
  const funnelStageLabels = funnelStages && funnelStages.length > 0
    ? funnelStages.map(s => s.label)
    : ['Leads', 'Agendamentos', 'Comparecimentos', 'Vendas'];

  const funnelValues = (() => {
    const totals = consolidated.totals;
    if (funnelStages && funnelStages.length > 0) {
      return funnelStages.map((_, i) => {
        if (i === 0) return Math.round(totals.total_leads || 0);
        return Math.round(totals.stageValues?.[i] || 0);
      });
    }
    return [
      Math.round(totals.total_leads || 0),
      Math.round(totals.total_appointments || 0),
      Math.round(totals.total_showups || 0),
      Math.round(totals.total_sales || 0),
    ];
  })();

  const yAfterFunnel = drawFunnelChart(doc, {
    x: marginL,
    y,
    w: col1W,
    h: 65,
    stages: funnelStageLabels,
    values: funnelValues,
    pageW,
    marginL,
  });

  const channels = localPlan.channels || [];
  drawChannelAllocation(doc, {
    x: col2X,
    y,
    channels,
    totalBudget: totalInvestment,
    pageW,
    marginL: col2X,
    w: col2W,
  });

  y = Math.max(yAfterFunnel, y + 70) + 4;

  // ── Tabela resultados por canal ─────────────────
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

  const tableHeaders = ['Canal', 'Budget', 'Leads', ...middleCols.map(c => abbrevStage(c.label)), 'Vendas', 'Receita', 'CPL', 'CAC', 'ROAS'];
  const totalTableW = pageW - marginL * 2;
  const canalW = 30; const budgetW = 22; const receitaW = 24;
  const numColsRest = tableHeaders.length - 3;
  const otherW = (totalTableW - canalW - budgetW - receitaW) / numColsRest;
  const colWidths = [canalW, budgetW, ...tableHeaders.slice(2, -4).map(() => otherW), otherW, receitaW, otherW, otherW, otherW];

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
    'Total', fmt(totNetBudget), fmtN(consolidated.totals?.total_leads),
    ...middleCols.map(col => fmtN(consolidated.totals?.stageValues?.[col.stageIndex])),
    fmtN(consolidated.totals?.total_sales), fmt(consolidated.totals?.total_revenue),
    fmt(consolidated.blended_cpl), fmt(consolidated.blended_cost_per_sale),
    fmtRoas(consolidated.totals?.total_revenue, totNetBudget),
  ]);

  drawTable(doc, { startY: y, headers: tableHeaders, rows: tableRows, colWidths, pageW, marginL });

  // ═══════════════════════════════════════════════
  // PÁGINA 2+ — Estrutura Meta em cascata
  // ═══════════════════════════════════════════════
  const metaChannels = (localPlan.channels || []).filter(c => c.channel_name === 'Meta' && (c.strategies || []).length > 0);
  for (const metaCh of metaChannels) {
    drawMetaPage(doc, { metaCh, titulo, pageW, pageH, marginL });
  }

  // ── Footer em todas as páginas ─────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.crema);
    doc.line(marginL, pageH - 9, pageW - marginL, pageH - 9);
    doc.setFontSize(6.5);
    doc.setTextColor(...C.savana);
    doc.setFont(undefined, 'normal');
    doc.text(`Pagina ${i} de ${pageCount}`, pageW - marginL, pageH - 5, { align: 'right' });
    doc.text('Media Planner - Performance Clinic', marginL, pageH - 5);
    doc.setFillColor(...C.laranja);
    doc.circle(pageW / 2, pageH - 6, 0.8, 'F');
  }

  const fileName = `plano_${(localPlan.client_name || 'cliente').replace(/\s+/g, '_')}_${mes}_${localPlan.period_year}.pdf`;
  doc.save(fileName);
}