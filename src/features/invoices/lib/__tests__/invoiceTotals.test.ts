import { describe, expect, it } from "vitest";
import { invoiceTotals, lineValueSoFar } from "../invoiceTotals";

describe("invoiceTotals", () => {
  it("rental days are the subtotal, not a fee", () => {
    const t = invoiceTotals({ sub_total: 600, transport_fee: "0", discount_amount: "0", total_amount: 600, billed_total_amount: 300 });
    expect(t).toMatchObject({ subTotal: 600, lateFees: 0, billed: 300, total: 600 });
  });

  it("only days past a due date are late fees; the breakdown adds up", () => {
    const t = invoiceTotals({ sub_total: "1000", transport_fee: "200", discount_amount: "100", total_amount: 1600, billed_total_amount: 1600 });
    expect(t.lateFees).toBe(500);
    expect(t.subTotal + t.lateFees + t.transport - t.discount).toBe(t.total);
  });

  it("a line's value so far adds its running charge", () => {
    expect(lineValueSoFar({ line_total_amount: "300", accrued_charge: "300.00" })).toBe(600);
  });
});
