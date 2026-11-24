import type { InvoiceSaleLineRow } from "../api/pos.api";

// The maths and rules of returning sold items (plan §5.4, R5-backend). Everything here is pure so the
// overlay shows the same figures the server will work out. The server stays the authority: if it ever
// differs by a cent, its answer is what is saved.

export type ReturnCondition = "good" | "damaged";
export type SettlementMode = "refund" | "credit";

export const toCents = (n: unknown): number => Math.round((Number(n) || 0) * 100);
export const fromCents = (c: number): number => Math.round(c) / 100;
export const roundQty = (n: number): number => Math.round(n * 1000) / 1000;

type LineMoney = Pick<InvoiceSaleLineRow, "base_qty" | "returned_base_qty" | "line_total" | "bill_discount_share"> & {
  returned_value?: number | null;
};

/** What the customer paid for the whole line: after its own discount and its share of the bill discount. */
export const lineNetCents = (line: Pick<InvoiceSaleLineRow, "line_total" | "bill_discount_share">): number =>
  toCents(line.line_total) - toCents(line.bill_discount_share);

/** Base units that can still come back. */
export const returnableBase = (line: Pick<InvoiceSaleLineRow, "base_qty" | "returned_base_qty">): number =>
  Math.max(0, roundQty(Number(line.base_qty) - Number(line.returned_base_qty || 0)));

/**
 * The refunded value of returning `returnBaseQty` base units of a line, in cents.
 *  - a step that leaves some of the line: net × qty / base_qty, rounded to the cent
 *  - the step that brings the line to fully returned takes exactly the remainder, so a line
 *    returned in several steps refunds its net to the cent
 * The remainder uses the line's `returned_value` when the server sends it; otherwise it assumes the
 * earlier steps came to the proportional share (it can be a cent out after several partial steps).
 */
export function returnValueCents(line: LineMoney, returnBaseQty: number): number {
  const base = Number(line.base_qty);
  if (!(base > 0) || !(returnBaseQty > 0)) return 0;
  const net = lineNetCents(line);
  const remaining = returnableBase(line);
  const qty = Math.min(roundQty(returnBaseQty), remaining);
  if (qty <= 0) return 0;
  if (qty >= remaining) {
    const before = Number(line.returned_base_qty || 0);
    const prior = line.returned_value != null ? toCents(line.returned_value) : before > 0 ? Math.round((net * before) / base) : 0;
    return Math.max(0, net - prior);
  }
  return Math.round((net * qty) / base);
}

export interface UnitOption {
  /** The unit_id to send; null is the item's base unit. */
  unitId: number | null;
  label: string;
  factor: number;
}

/** A pack line can be returned in packs (as sold) or in single pieces; any other line only in its own unit. */
export function unitOptions(line: Pick<InvoiceSaleLineRow, "unit_id" | "unit_label" | "unit_factor" | "base_unit">): UnitOption[] {
  const factor = Number(line.unit_factor) > 0 ? Number(line.unit_factor) : 1;
  if (factor > 1) {
    return [
      { unitId: line.unit_id ?? null, label: line.unit_label, factor },
      { unitId: null, label: line.base_unit, factor: 1 },
    ];
  }
  return [{ unitId: null, label: line.unit_label, factor: 1 }];
}

/** The most that can be returned in a unit: whole packs for a pack unit. */
export const maxInUnit = (line: Pick<InvoiceSaleLineRow, "base_qty" | "returned_base_qty">, factor: number): number => {
  const left = returnableBase(line);
  return factor > 1 ? Math.floor(left / factor + 1e-9) : left;
};

/** True when quantities may have decimals (kg, metres): the line was sold or has left over in fractions. */
export const isDecimalLine = (line: Pick<InvoiceSaleLineRow, "base_qty" | "qty" | "returned_base_qty">): boolean =>
  !Number.isInteger(roundQty(Number(line.base_qty))) || !Number.isInteger(roundQty(Number(line.qty))) || !Number.isInteger(roundQty(Number(line.returned_base_qty || 0)));

