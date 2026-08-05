import { jsPDF } from 'jspdf';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const SEGMENTOS = {
  implants: 'Implantes', aesthetics: 'Estética', orthodontics: 'Ortodontia',
  general: 'Clínica Geral', periodontics: 'Periodontia', endodontics: 'Endodontia',
  pediatric: 'Odontopediatria', other: 'Outros',
};
const STATUS_PT = { draft: 'Rascunho', active: 'Ativo', completed: 'Concluído' };

// Mantém o texto como está — jsPDF suporta UTF-8 com a fonte padrão (Helvetica)
function safe(str) {
  if (!str) return '';
  return String(str).replace(/→/g, '>').replace(/[–—]/g, '-');
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
  'qualificacao': 'Qualif.', 'qualification': 'Qualif.', 'qualificação': 'Qualif.',
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
  doc.text('PLANO DE MÍDIA', 19, 9);

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

// ── Funil trapézio (formato FIXO, cores da empresa) ───────────────────────────
const STAGE_COLORS_FUNNEL = [
  [248, 93,  7],    // laranja U-Trax
  [200, 100, 30],   // laranja-âmbar
  [160, 110, 50],   // terracota
  [126, 105, 81],   // savana
  [ 80,  70, 50],   // marrom-claro
  [ 49,  43, 29],   // marrom
];

function drawTrapezoid(doc, cx, yTop, wTop, yBot, wBot) {
  const xTL = cx - wTop / 2, xTR = cx + wTop / 2;
  const xBL = cx - wBot / 2, xBR = cx + wBot / 2;
  doc.triangle(xTL, yTop, xTR, yTop, xBR, yBot, 'F');
  doc.triangle(xTL, yTop, xBR, yBot, xBL, yBot, 'F');
}

function stageTopLabel(stageLabel, isLast) {
  const lbl = safe(stageLabel);
  return isLast ? `${lbl} projetadas` : `${lbl} esperados`;
}

function drawFunnelPyramid(doc, { x, y, w, stages, values, title = 'Funil de Conversão', compact = false, stageH: stageHOpt }) {
  if (!stages || stages.length === 0) return y;

  // Título
  doc.setFontSize(compact ? 8 : 9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text(safe(title), x, y);
  doc.setDrawColor(...C.laranja);
  doc.setLineWidth(0.5);
  doc.line(x, y + 1.5, x + (compact ? 40 : 55), y + 1.5);
  doc.setLineWidth(0.2);
  y += 7;

  const n = stages.length;
  const stageH = stageHOpt || (compact ? 15 : 19);
  const gap = compact ? 1 : 1.2;
  const cx = x + w / 2;

  // Funil de formato FIXO — afunila linearmente de 100% (topo) a ~35% (base),
  // independente dos valores. Os números ficam dentro de cada trapézio.
  const topRatio = 1.0;
  const botRatio = 0.35;
  const widths = stages.map((_, i) => w * (topRatio - (topRatio - botRatio) * (i / Math.max(1, n - 1))));

  stages.forEach((stage, i) => {
    const wTop = widths[i];
    const wBot = i < n - 1 ? widths[i + 1] : Math.max(10, widths[i] * 0.8);
    const yTop = y + i * (stageH + gap);
    const yBot = yTop + stageH;
    const color = STAGE_COLORS_FUNNEL[Math.min(i, STAGE_COLORS_FUNNEL.length - 1)];
    const isLast = i === n - 1;

    doc.setFillColor(...color);
    drawTrapezoid(doc, cx, yTop, wTop, yBot, wBot);

    // Rótulo da etapa na parte superior do trapézio (ex.: "Leads esperados")
    const label = stageTopLabel(stage, isLast);
    doc.setFontSize(compact ? 5.5 : 6.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.branco);
    const maxTextW = Math.min(wTop, wBot) - 4;
    const lines = doc.splitTextToSize(label, Math.max(8, maxTextW));
    const labelLineH = compact ? 2.6 : 3;
    const labelStartY = yTop + (compact ? 3.5 : 4);
    lines.slice(0, 2).forEach((line, li) => {
      doc.text(line, cx, labelStartY + li * labelLineH, { align: 'center' });
    });

    // Valor centralizado na parte inferior do trapézio
    doc.setFontSize(compact ? 9 : 11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.branco);
    doc.text(fmtN(values[i] || 0), cx, yBot - (compact ? 3 : 4), { align: 'center' });
  });

  return y + n * (stageH + gap) + 2;
}

// ── Funil por canal/objectivo (trapézio, compacto, lado a lado) ───────────────
function drawChannelFunnel(doc, { x, y, w, channelName, stages, values, title }) {
  return drawFunnelPyramid(doc, { x, y, w, stages, values, title: title || channelName, compact: true });
}

// ── Gráfico funil (compatibilidade) ──────────────────────────────────────────
function drawFunnelChart(doc, { x, y, w, h, stages, values, pageW, marginL, title = 'Funil de Conversão', compact = false }) {
  return drawFunnelPyramid(doc, { x, y, w, stages, values, title, compact });
}

// ── Alocação canais (barras horizontais proporcionais) ────────────────────────
function drawChannelAllocation(doc, { x, y, channels, totalBudget, pageW, marginL, w }) {
  if (!channels || channels.length === 0) return y;

  const labelW = 42; // largura da área de label (inclui logo + nome)
  const barAreaW = w - labelW - 28;

  // Título alinhado com início das barras
  const titleX = x + labelW;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text('Alocação por Canal', titleX, y);
  doc.setDrawColor(...C.laranja);
  doc.setLineWidth(0.5);
  doc.line(titleX, y + 1.5, titleX + 55, y + 1.5);
  doc.setLineWidth(0.2);
  y += 7;

  const BAR_COLORS = [
    [248, 93, 7],    // laranja U-Trax (Meta)
    [66, 103, 178],  // azul (Google)
    [52, 168, 83],
    [251, 188, 4],
    [234, 67, 53],
    [126, 105, 81],
  ];

  const barH = 13;

  channels.forEach((ch, i) => {
    const bv = ch.budget_value || 0;
    const pct = totalBudget > 0 ? bv / totalBudget : 0;
    const bw = Math.max(3, barAreaW * pct);
    const color = BAR_COLORS[i % BAR_COLORS.length];
    const midY = y + (barH - 3) / 2;

    // Nome do canal
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...C.marrom);
    doc.text(safe(ch.channel_name || '-'), x + labelW - 3, midY + 1, { align: 'right' });

    // bg track
    doc.setFillColor(235, 232, 225);
    doc.roundedRect(x + labelW, y, barAreaW, barH - 3, 1, 1, 'F');
    // fill
    doc.setFillColor(...color);
    doc.roundedRect(x + labelW, y, bw, barH - 3, 1, 1, 'F');

    // percent + value
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...C.savana);
    doc.text(safe(Math.round(pct * 100) + '% | ' + fmt(bv)), x + labelW + barAreaW + 3, midY + 1);

    y += barH;
  });

  return y + 4;
}

