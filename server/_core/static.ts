import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In dev, __dirname is server/_core (2 levels up to root).
  // In production, esbuild bundles to dist/index.js so __dirname is dist/ and
  // the Vite output is at dist/public (one level down, same dir).
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // codeql[js/missing-rate-limiting] — catch-all serves the static SPA index.html; rate limiting is applied on API paths upstream in app.ts
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