export const isSerialLine = (line: Pick<InvoiceSaleLineRow, "serials">): boolean => (line.serials?.length ?? 0) > 0;

export interface ReturnRow {
  key: string;
  line: InvoiceSaleLineRow;
  qty: number;
  unit: UnitOption;
  condition: ReturnCondition;
  serial: string;
}

export const rowBaseQty = (row: Pick<ReturnRow, "qty" | "unit">): number => roundQty(row.qty * row.unit.factor);

export const rowValueCents = (row: ReturnRow): number => returnValueCents(row.line, rowBaseQty(row));

export interface ReturnSummary {
  items: number;
  valueCents: number;
}

export function summariseRows(rows: ReturnRow[]): ReturnSummary {
  const picked = rows.filter((r) => r.qty > 0);
  // Several serial rows of one line add up in base units before the last-step remainder is taken.
  const byLine = new Map<number, { line: InvoiceSaleLineRow; base: number }>();
  picked.forEach((r) => {
    const cur = byLine.get(r.line.sale_line_id) ?? { line: r.line, base: 0 };
    cur.base = roundQty(cur.base + rowBaseQty(r));
    byLine.set(r.line.sale_line_id, cur);
  });
  let valueCents = 0;
  byLine.forEach(({ line, base }) => (valueCents += returnValueCents(line, base)));
  return { items: byLine.size, valueCents };
}

// ── settlement ──────────────────────────────────────────────────────────────────────────

export interface SettlementRules {
  /** "Keep on bill" is not offered at all for the walk-in customer. */
  showCredit: boolean;
  /** On a Completed bill the return must be refunded in the same step (R5 DECISION). */
  creditDisabled: boolean;
  /** …and for exactly its value. */
  amountFixed: boolean;
}

export const isCompletedBill = (invoice: any): boolean => String(invoice?.status ?? "") === "Completed";
export const isWalkInBill = (invoice: any): boolean => Boolean(invoice?.Customer?.is_walk_in ?? invoice?.customer?.is_walk_in);

export function settlementRules(invoice: any): SettlementRules {
  const completed = isCompletedBill(invoice);
  return { showCredit: !isWalkInBill(invoice), creditDisabled: completed, amountFixed: completed };
}

/** What has been paid on the bill so far: payments minus refunds, voided ones left out. */
export function netPaidCents(invoice: any): number {
  const payments: any[] = invoice?.Payments ?? invoice?.payments ?? [];
  return payments.filter((p) => !p?.is_voided).reduce((sum, p) => sum + toCents(p?.payment_amount), 0);
}

/**
 * The most that can be refunded with this return: what was paid beyond the bill's new total, never
 * below 0. On a Completed bill (balance 0) that is exactly the returned value.
 */
export function refundCapCents(invoice: any, valueCents: number): number {
  const total = toCents(invoice?.total_amount);
  return Math.max(0, netPaidCents(invoice) - Math.max(0, total - valueCents));
}

// ── request ─────────────────────────────────────────────────────────────────────────────

