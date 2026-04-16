export interface KommoLeadDto {
  id: string;
  pipeline?: string;
  status?: string;
  channel?: string;
  responsible?: string;
  procedureName?: string;
  valueAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  rawPayload?: unknown;
}

import { validateKommoDomain } from "./kommoValidation";

export async function fetchKommoLeads(_params: {
  accountDomain: string;
  accessToken: string;
  createdAtFrom?: string;
}): Promise<KommoLeadDto[]> {
  validateKommoDomain(_params.accountDomain);
  const url = new URL(`https://${_params.accountDomain}/api/v4/leads`);
  url.searchParams.set("limit", "250");
  if (_params.createdAtFrom) {
    const seconds = Math.floor(new Date(_params.createdAtFrom).getTime() / 1000);
    if (Number.isFinite(seconds) && seconds > 0) {
      url.searchParams.set("filter[created_at][from]", String(seconds));
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${_params.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Kommo leads fetch failed with ${response.status}`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const embedded = payload._embedded && typeof payload._embedded === "object"
    ? payload._embedded as Record<string, unknown>
    : null;
  const leads = embedded?._embedded ?? embedded;
  const rows = Array.isArray(embedded?.leads) ? embedded!.leads as Array<Record<string, unknown>> : [];
  const source = rows.length > 0 ? rows : (Array.isArray(leads) ? leads as Array<Record<string, unknown>> : []);

  return source.map((lead) => ({
    id: String(lead.id ?? ""),
    pipeline: typeof lead.pipeline_id === "string" || typeof lead.pipeline_id === "number" ? String(lead.pipeline_id) : undefined,
    status: typeof lead.status_id === "string" || typeof lead.status_id === "number" ? String(lead.status_id) : undefined,
    responsible: typeof lead.responsible_user_id === "string" || typeof lead.responsible_user_id === "number" ? String(lead.responsible_user_id) : undefined,
    procedureName: typeof lead.name === "string" ? lead.name : undefined,
    valueAmount: typeof lead.price === "number" ? lead.price : 0,
    createdAt: typeof lead.created_at === "number" ? new Date(lead.created_at * 1000).toISOString() : undefined,
    updatedAt: typeof lead.updated_at === "number" ? new Date(lead.updated_at * 1000).toISOString() : undefined,
    rawPayload: lead,
  }));
}
