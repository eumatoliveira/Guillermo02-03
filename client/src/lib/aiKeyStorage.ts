export const AI_KEY_STORAGE_KEYS = {
  anthropic: "glx_anthropic_key",
  openai: "glx_openai_key",
} as const;

const ENC_PREFIX = "glx_enc::";
const PBKDF2_SALT = new TextEncoder().encode("glx-insights-salt-2026");
const PBKDF2_PASS = "glx-dashboard-secure-key-v1";

async function deriveKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PBKDF2_PASS),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: PBKDF2_SALT, iterations: 12000, hash: "SHA-256" },
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export async function encryptStoredApiKey(plain: string): Promise<string> {
  const key = await deriveKey("encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const buf = new Uint8Array(12 + enc.byteLength);
  buf.set(iv);
  buf.set(new Uint8Array(enc), 12);
  return ENC_PREFIX + btoa(Array.from(buf, (byte) => String.fromCharCode(byte)).join(""));
}

export async function decryptStoredApiKey(stored: string): Promise<string> {
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  try {
    const buf = Uint8Array.from(atob(stored.slice(ENC_PREFIX.length)), (char) => char.charCodeAt(0));
    const key = await deriveKey("decrypt");
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, key, buf.slice(12));
    return new TextDecoder().decode(dec);
  } catch {
    return "";
  }
}

export async function saveStoredApiKey(storageKey: string, plain: string) {
  if (typeof window === "undefined") return;
  const encrypted = await encryptStoredApiKey(plain);
  window.localStorage.setItem(storageKey, encrypted);
}

export async function loadStoredApiKey(storageKey: string): Promise<string> {
  if (typeof window === "undefined") return "";
  const stored = window.localStorage.getItem(storageKey) ?? "";
  if (!stored) return "";
  return decryptStoredApiKey(stored);
}

export function clearStoredApiKey(storageKey: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
}
