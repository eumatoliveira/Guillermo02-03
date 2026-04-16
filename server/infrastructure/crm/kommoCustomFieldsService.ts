import { validateKommoDomain } from "./kommoValidation";
export interface KommoCustomFieldDto {
  id: string;
  name?: string | null;
  code?: string | null;
  fieldType?: string | null;
  entityType: string;
  enums?: Array<{ id: string; value: string }> | null;
}


export async function fetchKommoCustomFields(params: {
  accountDomain: string;
  accessToken: string;
  entityType: "leads" | "contacts" | "companies";
}): Promise<KommoCustomFieldDto[]> {
  validateKommoDomain(params.accountDomain);
  const url = new URL(`https://${params.accountDomain}/api/v4/${params.entityType}/custom_fields`);
  url.searchParams.set("limit", "250");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 204) return [];
  if (!response.ok) {
    throw new Error(`Kommo custom_fields fetch failed with ${response.status} for ${params.entityType}`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const embedded = payload._embedded && typeof payload._embedded === "object"
    ? payload._embedded as Record<string, unknown>
    : null;
  const rows = Array.isArray(embedded?.custom_fields)
    ? embedded!.custom_fields as Array<Record<string, unknown>>
    : [];

  return rows.map((cf) => {
    const enumsRaw = Array.isArray(cf.enums) ? cf.enums as Array<Record<string, unknown>> : null;
    return {
      id: String(cf.id ?? ""),
      name: typeof cf.name === "string" ? cf.name : null,
      code: typeof cf.code === "string" ? cf.code : null,
      fieldType: typeof cf.field_type === "string" ? cf.field_type : null,
      entityType: params.entityType,
      enums: enumsRaw
        ? enumsRaw.map((e) => ({ id: String(e.id ?? ""), value: String(e.value ?? "") }))
        : null,
    };
  });
}
