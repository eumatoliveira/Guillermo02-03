import { validateKommoDomain } from "./kommoValidation";
export interface KommoNoteDto {
  id: string;
  entityType: string;
  entityId: string;
  noteType?: string | null;
  text?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}


export async function fetchKommoNotes(params: {
  accountDomain: string;
  accessToken: string;
  entityType: "leads" | "contacts" | "companies";
  entityId?: string;
  page?: number;
}): Promise<KommoNoteDto[]> {
  validateKommoDomain(params.accountDomain);
  const basePath = params.entityId
    ? `/api/v4/${params.entityType}/${params.entityId}/notes`
    : `/api/v4/${params.entityType}/notes`;

  const url = new URL(`https://${params.accountDomain}${basePath}`);
  url.searchParams.set("limit", "250");
  if (params.page && params.page > 1) {
    url.searchParams.set("page", String(params.page));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 204) return [];
  if (!response.ok) {
    throw new Error(`Kommo notes fetch failed with ${response.status} for ${params.entityType}`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const embedded = payload._embedded && typeof payload._embedded === "object"
    ? payload._embedded as Record<string, unknown>
    : null;
  const rows = Array.isArray(embedded?.notes) ? embedded!.notes as Array<Record<string, unknown>> : [];

  return rows.map((n) => ({
    id: String(n.id ?? ""),
    entityType: params.entityType,
    entityId: typeof n.entity_id === "string" || typeof n.entity_id === "number"
      ? String(n.entity_id) : (params.entityId ?? ""),
    noteType: typeof n.note_type === "string" ? n.note_type : null,
    text: typeof n.params === "object" && n.params !== null && typeof (n.params as Record<string, unknown>).text === "string"
      ? (n.params as Record<string, unknown>).text as string : null,
    createdBy: typeof n.created_by === "string" || typeof n.created_by === "number"
      ? String(n.created_by) : null,
    createdAt: typeof n.created_at === "number" ? new Date(n.created_at * 1000).toISOString() : null,
    updatedAt: typeof n.updated_at === "number" ? new Date(n.updated_at * 1000).toISOString() : null,
  }));
}
