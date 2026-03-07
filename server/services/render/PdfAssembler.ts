import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ElementHandle, Page } from "puppeteer";
import { browserPool } from "./BrowserPool";

export type ExportPlan = "essential" | "pro" | "enterprise";

export type ExportAppointment = {
  date: string;
  weekday: string;
  professional: string;
  channel: string;
  unit: string;
  procedure: string;
  status: string;
  severity: string;
  revenue: number;
  cost: number;
  nps: number | null;
  waitMinutes: number;
  isReturn: boolean;
  leadSource: string;
  cac: number;
};

export type ExportPayload = {
  clinicName: string;
  plan: ExportPlan;
  language: "PT" | "EN" | "ES";
  currency: string;
  filters: Record<string, string>;
  appointments?: ExportAppointment[];
};

type SectionCapture = {
  title: string;
  kpis: Array<{ label: string; value: string }>;
  charts: Buffer[];
};

function normalizePdfText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveRenderBaseUrl() {
  return process.env.INTERNAL_RENDER_BASE_URL || process.env.APP_BASE_URL || "http://localhost:3000";
}

async function readText(element: ElementHandle<Element>, selector: string) {
  const handle = await element.$(selector);
  if (!handle) return "";
  const value = await handle.evaluate((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "");
  await handle.dispose();
  return value;
}

async function captureSections(page: Page): Promise<SectionCapture[]> {
  const sections = await page.$$(".pdf-export-section");
  const results: SectionCapture[] = [];

  for (const section of sections) {
    const title = normalizePdfText((await section.evaluate((node) => node.getAttribute("data-title")?.trim() ?? "")) || "Dashboard") || "Dashboard";
    const kpiCards = await section.$$(".overview-card");
    const kpis: Array<{ label: string; value: string }> = [];
    for (const card of kpiCards.slice(0, 4)) {
      const label = normalizePdfText(await readText(card, ".overview-card-label"));
      const value = normalizePdfText(await readText(card, ".overview-card-value"));
      if (label && value) {
        kpis.push({ label, value });
      }
      await card.dispose();
    }

    const chartCards = await section.$$(".chart-card");
    const charts: Buffer[] = [];
    for (const chartCard of chartCards) {
      const image = await chartCard.screenshot({ type: "png" });
      charts.push(Buffer.from(image));
      await chartCard.dispose();
    }

    results.push({ title, kpis, charts });
    await section.dispose();
  }

  return results;
}

export class PdfAssembler {
  async generate(payload: ExportPayload): Promise<Buffer> {
    const browser = await browserPool.acquire();
    let page: Page | null = null;

    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1480, height: 2200, deviceScaleFactor: 2 });

      await page.evaluateOnNewDocument((input) => {
        localStorage.setItem("glx-language", input.language.toLowerCase());
        localStorage.setItem("glx-dashboard-currency", input.currency);
        (window as unknown as { __GLX_PDF_RENDER_PAYLOAD__?: unknown }).__GLX_PDF_RENDER_PAYLOAD__ = input;
      }, payload);

      await page.goto(`${resolveRenderBaseUrl()}/internal/pdf-render`, { waitUntil: "networkidle0", timeout: 30000 });
      await page.waitForSelector('[data-pdf-render-ready="true"]', { timeout: 15000 });

      const sections = await captureSections(page);
      return this.buildPdf(payload, sections);
    } finally {
      if (page) {
        await page.close().catch(() => undefined);
      }
      browserPool.release(browser);
    }
  }

  private async buildPdf(payload: ExportPayload, sections: SectionCapture[]) {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    this.addCover(pdf, payload, regular, bold);

    for (const section of sections) {
      let page = pdf.addPage([842, 595]);
      const { width, height } = page.getSize();
      page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
      page.drawRectangle({ x: 0, y: height - 42, width, height: 42, color: rgb(0.965, 0.969, 0.976) });
      page.drawRectangle({ x: 0, y: height - 42, width: 4, height: 42, color: rgb(0.976, 0.451, 0.086) });
      page.drawText(normalizePdfText(section.title) || "Dashboard", { x: 18, y: height - 27, size: 16, font: bold, color: rgb(0.067, 0.094, 0.153) });

      let kpiX = 18;
      for (const kpi of section.kpis) {
        page.drawRectangle({ x: kpiX, y: height - 118, width: 190, height: 58, color: rgb(0.973, 0.976, 0.98), borderColor: rgb(0.886, 0.91, 0.949), borderWidth: 1 });
        page.drawText(normalizePdfText(kpi.label), { x: kpiX + 10, y: height - 82, size: 9, font: regular, color: rgb(0.392, 0.455, 0.545) });
        page.drawText(normalizePdfText(kpi.value), { x: kpiX + 10, y: height - 102, size: 18, font: bold, color: rgb(0.067, 0.094, 0.153) });
        kpiX += 200;
      }

      let chartX = 18;
      let chartY = height - (section.kpis.length > 0 ? 150 : 64);
      const maxChartWidth = 392;

      for (let index = 0; index < section.charts.length; index += 1) {
        const image = await pdf.embedPng(section.charts[index]);
        const scaled = image.scaleToFit(maxChartWidth, 180);

        if (chartY - scaled.height - 20 < 30) {
          page = pdf.addPage([842, 595]);
          page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
          chartY = height - 24;
          chartX = 18;
        }

        page.drawRectangle({
          x: chartX - 4,
          y: chartY - scaled.height - 8,
          width: scaled.width + 8,
          height: scaled.height + 12,
          color: rgb(0.985, 0.988, 0.992),
          borderColor: rgb(0.886, 0.91, 0.949),
          borderWidth: 1,
        });
        page.drawImage(image, {
          x: chartX,
          y: chartY - scaled.height - 4,
          width: scaled.width,
          height: scaled.height,
        });

        if (chartX === 18) {
          chartX = 426;
        } else {
          chartX = 18;
          chartY -= scaled.height + 24;
        }
      }
    }

    const pages = pdf.getPages();
    for (let index = 1; index < pages.length; index += 1) {
      const page = pages[index];
      page.drawText(`GLX Partners | Confidencial | ${index} / ${pages.length - 1}`, {
        x: 318,
        y: 16,
        size: 9,
        font: regular,
        color: rgb(0.392, 0.455, 0.545),
      });
    }

    return Buffer.from(await pdf.save());
  }

  private addCover(pdf: PDFDocument, payload: ExportPayload, font: PDFFont, boldFont: PDFFont) {
    const page = pdf.addPage([842, 595]);
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 0, y: 0, width: 8, height, color: rgb(0.976, 0.451, 0.086) });
    page.drawText("GLX Partners", { x: 60, y: height - 120, size: 32, font: boldFont, color: rgb(0.067, 0.094, 0.153) });
    page.drawText("Performance para Clinicas Privadas", { x: 60, y: height - 152, size: 14, font, color: rgb(0.392, 0.455, 0.545) });
    page.drawText(normalizePdfText(payload.clinicName) || "Cliente GLX", { x: 60, y: height - 235, size: 20, font: boldFont, color: rgb(0.067, 0.094, 0.153) });
    page.drawText(`Plano ${normalizePdfText(payload.plan.toUpperCase())}`, { x: 60, y: height - 270, size: 14, font: boldFont, color: rgb(0.976, 0.451, 0.086) });
    page.drawText(`Exportado em ${normalizePdfText(new Date().toLocaleDateString("pt-BR"))}`, { x: 60, y: height - 294, size: 11, font, color: rgb(0.392, 0.455, 0.545) });
  }
}

export const pdfAssembler = new PdfAssembler();
