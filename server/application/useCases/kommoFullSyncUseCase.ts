import { getProviderIntegrationConfig } from "../../db";
import { fetchKommoLeads } from "../../infrastructure/crm/kommoApiService";
import { fetchKommoContacts } from "../../infrastructure/crm/kommoContactsService";
import { fetchKommoUsers } from "../../infrastructure/crm/kommoUsersService";
import { fetchKommoEvents } from "../../infrastructure/crm/kommoEventsService";
import { fetchKommoTasks } from "../../infrastructure/crm/kommoTasksService";
import { fetchKommoCustomFields } from "../../infrastructure/crm/kommoCustomFieldsService";
import { enqueueIntegrationEvent } from "../../domain/integrationQueue";
import {
  normalizeKommoPayload,
  normalizeKommoContact,
  normalizeKommoEvent,
  normalizeKommoTask,
} from "../../domain/integrationEventNormalizer";

export interface KommoFullSyncInput {
  userId: number;
  provider?: "kommo";
  since?: string;
}

export interface KommoFullSyncResult {
  success: boolean;
  syncedAt: string;
  fetchedLeads: number;
  upsertedLeads: number;
  fetchedContacts: number;
  fetchedUsers: number;
  fetchedEvents: number;
  fetchedTasks: number;
  provider: "kommo";
}

async function safeList<T>(fn: () => Promise<T[]>, label?: string): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[kommoFullSync] safeList error${label ? ` (${label})` : ""}:`, err);
    return [];
  }
}

export async function kommoFullSyncUseCase(input: KommoFullSyncInput): Promise<KommoFullSyncResult> {
  const config = await getProviderIntegrationConfig(input.userId, "kommo");
  if (!config?.accessToken || !config.accountDomain) {
    throw new Error("Kommo integration is not configured");
  }

  const { accountDomain, accessToken } = config;
  const since = input.since;

  // Etapa 1 - bootstrap: custom fields (mapeamento de campos, sem enfileiramento)
  await safeList(() => fetchKommoCustomFields({ accountDomain, accessToken, entityType: "leads" }));
  await safeList(() => fetchKommoCustomFields({ accountDomain, accessToken, entityType: "contacts" }));

  // Etapa 2 - users (resolução responsible_user_id -> nome)
  const users = await safeList(() => fetchKommoUsers({ accountDomain, accessToken }));

  // Etapa 3 - leads (base do funil comercial)
  const leads = await safeList(() =>
    fetchKommoLeads({ accountDomain, accessToken, createdAtFrom: since })
  );

  let upsertedLeads = 0;
  for (const lead of leads) {
    const envelopes = normalizeKommoPayload(lead, "application/json");
    for (const envelope of envelopes) {
      await enqueueIntegrationEvent({ userId: input.userId, provider: "kommo", envelope });
      upsertedLeads += 1;
    }
  }

  // Etapa 4 - contacts (retorno, LTV, SLA)
  const contacts = await safeList(() =>
    fetchKommoContacts({ accountDomain, accessToken, updatedAtFrom: since })
  );
  for (const contact of contacts) {
    const raw = contact.rawPayload && typeof contact.rawPayload === "object"
      ? contact.rawPayload as Record<string, unknown>
      : {
          id: contact.id,
          name: contact.name,
          responsible_user_id: contact.responsibleUserId,
          created_at: contact.createdAt ? Math.floor(new Date(contact.createdAt).getTime() / 1000) : null,
          updated_at: contact.updatedAt ? Math.floor(new Date(contact.updatedAt).getTime() / 1000) : null,
        };
    const envelope = normalizeKommoContact(raw);
    await enqueueIntegrationEvent({ userId: input.userId, provider: "kommo", envelope });
  }

  // Etapa 5 - events (auditoria de mudanças de stage, tempo entre etapas)
  const events = await safeList(() =>
    fetchKommoEvents({ accountDomain, accessToken, createdAtFrom: since })
  );
  for (const ev of events) {
    const raw: Record<string, unknown> = {
      id: ev.id,
      type: ev.type,
      entity_type: ev.entityType,
      entity_id: ev.entityId,
      created_at: ev.createdAt ? Math.floor(new Date(ev.createdAt).getTime() / 1000) : null,
      created_by: ev.createdBy,
      value_after: ev.valueAfter,
      value_before: ev.valueBefore,
    };
    const envelope = normalizeKommoEvent(raw);
    await enqueueIntegrationEvent({ userId: input.userId, provider: "kommo", envelope });
  }

  // Etapa 6 - tasks (SLA, disciplina comercial, follow-up)
  const tasks = await safeList(() => fetchKommoTasks({ accountDomain, accessToken }));
  for (const task of tasks) {
    const raw: Record<string, unknown> = {
      id: task.id,
      text: task.text,
      is_completed: task.isCompleted,
      complete_till: task.completeTill ? Math.floor(new Date(task.completeTill).getTime() / 1000) : null,
      responsible_user_id: task.responsibleUserId,
      entity_type: task.entityType,
      entity_id: task.entityId,
      created_at: task.createdAt ? Math.floor(new Date(task.createdAt).getTime() / 1000) : null,
      updated_at: task.updatedAt ? Math.floor(new Date(task.updatedAt).getTime() / 1000) : null,
    };
    const envelope = normalizeKommoTask(raw);
    await enqueueIntegrationEvent({ userId: input.userId, provider: "kommo", envelope });
  }

  return {
    success: true,
    syncedAt: new Date().toISOString(),
    fetchedLeads: leads.length,
    upsertedLeads,
    fetchedContacts: contacts.length,
    fetchedUsers: users.length,
    fetchedEvents: events.length,
    fetchedTasks: tasks.length,
    provider: input.provider ?? "kommo",
  };
}
