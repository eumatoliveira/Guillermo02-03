import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { generateApiKey } from "./publicApi/apiKeyService";
import { registerApiKey, revokeApiKeyFromCache } from "./publicApi/apiKeyMiddleware";

// In-memory store (replace with DB queries when DB is available)
interface StoredKey {
  id: number;
  userId: number;
  name: string;
  keyHash: string;
  keyPrefix: string;
  mode: "live" | "sandbox";
  scopes: string[];
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

const keyStore = new Map<number, StoredKey>();
let keyIdCounter = 1;

export const apiKeyRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.user!.id;
    return Array.from(keyStore.values())
      .filter(k => k.userId === userId)
      .map(({ keyHash: _h, ...safe }) => safe); // never return the hash
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      mode: z.enum(["live", "sandbox"]).default("sandbox"),
      scopes: z.array(z.enum(["kpis", "appointments", "finance", "nps", "channels", "*"])).default(["*"]),
      expiresInDays: z.number().min(1).max(365).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const userId = ctx.user!.id;
      const existing = Array.from(keyStore.values()).filter(k => k.userId === userId && k.isActive);
      if (existing.length >= 10) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 10 active API keys per account." });
      }

      const { raw, hash, prefix } = generateApiKey(input.mode);
      const id = keyIdCounter++;
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86400000)
        : null;

      const record: StoredKey = {
        id, userId,
        name: input.name,
        keyHash: hash,
        keyPrefix: prefix,
        mode: input.mode,
        scopes: input.scopes,
        isActive: true,
        expiresAt,
        createdAt: new Date(),
        lastUsedAt: null,
      };

      keyStore.set(id, record);
      registerApiKey(hash, { id, userId, mode: input.mode, scopes: input.scopes, isActive: true, expiresAt });

      // Return raw key ONCE — never stored
      return { id, name: input.name, mode: input.mode, prefix, rawKey: raw, expiresAt, scopes: input.scopes };
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => {
      const key = keyStore.get(input.id);
      if (!key || key.userId !== ctx.user!.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "API key not found." });
      }
      key.isActive = false;
      revokeApiKeyFromCache(key.keyHash);
      return { success: true };
    }),
});
