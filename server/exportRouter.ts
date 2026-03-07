import { Router } from "express";
import { pdfAssembler, type ExportPayload } from "./services/render/PdfAssembler";

export const exportRouter = Router();

exportRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

exportRouter.post("/pdf", async (req, res) => {
  try {
    const payload = req.body as ExportPayload;
    if (!payload?.plan || !payload?.clinicName) {
      res.status(400).json({ error: "plan e clinicName sao obrigatorios" });
      return;
    }

    const buffer = await pdfAssembler.generate(payload);
    const filename = `GLX_${payload.plan.charAt(0).toUpperCase()}${payload.plan.slice(1)}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(buffer.length));
    res.send(buffer);
  } catch (error) {
    console.error("[/api/export/pdf]", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Erro ao gerar PDF" });
  }
});
