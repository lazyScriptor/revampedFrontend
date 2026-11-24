import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

const api = { postSaleReturn: vi.fn(), fetchSaleReturns: vi.fn(), fetchReturnFind: vi.fn() };
vi.mock("../returns/returns.api", async (orig) => ({
  ...(await orig<typeof import("../returns/returns.api")>()),
  postSaleReturn: (...a: any[]) => api.postSaleReturn(...a),
  fetchSaleReturns: (...a: any[]) => api.fetchSaleReturns(...a),
  fetchReturnFind: (...a: any[]) => api.fetchReturnFind(...a),
}));

const printSpy = vi.fn();
let currentInvoice: any = null;
vi.mock("@/features/invoices/hooks/useInvoiceHooks", () => ({
  useInvoiceDetails: () => ({ data: currentInvoice }),
  handlePrintInvoice: (...a: any[]) => printSpy(...a),
}));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({ useInvoiceSignatures: () => ({ data: { signatures: [] } }) }));
vi.mock("../catalog/useRetailCatalog", () => ({ useRetailCatalog: () => ({ index: { byId: new Map() } }) }));
vi.mock("../approval/useApproval", () => ({ useApproval: () => ({ request: vi.fn() }) }));
vi.mock("../finder/ItemFinder", () => ({ ItemFinder: () => null }));
vi.mock("../stock/useStockLevels", () => ({ invalidateStock: vi.fn() }));

import { useOverlay } from "@/components/overlay";
import { useAuthStore } from "@/stores/useAuthStore";
import { RETURN_OVERLAY_ID } from "../catalog/overlayIds";
import "../catalog/registerCatalog";
import { renderCatalogUi, signIn } from "./catalogTestUtils";
import { InvoiceReceipt, buildSnapshotReceiptProps } from "@/features/invoices/components/InvoiceReceipt";
import { ReturnSlipDialog } from "../receipts/ReturnSlipDialog";
import { ReturnSlipsSection } from "../receipts/ReturnSlipsSection";
import { normalizeSaleReturn } from "../receipts/receiptModel";

// What GET /api/invoices/:id/sale-returns sends.
const refundReturn = {
  return_id: 31,
  returned_at: "2026-11-24T12:30:00Z",
  cashier: "Dilini",
  lines: [
    { sale_line_id: 1, description: "Steel nail", qty: 3, unit_label: "pcs", condition: "good", value: 270 },
    { sale_line_id: 2, description: "Cutting wheel", qty: 1, unit_label: "pcs", condition: "damaged", value: 450 },
  ],
  value: 720,
  settlement: { mode: "refund", refunded: 720, credited: 0, method: "Cash" },
  reason: "Wrong item",
  balance_after: 0,
};
const keptReturn = { ...refundReturn, return_id: 32, settlement: { mode: "credit", refunded: 0, credited: 720, method: null }, balance_after: 1280, reason: null };

const bill = (over: Record<string, any> = {}) => ({
  invoice_id: 501,
  bill_kind: "sale",
  status: "Completed",
  doc_number: "INV-501",
  total_amount: 1280,
  Customer: { first_name: "Kamal", last_name: "Silva", phone_number: "0771234567" },
  InvoiceLines: [],
  SaleLines: [{ sale_line_id: 1, description: "Steel nail", unit_label: "pcs", qty: 10, base_qty: 10, unit_price: 100, line_total: 1000, status: "partly_returned", returned_base_qty: 3, unit_factor: 1, line_discount: 0, bill_discount_share: 0 }],
  Payments: [],
  ...over,
});

const text = (c: HTMLElement) => c.textContent ?? "";
const showSlip = (ret: any, props: Record<string, unknown> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InvoiceReceipt id="s" isPreview invoice={bill()} returnSlip={normalizeSaleReturn(ret)} language="en" {...props} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  printSpy.mockReset();
  localStorage.clear();
  useAuthStore.setState({ user: { first_name: "Nimal", configData: { business_display_name: "T A Enterprises" } } as any });
});

