import { formatLocalDate, todayLocalStr } from "@/lib/dates";

/**
 * "Where does this rental line stand today?" — one place for cost-today and overdue.
 *
 * Billing rules (mirrors backend `processReturn`):
 *  • The line's price is locked at dispatch (`line_total_amount`).
 *  • Late fees exist ONLY when the line's return date is tracked (`track_overdue`) and the machine
 *    comes back AFTER `expected_return_date`: fee = days late × extra daily rate × units returned.
 *  • A line dispatched with NO return date is "open-ended": it was priced for 1 day, but it is billed
 *    for the days it is really out. Every day beyond what the locked price covers adds the extra daily
 *    rate per unit. That is a charge for days out, not "overdue", so it never raises the overdue alarm.
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

/** Dispatched without a return date: untracked and due on the out date (a waived line keeps its real due date). */
export const isOpenEnded = (line: { track_overdue?: unknown; borrow_date?: unknown; expected_return_date?: unknown }): boolean => {
  const out = toYmd(line.borrow_date);
  return !isTracked(line.track_overdue) && !!out && out === toYmd(line.expected_return_date);
};

/**
 * The moment a line went out: the bill's time of day, on the line's out date.
 * Null when the bill's time is unknown (then day counts fall back to calendar dates).
 */
export const lineOutAt = (line: { borrow_date?: unknown }, issuedAt?: string | Date | null): Date | null => {
  if (!issuedAt) return null;
  const issued = issuedAt instanceof Date ? issuedAt : new Date(issuedAt);
  if (Number.isNaN(issued.getTime())) return null;
  const day = toYmd(line.borrow_date);
  if (!day || formatLocalDate(issued) === day) return issued;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, issued.getHours(), issued.getMinutes(), issued.getSeconds());
};

/** Rental days are elapsed time rounded up: past 24 hours is the next day (29 hours = 2 days), minimum 1. */
export const elapsedDays = (outAt: Date, to: Date): number => {
  const ms = to.getTime() - outAt.getTime();
  return Number.isFinite(ms) ? Math.max(1, Math.ceil(ms / DAY)) : 1;
};

/** Days out for billing: out date to `to`, never less than 1 (a same-day return is a day). */
export const billableDaysOut = (outDate: string, to: string): number => Math.max(1, daysBetween(outDate, to));

/** Days charged beyond what the locked price already covers, for an open-ended line. */
export const openEndedExtraDays = (outDate: string, to: string, minimumDays: number): number =>
  Math.max(0, billableDaysOut(outDate, to) - Math.max(1, minimumDays || 1));

/** Optional exact moments, so days are counted by elapsed time instead of calendar dates. */
export interface LineClock {
  /** When the bill was written (the time machines went out). */
  issuedAt?: string | Date | null;
  /** The current moment for lines still out (defaults to now). */
  now?: Date;
  /** When the line's last handover happened, with its time. */
  backAt?: string | null;
}

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
  /** Open-ended line: days it has been out so far (active) or was out (returned). */
  openEnded: boolean;
  /** Days charged beyond the locked price (open-ended lines only). */
  extraDays: number;
  /** Whole days the machine has been out / was out, at least 1. */
  daysOut: number;
  /** Days actually billed: the days the locked price covers plus any extra / late days. */
  billedDays: number;
  lockedCost: number;
  lateFee: number;
  costToday: number;
}

export function analyseLine(line: any, today: string = todayLocalStr(), clock: LineClock = {}): LineToday {
  const isActive = (line.line_status ?? line.status) === "Active";
  const qty = Number(line.borrow_quantity) || 0;
  const returned = (Number(line.good_returned_qty) || 0) + (Number(line.defective_returned_qty) || 0);
  const pending = Math.max(0, qty - returned);
  const tracked = isTracked(line.track_overdue);
  const dueDate = tracked ? toYmd(line.expected_return_date) : "";
  const daysLate = isActive && tracked && dueDate ? Math.max(0, daysBetween(dueDate, today)) : 0;
  const lockedCost = Number(line.line_total_amount) || 0;
  const outDate = toYmd(line.borrow_date);
  const openEnded = isOpenEnded(line);
  const minDays = Number(line.locked_minimum_days) || 1;
  const rate = Number(line.locked_extra_daily_rate) || 0;
  const outAt = lineOutAt(line, clock.issuedAt);
  const backYmd = toYmd(line.actual_return_date);
  const backMoment = !isActive && clock.backAt && /T|\d:\d/.test(clock.backAt) ? new Date(clock.backAt) : null;
  const endMoment = isActive ? clock.now ?? new Date() : backMoment;
  // Elapsed time when both moments are known, calendar dates otherwise.
  const timed = openEnded && !!outAt && !!endMoment && !Number.isNaN(endMoment.getTime());
  const elapsedOut = timed ? elapsedDays(outAt as Date, endMoment as Date) : 0;
  const extraDays = openEnded && isActive ? (timed ? Math.max(0, elapsedOut - Math.max(1, minDays)) : openEndedExtraDays(outDate, today, minDays)) : 0;
  const lateFee = (openEnded ? extraDays : daysLate) * rate * pending;

  const endDay = !isActive && backYmd ? backYmd : today;
  const daysOut = timed ? elapsedOut : outDate ? billableDaysOut(outDate, endDay) : 1;
  const contractDays = toYmd(line.expected_return_date) && outDate ? Math.max(1, daysBetween(outDate, toYmd(line.expected_return_date))) : 1;
  // Settled lines: read the billed days back from the amount actually charged, so a line that was
  // closed before extra days were billed shows "billed 1" next to "2 days out" instead of looking right.
  const basePrice = Number(line.locked_base_price) || 0;
  const perUnit = qty > 0 ? lockedCost / qty : 0;
  const paidDays = rate > 0 && perUnit > basePrice ? minDays + Math.round((perUnit - basePrice) / rate) : Math.max(1, minDays);
  const billedDays = !isActive ? paidDays : openEnded ? daysOut : tracked ? Math.max(contractDays, daysOut) : contractDays;

  return {
    isActive,
    tracked,
    qty,
    returned,
    pending,
    outDate,
    dueDate,
    isOverdue: daysLate > 0,
    daysLate,
    openEnded,
    extraDays,
    daysOut,
    billedDays,
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

export function summariseInvoice(
  rawLines: any[],
  today: string = todayLocalStr(),
  clock: Omit<LineClock, "backAt"> & { backAtFor?: (line: any) => string | null } = {},
): InvoiceToday {
  const lines = rawLines.map((l) => analyseLine(l, today, { issuedAt: clock.issuedAt, now: clock.now, backAt: clock.backAtFor?.(l) ?? null }));
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
