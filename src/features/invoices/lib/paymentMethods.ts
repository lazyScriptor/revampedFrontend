import { tk } from "@/i18n/marker";

// How money was taken. Only "Cash" goes into the shop drawer (the cash locker counts it).
export const PAYMENT_METHODS = ["Cash", "Card", "Transfer", "Cheque"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  Cash: tk("invoices.FinancialPanel.method.Cash"),
  Card: tk("invoices.FinancialPanel.method.Card"),
  Transfer: tk("invoices.FinancialPanel.method.Transfer"),
  Cheque: tk("invoices.FinancialPanel.method.Cheque"),
};

export const isCashMethod = (method: unknown) => String(method ?? "").trim().toLowerCase() === "cash";
