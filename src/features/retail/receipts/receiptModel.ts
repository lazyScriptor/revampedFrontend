import { normalizeSaleLines } from "../api/pos.api";

// The facts a printed bill needs, worked out once from a bill (or its print snapshot). Pure, so the
// receipt, the return slip and the tests all read money the same way.
//
// How the server keeps a bill with goods (R4/R5 backend):
//  • a sale line's `line_total` is qty × price less its own discount, BEFORE the bill discount
//  • `sub_total` holds the machines' rent plus the goods (both before the bill discount)
//  • `total_amount` = rent + goods + transport − discount − returned (+ late charges still running)
//  • a return lowers `total_amount` and `sale_total` by the returned value, never `line_total`

export type BillKind = "rental" | "sale" | "mixed";

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const rentalLinesOf = (invoice: any): any[] => {
  const raw = invoice?.InvoiceLines ?? invoice?.items ?? [];
  return Array.isArray(raw) ? raw : [];
};

/** rental, sale or mixed, from `bill_kind` when the bill has it, otherwise from what is on it. */
export const billKindOf = (invoice: any): BillKind => {
  const soldCount = normalizeSaleLines(invoice).length;
  const rentalCount = rentalLinesOf(invoice).length;
  if (invoice?.bill_kind === "sale" || (soldCount > 0 && rentalCount === 0)) return "sale";
  if (invoice?.bill_kind === "mixed" || (soldCount > 0 && rentalCount > 0)) return "mixed";
  return "rental";
};

export interface SoldReceiptLine {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  /** The line's own discount in rupees (not the bill discount). */
  lineDiscount: number;
  lineTotal: number;
  /** Returned so far, in the unit the line was sold in. */
  returnedQty: number;
  fullyReturned: boolean;
}

const roundQty = (n: number) => Math.round(n * 1000) / 1000;

/** The goods on a bill as a receipt lists them; voided lines are left out. */
export const soldLinesOf = (invoice: any): SoldReceiptLine[] =>
  normalizeSaleLines(invoice)
    .filter((l) => l.status !== "voided")
    .map((l, idx) => {
      const factor = l.unit_factor > 0 ? l.unit_factor : 1;
      const fully = l.status === "returned" || (l.returned_base_qty > 0 && l.returned_base_qty >= l.base_qty - 1e-9);
      return {
        id: `sale-${l.sale_line_id || idx}`,
        name: l.description,
        qty: l.qty,
        unit: l.unit_label,
        unitPrice: l.unit_price,
        lineDiscount: l.line_discount,
        lineTotal: l.line_total,
        returnedQty: l.returned_base_qty > 0 ? roundQty(l.returned_base_qty / factor) : 0,
        fullyReturned: fully,
      };
    });

export interface PaymentRow {
  amount: number;
  method: string;
  refund: boolean;
}

export interface SoldBillTotals {
  kind: BillKind;
  /** Machines' rent before the bill discount (mixed bills only). */
  rent: number;
  /** Goods before the bill discount and before returns. */
  items: number;
  transport: number;
  discount: number;
  /** Value of sold items taken back so far. */
  returned: number;
  /** Charges for machines kept past their date (mixed bills). */
  lateFees: number;
  total: number;
  /** Net of refunds. */
  paid: number;
  /** Cash handed over: paid plus the change given back, when the server reported change. */
  tendered: number;
  balance: number;
  changeDue: number;
  payments: PaymentRow[];
}

const paymentsOf = (invoice: any): any[] => {
  const raw = invoice?.Payments ?? invoice?.payments ?? [];
  return Array.isArray(raw) ? raw : [];
};

