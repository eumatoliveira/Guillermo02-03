import { validateKommoDomain } from "./kommoValidation";
export interface KommoUserDto {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  isActive?: boolean | null;
}


export async function fetchKommoUsers(params: {
  accountDomain: string;
  accessToken: string;
}): Promise<KommoUserDto[]> {
  validateKommoDomain(params.accountDomain);
  const url = new URL(`https://${params.accountDomain}/api/v4/users`);
  url.searchParams.set("limit", "250");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 204) return [];
  if (!response.ok) {
    throw new Error(`Kommo users fetch failed with ${response.status}`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const embedded = payload._embedded && typeof payload._embedded === "object"
    ? payload._embedded as Record<string, unknown>
    : null;
  const rows = Array.isArray(embedded?.users) ? embedded!.users as Array<Record<string, unknown>> : [];

  return rows.map((u) => ({
    id: String(u.id ?? ""),
    name: typeof u.name === "string" ? u.name : null,
    email: typeof u.email === "string" ? u.email : null,
    role: typeof u.role === "string" ? u.role : null,
    isActive: typeof u.is_active === "boolean" ? u.is_active : null,
  }));
}
