import { describe, it, expect, beforeEach } from "vitest";
import {
  usePosCartStore,
  selectRentalLines,
  selectSaleLines,
  selectRentalSubtotal,
  selectSaleSubtotal,
  toRentalPayload,
  type SaleCartLine,
} from "../posCartStore";
import type { CartItem } from "../../components/PosLedgerPanel";

const rental = (over: Partial<CartItem> = {}): CartItem => ({
  cart_id: "r1",
  equipment_id: 1,
  equipment_name: "Drill",
  available_qty: 5,
  is_bulk_item: false,
  borrow_quantity: 2,
  borrow_date: "2026-01-10",
  expected_return_date: "2026-01-13",
  locked_base_price: 1000,
  locked_minimum_days: 1,
  locked_extra_daily_rate: 500,
  pricing_mode: "daily",
  track_overdue: false,
  ...over,
});

const sale = (over: Partial<SaleCartLine> = {}): SaleCartLine => ({
  kind: "sale",
  cart_id: "s1",
  line_kind: "item",
  product_id: 7,
  description: "Tape",
  warehouse_id: 1,
  unit_id: null,
  unit_label: "pc",
  unit_factor: 1,
  qty: 3,
  base_qty: 3,
  unit_price: 100,
  price_source: "retail",
  line_discount: 0,
  bill_discount_share: 0,
  line_total: 300,
  ...over,
});

const st = () => usePosCartStore.getState();

describe("posCartStore", () => {
  beforeEach(() => st().resetAll());

  it("starts empty", () => {
    expect(st().lines).toEqual([]);
    expect(st().fees).toEqual({ transport: 0, discount: 0, advance: 0 });
    expect(st().billDate).toBeNull();
    expect(st().selectedCustomer).toBeNull();
  });

  it("setRentalLines accepts plain arrays and functional updaters and tags rentals", () => {
    st().setRentalLines([rental()]);
    expect(st().lines).toHaveLength(1);
    expect(st().lines[0].kind).toBe("rental");
    st().setRentalLines((prev) => [...prev, rental({ cart_id: "r2" })]);
    expect(selectRentalLines(st().lines).map((l) => l.cart_id)).toEqual(["r1", "r2"]);
    st().setRentalLines((prev) => prev.filter((l) => l.cart_id !== "r1"));
    expect(selectRentalLines(st().lines).map((l) => l.cart_id)).toEqual(["r2"]);
  });

  it("setRentalLines leaves sale lines untouched", () => {
    st().setLines([sale()]);
    st().setRentalLines([rental()]);
    expect(selectSaleLines(st().lines)).toHaveLength(1);
    st().setRentalLines([]);
    expect(selectSaleLines(st().lines)).toHaveLength(1);
    expect(selectRentalLines(st().lines)).toHaveLength(0);
  });

  it("does not change state when the updater returns the same array", () => {
    st().setRentalLines([rental()]);
    const before = st().lines;
    st().setRentalLines((prev) => prev);
    expect(st().lines).toBe(before);
  });

  it("computes rental and sale subtotals separately", () => {
    st().setRentalLines([rental()]); // 3 days, 2 qty: 1000 + 2 extra days x 500 = 2000 each
    st().setLines((l) => [...l, sale(), sale({ cart_id: "s2", line_total: 50 })]);
    expect(selectSaleSubtotal(st().lines)).toBe(350);
    expect(selectRentalSubtotal(st().lines)).toBeGreaterThan(0);
  });

  it("toRentalPayload strips the kind tag only", () => {
    st().setRentalLines([rental()]);
    const payload = toRentalPayload(selectRentalLines(st().lines)[0]);
    expect(payload).toEqual(rental());
    expect("kind" in payload).toBe(false);
  });

  it("setFees supports updaters", () => {
    st().setFees((f: any) => ({ ...f, transport: 250 }));
    expect(st().fees.transport).toBe(250);
  });

  it("applyBillDateToLines shifts out date and keeps the rental length", () => {
    st().setRentalLines([rental()]);
    st().applyBillDateToLines("2026-01-12");
    const l = selectRentalLines(st().lines)[0];
    expect(l.borrow_date).toBe("2026-01-12");
    expect(l.expected_return_date).toBe("2026-01-15");
  });

  it("clearCart keeps the customer; resetAll clears it", () => {
    st().setSelectedCustomer({ customer_id: 1 });
    st().setOnBehalfOfCustomer({ customer_id: 2 });
    st().setRentalLines([rental()]);
    st().setFees({ transport: 1, discount: 2, advance: 3 });
    st().setBillDate("2026-01-01T10:00");
    st().clearCart();
    expect(st().lines).toEqual([]);
    expect(st().fees).toEqual({ transport: 0, discount: 0, advance: 0 });
    expect(st().billDate).toBeNull();
    expect(st().selectedCustomer).toEqual({ customer_id: 1 });
    st().resetAll();
    expect(st().selectedCustomer).toBeNull();
    expect(st().onBehalfOfCustomer).toBeNull();
  });
});