// ── Página Meta: estrutura em cascata ─────────────────────────────────────────
function drawMetaPage(doc, { metaCh, titulo, pageW, pageH, marginL }) {
  const FUNNEL_STAGE_LABELS = {
    topo: 'Topo — Reconhecimento',
    meio: 'Meio — Consideração',
    fundo: 'Fundo — Conversão',
    remarketing: 'Remarketing',
  };
  const FUNNEL_COLORS = {
    topo:        [248, 93, 7],
    meio:        [126, 105, 81],
    fundo:       [49, 43, 29],
    remarketing: [66, 103, 178],
  };

  doc.addPage();
  const headerH = drawHeader(doc, titulo, 'Estrutura de Campanhas — Meta Ads', pageW);
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
      doc.text(safe(`Mensal: ${fmt(adBudget)}  |  Diário: R$${dailyBudget.toFixed(2)}`), pageW - marginL - 18, my + 5.5, { align: 'right' });

      // ── Nível 3: Parametrizações em grid ──────────────────
      const params = adset.params || {};
      const paramItems = [
        { label: 'Objetivo', value: params.objetivo },
        { label: 'Público', value: params.publico },
        { label: 'Faixa Etária', value: params.faixa_etaria },
        { label: 'Gênero', value: params.genero },
        { label: 'Localização', value: params.localizacao },
        { label: 'Formato', value: params.formato },
        { label: 'Posicionamento', value: params.posicionamento },
        { label: 'Observações', value: params.observacoes },
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
        doc.text('Sem parametrizações definidas.', marginL + 18, my + 16);
      }

      my += 30;
    }

    my += 6;
  }

  return my;
}

// ── EXPORT PRINCIPAL ──────────────────────────────────────────────────────────
// ── Formatação de cards por unidade ────────────────────────────────────────────
function fmtCard(value, unit, label) {
  if (typeof value !== 'number' || !isFinite(value)) return '-';
  if (unit === 'percentual') return (value * 100).toFixed(1) + '%';
  if (unit === 'moeda') return 'R$' + Math.round(value).toLocaleString('pt-BR');
  if (label && label.toLowerCase().includes('frequ')) return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return Math.round(value).toLocaleString('pt-BR');
}

