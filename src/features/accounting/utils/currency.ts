import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Get the currency code from tenant config.
 * Falls back to 'LKR' if not configured.
 */
export function useCurrencyCode(): string {
  const configData = useAuthStore((s) => s.user?.configData);
  return (configData as any)?.currency_code || "LKR";
}

/** Map currency codes to their display symbols */
const CURRENCY_SYMBOLS: Record<string, string> = {
  LKR: "Rs.",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  SGD: "S$",
  AED: "AED",
};

/**
 * Format a numeric amount with the given currency symbol.
 * Uses tabular number formatting for alignment in tables.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currencyCode = "LKR"
): string {
  const num = Number(amount || 0);
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  return `${symbol} ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Hook version — returns a formatter bound to the tenant's currency.
 */
export function useCurrencyFormatter() {
  const code = useCurrencyCode();
  return {
    currencyCode: code,
    symbol: CURRENCY_SYMBOLS[code] || code,
    format: (amount: number | string | null | undefined) =>
      formatCurrency(amount, code),
  };
}
