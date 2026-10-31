import { describe, expect, it } from "vitest";
import { analyseLine, summariseInvoice, daysBetween, toYmd, elapsedDays } from "../lineCost";

const base = {
  line_status: "Active",
  borrow_quantity: 2,
  good_returned_qty: 0,
  defective_returned_qty: 0,
  borrow_date: "2026-10-20",
  expected_return_date: "2026-10-20", // POS default: same day as dispatch
  line_total_amount: "1000",
  locked_extra_daily_rate: 500,
};

describe("date helpers", () => {
  it("is timezone-safe", () => {
    expect(toYmd("2026-10-25T18:30:00.000Z")).toBe("2026-10-25");
    expect(daysBetween("2026-10-20", "2026-10-23")).toBe(3);
    expect(daysBetween("2026-10-23", "2026-10-20")).toBe(-3);
  });
});

describe("a line with no return date is billed for the days it is really out", () => {
  it("out for 5 days: not 'overdue', but 4 extra days are charged on top of the 1-day price", () => {
    const r = analyseLine({ ...base, track_overdue: false }, "2026-10-25");
    expect(r.openEnded).toBe(true);
    expect(r.isOverdue).toBe(false);
    expect(r.daysOut).toBe(5);
    expect(r.billedDays).toBe(5);
    expect(r.extraDays).toBe(4);
    expect(r.lateFee).toBe(4 * 500 * 2);
    expect(r.costToday).toBe(1000 + 4000);
    expect(r.dueDate).toBe("");
  });

  it("out for 2 days is billed 2 days, not 1 (the reported bug)", () => {
    const r = analyseLine({ ...base, track_overdue: false, borrow_quantity: 1, line_total_amount: "500" }, "2026-10-22");
    expect(r.daysOut).toBe(2);
    expect(r.costToday).toBe(500 + 500);
  });

  it("same-day and next-day returns stay at the 1-day price", () => {
    expect(analyseLine({ ...base, track_overdue: false }, "2026-10-20").costToday).toBe(1000);
    expect(analyseLine({ ...base, track_overdue: false }, "2026-10-21").costToday).toBe(1000);
  });

  it("days covered by a minimum-days package are free", () => {
    const r = analyseLine({ ...base, track_overdue: false, locked_minimum_days: 3 }, "2026-10-23");
    expect(r.extraDays).toBe(0);
    expect(r.costToday).toBe(1000);
  });

  it("a waived line keeps its real due date and is not open-ended", () => {
    const r = analyseLine({ ...base, track_overdue: false, expected_return_date: "2026-10-23" }, "2026-10-30");
    expect(r.openEnded).toBe(false);
    expect(r.costToday).toBe(1000);
  });

  it("treats 0 / '0' from MySQL as untracked too", () => {
    expect(analyseLine({ ...base, track_overdue: 0 }, "2026-10-25").openEnded).toBe(true);
    expect(analyseLine({ ...base, track_overdue: "0" }, "2026-10-25").isOverdue).toBe(false);
  });

  it("a returned open-ended line shows the days it was out, at the final amount", () => {
    const r = analyseLine({ ...base, line_status: "Returned", track_overdue: false, actual_return_date: "2026-10-22", line_total_amount: "2000" }, "2026-12-01");
    expect(r.daysOut).toBe(2);
    expect(r.extraDays).toBe(0);
    expect(r.costToday).toBe(2000);
  });

  it("tracked line is not overdue ON the due date or before it", () => {
    const tracked = { ...base, track_overdue: true, expected_return_date: "2026-10-22" };
    expect(analyseLine(tracked, "2026-10-21").isOverdue).toBe(false);
    expect(analyseLine(tracked, "2026-10-22").isOverdue).toBe(false);
  });

  it("tracked line after the due date: days late × extra rate × units still out", () => {
    const tracked = { ...base, track_overdue: true, expected_return_date: "2026-10-22", good_returned_qty: 1 };
    const r = analyseLine(tracked, "2026-10-25"); // 3 days late, 1 unit still out
    expect(r.isOverdue).toBe(true);
    expect(r.daysLate).toBe(3);
    expect(r.lateFee).toBe(3 * 500 * 1);
    expect(r.costToday).toBe(1000 + 1500);
  });

  it("returned lines are settled: never overdue, cost = final amount", () => {
    const r = analyseLine({ ...base, line_status: "Returned", track_overdue: true, line_total_amount: "1800" }, "2026-12-01");
    expect(r.isActive).toBe(false);
    expect(r.isOverdue).toBe(false);
    expect(r.costToday).toBe(1800);
  });
});

describe("days are elapsed time, rounded up (29 hours = 2 days)", () => {
  const out = { ...base, track_overdue: false, borrow_quantity: 1, line_total_amount: "250", locked_extra_daily_rate: 250, borrow_date: "2026-10-30", expected_return_date: "2026-10-30" };
  const issuedAt = new Date(2026, 9, 30, 9, 42);

  it("elapsedDays rounds anything past 24h up", () => {
    expect(elapsedDays(issuedAt, new Date(2026, 9, 31, 9, 42))).toBe(1);
    expect(elapsedDays(issuedAt, new Date(2026, 9, 31, 9, 43))).toBe(2);
    expect(elapsedDays(issuedAt, new Date(2026, 9, 31, 15, 8))).toBe(2);
    expect(elapsedDays(issuedAt, new Date(2026, 9, 30, 9, 50))).toBe(1);
  });

  it("an active no-return-date line out 29 hours is 2 days, +1 extra day charged", () => {
    const r = analyseLine(out, "2026-10-31", { issuedAt, now: new Date(2026, 9, 31, 15, 8) });
    expect(r.daysOut).toBe(2);
    expect(r.extraDays).toBe(1);
    expect(r.costToday).toBe(500);
  });

  it("a returned line uses the handover time", () => {
    const r = analyseLine({ ...out, line_status: "Returned", actual_return_date: "2026-10-31", line_total_amount: "500" }, "2026-12-01", { issuedAt, backAt: new Date(2026, 9, 31, 15, 8).toISOString() });
    expect(r.daysOut).toBe(2);
    expect(r.costToday).toBe(500);
  });
});

describe("invoice summary", () => {
  it("totals cost today and counts out / returned / overdue", () => {
    const s = summariseInvoice(
      [
        { ...base, track_overdue: false, borrow_date: "2026-10-20" },
        { ...base, track_overdue: true, expected_return_date: "2026-10-23", borrow_date: "2026-10-21", line_total_amount: "400" },
        { ...base, line_status: "Returned", line_total_amount: "300", borrow_date: "2026-10-19" },
      ],
      "2026-10-25",
    );
    expect(s.outCount).toBe(2);
    expect(s.returnedCount).toBe(1);
    expect(s.overdueCount).toBe(1);
    expect(s.earliestOut).toBe("2026-10-19");
    // line 1: open-ended, out 5 days = 4 extra days × 500 × 2; line 2: 2 days late × 500 × 2
    expect(s.lateFeeToday).toBe(4 * 500 * 2 + 2 * 500 * 2);
    expect(s.costToday).toBe(1000 + 4000 + (400 + 2000) + 300);
  });
});
