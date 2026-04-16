import { validateKommoDomain } from "./kommoValidation";
export interface KommoContactDto {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  responsibleUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  rawPayload?: unknown;
}


export async function fetchKommoContacts(params: {
  accountDomain: string;
  accessToken: string;
  updatedAtFrom?: string;
  page?: number;
}): Promise<KommoContactDto[]> {
  validateKommoDomain(params.accountDomain);
  const url = new URL(`https://${params.accountDomain}/api/v4/contacts`);
  url.searchParams.set("limit", "250");
  if (params.page && params.page > 1) {
    url.searchParams.set("page", String(params.page));
  }
  if (params.updatedAtFrom) {
    const seconds = Math.floor(new Date(params.updatedAtFrom).getTime() / 1000);
    if (Number.isFinite(seconds) && seconds > 0) {
      url.searchParams.set("filter[updated_at][from]", String(seconds));
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
    throw new Error(`Kommo contacts fetch failed with ${response.status}`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const embedded = payload._embedded && typeof payload._embedded === "object"
    ? payload._embedded as Record<string, unknown>
    : null;
  const rows = Array.isArray(embedded?.contacts) ? embedded!.contacts as Array<Record<string, unknown>> : [];

  return rows.map((c) => {
    const customFields = Array.isArray(c.custom_fields_values) ? c.custom_fields_values as Array<Record<string, unknown>> : [];
    const phoneField = customFields.find((f) => f.field_code === "PHONE");
    const emailField = customFields.find((f) => f.field_code === "EMAIL");
    const phoneValues = Array.isArray(phoneField?.values) ? phoneField!.values as Array<Record<string, unknown>> : [];
    const emailValues = Array.isArray(emailField?.values) ? emailField!.values as Array<Record<string, unknown>> : [];

    return {
      id: String(c.id ?? ""),
      name: typeof c.name === "string" ? c.name : null,
      firstName: typeof c.first_name === "string" ? c.first_name : null,
      lastName: typeof c.last_name === "string" ? c.last_name : null,
      phone: typeof phoneValues[0]?.value === "string" ? phoneValues[0].value : null,
      email: typeof emailValues[0]?.value === "string" ? emailValues[0].value : null,
      responsibleUserId: typeof c.responsible_user_id === "string" || typeof c.responsible_user_id === "number"
        ? String(c.responsible_user_id) : null,
      createdAt: typeof c.created_at === "number" ? new Date(c.created_at * 1000).toISOString() : null,
      updatedAt: typeof c.updated_at === "number" ? new Date(c.updated_at * 1000).toISOString() : null,
      rawPayload: c,
    };
  });
}
