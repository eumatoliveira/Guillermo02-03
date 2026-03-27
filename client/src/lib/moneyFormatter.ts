import { CURRENCY_LOCALE_MAP, type SupportedCurrency } from "@shared/currency";

// Currencies that display the symbol after the number (European convention)
const SYMBOL_AFTER_CURRENCIES = new Set<SupportedCurrency>(["EUR"]);

function getCurrencySymbolInfo(currency: SupportedCurrency): { symbol: string; symbolAfter: boolean } {
  const parts = new Intl.NumberFormat(CURRENCY_LOCALE_MAP[currency] ?? "pt-BR", {
    style: "currency",
    currency,
  }).formatToParts(1000);
  const symbol = parts.find(p => p.type === "currency")?.value ?? currency;
  return { symbol, symbolAfter: SYMBOL_AFTER_CURRENCIES.has(currency) };
}

export const MoneyFormatter = {
  format(value: number, currency: SupportedCurrency, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(CURRENCY_LOCALE_MAP[currency] ?? "pt-BR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  },
  formatCompact(value: number, currency: SupportedCurrency) {
    const abs = Math.abs(value);

    // For non-BRL currencies use manual formatting for consistent symbol placement
    if (currency !== "BRL") {
      const { symbol, symbolAfter } = getCurrencySymbolInfo(currency);
      const sign = value < 0 ? "-" : "";

      if (abs >= 1_000_000) {
        const divided = abs / 1_000_000;
        const numStr = divided % 1 === 0 ? divided.toFixed(0) : divided.toFixed(1);
        return symbolAfter ? `${sign}${numStr}M${symbol}` : `${sign}${symbol}${numStr}M`;
      }

      if (abs >= 1000) {
        const divided = abs / 1000;
        const numStr = divided % 1 === 0 ? divided.toFixed(0) : divided.toFixed(1);
        return symbolAfter ? `${sign}${numStr}K${symbol}` : `${sign}${symbol}${numStr}K`;
      }

      // Small values (< 1000)
      const numStr = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1);
      return symbolAfter ? `${sign}${numStr}${symbol}` : `${sign}${symbol}${numStr}`;
    }

    // BRL — formato manual com sufixo k/M para consistência com outras moedas
    const sign = value < 0 ? "-" : "";
    if (abs >= 1_000_000) {
      const divided = abs / 1_000_000;
      const numStr = divided % 1 === 0 ? divided.toFixed(0) : divided.toFixed(1);
      return `${sign}R$ ${numStr}M`;
    }
    if (abs >= 1000) {
      const divided = abs / 1000;
      const numStr = divided % 1 === 0 ? divided.toFixed(0) : divided.toFixed(1);
      return `${sign}R$ ${numStr}k`;
    }
    const numStr = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1);
    return `${sign}R$ ${numStr}`;
  },
};
