/**
 * Money for a bill with machines AND hardware on it (retail plan D13, §5.3).
 *
 * One bill, one balance: Rent + Items + Transport − Discount = Total. The same rows are used at the
 * counter (before the bill exists) and on a saved bill (read from the API), so the two always agree.
 */
const round = (n: number) => Math.round(n * 100) / 100;

export interface MixedCartTotals {
  rent: number;
  items: number;
  transport: number;
  discount: number;
  total: number;
}

export function mixedCartTotals(
  rentSubtotal: number,
  itemsSubtotal: number,
  fees: { transport?: number; discount?: number },
): MixedCartTotals {
  const transport = Number(fees.transport) || 0;
  const discount = Number(fees.discount) || 0;
  return {
    rent: round(rentSubtotal),
    items: round(itemsSubtotal),
    transport,
    discount,
    total: Math.max(0, round(rentSubtotal + itemsSubtotal + transport - discount)),
  };
}

/** The payment box starts at the goods; the cashier adds the rental deposit on top (D13). */
export const suggestedMixedPayment = (itemsSubtotal: number): number => Math.max(0, round(itemsSubtotal));

/** True when a saved bill carries both machines and goods. */
export const isMixedBill = (inv: any): boolean => inv?.bill_kind === "mixed";
