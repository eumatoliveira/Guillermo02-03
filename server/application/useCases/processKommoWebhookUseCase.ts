import { timingSafeEqual } from "crypto";
import { ENV } from "../../_core/env";

export interface ProcessKommoWebhookInput {
  eventId: string;
  signature?: string;
  payload: unknown;
  expectedSecret?: string;
}

export interface ProcessKommoWebhookResult {
  accepted: boolean;
  status: "processed" | "ignored";
  reason?: string;
}

export async function processKommoWebhookUseCase(input: ProcessKommoWebhookInput): Promise<ProcessKommoWebhookResult> {
  if (!input.eventId) {
    return { accepted: false, status: "ignored", reason: "missing_event_id" };
  }

  const expectedSecret = input.expectedSecret ?? ENV.kommoWebhookSecret;
  if (!expectedSecret) {
    return { accepted: false, status: "ignored", reason: "missing_webhook_secret" };
  }

  const sigMatch = input.signature
    ? timingSafeEqual(Buffer.from(input.signature), Buffer.from(expectedSecret))
    : false;
  if (!sigMatch) {
    return { accepted: false, status: "ignored", reason: "invalid_signature" };
  }

  // Deterministic delegation only: webhook parsing/normalization happens in infrastructure,
  // mathematical rules remain in domain/alert engine.
  return {
    accepted: true,
    status: "processed",
  };
}
