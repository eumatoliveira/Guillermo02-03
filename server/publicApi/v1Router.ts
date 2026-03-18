import { Router } from "express";
import { apiKeyAuth, requireScope } from "./apiKeyMiddleware";
import {
  getSandboxKPIs, getSandboxChannels, getSandboxAppointments,
  getSandboxFinance, getSandboxNPS,
} from "./sandboxData";

export const v1Router = Router();

// All routes require API key
v1Router.use(apiKeyAuth);

const isSandbox = (req: any) => req.apiKeyMode === "sandbox";
const userId = (req: any): number => req.apiKeyUserId as number;

// ── GET /api/v1/ ── Health / info
v1Router.get("/", (_req, res) => {
  res.json({
    api: "GLX SaaS Data API",
    version: "1.0.0",
    docs: "https://docs.glx.com/api",
    endpoints: [
      "GET /api/v1/kpis",
      "GET /api/v1/appointments",
      "GET /api/v1/channels",
      "GET /api/v1/finance",
      "GET /api/v1/nps",
    ],
  });
});

// ── GET /api/v1/kpis ──
v1Router.get("/kpis", requireScope("kpis"), (req, res) => {
  if (isSandbox(req)) {
    return res.json({ mode: "sandbox", data: getSandboxKPIs(userId(req)) });
  }
  res.json({ mode: "live", data: getSandboxKPIs(userId(req)), note: "Live data integration pending" });
});

// ── GET /api/v1/appointments ──
v1Router.get("/appointments", requireScope("appointments"), (req, res) => {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20")));
  if (isSandbox(req)) {
    return res.json({ mode: "sandbox", ...getSandboxAppointments(userId(req), page, limit) });
  }
  res.json({ mode: "live", ...getSandboxAppointments(userId(req), page, limit), note: "Live data integration pending" });
});

// ── GET /api/v1/channels ──
v1Router.get("/channels", requireScope("channels"), (req, res) => {
  if (isSandbox(req)) {
    return res.json({ mode: "sandbox", data: getSandboxChannels(userId(req)) });
  }
  res.json({ mode: "live", data: getSandboxChannels(userId(req)), note: "Live data integration pending" });
});

// ── GET /api/v1/finance ──
v1Router.get("/finance", requireScope("finance"), (req, res) => {
  if (isSandbox(req)) {
    return res.json({ mode: "sandbox", data: getSandboxFinance(userId(req)) });
  }
  res.json({ mode: "live", data: getSandboxFinance(userId(req)), note: "Live data integration pending" });
});

// ── GET /api/v1/nps ──
v1Router.get("/nps", requireScope("nps"), (req, res) => {
  if (isSandbox(req)) {
    return res.json({ mode: "sandbox", data: getSandboxNPS(userId(req)) });
  }
  res.json({ mode: "live", data: getSandboxNPS(userId(req)), note: "Live data integration pending" });
});