describe("return slip", () => {
  it("shows shop, Return slip, bill no., date, cashier, each item with Good/Damaged and value, Refunded (method), balance after and the reason", () => {
    const { container } = showSlip(refundReturn);
    const c = text(container);
    expect(c).toContain("T A Enterprises");
    expect(c).toContain("RETURN SLIP");
    expect(c).toMatch(/Bill no\.\s*INV-501/);
    expect(c).toContain("Returned on");
    expect(c).toContain("Cashier");
    expect(c).toContain("Dilini");
    expect(c).toContain("Steel nail");
    expect(c).toContain("3 pcs · Good");
    expect(c).toContain("1 pcs · Damaged");
    expect(c).toContain("Rs. 270.00");
    expect(c).toContain("Rs. 450.00");
    expect(c).toMatch(/Value\s*Rs\. 720\.00/);
    expect(c).toMatch(/Refunded \(Cash\)\s*Rs\. 720\.00/);
    expect(c).toMatch(/Balance after\s*PAID IN FULL/);
    expect(c).toContain("Reason: Wrong item");
    expect(c).not.toMatch(/Signature|terms/i);
  });

  it("a return kept on the bill says so and shows what is still owed", () => {
    const c = text(showSlip(keptReturn).container);
    expect(c).toMatch(/Kept on bill\s*Rs\. 720\.00/);
    expect(c).not.toMatch(/Refunded/);
    expect(c).toMatch(/Balance after\s*Rs\. 1,280\.00/);
    expect(c).not.toContain("Reason");
  });

  it("prints the shop's footer, in Sinhala labels too, at 58 mm and on A4", () => {
    useAuthStore.setState({ user: { first_name: "Nimal", plan: { features: { retail: false } }, configData: { business_display_name: "Shop" } } as any });
    const footer = showSlip(refundReturn, { retailReceipt: { returnSlipFooter: "Keep this slip" } });
    expect(text(footer.container)).toContain("Keep this slip");
    footer.unmount();
    const si = showSlip(refundReturn, { language: "si" });
    expect(text(si.container)).toContain("ආපසු ලැබීමේ රිසිට්පත");
    expect(text(si.container)).toContain("හානි");
    si.unmount();
    const narrow = showSlip(refundReturn, { paperWidth: "58mm" });
    expect(getComputedStyle(narrow.container.firstChild as HTMLElement).width).toBe("48mm");
    narrow.unmount();
    const a4 = showSlip(refundReturn, { paperWidth: "a4" });
    expect(getComputedStyle(a4.container.firstChild as HTMLElement).width).toBe("190mm");
    expect(a4.container.querySelector('[data-testid="return-slip"]')).not.toBeNull();
  });

  it("is reprinted from the snapshot stored with it", () => {
    const log = { doc_type: "RETURN_SLIP", doc_number: "INV-501", paper_width: "80mm", language: "en", bill_snapshot: { ...bill(), return_id: 31, return: refundReturn } };
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <InvoiceReceipt id="h" {...(buildSnapshotReceiptProps(log) as any)} isPreview />
      </QueryClientProvider>,
    );
    expect(text(container)).toContain("RETURN SLIP");
    expect(text(container)).toMatch(/Refunded \(Cash\)/);
  });

  it("the dialog prints it as RETURN_SLIP for that return, with the return in the snapshot", async () => {
    printSpy.mockResolvedValue({ method: "direct", printer: "XP-80", jobId: "1", heightMm: 90 });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ReturnSlipDialog open onClose={vi.fn()} invoice={bill()} ret={normalizeSaleReturn(refundReturn)} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: "A4" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "58 mm" }));
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    const [id, options] = printSpy.mock.calls[0];
    expect(id).toBe("printable-return-slip-31");
    expect(options).toMatchObject({ docType: "RETURN_SLIP", returnId: 31, invoiceId: 501, docNumber: "INV-501", paperWidth: "58mm" });
    expect(options.billSnapshot).toMatchObject({ return_id: 31, return: { return_id: 31, value: 720 } });
    expect(await screen.findByText(/sent to XP-80/)).toBeTruthy();
  });
});