// ── Linha de cards (resumo por objetivo) ───────────────────────────────────────
function drawCardsRow(doc, { cards, y, pageW, marginL, cardH = 14, accent = C.laranja }) {
  const perRow = Math.min(cards.length, 6);
  if (perRow === 0) return y;
  const gap = 2.5;
  const cardW = (pageW - marginL * 2 - (perRow - 1) * gap) / perRow;
  cards.slice(0, 6).forEach((c, i) => {
    const cx = marginL + i * (cardW + gap);
    doc.setFillColor(...C.linho);
    doc.setDrawColor(...C.crema);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'FD');
    doc.setFillColor(...accent);
    doc.roundedRect(cx, y, cardW, 2.5, 1, 1, 'F');
    doc.rect(cx, y + 1.2, cardW, 1.3, 'F');
    doc.setFontSize(6);
    doc.setTextColor(...C.savana);
    doc.setFont(undefined, 'normal');
    doc.text(safe(c.label), cx + 3, y + 6.5);
    doc.setFontSize(9.5);
    doc.setTextColor(...C.marrom);
    doc.setFont(undefined, 'bold');
    doc.text(safe(c.value), cx + 3, y + 12);
  });
  return y + cardH + 4;
}

function buildGroupCards(data, type) {
  const cards = [{ label: 'Investimento', value: 'R$' + Math.round(data.investment || 0).toLocaleString('pt-BR') }];
  if (data.calculatedCards && data.calculatedCards.length) {
    data.calculatedCards.forEach(c => cards.push({ label: c.label, value: fmtCard(c.value, c.unit, c.label) }));
  } else if (type === 'branding') {
    const frequency = data.reach > 0 ? data.impressions / data.reach : 0;
    if (data.impressions > 0) cards.push({ label: 'Impressões', value: Math.round(data.impressions).toLocaleString('pt-BR') });
    if (data.reach > 0) cards.push({ label: 'Alcance', value: Math.round(data.reach).toLocaleString('pt-BR') });
    if (frequency > 0) cards.push({ label: 'Frequência', value: frequency.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) });
    if (data.clicks > 0) cards.push({ label: 'Cliques', value: Math.round(data.clicks).toLocaleString('pt-BR') });
  } else {
    if (data.leads > 0) cards.push({ label: 'Leads', value: Math.round(data.leads).toLocaleString('pt-BR') });
    if (data.sales > 0) cards.push({ label: 'Vendas', value: Math.round(data.sales).toLocaleString('pt-BR') });
    if (data.revenue > 0) cards.push({ label: 'Receita', value: 'R$' + Math.round(data.revenue).toLocaleString('pt-BR') });
  }
  return cards;
}

function drawSectionTitle(doc, text, y, color, marginL) {
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...C.marrom);
  doc.text(safe(text), marginL, y);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.line(marginL, y + 1.5, marginL + 45, y + 1.5);
  doc.setLineWidth(0.2);
  return y + 6;
}

// ── Página: Detalhamento das Campanhas (branding + performance) ────────────────
function drawObjectiveCardsPage(doc, { brandingGroups, performanceGroups, pageW, pageH, marginL, titulo }) {
  const bEntries = Object.entries(brandingGroups || {});
  const pEntries = Object.entries(performanceGroups || {});
  if (bEntries.length === 0 && pEntries.length === 0) return;

  doc.addPage();
  const headerH = drawHeader(doc, titulo, 'Detalhamento das Campanhas', pageW);
  let y = headerH + 8;

  if (bEntries.length) {
    y = drawSectionTitle(doc, 'Branding', y, C.amareloStage, marginL);
    for (const [name, data] of bEntries) {
      if (y > pageH - 25) { doc.addPage(); y = drawSectionTitle(doc, 'Branding (cont.)', 14, C.amareloStage, marginL); }
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...C.savana);
      const chs = data.channels && data.channels.size ? '  ·  ' + Array.from(data.channels).join(', ') : '';
      doc.text(safe(name) + chs, marginL, y);
      y += 4;
      y = drawCardsRow(doc, { cards: buildGroupCards(data, 'branding'), y, pageW, marginL, accent: C.amareloStage });
      y += 2;
    }
  }

  if (pEntries.length) {
    if (bEntries.length) y += 2;
    if (y > pageH - 25) { doc.addPage(); y = 14; }
    y = drawSectionTitle(doc, 'Performance', y, C.laranja, marginL);
    for (const [name, data] of pEntries) {
      if (y > pageH - 25) { doc.addPage(); y = drawSectionTitle(doc, 'Performance (cont.)', 14, C.laranja, marginL); }
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...C.savana);
      const chs = data.channels && data.channels.size ? '  ·  ' + Array.from(data.channels).join(', ') : '';
      doc.text(safe(name) + chs, marginL, y);
      y += 4;
      y = drawCardsRow(doc, { cards: buildGroupCards(data, 'performance'), y, pageW, marginL, accent: C.laranja });
      y += 2;
    }
  }
}

