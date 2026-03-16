export function decodeDashboardText(value: string): string {
  if (!/[Ãâ�]/.test(value)) {
    return value;
  }

  try {
    return new TextDecoder("utf-8").decode(Uint8Array.from(value, (char) => char.charCodeAt(0)));
  } catch {
    return value;
  }
}
