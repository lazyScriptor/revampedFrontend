/**
 * One way to read an invoice's money, used by every screen.
 *
 * The API sends live figures for rentals still out:
 *  • `sub_total`    the rental for the days so far (days out × rate, by the line's pricing)
 *  • `total_amount` what the customer owes for so far
 * Late fees (days past a set due date) are the only thing between the two besides transport and
 * discount. `billed_total_amount` / `billed_sub_total` are the parts already billed.
 */
import { normalizeSaleLines } from "@/features/retail/api/pos.api";

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
  /** Mixed bills only: the rent part and the goods part of `subTotal`, before transport and discount. */
  mixed: boolean;
  rent: number;
  items: number;
  /** R5: value of sold items taken back so far (the totals above are already reduced by it). */
  returned: number;
}

export function invoiceTotals(inv: any): InvoiceTotals {
  const rawSub = Number(inv?.sub_total) || 0;
  const saleTotal = Number(inv?.sale_total) || 0;
  const transport = Number(inv?.transport_fee) || 0;
  const discount = Number(inv?.discount_amount) || 0;
  const total = Number(inv?.total_amount) || 0;
  const returned = Math.max(0, Number(inv?.returned_total) || 0);
  const kind = inv?.bill_kind;
  const mixed = kind === "mixed";
  const saleOnly = kind === "sale" || (!mixed && rawSub === 0 && saleTotal > 0);

  // What the server stores (R3–R5):
  //  • sub_total: rent + goods before the bill discount and before any return (sale and mixed bills)
  //  • a sale line's line_total: after its own line discount, BEFORE its share of the bill discount
  //  • sale_total and total_amount: after the bill discount and after returns
  // So goods before the bill discount = Σ line_total, and returns are shown as their own row.
  const lines = mixed ? normalizeSaleLines(inv).filter((l) => l.status !== "voided") : [];
  const itemsGross = mixed ? round(lines.length > 0 ? lines.reduce((sum, l) => sum + l.line_total, 0) : saleTotal + returned) : 0;
  const subTotal = saleOnly ? rawSub || round(saleTotal + returned + discount) : rawSub;

  const billed = inv?.billed_total_amount !== undefined ? Number(inv.billed_total_amount) || 0 : round(total - (Number(inv?.accrued_charges) || 0));
  return {
    subTotal,
    transport,
    discount,
    // returns lower the total; add them back so they never hide (or fake) late fees
    lateFees: Math.max(0, round(total + returned - (subTotal + transport - discount))),
    billed,
    total,
    mixed,
    rent: mixed ? Math.max(0, round(subTotal - itemsGross)) : subTotal,
    items: itemsGross,
    returned,
  };
}

/** A line's value so far: billed amount plus its running charge. */
export const lineValueSoFar = (line: any) => round((Number(line?.line_total_amount) || 0) + (Number(line?.accrued_charge) || 0));
