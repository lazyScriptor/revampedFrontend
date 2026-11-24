import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";
import { InvoiceReceipt, buildSnapshotReceiptProps, getReceiptLabels } from "@/features/invoices/components/InvoiceReceipt";
import { CASES, renderCase, rentalInvoice } from "@/features/invoices/components/__tests__/rentalReceiptCases";
import baseline from "@/features/invoices/components/__tests__/__fixtures__/rentalReceipts.json";
import { billKindOf, soldBillTotals, soldLinesOf } from "../receipts/receiptModel";

vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useInvoiceSignatures: () => ({ data: { signatures: [] } }),
}));

const line = (over: Record<string, any> = {}) => ({
  sale_line_id: 1, product_id: 1, line_kind: "item", description: "Steel nail", unit_label: "pcs", unit_factor: 1, qty: 10, base_qty: 10,
  unit_price: 100, line_discount: 0, bill_discount_share: 0, line_total: 1000, status: "sold", returned_base_qty: 0, ...over,
});

// A sale-only bill: nails (3 of 10 came back), a fully returned tape, and a cash sale with change.
const saleBill = (over: Record<string, any> = {}) => ({
  invoice_id: 501,
  bill_kind: "sale",
  status: "Completed",
  issued_date: "2026-11-23T12:00:00Z",
  Customer: { first_name: "Walk-in", last_name: "customer", is_walk_in: true, phone_number: "0000000000" },
  InvoiceLines: [],
  SaleLines: [
    line({ returned_base_qty: 3, status: "partly_returned", line_discount: 50, line_total: 950, unit_price: 100 }),
    line({ sale_line_id: 2, description: "Black tape", qty: 2, base_qty: 2, unit_price: 250, line_total: 500, returned_base_qty: 2, status: "returned" }),
  ],
  sub_total: 1450,
  sale_total: 1450 - 285 - 500,
  transport_fee: 0,
  discount_amount: 0,
  returned_total: 785,
  total_amount: 665,
  Payments: [{ payment_amount: 1450, method: "Cash" }, { payment_amount: -785, method: "Cash" }],
  issued_by: { name: "Dilini" },
  ...over,
});

const mixedBill = (over: Record<string, any> = {}) => ({
  ...rentalInvoice,
  bill_kind: "mixed",
  sub_total: 11500 + 1000,
  discount_amount: 200,
  transport_fee: 500,
  total_amount: 11500 + 1000 + 500 - 200,
  SaleLines: [line({ qty: 10, unit_price: 100, line_total: 1000 })],
  ...over,
});

const setShop = (retail = true) =>
  useAuthStore.setState({
    user: {
      first_name: "Nimal",
      plan: { features: { retail } },
      configData: { business_display_name: "T A Enterprises", currency_code: "Rs.", custom_settings: { phone: "0777593701", address: "23 New Galle Road" } },
    } as any,
  });

const show = (props: Record<string, unknown>) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InvoiceReceipt id="r" isPreview showBarcode={false} language="en" {...props} />
    </QueryClientProvider>,
  );

const text = (c: HTMLElement) => c.textContent ?? "";

beforeEach(() => {
  localStorage.clear();
  setShop(false);
});

describe("rental receipts are unchanged", () => {
  for (const c of CASES) {
    it(`${c.name} draws exactly what it drew before retail receipts`, () => {
      expect(renderCase(InvoiceReceipt, c.props)).toBe((baseline as Record<string, string>)[c.name]);
    });
  }
});

