import { describe, expect, it } from "vitest";
import {
  buildReturnPayload,
  buildRows,
  describeSaleReturnTrace,
  maxInUnit,
  refundCapCents,
  returnValueCents,
  rowMax,
  settlementRules,
  summariseRows,
  unitOptions,
} from "../returns/returnsModel";
import { normalizeSaleLines } from "../api/pos.api";

const lineOf = (over: Record<string, any> = {}) =>
  normalizeSaleLines({
    SaleLines: [{ sale_line_id: 1, product_id: 5, qty: 3, base_qty: 3, unit_label: "pcs", unit_factor: 1, unit_price: 1000, line_discount: 0, bill_discount_share: 0, line_total: 3000, status: "sold", ...over }],
  })[0];

describe("returnValueCents", () => {
  it("partial return of a discounted line: net is line total less its bill-discount share", () => {
    const line = lineOf({ line_total: 3000, bill_discount_share: 90 }); // net 2,910 for 3
    expect(returnValueCents(line, 1)).toBe(97000);
  });

  it("the return that finishes the line takes exactly the remainder (to the cent)", () => {
    // Rs 100.00 over 3 units: 33.33 + 33.33, then the last takes 33.34
    const fresh = lineOf({ qty: 3, base_qty: 3, line_total: 100, bill_discount_share: 0 });
    expect(returnValueCents(fresh, 1)).toBe(3333);
    const afterTwo = lineOf({ qty: 3, base_qty: 3, line_total: 100, returned_base_qty: 2, returned_value: 66.66 });
    expect(returnValueCents(afterTwo, 1)).toBe(3334);
    // all three at once = the whole net
    expect(returnValueCents(fresh, 3)).toBe(10000);
  });

  it("a line returned in two steps refunds its net exactly", () => {
    const fresh = lineOf({ qty: 4, base_qty: 4, line_total: 1001, bill_discount_share: 0.5 }); // net 1000.50
    const first = returnValueCents(fresh, 1);
    const rest = returnValueCents(lineOf({ qty: 4, base_qty: 4, line_total: 1001, bill_discount_share: 0.5, returned_base_qty: 1, returned_value: first / 100 }), 3);
    expect(first + rest).toBe(100050);
  });

  it("never more than what is left, and zero for nothing", () => {
    const line = lineOf({ returned_base_qty: 2 });
    expect(returnValueCents(line, 5)).toBe(returnValueCents(line, 1));
    expect(returnValueCents(line, 0)).toBe(0);
  });
});

describe("units and limits", () => {
  const pack = lineOf({ unit_id: 7, unit_label: "box", unit_factor: 10, qty: 2, base_qty: 20, base_unit: "pcs", line_total: 2000 });
  it("a pack line can be returned in packs or single pieces", () => {
    const opts = unitOptions(pack);
    expect(opts.map((o) => [o.unitId, o.label, o.factor])).toEqual([[7, "box", 10], [null, "pcs", 1]]);
    expect(maxInUnit(pack, 10)).toBe(2);
    expect(maxInUnit(pack, 1)).toBe(20);
    // 5 pieces of a Rs 2,000 pack-of-20 line
    expect(returnValueCents(pack, 5)).toBe(50000);
  });
  it("whole packs only when part of a pack has gone", () => {
    expect(maxInUnit({ ...pack, returned_base_qty: 5 }, 10)).toBe(1);
  });
  it("serial rows share one allowance per line", () => {
    const l = lineOf({ qty: 2, base_qty: 2, serials: ["A", "B"] });
    const rows = buildRows([l], 1);
    expect(rows).toHaveLength(2);
    expect(rows[0].serial).toBe("A");
    expect(rows[0].qty).toBe(1);
    expect(rowMax(rows, rows[1])).toBe(1);
    const both = [rows[0], { ...rows[1], qty: 1 }];
    expect(summariseRows(both).items).toBe(1);
    expect(summariseRows(both).valueCents).toBe(300000);
  });
});

describe("settlement", () => {
  const open = { status: "Active", total_amount: 9910, Customer: { is_walk_in: false }, Payments: [{ payment_amount: 9500 }, { payment_amount: 999, is_voided: true }] };
  it("refund is capped at what was paid beyond the new total; a Completed bill gets exactly the value", () => {
    expect(refundCapCents(open, 97000)).toBe(56000);
    const done = { status: "Completed", total_amount: 9910, Customer: { is_walk_in: true }, Payments: [{ payment_amount: 9910 }] };
    expect(refundCapCents(done, 97000)).toBe(97000);
    expect(refundCapCents({ ...open, Payments: [] }, 97000)).toBe(0);
  });
  it("keep on bill: hidden for the walk-in, disabled when Completed, fixed amount when Completed", () => {
    expect(settlementRules({ status: "Completed", Customer: { is_walk_in: true } })).toEqual({ showCredit: false, creditDisabled: true, amountFixed: true });
    expect(settlementRules({ status: "Completed", Customer: {} })).toEqual({ showCredit: true, creditDisabled: true, amountFixed: true });
    expect(settlementRules({ status: "PendingPayment", Customer: {} })).toEqual({ showCredit: true, creditDisabled: false, amountFixed: false });
  });
});

describe("payload", () => {
  it("lines, settlement, reason and the approval token", () => {
    const pack = lineOf({ unit_id: 7, unit_label: "box", unit_factor: 10, qty: 2, base_qty: 20, base_unit: "pcs" });
    const rows = buildRows([pack], 1);
    const p = buildReturnPayload({ rows, mode: "refund", method: "Card", amount: 50, reason: " Wrong item ", approvalToken: "tok" });
    expect(p).toEqual({
      lines: [{ sale_line_id: 1, qty: 1, unit_id: 7, condition: "good" }],
      settlement: { mode: "refund", method: "Card", amount: 50 },
      reason: "Wrong item",
      approval_tokens: { return_no_bill: "tok" },
    });
    expect(buildReturnPayload({ rows, mode: "credit", method: "Cash", amount: null })).toEqual({
      lines: [{ sale_line_id: 1, qty: 1, unit_id: 7, condition: "good" }],
      settlement: { mode: "credit" },
    });
  });

  it("a pack line returned in single pieces sends unit_id null, so the server doesn't read it as packs", () => {
    const pack = lineOf({ unit_id: 7, unit_label: "box", unit_factor: 10, qty: 2, base_qty: 20, base_unit: "pcs" });
    const [row] = buildRows([pack], 1);
    const pieces = { ...row, qty: 3, unit: unitOptions(pack).find((u) => u.unitId === null)! };
    expect(buildReturnPayload({ rows: [pieces], mode: "credit", method: "Cash", amount: null }).lines).toEqual([
      { sale_line_id: 1, qty: 3, unit_id: null, condition: "good" },
    ]);
  });
});

describe("trace", () => {
  it("reads a SALE_RETURN event", () => {
    const d = describeSaleReturnTrace({ event_action: "SALE_RETURN", state_payload: JSON.stringify({ lines: [{}, {}], value: 1180, settlement: { refunded: 1180, method: "Cash" } }) });
    expect(d).toEqual({ items: 2, value: 1180, method: "Cash", credit: false });
    expect(describeSaleReturnTrace({ event_action: "RETURN_PROCESSED" })).toBeNull();
  });
});