// ── Páginas: Resumo por Funis (grade de até 6 por página, centralizados) ──────
function drawPerformanceByChannelPages(doc, { channelResults, funnelStageLabels, pageW, pageH, marginL, titulo }) {
  const perf = (channelResults || []).filter(ch => {
    const sv = ch.metrics?.stageValues;
    return sv && sv.length > 1 && sv.some(v => v > 0);
  });
  if (perf.length === 0) return;

  const usableW = pageW - marginL * 2;
  const headerReserve = 40; // espaço para cabeçalho
  const usableH = pageH - headerReserve - 8;
  const colGap = 10;
  const rowGap = 8;

  // Calcula colunas/linhas por página conforme a quantidade
  function layoutForCount(count) {
    let cols, rows;
    if (count <= 1) { cols = 1; rows = 1; }
    else if (count <= 2) { cols = 2; rows = 1; }
    else if (count <= 3) { cols = 3; rows = 1; }
    else if (count <= 6) { cols = 3; rows = 2; }
    else { cols = 3; rows = 2; } // 6 por página, resto em próx. página
    return { cols, rows };
  }

  let remaining = [...perf];
  let firstPage = true;

  while (remaining.length > 0) {
    const { cols, rows } = layoutForCount(remaining.length);
    const perPage = cols * rows;
    const pageItems = remaining.slice(0, perPage);
    remaining = remaining.slice(perPage);

    doc.addPage();
    const headerH = drawHeader(doc, titulo, 'Resumo por Funis', pageW);

    // Largura/altura de cada célula
    const cellW = (usableW - (cols - 1) * colGap) / cols;
    const cellH = (usableH - (rows - 1) * rowGap) / rows;

    // Altura do funil compacta conforme linhas
    const n = funnelStageLabels.length;
    const stageH = rows === 1 ? 14 : 11;
    const gap = rows === 2 ? 1 : 1.2;
    const titleH = 7;
    const funnelH = titleH + n * (stageH + gap) + 2;
    // Largura do funil: ocupa ~80% da célula (deixa respiro)
    const funnelW = Math.min(cellW, rows === 1 ? cellW * 0.7 : cellW * 0.82);

    // Centraliza o bloco horizontalmente quando há menos colunas que 3
    const totalBlockW = cols * funnelW + (cols - 1) * colGap;
    const blockStartX = marginL + (usableW - totalBlockW) / 2;

    pageItems.forEach((ch, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cellX = blockStartX + col * (funnelW + colGap);
      const cellY = headerH + 8 + row * (cellH + rowGap);
      // Centraliza verticalmente dentro da célula
      const startY = cellY + (cellH - funnelH) / 2;

      const values = funnelStageLabels.map((_, i) => Math.round(ch.metrics.stageValues?.[i] || 0));
      drawFunnelPyramid(doc, {
        x: cellX, y: startY, w: funnelW,
        stages: funnelStageLabels, values,
        title: safe(ch.channel_name || 'Canal'),
        compact: rows === 2,
        stageH,
      });
    });

    firstPage = false;
  }
}

export async function exportPlanToPdf({ localPlan, consolidated, totalInvestment, funnelStages, conversionPairs, getRate, brandingGroups, performanceGroups }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const mes = MESES[(localPlan.period_month || 1) - 1];
  const titulo = safe(`${localPlan.client_name || 'Cliente'}  |  ${mes} ${localPlan.period_year}`);
  const subtitulo = safe('Resultado · Planejamento Consolidado');

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
    ...(hasAnyTax ? [{ label: 'Invest. Líquido', value: `R$${Math.round(netInvestment).toLocaleString('pt-BR')}` }] : []),
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

  // ── Páginas extras: cards por objetivo e funis por canal ──
  drawObjectiveCardsPage(doc, { brandingGroups, performanceGroups, pageW, pageH, marginL, titulo });
  drawPerformanceByChannelPages(doc, { channelResults: consolidated.channelResults, funnelStageLabels, pageW, pageH, marginL, titulo });

  // ── Footer em todas as páginas ─────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(...C.savana);
    doc.setFont(undefined, 'normal');
    doc.text(`Página ${i} de ${pageCount}`, pageW - marginL, pageH - 5, { align: 'right' });
  }

  const fileName = `plano_${(localPlan.client_name || 'cliente').replace(/\s+/g, '_')}_${mes}_${localPlan.period_year}.pdf`;
  doc.save(fileName);
}