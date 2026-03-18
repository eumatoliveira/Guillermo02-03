import crypto from "crypto";

export const API_KEY_SCOPES = ["kpis", "appointments", "finance", "nps", "channels"] as const;
export type ApiScope = typeof API_KEY_SCOPES[number];

export function generateApiKey(mode: "live" | "sandbox"): { raw: string; hash: string; prefix: string } {
  const secret = crypto.randomBytes(32).toString("base64url"); // 43 chars
  const raw = `glx_${mode}_${secret}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 16); // "glx_live_Ab3xYz" for display
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
