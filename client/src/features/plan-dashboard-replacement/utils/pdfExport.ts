import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { translateDashboardText } from '../i18n';
import { resolveKpiMeta, type KpiSourceMode } from './kpiMeta';

export interface PdfExportLabels {
  page: string;
  of: string;
  confidential: string;
  rights: string;
  tab: string;
  indicator: string;
  consolidatedValue: string;
  detail: string;
}

export interface DashboardHealthPdfLabels extends PdfExportLabels {
  statusSummary: string;
  healthy: string;
  stable: string;
  critical: string;
  legend: string;
  legendHealthy: string;
  legendStable: string;
  legendCritical: string;
  methodology: string;
  formula: string;
  howMeasured: string;
  sources: string;
  chartGallery: string;
  snapshot: string;
}

const defaultLabels: PdfExportLabels = {
  page: 'Pagina',
  of: 'de',
  confidential: 'GLX Performance Control Tower - Confidencial',
  rights: 'Copyright 2026 GLX Partners. Todos os direitos reservados.',
  tab: 'Aba',
  indicator: 'Indicador / KPI',
  consolidatedValue: 'Valor consolidado',
  detail: 'Detalhamento',
};

const defaultHealthLabels: DashboardHealthPdfLabels = {
  ...defaultLabels,
  statusSummary: 'Resumo de saude',
  healthy: 'Saudavel',
  stable: 'Estavel',
  critical: 'Critico',
  legend: 'Legenda',
  legendHealthy: 'Saudavel: indicador dentro da meta ou com status OK.',
  legendStable: 'Estavel: indicador em atencao, warning, P2 ou P3, sem ruptura imediata.',
  legendCritical: 'Critico: indicador com status P1 ou critico, exigindo acao imediata.',
  methodology: 'Metodologia e calculos',
  formula: 'Formula',
  howMeasured: 'Como a medicao e feita',
  sources: 'Fontes e campos usados',
  chartGallery: 'Graficos executivos',
  snapshot: 'Snapshot consolidado',
};

type PdfLanguage = 'pt' | 'en' | 'es';

type SectionVisual = {
  title: string;
  node: HTMLElement;
};

type SectionTable = {
  title: string;
  head: string[][];
  body: string[][];
};

type SectionSnapshot = {
  title: string;
  cards: Array<{ label: string; value: string }>;
  tableStatuses: string[];
  visuals: SectionVisual[];
  tables: SectionTable[];
  methodologyLabels: string[];
};

function safeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeStatus(value: string) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function classifyHealth(value: string): 'healthy' | 'stable' | 'critical' | null {
  const status = normalizeStatus(value);
  if (!status) return null;
  if (status.includes('P1') || status.includes('CRITIC')) return 'critical';
  if (status.includes('OK') || status.includes('HEALTHY') || status.includes('SAUDAVEL')) return 'healthy';
  if (status.includes('P2') || status.includes('P3') || status.includes('WARN') || status.includes('ATEN') || status.includes('ESTAVEL') || status.includes('STABLE')) {
    return 'stable';
  }
  return null;
}

function toLanguage(locale: string): PdfLanguage {
  if (locale.startsWith('en')) return 'en';
  if (locale.startsWith('es')) return 'es';
  return 'pt';
}

function translateMetaText(text: string, language: PdfLanguage) {
  if (language === 'pt') return text;
  return translateDashboardText(text, language);
}

function drawHeader(pdf: jsPDF, title: string, subtitle: string, dateStr: string) {
  pdf.setFillColor(255, 90, 31);
  pdf.rect(0, 0, 210, 3, 'F');

  pdf.setFillColor(255, 90, 31);
  pdf.roundedRect(8, 6, 12, 10, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GLX', 14, 12.5, { align: 'center' });

  pdf.setTextColor(17, 24, 39);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 23, 10);

  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(subtitle, 23, 14.5);
  pdf.text(dateStr, 202, 10, { align: 'right' });

  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.line(8, 20, 202, 20);
}

