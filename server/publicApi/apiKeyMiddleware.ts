import type { Request, Response, NextFunction } from "express";
import { hashApiKey } from "./apiKeyService";

// In-memory API key store (also works as dev fallback when no DB)
// Maps keyHash -> { userId, mode, scopes, isActive, expiresAt, id }
const apiKeyCache = new Map<string, {
  id: number;
  userId: number;
  mode: "live" | "sandbox";
  scopes: string[];
  isActive: boolean;
  expiresAt: Date | null;
}>();

export function registerApiKey(hash: string, record: typeof apiKeyCache extends Map<string, infer V> ? V : never) {
  apiKeyCache.set(hash, record);
}

export function revokeApiKeyFromCache(hash: string) {
  apiKeyCache.delete(hash);
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing API key. Use: Authorization: Bearer glx_live_..." });
    return;
  }

  const raw = authHeader.slice(7).trim();
  if (!raw.startsWith("glx_")) {
    res.status(401).json({ error: "Invalid API key format." });
    return;
  }

  const hash = hashApiKey(raw);
  const record = apiKeyCache.get(hash);

  if (!record) {
    res.status(401).json({ error: "API key not found or revoked." });
    return;
  }

  if (!record.isActive) {
    res.status(403).json({ error: "API key is inactive." });
    return;
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    res.status(403).json({ error: "API key has expired." });
    return;
  }

  (req as any).apiKeyId = record.id;
  (req as any).apiKeyUserId = record.userId;
  (req as any).apiKeyMode = record.mode;
  (req as any).apiKeyScopes = record.scopes;
  next();
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const scopes: string[] = (req as any).apiKeyScopes ?? [];
    if (scopes.length > 0 && !scopes.includes(scope) && !scopes.includes("*")) {
      res.status(403).json({ error: `Scope '${scope}' required. Key scopes: [${scopes.join(", ")}]` });
      return;
    }
    next();
  };
}
