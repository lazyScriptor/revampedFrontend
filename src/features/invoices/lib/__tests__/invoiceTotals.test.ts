import { describe, expect, it } from "vitest";
import { invoiceTotals, lineValueSoFar } from "../invoiceTotals";

describe("invoiceTotals", () => {
  it("splits the live total into billed and running charges, so the breakdown adds up", () => {
    const t = invoiceTotals({ sub_total: "300", transport_fee: "0", discount_amount: "0", total_amount: 600, billed_total_amount: 300, accrued_charges: "300.00" });
    expect(t).toMatchObject({ subTotal: 300, billedExtra: 0, soFar: 300, billed: 300, total: 600 });
    expect(t.subTotal + t.billedExtra + t.soFar + t.transport - t.discount).toBe(t.total);
  });

  it("late fees billed at a handover show as billed extra", () => {
    const t = invoiceTotals({ sub_total: "1000", transport_fee: "200", discount_amount: "100", total_amount: 1600, billed_total_amount: 1600, accrued_charges: 0 });
    expect(t.billedExtra).toBe(500);
    expect(t.soFar).toBe(0);
  });

  it("a line's value so far adds its running charge", () => {
    expect(lineValueSoFar({ line_total_amount: "300", accrued_charge: "300.00" })).toBe(600);
  });
});
