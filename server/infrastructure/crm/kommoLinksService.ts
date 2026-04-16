import { validateKommoDomain } from "./kommoValidation";
export interface KommoLinkDto {
  toEntityType: string;
  toEntityId: string;
  metadata?: unknown;
}


export async function fetchKommoLinks(params: {
  accountDomain: string;
  accessToken: string;
  entityType: "leads" | "contacts" | "companies";
  entityId: string;
}): Promise<KommoLinkDto[]> {
  validateKommoDomain(params.accountDomain);
  const url = new URL(
    `https://${params.accountDomain}/api/v4/${params.entityType}/${params.entityId}/links`
  );

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 204) return [];
  if (!response.ok) {
    throw new Error(
      `Kommo links fetch failed with ${response.status} for ${params.entityType}/${params.entityId}`
    );
  }

  const payload = await response.json() as Record<string, unknown>;
  const embedded = payload._embedded && typeof payload._embedded === "object"
    ? payload._embedded as Record<string, unknown>
    : null;
  const rows = Array.isArray(embedded?.links) ? embedded!.links as Array<Record<string, unknown>> : [];

  return rows.map((lnk) => ({
    toEntityType: typeof lnk.to_entity_type === "string" ? lnk.to_entity_type : "",
    toEntityId: typeof lnk.to_entity_id === "string" || typeof lnk.to_entity_id === "number"
      ? String(lnk.to_entity_id) : "",
    metadata: lnk.metadata ?? null,
  }));
}