function drawFooter(pdf: jsPDF, labels: PdfExportLabels) {
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(7);
    pdf.text(`${labels.page} ${i} ${labels.of} ${pageCount}`, 202, 14, { align: 'right' });

    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.3);
    pdf.line(8, 285, 202, 285);
    pdf.setTextColor(156, 163, 175);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(labels.confidential, 8, 291);
    pdf.text(labels.rights, 202, 291, { align: 'right' });
  }
}

function ensureRoom(pdf: jsPDF, requiredHeight: number) {
  const cursor = (pdf as any).lastAutoTable?.finalY ?? 26;
  if (cursor + requiredHeight > 278) {
    pdf.addPage();
    drawCurrentHeader(pdf);
    (pdf as any).lastAutoTable = { finalY: 26 };
    return 26;
  }
  return cursor;
}

let currentHeader: { title: string; subtitle: string; dateStr: string } | null = null;

function drawCurrentHeader(pdf: jsPDF) {
  if (!currentHeader) return;
  drawHeader(pdf, currentHeader.title, currentHeader.subtitle, currentHeader.dateStr);
}

function extractSections(contentElement: HTMLElement): HTMLElement[] {
  const sections = contentElement.querySelectorAll<HTMLElement>('.pdf-export-section');
  return sections.length > 0 ? Array.from(sections) : [contentElement];
}

function extractSectionSnapshot(section: HTMLElement): SectionSnapshot {
  const title = safeText(section.getAttribute('data-title')) || 'Dashboard';
  const cards = Array.from(section.querySelectorAll<HTMLElement>('.overview-card'))
    .map((card) => ({
      label: safeText(card.querySelector('.overview-card-label')?.textContent),
      value: safeText(card.querySelector('.overview-card-value')?.textContent),
    }))
    .filter((card) => card.label && card.value);

  const tableStatuses: string[] = [];
  section.querySelectorAll('table.data-table tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;
    const statusCell = cells.length >= 6 ? cells[cells.length - 2] : cells[cells.length - 1];
    const statusText = safeText(statusCell?.textContent);
    if (statusText) tableStatuses.push(statusText);
  });

  const methodologyLabels = Array.from(
    new Set(
      cards
        .map((card) => card.label)
        .filter(Boolean)
        .slice(0, 12),
    ),
  );

  const visuals = Array.from(section.querySelectorAll<HTMLElement>('.chart-card'))
    .map((node) => ({
      title: safeText(node.querySelector('.chart-card-title, .detail-section-header')?.textContent) || title,
      node,
    }));

  const tables = Array.from(section.querySelectorAll<HTMLElement>('.data-table'))
    .map((table, tableIndex) => {
      const head = Array.from(table.querySelectorAll('thead tr'))
        .map((tr) => Array.from(tr.querySelectorAll('th')).map((th) => safeText(th.textContent)))
        .filter((row) => row.length > 0);
      const body = Array.from(table.querySelectorAll('tbody tr'))
        .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => safeText(td.textContent)))
        .filter((row) => row.length > 0);

      if (head.length === 0 && body.length === 0) return null;

      const titleNode = table.closest('.chart-card, .detail-section')?.querySelector('.chart-card-title, .detail-section-header');
      return {
        title: safeText(titleNode?.textContent) || `${title} ${tableIndex + 1}`,
        head,
        body,
      } satisfies SectionTable;
    })
    .filter((table): table is SectionTable => Boolean(table));

  return {
    title,
    cards,
    tableStatuses,
    visuals,
    tables,
    methodologyLabels,
  };
}

async function withVisibleExportNode<T>(element: HTMLElement, run: () => Promise<T>) {
  const original = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    width: element.style.width,
    visibility: element.style.visibility,
    opacity: element.style.opacity,
    pointerEvents: element.style.pointerEvents,
    zIndex: element.style.zIndex,
  };

  const computed = window.getComputedStyle(element);
  const needsReveal = computed.visibility === 'hidden' || element.style.visibility === 'hidden';

  if (needsReveal) {
    element.style.position = 'fixed';
    element.style.left = '0';
    element.style.top = '0';
    element.style.width = element.style.width || '1440px';
    element.style.visibility = 'visible';
    element.style.opacity = '0';
    element.style.pointerEvents = 'none';
    element.style.zIndex = '-1';
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
  }

  try {
    return await run();
  } finally {
    if (needsReveal) {
      element.style.position = original.position;
      element.style.left = original.left;
      element.style.top = original.top;
      element.style.width = original.width;
      element.style.visibility = original.visibility;
      element.style.opacity = original.opacity;
      element.style.pointerEvents = original.pointerEvents;
      element.style.zIndex = original.zIndex;
    }
  }
}