describe("GET sale-returns", () => {
  it("reads the list, newest first, into slips", async () => {
    const { api: realApi } = await import("@/lib/api");
    const get = vi.spyOn(realApi, "get").mockResolvedValue({ status: "success", message: "ok", data: [refundReturn, keptReturn] } as any);
    const { fetchSaleReturns: realFetch } = await vi.importActual<typeof import("../returns/returns.api")>("../returns/returns.api");
    const rows = await realFetch(501);
    expect(get).toHaveBeenCalledWith("/invoices/501/sale-returns");
    expect(rows.map((r) => r.return_id)).toEqual([31, 32]);
    expect(rows[0].lines[1]).toMatchObject({ condition: "damaged", value: 450 });
    expect(rows[1].settlement).toMatchObject({ mode: "credit", credited: 720 });
    get.mockRestore();
  });
});

describe("after a return", () => {
  const saleLine = { sale_line_id: 11, product_id: 1, line_kind: "item", description: "Steel nail", unit_label: "pcs", unit_factor: 1, qty: 3, base_qty: 3, unit_price: 1000, line_discount: 0, bill_discount_share: 0, line_total: 3000, status: "sold" };

  function Launcher() {
    const { open } = useOverlay();
    return <button onClick={() => open(RETURN_OVERLAY_ID, { invoiceId: 501, invoice: currentInvoice, saleLineId: 11 })}>open-return</button>;
  }

  it("offers Print slip, loads the newest return from GET sale-returns and opens its slip", async () => {
    signIn({ permissions: ["retail:return", "retail:view"] });
    currentInvoice = bill({ SaleLines: [saleLine], total_amount: 9910, Payments: [{ payment_amount: 9910, method: "Cash" }], Customer: { first_name: "Walk-in", is_walk_in: true } });
    api.postSaleReturn.mockResolvedValue({ invoice: {}, settlement: { refunded: 3000, credited: 0, payment_id: 9 } });
    api.fetchSaleReturns.mockResolvedValue([normalizeSaleReturn(refundReturn), normalizeSaleReturn(keptReturn)]);
    renderCatalogUi(<Launcher />);
    fireEvent.click(screen.getByText("open-return"));
    await screen.findByText("Return · INV-501");
    fireEvent.click(screen.getByRole("button", { name: /return & refund/i }));
    expect(await screen.findByTestId("return-done")).toBeTruthy();
    expect(api.fetchSaleReturns).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Print slip" }));
    await waitFor(() => expect(api.fetchSaleReturns).toHaveBeenCalledWith(501));
    expect(await screen.findByText("Return slip · INV-501")).toBeTruthy();
    expect(screen.getAllByText(/Refunded \(Cash\)/).length).toBeGreaterThan(0); // slip 31, the newest
    expect(screen.queryByText(/Kept on bill/)).toBeNull();
  }, 15000);

  it("the bill's print history lists each return with its own Print return slip button", async () => {
    useAuthStore.setState({ user: { first_name: "Nimal", plan: { features: { retail: true } }, configData: {} } as any });
    currentInvoice = bill();
    api.fetchSaleReturns.mockResolvedValue([normalizeSaleReturn(refundReturn), normalizeSaleReturn(keptReturn)]);
    renderCatalogUi(<ReturnSlipsSection invoiceId={501} active />);
    const buttons = await screen.findAllByRole("button", { name: "Print return slip" });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);
    expect(await screen.findByText("Return slip · INV-501")).toBeTruthy();
    expect(screen.getAllByText(/Kept on bill/).length).toBeGreaterThan(0); // the second return (32)
  });

  it("shows nothing when the bill has no returns, or retail is off", async () => {
    api.fetchSaleReturns.mockResolvedValue([]);
    useAuthStore.setState({ user: { first_name: "Nimal", plan: { features: { retail: true } }, configData: {} } as any });
    const { container, unmount } = renderCatalogUi(<ReturnSlipsSection invoiceId={501} active />);
    await waitFor(() => expect(api.fetchSaleReturns).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="return-slips"]')).toBeNull();
    unmount();
    api.fetchSaleReturns.mockClear();
    useAuthStore.setState({ user: { first_name: "Nimal", plan: { features: { retail: false } }, configData: {} } as any });
    renderCatalogUi(<ReturnSlipsSection invoiceId={501} active />);
    expect(api.fetchSaleReturns).not.toHaveBeenCalled();
  });
});
