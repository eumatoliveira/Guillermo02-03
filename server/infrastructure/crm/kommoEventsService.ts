import { validateKommoDomain } from "./kommoValidation";
export interface KommoEventDto {
  id: string;
  type?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
  valueAfter?: unknown;
  valueBefore?: unknown;
}


export async function fetchKommoEvents(params: {
  accountDomain: string;
  accessToken: string;
  createdAtFrom?: string;
  entityType?: string;
  page?: number;
}): Promise<KommoEventDto[]> {
  validateKommoDomain(params.accountDomain);
  const url = new URL(`https://${params.accountDomain}/api/v4/events`);
  url.searchParams.set("limit", "250");
  if (params.page && params.page > 1) {
    url.searchParams.set("page", String(params.page));
  }
  if (params.entityType) {
    url.searchParams.set("filter[type]", params.entityType);
  }
  if (params.createdAtFrom) {
    const seconds = Math.floor(new Date(params.createdAtFrom).getTime() / 1000);
    if (Number.isFinite(seconds) && seconds > 0) {
      url.searchParams.set("filter[created_at][from]", String(seconds));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 204) return [];
  if (!response.ok) {
    throw new Error(`Kommo events fetch failed with ${response.status}`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const embedded = payload._embedded && typeof payload._embedded === "object"
    ? payload._embedded as Record<string, unknown>
    : null;
  const rows = Array.isArray(embedded?.events) ? embedded!.events as Array<Record<string, unknown>> : [];

  return rows.map((ev) => ({
    id: String(ev.id ?? ""),
    type: typeof ev.type === "string" ? ev.type : null,
    entityType: typeof ev.entity_type === "string" ? ev.entity_type : null,
    entityId: typeof ev.entity_id === "string" || typeof ev.entity_id === "number"
      ? String(ev.entity_id) : null,
    createdAt: typeof ev.created_at === "number" ? new Date(ev.created_at * 1000).toISOString() : null,
    createdBy: typeof ev.created_by === "string" || typeof ev.created_by === "number"
      ? String(ev.created_by) : null,
    valueAfter: ev.value_after ?? null,
    valueBefore: ev.value_before ?? null,
  }));
}
