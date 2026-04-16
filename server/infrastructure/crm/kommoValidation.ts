/** Domínios válidos para contas Kommo — whitelist explícita contra SSRF */
const KOMMO_DOMAIN_RE = /^[a-zA-Z0-9-]+\.(kommo\.com|amocrm\.ru)$/;

export function validateKommoDomain(domain: string): void {
  if (!KOMMO_DOMAIN_RE.test(domain)) {
    throw new Error(
      `Invalid Kommo account domain: "${domain}". Must match *.kommo.com or *.amocrm.ru`,
    );
  }
}
