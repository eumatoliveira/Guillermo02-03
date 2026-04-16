import { validateKommoDomain } from "./kommoValidation";
export interface KommoTaskDto {
  id: string;
  taskTypeId?: string | null;
  text?: string | null;
  completeTill?: string | null;
  isCompleted?: boolean | null;
  responsibleUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}


export async function fetchKommoTasks(params: {
  accountDomain: string;
  accessToken: string;
  filter?: "complete" | "incomplete";
  page?: number;
}): Promise<KommoTaskDto[]> {
  validateKommoDomain(params.accountDomain);
  const url = new URL(`https://${params.accountDomain}/api/v4/tasks`);
  url.searchParams.set("limit", "250");
  if (params.page && params.page > 1) {
    url.searchParams.set("page", String(params.page));
  }
  if (params.filter) {
    url.searchParams.set("filter[is_completed]", params.filter === "complete" ? "1" : "0");
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 204) return [];
  if (!response.ok) {
    throw new Error(`Kommo tasks fetch failed with ${response.status}`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const embedded = payload._embedded && typeof payload._embedded === "object"
    ? payload._embedded as Record<string, unknown>
    : null;
  const rows = Array.isArray(embedded?.tasks) ? embedded!.tasks as Array<Record<string, unknown>> : [];

  return rows.map((t) => ({
    id: String(t.id ?? ""),
    taskTypeId: typeof t.task_type_id === "string" || typeof t.task_type_id === "number"
      ? String(t.task_type_id) : null,
    text: typeof t.text === "string" ? t.text : null,
    completeTill: typeof t.complete_till === "number" ? new Date(t.complete_till * 1000).toISOString() : null,
    isCompleted: typeof t.is_completed === "boolean" ? t.is_completed : null,
    responsibleUserId: typeof t.responsible_user_id === "string" || typeof t.responsible_user_id === "number"
      ? String(t.responsible_user_id) : null,
    entityType: typeof t.entity_type === "string" ? t.entity_type : null,
    entityId: typeof t.entity_id === "string" || typeof t.entity_id === "number"
      ? String(t.entity_id) : null,
    createdAt: typeof t.created_at === "number" ? new Date(t.created_at * 1000).toISOString() : null,
    updatedAt: typeof t.updated_at === "number" ? new Date(t.updated_at * 1000).toISOString() : null,
  }));
}
