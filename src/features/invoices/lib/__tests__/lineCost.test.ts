import { describe, expect, it } from "vitest";
import { analyseLine, summariseInvoice, daysBetween, toYmd } from "../lineCost";

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

describe("overdue only exists when the return date is tracked (the 'expired after 1 day' bug)", () => {
  it("untracked line, out for 5 days: NOT overdue, cost stays the locked price", () => {
    const r = analyseLine({ ...base, track_overdue: false }, "2026-10-25");
    expect(r.isOverdue).toBe(false);
    expect(r.daysLate).toBe(0);
    expect(r.costToday).toBe(1000);
    expect(r.dueDate).toBe("");
  });

  it("treats 0 / '0' from MySQL as untracked too", () => {
    expect(analyseLine({ ...base, track_overdue: 0 }, "2026-10-25").isOverdue).toBe(false);
    expect(analyseLine({ ...base, track_overdue: "0" }, "2026-10-25").isOverdue).toBe(false);
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
    expect(s.lateFeeToday).toBe(2 * 500 * 2);
    expect(s.costToday).toBe(1000 + (400 + 2000) + 300);
  });
});