async function captureNodeImage(node: HTMLElement) {
  const canvas = await html2canvas(node, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

function addSectionTitle(pdf: jsPDF, labels: PdfExportLabels, title: string) {
  let startY = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 8 : 26;
  if (startY > 270) {
    pdf.addPage();
    drawCurrentHeader(pdf);
    startY = 26;
  }
  pdf.setFontSize(14);
  pdf.setTextColor(255, 90, 31);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${labels.tab}: ${title}`, 8, startY);
  (pdf as any).lastAutoTable = { finalY: startY + 2 };
}

function drawSubsectionTitle(pdf: jsPDF, title: string) {
  const startY = ensureRoom(pdf, 12) + 6;
  pdf.setFontSize(10);
  pdf.setTextColor(75, 85, 99);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 8, startY);
  (pdf as any).lastAutoTable = { finalY: startY + 2 };
}

async function addVisualGallery(pdf: jsPDF, visuals: SectionVisual[], galleryTitle: string) {
  if (visuals.length === 0) return;

  drawSubsectionTitle(pdf, galleryTitle);

  const left = 8;
  const gap = 6;
  const columnWidth = 94;
  let cursorX = left;
  let cursorY = ((pdf as any).lastAutoTable?.finalY ?? 26) + 6;
  let lastBottomY = cursorY;

  for (const visual of visuals) {
    const image = await captureNodeImage(visual.node);
    const imageWidth = columnWidth;
    const imageHeight = Math.max(34, Math.min(82, (image.height / image.width) * imageWidth));
    const titleHeight = 8;
    const blockHeight = titleHeight + imageHeight + 4;

    if (cursorY + blockHeight > 276) {
      pdf.addPage();
      drawCurrentHeader(pdf);
      cursorX = left;
      cursorY = 28;
    }

    pdf.setFontSize(8.5);
    pdf.setTextColor(75, 85, 99);
    pdf.setFont('helvetica', 'bold');
    pdf.text(visual.title, cursorX, cursorY + 4, { maxWidth: imageWidth });
    pdf.addImage(image.dataUrl, 'PNG', cursorX, cursorY + 6, imageWidth, imageHeight);
    lastBottomY = Math.max(lastBottomY, cursorY + blockHeight);

    if (cursorX === left) {
      cursorX = left + columnWidth + gap;
    } else {
      cursorX = left;
      cursorY += blockHeight + 6;
      lastBottomY = cursorY;
    }
  }

  (pdf as any).lastAutoTable = { finalY: cursorX === left ? cursorY : lastBottomY };
}

function addSectionTables(pdf: jsPDF, tables: SectionTable[]) {
  for (const table of tables) {
    const startY = ensureRoom(pdf, 28) + 6;
    pdf.setFontSize(10);
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.text(table.title, 8, startY);

    autoTable(pdf, {
      startY: startY + 3,
      head: table.head.length ? table.head : undefined,
      body: table.body,
      theme: 'grid',
      headStyles: { fillColor: [28, 31, 38], textColor: 255 },
      styles: { fontSize: 7, cellPadding: 2.5 },
      margin: { top: 26, bottom: 15, left: 8, right: 8 },
    });
  }
}

export async function exportDashboardPDF(
  contentElement: HTMLElement,
  title: string,
  subtitle: string,
  filenamePrefix = 'GLX_Report',
  labels: Partial<PdfExportLabels> = {},
  locale = 'pt-BR',
): Promise<void> {
  if (!contentElement) return;

  const copy = { ...defaultLabels, ...labels };
  const pdf = new jsPDF('p', 'mm', 'a4');
  const now = new Date();
  const dateStr = now.toLocaleString(locale);
  currentHeader = { title, subtitle, dateStr };

  drawCurrentHeader(pdf);

  extractSections(contentElement).forEach((section, idx) => {
    const sectionTitle = safeText(section.getAttribute('data-title'));

    if (idx > 0 && (pdf as any).lastAutoTable) {
      if ((pdf as any).lastAutoTable.finalY > 250) {
        pdf.addPage();
        drawCurrentHeader(pdf);
        (pdf as any).lastAutoTable.finalY = 26;
      } else {
        (pdf as any).lastAutoTable.finalY += 15;
      }
    }

    let startY = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY : 26;

    if (sectionTitle) {
      pdf.setFontSize(14);
      pdf.setTextColor(255, 90, 31);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${copy.tab}: ${sectionTitle}`, 8, startY);
      startY += 5;
    }

    const cardData = Array.from(section.querySelectorAll<HTMLElement>('.overview-card'))
      .map((card) => [
        safeText(card.querySelector('.overview-card-label')?.textContent),
        safeText(card.querySelector('.overview-card-value')?.textContent),
      ])
      .filter(([label, value]) => label && value);

    if (cardData.length > 0) {
      autoTable(pdf, {
        startY,
        head: [[copy.indicator, copy.consolidatedValue]],
        body: cardData,
        theme: 'grid',
        headStyles: { fillColor: [255, 90, 31], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { top: 26, bottom: 15, left: 8, right: 8 },
      });
      startY = (pdf as any).lastAutoTable.finalY;
    }

    section.querySelectorAll('.data-table').forEach((table, tableIndex) => {
      const head = Array.from(table.querySelectorAll('thead tr'))
        .map((tr) => Array.from(tr.querySelectorAll('th')).map((th) => safeText(th.textContent)))
        .filter((row) => row.length > 0);
      const body = Array.from(table.querySelectorAll('tbody tr'))
        .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => safeText(td.textContent)))
        .filter((row) => row.length > 0);

      if (head.length || body.length) {
        let tableStartY = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 10 : startY + 10;
        const titleSpan = table.closest('.chart-card')?.querySelector('.chart-card-title, .detail-section-header');
        const tableTitleText = safeText(titleSpan?.textContent) || `${copy.detail} ${tableIndex + 1}`;

        pdf.setFontSize(10);
        pdf.setTextColor(17, 24, 39);
        pdf.setFont('helvetica', 'bold');
        if (tableStartY + 10 > 280) {
          pdf.addPage();
          drawCurrentHeader(pdf);
          tableStartY = 26;
        }

        pdf.text(tableTitleText, 8, tableStartY);

        autoTable(pdf, {
          startY: tableStartY + 3,
          head: head.length ? head : undefined,
          body,
          theme: 'grid',
          headStyles: { fillColor: [28, 31, 38], textColor: 255 },
          styles: { fontSize: 7, cellPadding: 2.5 },
          margin: { top: 26, bottom: 15, left: 8, right: 8 },
        });
      }
    });
  });

  drawFooter(pdf, copy);
  pdf.save(`${filenamePrefix}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.pdf`);
}

