import { tk } from "@/i18n/marker";

// "PendingPayment" is the stored value for "every item is back but the invoice is still open"
// (refund, discount or balance pending). Staff close it with "Complete invoice".
export const invoiceStatusLabel = (status?: string | null) =>
  status === "Completed"
    ? tk("invoices.status.completed")
    : status === "PendingPayment"
      ? tk("invoices.status.awaitingClose")
      : tk("invoices.status.active");

export const invoiceStatusColor = (status?: string | null): "success" | "info" | "warning" =>
  status === "Completed" ? "success" : status === "PendingPayment" ? "info" : "warning";

/** Units still with the customer across all lines. */
export const unitsOut = (lines: any[] = []) =>
  lines.reduce(
    (s, l) => s + Math.max(0, Number(l.borrow_quantity || 0) - Number(l.good_returned_qty || 0) - Number(l.defective_returned_qty || 0)),
    0,
  );

export type MoneyState = "owes" | "refund" | "settled";
/** Signed: positive = customer owes us, negative = we owe the customer. */
export const moneyState = (total: number, paid: number): { state: MoneyState; amount: number } => {
  const diff = Math.round((Number(total) - Number(paid)) * 100) / 100;
  if (diff > 0.005) return { state: "owes", amount: diff };
  if (diff < -0.005) return { state: "refund", amount: -diff };
  return { state: "settled", amount: 0 };
};