describe("what a bill is", () => {
  it("tells rental, sale and mixed apart", () => {
    expect(billKindOf(rentalInvoice)).toBe("rental");
    expect(billKindOf(saleBill())).toBe("sale");
    expect(billKindOf(mixedBill())).toBe("mixed");
  });

  it("works out Rent · Items · Transport · Discount · Returned · Total · Paid · Balance", () => {
    const t = soldBillTotals(mixedBill({ Payments: [{ payment_amount: 5000, method: "Cash" }] }));
    expect(t).toMatchObject({ kind: "mixed", rent: 11500, items: 1000, transport: 500, discount: 200, returned: 0, lateFees: 0, total: 12800, paid: 5000, balance: 7800 });
    const s = soldBillTotals(saleBill());
    expect(s).toMatchObject({ kind: "sale", items: 1450, returned: 785, total: 665, paid: 665, balance: 0 });
  });

  it("leaves voided lines off", () => {
    expect(soldLinesOf(saleBill({ SaleLines: [line(), line({ sale_line_id: 9, description: "Voided", status: "voided" })] }))).toHaveLength(1);
  });
});

describe("short retail receipt (sale-only bill)", () => {
  it("has the shop, bill no., date, cashier, items, total, paid and the returned note, and nothing rental", () => {
    const { container } = show({ invoice: saleBill(), showBarcode: true });
    const c = text(container);
    expect(c).toContain("T A Enterprises");
    expect(c).toContain("23 New Galle Road");
    expect(c).toContain("RECEIPT");
    expect(c).toContain("INV-501");
    expect(c).toContain("Cashier: Dilini");
    expect(c).toContain("Steel nail");
    expect(c).toContain("10 pcs × Rs. 100.00");
    expect(c).toContain("Rs. 950.00");
    expect(c).toContain("−3 returned");
    expect(c).toContain("TOTAL");
    expect(c).toContain("Rs. 665.00");
    expect(container.querySelector("svg")).not.toBeNull(); // the bill barcode
    // what a short receipt leaves out
    for (const gone of [/ID card/i, /Signature/i, /terms|liability/i, /Late/i, /Hirer/i, /→/, /N\/A/, /NIC/, /Initial advance/i]) expect(c).not.toMatch(gone);
  });

  it("strikes a fully returned line through and shows what came back", () => {
    const { container } = show({ invoice: saleBill() });
    const struck = Array.from(container.querySelectorAll<HTMLElement>("div, span")).filter((e) => e.style.textDecoration === "line-through");
    expect(struck.map((e) => e.textContent).join("|")).toContain("Black tape");
    expect(text(container)).toContain("−2 returned");
    const notes = container.querySelectorAll('[data-testid="receipt-returned-note"]');
    expect(notes).toHaveLength(2);
  });

  it("a cash sale with change shows Paid as the cash handed over and the Change", () => {
    const bill = saleBill({
      SaleLines: [line({ qty: 4, base_qty: 4, unit_price: 250, line_total: 1000 })],
      sale_total: 1000, returned_total: 0, total_amount: 1000, Payments: [{ payment_amount: 1000, method: "Cash" }], change_due: 500,
    });
    const { container } = show({ invoice: bill });
    const c = text(container);
    expect(c).toMatch(/Paid\s*Rs\. 1,500\.00/);
    expect(c).toMatch(/Change\s*Rs\. 500\.00/);
    expect(c).not.toMatch(/BALANCE/);
  });

  it("an unpaid sale on credit shows the balance instead of change", () => {
    const bill = saleBill({
      SaleLines: [line({ qty: 4, base_qty: 4, unit_price: 250, line_total: 1000 })],
      sale_total: 1000, returned_total: 0, total_amount: 1000, Payments: [{ payment_amount: 400, method: "Cash" }],
    });
    const c = text(show({ invoice: bill }).container);
    expect(c).toMatch(/BALANCE\s*Rs\. 600\.00/);
    expect(c).not.toMatch(/Change/);
  });

  it("shows the transport and discount rows only when there are some", () => {
    const bill = saleBill({
      SaleLines: [line({ qty: 4, base_qty: 4, unit_price: 250, line_total: 1000 })],
      sale_total: 900, returned_total: 0, discount_amount: 100, transport_fee: 50, total_amount: 950, Payments: [{ payment_amount: 950, method: "Cash" }],
    });
    const c = text(show({ invoice: bill }).container);
    expect(c).toContain("Transport+Rs. 50.00");
    expect(c).toContain("Discount-Rs. 100.00");
    expect(c).toContain("Rs. 950.00");
    expect(text(show({ invoice: saleBill({ returned_total: 0, SaleLines: [line()], total_amount: 1000, Payments: [{ payment_amount: 1000 }] }) }).container)).not.toContain("Transport");
  });

  it("follows the shop's settings: footer, cashier line", () => {
    const withFooter = show({ invoice: saleBill(), retailReceipt: { saleFooter: "No returns after 7 days", showCashier: false } });
    expect(text(withFooter.container)).toContain("No returns after 7 days");
    expect(text(withFooter.container)).not.toContain("Cashier");
  });

  it("falls back to the signed-in user as cashier when the bill has none", () => {
    const { container } = show({ invoice: saleBill({ issued_by: undefined }) });
    expect(text(container)).toContain("Cashier: Nimal");
  });

  it("prints in Sinhala through the receipt labels", () => {
    const { container } = show({ invoice: saleBill({ change_due: 0 }), language: "si" });
    const si = getReceiptLabels("si");
    expect(si.sReceipt).toBe("රිසිට්පත");
    expect(text(container)).toContain(si.sReceipt);
    expect(text(container)).toContain(si.sCashier);
    expect(text(container)).toContain(si.returnedQty("3"));
    expect(si.sChange).not.toBe(getReceiptLabels("en").sChange);
  });

  it("58 mm uses the narrow paper", () => {
    const { container } = show({ invoice: saleBill(), paperWidth: "58mm" });
    expect((container.firstChild as HTMLElement).style.width || getComputedStyle(container.firstChild as HTMLElement).width).toMatch(/48mm/);
    expect(text(container)).toContain("Steel nail");
  });

  it("is read back from a print snapshot for a reprint", () => {
    const log = { doc_type: "SALE_RECEIPT", doc_number: "INV-501", paper_width: "80mm", language: "en", printed_at: "2026-11-24T12:00:00Z", printed_by_name: "Reprinter", bill_snapshot: saleBill({ change_due: 0 }) };
    const props = buildSnapshotReceiptProps(log);
    const { container } = show({ ...props });
    const c = text(container);
    expect(c).toContain("RECEIPT");
    expect(c).toContain("Cashier: Dilini"); // the bill's cashier, not whoever reprints it
    expect(c).toContain("−3 returned");
    expect(c).toContain("Rs. 665.00");
  });
});

