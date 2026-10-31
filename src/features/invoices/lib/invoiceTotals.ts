/**
 * One way to read an invoice's money, used by every screen.
 *
 * The API sends `total_amount` as what the customer owes for so far: the billed total plus
 * `accrued_charges` (extra / late days running on machines still out). `billed_total_amount` is the
 * part already billed. Lines carry their own running `accrued_charge`.
 */
const round = (n: number) => Math.round(n * 100) / 100;

export interface InvoiceTotals {
  subTotal: number;
  transport: number;
  discount: number;
  /** Extra / late days already billed at a handover. */
  billedExtra: number;
  /** Extra / late days so far on machines still out (not billed yet). */
  soFar: number;
  billed: number;
  total: number;
}

export function invoiceTotals(inv: any): InvoiceTotals {
  const subTotal = Number(inv?.sub_total) || 0;
  const transport = Number(inv?.transport_fee) || 0;
  const discount = Number(inv?.discount_amount) || 0;
  const total = Number(inv?.total_amount) || 0;
  const soFar = Number(inv?.accrued_charges) || 0;
  const billed = inv?.billed_total_amount !== undefined ? Number(inv.billed_total_amount) || 0 : round(total - soFar);
  return {
    subTotal,
    transport,
    discount,
    billedExtra: Math.max(0, round(billed - (subTotal + transport - discount))),
    soFar,
    billed,
    total,
  };
}

/** A line's value so far: billed amount plus its running charge. */
export const lineValueSoFar = (line: any) => round((Number(line?.line_total_amount) || 0) + (Number(line?.accrued_charge) || 0));
