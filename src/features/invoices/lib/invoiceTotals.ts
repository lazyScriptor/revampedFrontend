/**
 * One way to read an invoice's money, used by every screen.
 *
 * The API sends live figures for rentals still out:
 *  • `sub_total`    the rental for the days so far (days out × rate, by the line's pricing)
 *  • `total_amount` what the customer owes for so far
 * Late fees (days past a set due date) are the only thing between the two besides transport and
 * discount. `billed_total_amount` / `billed_sub_total` are the parts already billed.
 */
const round = (n: number) => Math.round(n * 100) / 100;

export interface InvoiceTotals {
  subTotal: number;
  transport: number;
  discount: number;
  /** Days kept past a set due date (billed or still running). */
  lateFees: number;
  /** Already billed (excludes the running charges of machines still out). */
  billed: number;
  total: number;
}

export function invoiceTotals(inv: any): InvoiceTotals {
  const subTotal = Number(inv?.sub_total) || 0;
  const transport = Number(inv?.transport_fee) || 0;
  const discount = Number(inv?.discount_amount) || 0;
  const total = Number(inv?.total_amount) || 0;
  const billed = inv?.billed_total_amount !== undefined ? Number(inv.billed_total_amount) || 0 : round(total - (Number(inv?.accrued_charges) || 0));
  return {
    subTotal,
    transport,
    discount,
    lateFees: Math.max(0, round(total - (subTotal + transport - discount))),
    billed,
    total,
  };
}

/** A line's value so far: billed amount plus its running charge. */
export const lineValueSoFar = (line: any) => round((Number(line?.line_total_amount) || 0) + (Number(line?.accrued_charge) || 0));
