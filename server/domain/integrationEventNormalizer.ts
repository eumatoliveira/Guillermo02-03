import { createHash, randomUUID } from "node:crypto";
import type { IntegrationEventEnvelope, IntegrationProvider } from "@shared/integrationEvents";

function hashPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload ?? {})).digest("hex");
}

function stringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : 0;
  }
  return 0;
}

function isoValue(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value !== "string") return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function baseEnvelope(provider: IntegrationProvider, payload: unknown, contentType?: string, signature?: string): Omit<IntegrationEventEnvelope, "eventType" | "entity" | "entityId" | "occurredAt" | "normalized"> {
  return {
    source: provider,
    receivedAt: new Date().toISOString(),
    requestId: randomUUID(),
    eventHash: hashPayload(payload),
    rawBody: payload,
    metadata: {
      provider,
      contentType,
      signature,
    },
  };
}

export function normalizeKommoPayload(payload: unknown, contentType?: string, signature?: string): IntegrationEventEnvelope[] {
  const base = baseEnvelope("kommo", payload, contentType, signature);
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const normalized: IntegrationEventEnvelope[] = [];

  const pushLead = (source: Record<string, unknown>, eventType: string) => {
    const leadId = stringValue(source.id, stringValue(record["event_id"], randomUUID()));
    const customFields = Array.isArray(source.custom_fields_values)
      ? source.custom_fields_values as Array<Record<string, unknown>>
      : [];
    const getCustomField = (code: string) => {
      const field = customFields.find((f) => f.field_code === code || f.field_name === code);
      if (!field) return null;
      const vals = Array.isArray(field.values) ? field.values as Array<Record<string, unknown>> : [];
      return vals.length > 0 ? stringValue(vals[0].value) : null;
    };

    normalized.push({
      ...base,
      eventType,
      entity: "lead",
      entityId: leadId,
      occurredAt: isoValue(source.created_at ?? source.updated_at ?? record["created_at"]),
      normalized: {
        leadId,
        pipeline: stringValue(source.pipeline_id ?? source.pipeline) || null,
        status: stringValue(source.status_id ?? source.status) || null,
        responsible: stringValue(source.responsible_user_id ?? source.responsible) || null,
        price: source.price != null ? numberValue(source.price ?? source.sale) : null,
        title: stringValue(source.name) || null,
        channel: stringValue(source.utm_source ?? source.source_name) || getCustomField("UTM_SOURCE") || null,
        unit: getCustomField("UNIT") || getCustomField("UNIDADE") || null,
        procedure: getCustomField("PROCEDURE") || getCustomField("PROCEDIMENTO") || null,
        scheduledAt: getCustomField("SCHEDULED_AT") || getCustomField("DATA_AGENDAMENTO") || null,
        cancellationReason: getCustomField("CANCELLATION_REASON") || getCustomField("MOTIVO_CANCELAMENTO") || null,
      },
    });
  };

  const leads = record["leads"];
  if (Array.isArray(leads)) {
    leads.forEach((item) => {
      if (item && typeof item === "object") pushLead(item as Record<string, unknown>, "lead.updated");
    });
  }

  const add = record["leads[add]"] ?? record["leads_add"];
  if (Array.isArray(add)) {
    add.forEach((item) => {
      if (item && typeof item === "object") pushLead(item as Record<string, unknown>, "lead.created");
    });
  }

  const statusChange = record["leads[status]"] ?? record["leads_status"];
  if (Array.isArray(statusChange)) {
    statusChange.forEach((item) => {
      if (item && typeof item === "object") pushLead(item as Record<string, unknown>, "lead.status_changed");
    });
  }

  if (normalized.length === 0) {
    pushLead(record, "lead.updated");
  }

  return normalized;
}

export function normalizeKommoContact(contact: Record<string, unknown>): IntegrationEventEnvelope {
  const base = baseEnvelope("kommo", contact, "application/json");
  const id = stringValue(contact.id, randomUUID());
  return {
    ...base,
    eventType: "contact.updated",
    entity: "contact",
    entityId: id,
    occurredAt: isoValue(contact.updated_at ?? contact.created_at),
    normalized: {
      contactId: id,
      name: stringValue(contact.name) || null,
      responsible: contact.responsible_user_id != null ? stringValue(contact.responsible_user_id) : null,
      createdAt: contact.created_at != null
        ? new Date(numberValue(contact.created_at) * 1000).toISOString()
        : null,
    },
  };
}

export function normalizeKommoEvent(event: Record<string, unknown>): IntegrationEventEnvelope {
  const base = baseEnvelope("kommo", event, "application/json");
  const id = stringValue(event.id, randomUUID());
  return {
    ...base,
    eventType: `crm_event.${stringValue(event.type, "unknown")}`,
    entity: "crm_event",
    entityId: event.entity_id != null ? stringValue(event.entity_id) : id,
    occurredAt: isoValue(event.created_at),
    normalized: {
      eventId: id,
      eventType: stringValue(event.type) || null,
      entityType: stringValue(event.entity_type) || null,
      entityId: event.entity_id != null ? stringValue(event.entity_id) : null,
      createdBy: event.created_by != null ? stringValue(event.created_by) : null,
      valueAfter: event.value_after ?? null,
      valueBefore: event.value_before ?? null,
    },
  };
}

export function normalizeKommoTask(task: Record<string, unknown>): IntegrationEventEnvelope {
  const base = baseEnvelope("kommo", task, "application/json");
  const id = stringValue(task.id, randomUUID());
  return {
    ...base,
    eventType: "task.updated",
    entity: "task",
    entityId: id,
    occurredAt: isoValue(task.updated_at ?? task.created_at),
    normalized: {
      taskId: id,
      text: stringValue(task.text) || null,
      isCompleted: task.is_completed != null ? task.is_completed : null,
      completeTill: task.complete_till != null
        ? new Date(numberValue(task.complete_till) * 1000).toISOString()
        : null,
      responsible: task.responsible_user_id != null ? stringValue(task.responsible_user_id) : null,
      entityType: stringValue(task.entity_type) || null,
      entityId: task.entity_id != null ? stringValue(task.entity_id) : null,
    },
  };
}

export function normalizeAsaasPayload(payload: unknown, contentType?: string, signature?: string): IntegrationEventEnvelope[] {
  const base = baseEnvelope("asaas", payload, contentType, signature);
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const payment = record.payment && typeof record.payment === "object" ? record.payment as Record<string, unknown> : record;
  const eventType = stringValue(record.event, "PAYMENT_UPDATED");
  const entityId = stringValue(payment.id, randomUUID());
  const customer = payment.customer && typeof payment.customer === "object" ? payment.customer as Record<string, unknown> : null;

  return [
    {
      ...base,
      eventType: eventType.toLowerCase(),
      entity: "payment",
      entityId,
      occurredAt: isoValue(
        payment.paymentDate ??
        payment.clientPaymentDate ??
        payment.dateCreated ??
        record.dateCreated,
      ),
      normalized: {
        paymentId: entityId,
        status: stringValue(payment.status, eventType),
        amount: numberValue(payment.value ?? payment.netValue),
        netAmount: numberValue(payment.netValue ?? payment.value),
        billingType: stringValue(payment.billingType),
        dueDate: stringValue(payment.dueDate),
        paidAt: stringValue(payment.clientPaymentDate ?? payment.paymentDate),
        customerId: stringValue(payment.customer, stringValue(customer?.id)),
        customerName: stringValue(customer?.name),
        description: stringValue(payment.description),
      },
    },
  ];
}
