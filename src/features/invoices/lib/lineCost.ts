import { formatLocalDate, todayLocalStr } from "@/lib/dates";

/**
 * "Where does this rental line stand today?" — one place for cost-today and overdue.
 *
 * Billing rules (mirrors backend `processReturn`):
 *  • The line's price is locked at dispatch (`line_total_amount`).
 *  • Late fees exist ONLY when the line's return date is tracked (`track_overdue`) and the machine
 *    comes back AFTER `expected_return_date`: fee = days late × extra daily rate × units returned.
 *  • A line whose return date is not tracked never goes overdue and never accrues anything.
 */

const DAY = 86_400_000;

/** "2026-10-25" or "2026-10-25T00:00:00Z" → "2026-10-25" (date-only, timezone-safe). */
export const toYmd = (value: unknown): string => {
  if (!value) return "";
  const s = String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : formatLocalDate(d);
};

/** Whole days from `from` to `to` (both YYYY-MM-DD). Negative if `to` is earlier. */
export const daysBetween = (from: string, to: string): number => {
  const parse = (v: string) => {
    const [y, m, d] = v.split("-").map(Number);
    return Date.UTC(y, (m || 1) - 1, d || 1);
  };
  if (!from || !to) return 0;
  return Math.round((parse(to) - parse(from)) / DAY);
};

const isTracked = (v: unknown) => !(v === false || v === 0 || v === "0");

export interface LineToday {
  isActive: boolean;
  tracked: boolean;
  qty: number;
  returned: number;
  pending: number;
  outDate: string;
  dueDate: string;
  isOverdue: boolean;
  daysLate: number;
  lockedCost: number;
  lateFee: number;
  costToday: number;
}

export function analyseLine(line: any, today: string = todayLocalStr()): LineToday {
  const isActive = (line.line_status ?? line.status) === "Active";
  const qty = Number(line.borrow_quantity) || 0;
  const returned = (Number(line.good_returned_qty) || 0) + (Number(line.defective_returned_qty) || 0);
  const pending = Math.max(0, qty - returned);
  const tracked = isTracked(line.track_overdue);
  const dueDate = tracked ? toYmd(line.expected_return_date) : "";
  const daysLate = isActive && tracked && dueDate ? Math.max(0, daysBetween(dueDate, today)) : 0;
  const lockedCost = Number(line.line_total_amount) || 0;
  const lateFee = daysLate * (Number(line.locked_extra_daily_rate) || 0) * pending;

  return {
    isActive,
    tracked,
    qty,
    returned,
    pending,
    outDate: toYmd(line.borrow_date),
    dueDate,
    isOverdue: daysLate > 0,
    daysLate,
    lockedCost,
    lateFee,
    costToday: lockedCost + (isActive ? lateFee : 0),
  };
}

export interface InvoiceToday {
  lines: LineToday[];
  costToday: number;
  lateFeeToday: number;
  outCount: number;
  returnedCount: number;
  overdueCount: number;
  earliestOut: string;
}

export function summariseInvoice(rawLines: any[], today: string = todayLocalStr()): InvoiceToday {
  const lines = rawLines.map((l) => analyseLine(l, today));
  const outDates = lines.map((l) => l.outDate).filter(Boolean).sort();
  return {
    lines,
    costToday: lines.reduce((s, l) => s + l.costToday, 0),
    lateFeeToday: lines.reduce((s, l) => s + (l.isActive ? l.lateFee : 0), 0),
    outCount: lines.filter((l) => l.isActive).length,
    returnedCount: lines.filter((l) => !l.isActive).length,
    overdueCount: lines.filter((l) => l.isOverdue).length,
    earliestOut: outDates[0] || "",
  };
}
