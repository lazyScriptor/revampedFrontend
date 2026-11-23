import { describe, it, expect, beforeEach } from "vitest";
import { usePosCartStore, selectRentalLines, selectSaleLines, selectRentalSubtotal, selectSaleSubtotal, type SaleCartLine } from "../posCartStore";
import type { CartItem } from "../../components/PosLedgerPanel";
import { mixedCartTotals, suggestedMixedPayment } from "../../lib/mixedBill";
import { invoiceTotals } from "../../lib/invoiceTotals";
import { buildMixedInvoicePayload } from "@/features/retail/pos/posPricing";
import { parseSaleCheckoutError } from "@/features/retail/api/pos.api";

const machine = (over: Partial<CartItem> = {}): CartItem => ({
  cart_id: "m1",
  equipment_id: 1,
  equipment_name: "Hammer Drill",
  available_qty: 5,
  is_bulk_item: true,
  borrow_quantity: 1,
  borrow_date: "2026-11-24",
  expected_return_date: "2026-11-24",
  locked_base_price: 1500,
  locked_minimum_days: 1,
  locked_extra_daily_rate: 1500,
  pricing_mode: "daily",
  track_overdue: false,
  ...over,
});

const goods = (over: Partial<SaleCartLine> = {}): SaleCartLine => ({
  kind: "sale",
  cart_id: "s1",
  line_kind: "item",
  product_id: 7,
  description: "Tape",
  warehouse_id: 1,
  unit_id: null,
  unit_label: "pc",
  unit_factor: 1,
  qty: 2,
  base_qty: 2,
  unit_price: 250,
  price_source: "retail",
  line_discount: 0,
  bill_discount_share: 0,
  line_total: 500,
  ...over,
});

const st = () => usePosCartStore.getState();
const named = { customer_id: 44, first_name: "Nimal", last_name: "P" };
const walkIn = { customer_id: 999, first_name: "Walk-in", last_name: "customer", is_walk_in: true };

beforeEach(() => st().resetAll());

describe("one cart for machines and goods", () => {
  it("holds both kinds in either order with their own subtotals", () => {
    st().addSaleLine(goods());
    st().setRentalLines((prev) => [...prev, machine()]);
    expect(selectRentalLines(st().lines)).toHaveLength(1);
    expect(selectSaleLines(st().lines)).toHaveLength(1);
    expect(selectRentalSubtotal(st().lines)).toBe(1500);
    expect(selectSaleSubtotal(st().lines)).toBe(500);

    st().resetAll();
    st().setRentalLines([machine()]);
    st().addSaleLine(goods());
    expect(selectRentalSubtotal(st().lines)).toBe(1500);
    expect(selectSaleSubtotal(st().lines)).toBe(500);
  });

  it("walk-in + machine: the machine waits, the prompt opens, a named customer adds it", () => {
    st().setSelectedCustomer(walkIn);
    st().holdRentalForCustomer(machine());
    expect(selectRentalLines(st().lines)).toHaveLength(0);
    expect(st().customerPrompt).toBe(true);
    expect(st().pendingRental?.equipment_id).toBe(1);

    st().setSelectedCustomer(named);
    expect(selectRentalLines(st().lines)).toHaveLength(1);
    expect(st().pendingRental).toBeNull();
    expect(st().customerPrompt).toBe(false);
  });

  it("cancel drops the held machine", () => {
    st().setSelectedCustomer(walkIn);
    st().holdRentalForCustomer(machine());
    st().cancelCustomerPrompt();
    expect(st().pendingRental).toBeNull();
    st().setSelectedCustomer(named);
    expect(selectRentalLines(st().lines)).toHaveLength(0);
  });

  it("the walk-in can't be picked while machines are in the cart", () => {
    st().setSelectedCustomer(named);
    st().setRentalLines([machine()]);
    st().setSelectedCustomer(walkIn);
    expect(st().selectedCustomer?.customer_id).toBe(44);
  });

  it("a held machine does not survive clearing the cart", () => {
    st().holdRentalForCustomer(machine());
    st().clearCart();
    expect(st().pendingRental).toBeNull();
    expect(st().customerPrompt).toBe(false);
  });
});

describe("mixed totals and payload", () => {
  it("Rent + Items + Transport − Discount = Total, to the cent", () => {
    expect(mixedCartTotals(1500, 500, { transport: 100, discount: 250.5 })).toEqual({
      rent: 1500,
      items: 500,
      transport: 100,
      discount: 250.5,
      total: 1849.5,
    });
    expect(mixedCartTotals(10, 5, { discount: 100 }).total).toBe(0);
  });

  it("the payment box starts at the goods total", () => {
    expect(suggestedMixedPayment(500)).toBe(500);
    expect(suggestedMixedPayment(0)).toBe(0);
  });

  it("sends items + sale_items together, one payment on fees, no settle_now", () => {
    const payload: any = buildMixedInvoicePayload({
      customerId: 44,
      onBehalfCustomerId: null,
      rentalItems: [{ equipment_id: 1 }],
      saleLines: [goods({ price_approval_token: "tok-price", line_discount: 10 })],
      fees: { transport: 0, discount: 20, advance: 800, advance_payment_method: "Card" },
      paymentMethod: "Card",
      jobSite: "Site A",
      billDiscountApprovalToken: "tok-disc",
    });
    expect(payload.items).toEqual([{ equipment_id: 1 }]);
    expect(payload.sale_items).toHaveLength(1);
    expect(payload.sale_items[0].approval_tokens).toEqual({ price_change: "tok-price" });
    expect(payload.fees).toMatchObject({ discount: 20, advance: 800, advance_payment_method: "Card" });
    expect(payload.approval_tokens).toMatchObject({ discount_over_limit: "tok-disc", price_change: "tok-price" });
    expect(payload).not.toHaveProperty("settle_now");
    expect(payload).not.toHaveProperty("payment");
    expect(payload.job_site).toBe("Site A");
  });

  it("422 walk-in on a mixed bill reads as needs_customer", () => {
    const r = parseSaleCheckoutError({ status: 422, data: { message: "Choose a customer to rent equipment" } });
    expect(r.kind).toBe("needs_customer");
  });
});

describe("invoiceTotals on a mixed bill", () => {
  const bill = {
    bill_kind: "mixed",
    sub_total: 2000, // rent 1500 + goods 500 before the bill discount
    sale_total: 450, // goods after their 50 share of the discount
    discount_amount: 100,
    transport_fee: 0,
    total_amount: 1900,
    SaleLines: [{ sale_line_id: 1, description: "Tape", qty: 2, unit_price: 250, line_total: 450, bill_discount_share: 50, status: "sold" }],
  };

  it("splits Rent and Items, keeps the sub_total and shows no phantom late fee", () => {
    const t = invoiceTotals(bill);
    expect(t.mixed).toBe(true);
    expect(t.subTotal).toBe(2000);
    expect(t.rent).toBe(1500);
    expect(t.items).toBe(500);
    expect(t.lateFees).toBe(0);
    expect(t.total).toBe(1900);
  });

  it("rental and sale bills are read as before", () => {
    expect(invoiceTotals({ bill_kind: "rental", sub_total: 900, total_amount: 900 }).subTotal).toBe(900);
    expect(invoiceTotals({ bill_kind: "sale", sub_total: 0, sale_total: 700, total_amount: 700 }).subTotal).toBe(700);
  });
});