describe("full bill with goods", () => {
  it("a mixed bill keeps the rental section and adds Items sold with Rent · Items · Transport · Discount · Total · Paid · Balance", () => {
    const { container } = show({ invoice: mixedBill({ Payments: [{ payment_amount: 5000, method: "Cash" }] }), showTerms: true });
    const c = text(container);
    expect(c).toContain("Concrete Mixer");
    expect(c).toContain("ITEMS SOLD");
    expect(c.indexOf("Concrete Mixer")).toBeLessThan(c.indexOf("ITEMS SOLD"));
    expect(c).toContain("10 pcs × Rs. 100.00");
    for (const row of [/Rent\s*Rs\. 11,500\.00/, /Items\s*Rs\. 1,000\.00/, /Transport\+Rs\. 500\.00/, /Discount-Rs\. 200\.00/, /TOTAL\s*Rs\. 12,800\.00/, /Paid · Cash\s*Rs\. 5,000\.00/, /BALANCE\s*Rs\. 7,800\.00/]) expect(c).toMatch(row);
    expect(c).toMatch(/Signature/i); // a bill with machines still carries the hirer's signature
    expect(container.querySelector('[data-testid="short-sale-receipt"]')).toBeNull();
  });

  it("a mixed bill with a returned line shows the Returned row and the −N returned note", () => {
    const bill = mixedBill({
      SaleLines: [line({ returned_base_qty: 3, status: "partly_returned" })],
      returned_total: 300,
      total_amount: 12500,
      Payments: [{ payment_amount: 12500, method: "Cash" }],
    });
    const c = text(show({ invoice: bill }).container);
    expect(c).toMatch(/Returned-Rs\. 300\.00/);
    expect(c).toContain("−3 returned");
    expect(c).toMatch(/TOTAL\s*Rs\. 12,500\.00/);
  });

  it("the classic design shows the same sections and totals", () => {
    const { container } = show({ invoice: mixedBill(), design: "classic" });
    const c = text(container);
    expect(c).toContain("ITEMS SOLD");
    expect(c).toMatch(/Items\s*Rs\. 1,000\.00/);
    expect(c).toMatch(/TOTAL\s*Rs\. 12,800\.00/);
  });

  it("the shop can leave the goods off rental bills; the Items row still adds up", () => {
    const { container } = show({ invoice: mixedBill(), retailReceipt: { showItemsSoldOnRentalReceipt: false } });
    const c = text(container);
    expect(c).not.toContain("ITEMS SOLD");
    expect(c).not.toContain("Steel nail");
    expect(c).toMatch(/Items\s*Rs\. 1,000\.00/);
    expect(c).toMatch(/TOTAL\s*Rs\. 12,800\.00/);
  });

  it("with the short receipt off, a sale-only bill prints the full bill: sales title, items sold, change, no ID card or terms", () => {
    const bill = saleBill({
      SaleLines: [line({ qty: 4, base_qty: 4, unit_price: 250, line_total: 1000 })],
      sale_total: 1000, returned_total: 0, total_amount: 1000, Payments: [{ payment_amount: 1000, method: "Cash" }], change_due: 200,
    });
    const { container } = show({ invoice: bill, showIdStatus: true, showTerms: true, retailReceipt: { shortSaleReceipt: false } });
    const c = text(container);
    expect(c).toContain("SALES BILL");
    expect(c).toContain("ITEMS SOLD");
    expect(c).toMatch(/Paid · Cash\s*Rs\. 1,200\.00/);
    expect(c).toMatch(/Change\s*Rs\. 200\.00/);
    expect(c).not.toMatch(/ID card/i);
    expect(c).not.toMatch(/Signature/i);
    expect(container.querySelector('[data-testid="short-sale-receipt"]')).toBeNull();
  });

  it("A4 is the same bill on a wider sheet", () => {
    const { container } = show({ invoice: mixedBill(), paperWidth: "a4" });
    expect((container.firstChild as HTMLElement).style.width || getComputedStyle(container.firstChild as HTMLElement).width).toMatch(/190mm/);
    expect(text(container)).toContain("ITEMS SOLD");
  });

  it("a quotation for a cart with goods lists them and adds the Rent and Items rows", () => {
    const { container } = show({
      isDraft: true,
      draftData: {
        customer: { first_name: "Kasun", last_name: "Silva" },
        items: [{ cart_id: "c1", equipment_name: "Concrete Mixer", borrow_quantity: 1, borrow_date: "2026-10-27T12:00:00Z", expected_return_date: "2026-10-29T12:00:00Z", locked_base_price: 1500, locked_extra_daily_rate: 1500, locked_minimum_days: 1 }],
        saleLines: [{ cart_id: "s1", description: "Cement bag", qty: 2, unit_label: "bag", unit_price: 1800, line_discount: 0, line_total: 3600 }],
        fees: { transport: 0, discount: 100, advance: 0 },
        draftId: "EST-1",
      },
    });
    const c = text(container);
    expect(c).toContain("ITEMS");
    expect(c).toContain("Cement bag");
    expect(c).toContain("2 bag × Rs. 1,800.00");
    expect(c).toMatch(/Rent\s*Rs\. 3,000\.00/);
    expect(c).toMatch(/Items\s*Rs\. 3,600\.00/);
    expect(c).toMatch(/TOTAL\s*Rs\. 6,500\.00/);
  });
});