/** Rent · Items · Transport · Discount · Returned · Total · Paid · Balance of a sale or mixed bill. */
export function soldBillTotals(invoice: any): SoldBillTotals {
  const kind = billKindOf(invoice);
  const sold = soldLinesOf(invoice);
  const items = sold.length > 0 ? round2(sold.reduce((sum, l) => sum + l.lineTotal, 0)) : round2(num(invoice?.sale_total));
  const subTotal = num(invoice?.sub_total ?? invoice?.fees?.subtotal);
  const rent = kind === "mixed" ? Math.max(0, round2(subTotal - items)) : 0;
  const transport = num(invoice?.transport_fee ?? invoice?.fees?.transportFee ?? invoice?.fees?.transport);
  const discount = num(invoice?.discount_amount ?? invoice?.fees?.discountAmount ?? invoice?.fees?.discount);
  const lineReturned = normalizeSaleLines(invoice).reduce((sum, l) => sum + (l.returned_value ?? 0), 0);
  const returned = Math.max(0, round2(invoice?.returned_total != null ? num(invoice.returned_total) : lineReturned));
  const total = num(invoice?.total_amount ?? invoice?.fees?.grandTotal) || Math.max(0, round2(rent + items + transport - discount - returned));
  const lateFees = kind === "mixed" ? Math.max(0, round2(total - (rent + items + transport - discount - returned))) : 0;

  const rows = paymentsOf(invoice);
  const payments: PaymentRow[] = rows.map((p) => {
    const raw = num(p.payment_amount ?? p.amount);
    return { amount: Math.abs(raw), method: String(p.method ?? "Cash"), refund: raw < 0 };
  });
  const paid =
    rows.length > 0
      ? round2(rows.reduce((sum, p) => sum + num(p.payment_amount ?? p.amount), 0))
      : num(invoice?.fees?.totalPaid ?? invoice?.total_paid);
  const changeDue = Math.max(0, num(invoice?.change_due));
  const balance =
    invoice?.fees?.balanceDue !== undefined && rows.length === 0 ? Math.max(0, num(invoice.fees.balanceDue)) : Math.max(0, round2(total - paid));
  return { kind, rent, items, transport, discount, returned, lateFees, total, paid, tendered: round2(paid + changeDue), balance, changeDue, payments };
}

// ─── Return slips ──────────────────────────────────────────────────────────────────────

/** One return of sold items, as GET /api/invoices/:id/sale-returns sends it. */
export interface SaleReturnRow {
  return_id: number;
  returned_at: string | null;
  cashier: string | null;
  lines: { sale_line_id: number | null; description: string; qty: number; unit_label: string; condition: "good" | "damaged"; value: number }[];
  value: number;
  settlement: { mode: "refund" | "credit" | null; refunded: number; credited: number; method: string | null };
  reason: string | null;
  balance_after: number | null;
}

/** Reads one return from the API (or from a stored print snapshot), tolerating missing fields. */
export const normalizeSaleReturn = (raw: any): SaleReturnRow => {
  const s = raw?.settlement ?? {};
  const lines: any[] = Array.isArray(raw?.lines) ? raw.lines : [];
  const mapped = lines.map((l) => ({
    sale_line_id: l?.sale_line_id != null ? Number(l.sale_line_id) : null,
    description: String(l?.description ?? ""),
    qty: num(l?.qty),
    unit_label: String(l?.unit_label ?? l?.unit ?? ""),
    condition: (l?.condition === "damaged" ? "damaged" : "good") as "good" | "damaged",
    value: num(l?.value),
  }));
  const value = raw?.value != null ? num(raw.value) : round2(mapped.reduce((sum, l) => sum + l.value, 0));
  return {
    return_id: num(raw?.return_id ?? raw?.id),
    returned_at: raw?.returned_at ?? raw?.occurred_at ?? null,
    cashier: raw?.cashier ?? null,
    lines: mapped,
    value,
    settlement: {
      mode: s.mode === "credit" ? "credit" : s.mode === "refund" ? "refund" : null,
      refunded: num(s.refunded),
      credited: num(s.credited),
      method: s.method ?? null,
    },
    reason: raw?.reason ?? null,
    balance_after: raw?.balance_after != null ? num(raw.balance_after) : null,
  };
};

/** True when the money went back to the customer; false when it stayed on the bill as credit. */
export const returnWasRefunded = (r: SaleReturnRow): boolean => r.settlement.refunded > 0 || (r.settlement.mode === "refund" && r.settlement.credited <= 0);