export async function exportDashboardHealthPDF(
  contentElement: HTMLElement,
  title: string,
  subtitle: string,
  filenamePrefix = 'GLX_Report_Health',
  labels: Partial<DashboardHealthPdfLabels> = {},
  locale = 'pt-BR',
  sourceMode: KpiSourceMode = 'fallback',
): Promise<void> {
  if (!contentElement) return;

  const copy = { ...defaultHealthLabels, ...labels };
  const pdf = new jsPDF('p', 'mm', 'a4');
  const now = new Date();
  const dateStr = now.toLocaleString(locale);
  const language = toLanguage(locale);
  currentHeader = { title, subtitle, dateStr };
  drawCurrentHeader(pdf);

  await withVisibleExportNode(contentElement, async () => {
    const snapshots = extractSections(contentElement).map((section) => extractSectionSnapshot(section));
    const globalCounts = snapshots.reduce(
      (acc, section) => {
        section.tableStatuses.forEach((status) => {
          const bucket = classifyHealth(status);
          if (bucket) acc[bucket] += 1;
        });
        return acc;
      },
      { healthy: 0, stable: 0, critical: 0 },
    );

    autoTable(pdf, {
      startY: 28,
      head: [[copy.statusSummary, copy.healthy, copy.stable, copy.critical]],
      body: [[copy.snapshot, String(globalCounts.healthy), String(globalCounts.stable), String(globalCounts.critical)]],
      theme: 'grid',
      headStyles: { fillColor: [255, 90, 31], textColor: 255 },
      bodyStyles: { textColor: 17 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { top: 26, bottom: 15, left: 8, right: 8 },
    });

    const legendStartY = ((pdf as any).lastAutoTable?.finalY ?? 42) + 8;
    pdf.setFontSize(11);
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.text(copy.legend, 8, legendStartY);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(copy.legendHealthy, 8, legendStartY + 6, { maxWidth: 192 });
    pdf.text(copy.legendStable, 8, legendStartY + 12, { maxWidth: 192 });
    pdf.text(copy.legendCritical, 8, legendStartY + 18, { maxWidth: 192 });
    (pdf as any).lastAutoTable = { finalY: legendStartY + 22 };

    for (const snapshot of snapshots) {
      pdf.addPage();
      drawCurrentHeader(pdf);
      (pdf as any).lastAutoTable = { finalY: 26 };

      addSectionTitle(pdf, copy, snapshot.title);

      const sectionCounts = snapshot.tableStatuses.reduce(
        (acc, status) => {
          const bucket = classifyHealth(status);
          if (bucket) acc[bucket] += 1;
          return acc;
        },
        { healthy: 0, stable: 0, critical: 0 },
      );

      autoTable(pdf, {
        startY: ((pdf as any).lastAutoTable?.finalY ?? 26) + 6,
        head: [[copy.statusSummary, copy.healthy, copy.stable, copy.critical]],
        body: [[snapshot.title, String(sectionCounts.healthy), String(sectionCounts.stable), String(sectionCounts.critical)]],
        theme: 'grid',
        headStyles: { fillColor: [28, 31, 38], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        margin: { top: 26, bottom: 15, left: 8, right: 8 },
      });

      if (snapshot.cards.length > 0) {
        autoTable(pdf, {
          startY: ((pdf as any).lastAutoTable?.finalY ?? 26) + 6,
          head: [[copy.indicator, copy.consolidatedValue]],
          body: snapshot.cards.map((card) => [card.label, card.value]),
          theme: 'grid',
          headStyles: { fillColor: [255, 90, 31], textColor: 255 },
          styles: { fontSize: 8, cellPadding: 2.5 },
          margin: { top: 26, bottom: 15, left: 8, right: 8 },
        });
      }

      await addVisualGallery(pdf, snapshot.visuals, copy.chartGallery);

      if (snapshot.tables.length > 0) {
        drawSubsectionTitle(pdf, copy.detail);
        addSectionTables(pdf, snapshot.tables);
      }

      const methodologyRows = snapshot.methodologyLabels
        .map((label) => {
          const meta = resolveKpiMeta(label, sourceMode);
          return [
            translateMetaText(meta.label, language),
            translateMetaText(meta.formula, language),
            translateMetaText(meta.howToCalculate, language),
            `${meta.sources.map((source) => translateMetaText(source, language)).join(', ')} | ${meta.fields.join(', ')}`,
          ];
        });

      if (methodologyRows.length > 0) {
        const startY = ensureRoom(pdf, 40) + 6;
        pdf.setFontSize(11);
        pdf.setTextColor(17, 24, 39);
        pdf.setFont('helvetica', 'bold');
        pdf.text(copy.methodology, 8, startY);

        autoTable(pdf, {
          startY: startY + 3,
          head: [[copy.indicator, copy.formula, copy.howMeasured, copy.sources]],
          body: methodologyRows,
          theme: 'grid',
          headStyles: { fillColor: [28, 31, 38], textColor: 255 },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 42 },
            2: { cellWidth: 54 },
            3: { cellWidth: 60 },
          },
          margin: { top: 26, bottom: 15, left: 8, right: 8 },
        });
      }
    }
  });

  drawFooter(pdf, copy);
  pdf.save(`${filenamePrefix}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.pdf`);
}