export const RETURN_REASONS = ["wrongItem", "notNeeded", "damaged", "other"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export interface SaleReturnLineInput {
  sale_line_id: number;
  qty: number;
  unit_id?: number;
  condition: ReturnCondition;
  serial_no?: string;
}

export interface SaleReturnInput {
  lines: SaleReturnLineInput[];
  settlement: { mode: SettlementMode; amount?: number; method?: string };
  reason?: string;
  approval_tokens?: Record<string, string>;
}

export interface BuildPayloadArgs {
  rows: ReturnRow[];
  mode: SettlementMode;
  method: string;
  /** The amount the cashier typed, or null to leave it to the server (it defaults to the returned value). */
  amount: number | null;
  reason?: string | null;
  approvalToken?: string | null;
}

export function buildReturnPayload({ rows, mode, method, amount, reason, approvalToken }: BuildPayloadArgs): SaleReturnInput {
  const lines: SaleReturnLineInput[] = rows
    .filter((r) => r.qty > 0)
    .map((r) => {
      const out: SaleReturnLineInput = { sale_line_id: r.line.sale_line_id, qty: r.qty, condition: r.condition };
      if (r.unit.unitId != null) out.unit_id = r.unit.unitId;
      if (isSerialLine(r.line) && r.serial.trim()) out.serial_no = r.serial.trim();
      return out;
    });
  const settlement: SaleReturnInput["settlement"] = { mode };
  if (mode === "refund") {
    settlement.method = method;
    if (amount != null) settlement.amount = amount;
  }
  const payload: SaleReturnInput = { lines, settlement };
  if (reason && reason.trim()) payload.reason = reason.trim();
  if (approvalToken) payload.approval_tokens = { return_no_bill: approvalToken };
  return payload;
}

/** The returnable lines of a bill, in bill order (voided and fully returned lines left out). */
export const returnableLines = (lines: InvoiceSaleLineRow[]): InvoiceSaleLineRow[] =>
  lines.filter((l) => l.status !== "voided" && l.returnable_qty > 0);

/** Rows for the overlay: one per line, or one per sold serial for serial lines. */
export function buildRows(lines: InvoiceSaleLineRow[], focusLineId?: number | null): ReturnRow[] {
  const rows: ReturnRow[] = [];
  returnableLines(lines).forEach((line) => {
    const units = unitOptions(line);
    const focused = focusLineId != null && line.sale_line_id === focusLineId;
    if (isSerialLine(line)) {
      const serials = line.serials ?? [];
      serials.forEach((serial, i) => {
        rows.push({
          key: `${line.sale_line_id}:${i}`,
          line,
          qty: focused && i === 0 ? 1 : 0,
          unit: units[0],
          condition: "good",
          serial,
        });
      });
      return;
    }
    rows.push({
      key: String(line.sale_line_id),
      line,
      qty: focused ? Math.min(1, maxInUnit(line, units[0].factor)) : 0,
      unit: units[0],
      condition: "good",
      serial: "",
    });
  });
  return rows;
}

/** Most this row may take given the other rows of the same line (serial lines share one allowance). */
export function rowMax(rows: ReturnRow[], row: ReturnRow): number {
  if (isSerialLine(row.line)) {
    const others = rows
      .filter((r) => r !== row && r.line.sale_line_id === row.line.sale_line_id)
      .reduce((sum, r) => sum + rowBaseQty(r), 0);
    return Math.max(0, Math.min(1, roundQty(returnableBase(row.line) - others)));
  }
  return maxInUnit(row.line, row.unit.factor);
}

/** "Returned 1 of 3" for a line, in the unit it was sold in. */
export function returnedOfLabel(line: InvoiceSaleLineRow): { returned: number; of: number } | null {
  if (!(line.returned_base_qty > 0)) return null;
  const factor = line.unit_factor > 0 ? line.unit_factor : 1;
  return { returned: roundQty(line.returned_base_qty / factor), of: line.qty };
}

export const isFullyReturned = (line: InvoiceSaleLineRow): boolean => line.status === "returned" || (line.returned_base_qty > 0 && line.returnable_qty <= 0 && line.status !== "voided");

/** Plain words for the SALE_RETURN trace event. */
export function describeSaleReturnTrace(trace: any): { items: number; value: number; method: string | null; credit: boolean } | null {
  if (String(trace?.event_action ?? "") !== "SALE_RETURN") return null;
  let payload: any = trace?.state_payload ?? trace?.payload ?? {};
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  const lines: any[] = Array.isArray(payload.lines) ? payload.lines : [];
  const settlement = payload.settlement ?? {};
  const refunded = Number(settlement.refunded ?? settlement.amount ?? 0) || 0;
  const credited = Number(settlement.credited ?? 0) || 0;
  const value = Number(payload.value ?? payload.total_value ?? payload.refund_value ?? refunded + credited) || 0;
  const items = Number(payload.items ?? lines.length) || lines.length;
  return {
    items,
    value,
    method: refunded > 0 ? String(settlement.method ?? "") || null : null,
    credit: refunded <= 0,
  };
}
