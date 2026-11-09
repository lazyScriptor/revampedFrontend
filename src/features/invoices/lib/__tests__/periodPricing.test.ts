// Period pricing (mirrors backend tests/unit/period-pricing.test.js): the base price pays for the whole
// minimum period (scaffolding: Rs. 250 for up to 5 days); each day after costs the extra daily rate.
import { describe, expect, it } from "vitest";
import { analyseLine, chargeableLateDays, periodCharge } from "../lineCost";
import { calculateLineMath, type CartItem } from "../../components/PosLedgerPanel";
import { calcDaysLate, calcLateFee } from "../../components/ReturnSettlementDialog";

const OUT = "2026-11-09";
const scaffold = {
  line_status: "Active",
  borrow_quantity: 2,
  good_returned_qty: 0,
  defective_returned_qty: 0,
  borrow_date: OUT,
  expected_return_date: OUT,
  track_overdue: false,
  locked_base_price: 250,
  locked_minimum_days: 5,
  locked_extra_daily_rate: 50,
  line_total_amount: "500",
};

describe("periodCharge", () => {
  it("1-day machine: unchanged", () => {
    expect(periodCharge({ base: 300, minDays: 1, rate: 300, days: 1, qty: 1 })).toBe(300);
    expect(periodCharge({ base: 300, minDays: 1, rate: 300, days: 3, qty: 2 })).toBe(1800);
  });

  it("5-day scaffold × 2 on day 1, 5 and 7", () => {
    const p = { base: 250, minDays: 5, rate: 50, qty: 2 };
    expect(periodCharge({ ...p, days: 1 })).toBe(500);
    expect(periodCharge({ ...p, days: 5 })).toBe(500);
    expect(periodCharge({ ...p, days: 7 })).toBe(700);
  });
});

describe("POS line preview", () => {
  const cart = (expected: string): CartItem =>
    ({
      cart_id: "c1",
      equipment_id: 46,
      equipment_name: "Scaffolding ( 3 * 5 )",
      is_bulk_item: true,
      available_qty: 20,
      borrow_quantity: 2,
      borrow_date: OUT,
      expected_return_date: expected,
      locked_base_price: 250,
      locked_minimum_days: 5,
      locked_extra_daily_rate: 50,
      pricing_mode: "tiered",
      track_overdue: expected !== OUT,
    }) as CartItem;

  it("same as the server: 500 for up to 5 days, 700 for 7", () => {
    expect(calculateLineMath(cart(OUT)).lineCost).toBe(500);
    expect(calculateLineMath(cart("2026-11-14")).lineCost).toBe(500);
    expect(calculateLineMath(cart("2026-11-16")).lineCost).toBe(700);
  });
});

describe("today's value while still out (inspection view)", () => {
  it("rented today: Rs. 500, nothing extra inside the period", () => {
    expect(analyseLine(scaffold, OUT).costToday).toBe(500);
    expect(analyseLine(scaffold, "2026-11-13").costToday).toBe(500); // day 5 by calendar
    expect(analyseLine(scaffold, "2026-11-15").costToday).toBe(600); // 6 days out → 1 extra × 50 × 2
  });

  it("uses the server's running charge when it is sent", () => {
    const r = analyseLine({ ...scaffold, accrued_charge: "200", accrued_days: 2, days_out: 7 }, "2026-11-15");
    expect(r.costToday).toBe(700);
  });

  it("partial return: only units still out run on", () => {
    const r = analyseLine({ ...scaffold, good_returned_qty: 1, line_total_amount: "600" }, "2026-11-15");
    expect(r.pending).toBe(1);
    expect(r.costToday).toBe(600 + 50);
  });
});

describe("a due date inside the paid period is not a late fee", () => {
  const tracked = { ...scaffold, track_overdue: true, expected_return_date: "2026-11-10" };

  it("chargeableLateDays", () => {
    expect(chargeableLateDays(OUT, "2026-11-10", "2026-11-11", 5)).toBe(0);
    expect(chargeableLateDays(OUT, "2026-11-10", "2026-11-16", 5)).toBe(2);
    expect(chargeableLateDays(OUT, "2026-11-10", "2026-11-12", 1)).toBe(2); // 1-day machine: plain days late
  });

  it("inspection view: still shows the due-date reminder, but charges nothing until the period ends", () => {
    const day3 = analyseLine(tracked, "2026-11-11");
    expect(day3.isOverdue).toBe(true);
    expect(day3.lateFee).toBe(0);
    expect(day3.costToday).toBe(500);
    expect(analyseLine(tracked, "2026-11-16").lateFee).toBe(2 * 50 * 2);
  });

  it("return dialog: day 3 is free, 2 days past the period cost 2 × 50 × 2", () => {
    const line = {
      track_overdue: true,
      expected_return: "2026-11-10",
      borrow_date: OUT,
      min_days: 5,
      open_ended: false,
      locked_extra_rate: 50,
      good_qty: 2,
      defective_qty: 0,
    } as any;
    expect(calcDaysLate(line, "2026-11-11")).toBe(0);
    expect(calcLateFee(line, "2026-11-16")).toBe(200);
    // 1-day machine unchanged: due 10th, back 12th = 2 days late
    expect(calcDaysLate({ ...line, min_days: 1 }, "2026-11-12")).toBe(2);
  });
});
