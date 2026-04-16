import type { IngestionParsedRow } from "@shared/types";
import type { IntegrationEventEnvelope } from "@shared/integrationEvents";
import { commitControlTowerIngestionBatch } from "./controlTowerDataStore";

function toPositiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}

function normalizedString(normalized: Record<string, unknown>, key: string, fallback: string) {
  const value = normalized[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function mapKommoStatus(eventType: string, normalized: Record<string, unknown>): IngestionParsedRow["status"] {
  const status = normalizedString(normalized, "status", "").toLowerCase();
  if (eventType.includes("status") && /(won|ganho|fechado|converted|closedwon)/.test(status)) return "realizado";
  if (/(lost|cancel|perd)/.test(status)) return "cancelado";
  return "agendado";
}

function mapAsaasStatus(eventType: string, normalized: Record<string, unknown>): IngestionParsedRow["status"] {
  const status = normalizedString(normalized, "status", eventType).toLowerCase();
  if (status.includes("received") || status.includes("confirmed")) return "realizado";
  if (status.includes("refund") || status.includes("deleted")) return "cancelado";
  if (status.includes("overdue")) return "noshow";
  return "agendado";
}

// Retorna null para métricas sem dados no CRM — o frontend exibirá "Dados não entrados"
function nullableNumber(normalized: Record<string, unknown>, key: string): number | null {
  const v = normalized[key];
  if (v === null || v === undefined) return null;
  return toPositiveNumber(v);
}

export function envelopeToFactRows(envelope: IntegrationEventEnvelope): IngestionParsedRow[] {
  const normalized = envelope.normalized;

  // Entidades de suporte (contact, task, crm_event) não geram linhas de fact operacionais
  if (
    envelope.entity === "contact" ||
    envelope.entity === "task" ||
    envelope.entity === "crm_event" ||
    envelope.entity === "note"
  ) {
    return [];
  }

  if (envelope.source === "kommo") {
    const amount = nullableNumber(normalized, "price");
    return [
      {
        id: `${envelope.source}:${envelope.entityId}:${envelope.eventType}`,
        timestamp: envelope.occurredAt,
        // Campos ausentes do CRM chegam como string vazia; o frontend exibe "Dados não entrados"
        channel: normalizedString(normalized, "channel", ""),
        professional: normalizedString(normalized, "responsible", ""),
        procedure: normalizedString(normalized, "procedure", "") || normalizedString(normalized, "title", ""),
        status: mapKommoStatus(envelope.eventType, normalized),
        pipeline: normalizedString(normalized, "pipeline", "") || undefined,
        unit: normalizedString(normalized, "unit", "") || undefined,
        entries: amount ?? 0,
        exits: 0,
        slotsAvailable: 1,
        slotsEmpty: envelope.eventType.includes("created") ? 1 : 0,
        ticketMedio: amount ?? 0,
        custoVariavel: 0,
        durationMinutes: 0,
        materialList: [],
        waitMinutes: 0,
        npsScore: 0,
        baseOldRevenueCurrent: 0,
        baseOldRevenuePrevious: 0,
        crmLeadId: envelope.entityId,
        sourceType: "crm",
      },
    ];
  }

  const gross = toPositiveNumber(normalized["amount"]);
  const net = toPositiveNumber(normalized["netAmount"]) || gross;
  return [
    {
      id: `${envelope.source}:${envelope.entityId}:${envelope.eventType}`,
      timestamp: envelope.occurredAt,
      channel: "Asaas",
      professional: "Financeiro",
      procedure: normalizedString(normalized, "description", "Cobranca"),
      status: mapAsaasStatus(envelope.eventType, normalized),
      pipeline: normalizedString(normalized, "billingType", "Financeiro"),
      unit: "Financeiro",
      entries: net,
      exits: Math.max(0, gross - net),
      slotsAvailable: 1,
      slotsEmpty: 0,
      ticketMedio: net,
      custoVariavel: 0,
      durationMinutes: 0,
      materialList: [],
      waitMinutes: 0,
      npsScore: 0,
      baseOldRevenueCurrent: 0,
      baseOldRevenuePrevious: 0,
      crmLeadId: normalizedString(normalized, "customerId", envelope.entityId),
      sourceType: "api",
    },
  ];
}

export async function persistIntegrationEnvelope(userId: number, envelope: IntegrationEventEnvelope) {
  const rows = envelopeToFactRows(envelope);
  return commitControlTowerIngestionBatch({
    userId,
    fileName: `${envelope.source}-${envelope.eventType}`,
    fileType: envelope.source === "kommo" ? "crm" : "api",
    rows,
    metadata: {
      envelope,
    },
  });
}
