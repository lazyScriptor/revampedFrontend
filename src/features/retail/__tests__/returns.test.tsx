import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import "@/i18n";

const api = { postSaleReturn: vi.fn(), fetchReturnFind: vi.fn() };
vi.mock("../returns/returns.api", async (orig) => ({
  ...(await orig<typeof import("../returns/returns.api")>()),
  postSaleReturn: (...a: any[]) => api.postSaleReturn(...a),
  fetchReturnFind: (...a: any[]) => api.fetchReturnFind(...a),
}));

let currentInvoice: any = null;
vi.mock("@/features/invoices/hooks/useInvoiceHooks", () => ({
  useInvoiceDetails: () => ({ data: currentInvoice }),
}));
vi.mock("../catalog/useRetailCatalog", () => ({
  useRetailCatalog: () => ({ index: { byId: new Map() } }),
}));
const approval = { request: vi.fn() };
vi.mock("../approval/useApproval", () => ({ useApproval: () => ({ request: approval.request }) }));
vi.mock("../finder/ItemFinder", () => ({
  ItemFinder: ({ onPick }: any) => <button onClick={() => onPick({ product_id: 77, name: "Cement bag" })}>pick-cement</button>,
}));
vi.mock("../stock/useStockLevels", () => ({ invalidateStock: vi.fn() }));

import { useOverlay } from "@/components/overlay";
import { FIND_RETURN_OVERLAY_ID, RETURN_OVERLAY_ID } from "../catalog/overlayIds";
import "../catalog/registerCatalog";
import { renderCatalogUi, signIn } from "./catalogTestUtils";

const saleLines = () => [
  { sale_line_id: 11, product_id: 1, line_kind: "item", description: "Steel nail", unit_label: "pcs", unit_factor: 1, qty: 3, base_qty: 3, unit_price: 1000, line_discount: 0, bill_discount_share: 90, line_total: 3000, status: "sold" },
  { sale_line_id: 12, product_id: 2, line_kind: "item", description: "Screws", unit_id: 7, unit_label: "box", unit_factor: 10, qty: 2, base_qty: 20, unit_price: 1000, line_discount: 0, bill_discount_share: 0, line_total: 2000, status: "sold", base_unit: "pcs" },
  { sale_line_id: 13, product_id: 3, line_kind: "item", description: "Drill", unit_label: "pcs", unit_factor: 1, qty: 1, base_qty: 1, unit_price: 5000, line_discount: 0, bill_discount_share: 0, line_total: 5000, status: "sold", serials: ["SN-1"] },
];
const bill = (over: Record<string, any> = {}) => ({
  invoice_id: 501,
  status: "Completed",
  bill_kind: "sale",
  total_amount: 9910,
  Customer: { first_name: "Walk-in", is_walk_in: true },
  Payments: [{ payment_id: 1, payment_amount: 9910, method: "Cash" }],
  SaleLines: saleLines(),
  ...over,
});

function Launcher({ lineId = 11 }: { lineId?: number | null }) {
  const { open } = useOverlay();
  return (
    <div>
      <button onClick={() => open(RETURN_OVERLAY_ID, { invoiceId: 501, invoice: currentInvoice, saleLineId: lineId })}>open-return</button>
      <button onClick={() => open(FIND_RETURN_OVERLAY_ID)}>open-find</button>
    </div>
  );
}

const show = async (invoice: any, lineId: number | null = 11) => {
  currentInvoice = invoice;
  renderCatalogUi(<Launcher lineId={lineId} />);
  fireEvent.click(screen.getByText("open-return"));
  await screen.findByText("Return · INV-501");
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: /return & refund|^return$/i }));
const summaryText = () => screen.getByTestId("return-summary").textContent ?? "";

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  approval.request.mockReset();
  signIn({ permissions: ["retail:return", "retail:view"] });
  api.postSaleReturn.mockResolvedValue({ invoice: {}, settlement: { refunded: 970, credited: 0, payment_id: 9 } });
});

describe("return overlay", () => {
  it("limits the quantity and shows the live value", async () => {
    await show(bill());
    expect(summaryText()).toContain("Rs 970"); // net 2,910 / 3, first unit preselected
    const plus = screen.getAllByRole("button", { name: "More" })[0];
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus); // only 3 sold
    expect((screen.getByRole("textbox", { name: "Quantity of Steel nail" }) as HTMLInputElement).value).toBe("3");
    expect(summaryText()).toContain("Rs 2,910");
    expect((plus).hasAttribute("disabled") || (plus).getAttribute("aria-disabled") === "true").toBe(true);
  });

  it("posts good/damaged, the fixed refund on a Completed bill, and the same idempotency key across a retry", async () => {
    api.postSaleReturn.mockRejectedValueOnce({ response: { status: 500, data: { message: "Server hiccup" } } });
    await show(bill());
    fireEvent.click(screen.getAllByRole("button", { name: /Damaged/ })[0]);
    submit();
    await screen.findByText("Server hiccup");
    submit();
    await waitFor(() => expect(api.postSaleReturn).toHaveBeenCalledTimes(2));
    const [id, body, key] = api.postSaleReturn.mock.calls[0];
    expect(id).toBe(501);
    expect(body).toEqual({ lines: [{ sale_line_id: 11, qty: 1, condition: "damaged" }], settlement: { mode: "refund", method: "Cash" } });
    expect(typeof key).toBe("string");
    expect(api.postSaleReturn.mock.calls[1][2]).toBe(key);
  });

  it("Keep on bill is hidden for the walk-in; the refund amount is fixed when the bill is Completed", async () => {
    await show(bill());
    expect(screen.queryByRole("button", { name: "Keep on bill" })).toBeNull();
    expect((screen.getByRole("textbox", { name: "Refund amount" })).hasAttribute("disabled") || (screen.getByRole("textbox", { name: "Refund amount" })).getAttribute("aria-disabled") === "true").toBe(true);
  });

  it("Keep on bill is disabled on a Completed bill for a named customer", async () => {
    await show(bill({ Customer: { first_name: "Kamal", is_walk_in: false } }));
    expect((screen.getByRole("button", { name: "Keep on bill" })).hasAttribute("disabled") || (screen.getByRole("button", { name: "Keep on bill" })).getAttribute("aria-disabled") === "true").toBe(true);
  });

  it("an open bill: the refund is capped, credit is allowed and sends no amount or method", async () => {
    const open = bill({ status: "Active", Customer: { first_name: "Kamal", is_walk_in: false }, Payments: [{ payment_amount: 9500 }] });
    await show(open);
    const amount = screen.getByRole("textbox", { name: "Refund amount" }) as HTMLInputElement;
    expect(amount.value).toBe("560"); // 9,500 paid - (9,910 - 970)
    fireEvent.change(amount, { target: { value: "600" } });
    expect(screen.getByText(/At most Rs 560/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /return & refund/i })).hasAttribute("disabled") || (screen.getByRole("button", { name: /return & refund/i })).getAttribute("aria-disabled") === "true").toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Keep on bill" }));
    submit();
    await waitFor(() => expect(api.postSaleReturn).toHaveBeenCalled());
    expect(api.postSaleReturn.mock.calls[0][1].settlement).toEqual({ mode: "credit" });
  });

  it("returns a pack in single pieces", async () => {
    await show(bill(), 12);
    fireEvent.click(screen.getByRole("button", { name: "pcs" })); // unit chip: pieces
    fireEvent.change(screen.getByRole("textbox", { name: "Quantity of Screws" }), { target: { value: "5" } });
    expect(summaryText()).toContain("Rs 500"); // 2,000 x 5 / 20
    submit();
    await waitFor(() => expect(api.postSaleReturn).toHaveBeenCalled());
    expect(api.postSaleReturn.mock.calls[0][1].lines).toEqual([{ sale_line_id: 12, qty: 5, condition: "good" }]);
  });

  it("a serial line shows the serial sold, prefilled, and sends it", async () => {
    await show(bill(), 13);
    expect((screen.getByRole("textbox", { name: "Serial" }) as HTMLInputElement).value).toBe("SN-1");
    submit();
    await waitFor(() => expect(api.postSaleReturn).toHaveBeenCalled());
    expect(api.postSaleReturn.mock.calls[0][1].lines).toEqual([{ sale_line_id: 13, qty: 1, condition: "good", serial_no: "SN-1" }]);
  });

  it("asks a manager when the server wants approval, then retries with the token", async () => {
    api.postSaleReturn.mockRejectedValueOnce({ response: { status: 409, data: { code: "APPROVAL_REQUIRED", message: "Needs manager approval (return_no_bill)" } } });
    approval.request.mockResolvedValue({ approval_token: "tok-1", exception_id: 3 });
    await show(bill());
    submit();
    await waitFor(() => expect(api.postSaleReturn).toHaveBeenCalledTimes(2));
    expect(approval.request).toHaveBeenCalledWith(expect.objectContaining({ type: "return_no_bill" }));
    expect(api.postSaleReturn.mock.calls[1][1].approval_tokens).toEqual({ return_no_bill: "tok-1" });
  });

  it("any other 409 shows the server's message as is", async () => {
    api.postSaleReturn.mockRejectedValueOnce({ response: { status: 409, data: { message: "Only 1 can still be returned" } } });
    await show(bill());
    submit();
    expect(await screen.findByText("Only 1 can still be returned")).toBeTruthy();
    expect(approval.request).not.toHaveBeenCalled();
  });
});

describe("find the bill", () => {
  const row = { invoice_id: 501, doc_number: "INV-501", issued_date: "2026-11-20", customer_name: "Kamal Silva", sale_line_id: 11, product_id: 77, description: "Cement bag", unit_label: "bag", qty_sold: 4, qty_returnable: 3, unit_price: 1850 };

  it("searches by customer, then by item, and opens the chosen bill's return", async () => {
    api.fetchReturnFind.mockResolvedValue([row]);
    currentInvoice = bill();
    renderCatalogUi(<Launcher />);
    fireEvent.click(screen.getByText("open-find"));
    const box = await screen.findByRole("textbox", { name: /customer, phone or bill/i });
    fireEvent.change(box, { target: { value: "Kamal" } });
    await waitFor(() => expect(api.fetchReturnFind).toHaveBeenCalledWith(expect.objectContaining({ q: "Kamal", product_id: null })));

    fireEvent.click(screen.getByRole("button", { name: "Item" }));
    fireEvent.click(await screen.findByText("pick-cement"));
    await waitFor(() => expect(api.fetchReturnFind).toHaveBeenCalledWith(expect.objectContaining({ product_id: 77 })));

    const hit = await screen.findByText("Cement bag", { selector: "p" });
    expect(screen.getByText(/3 of 4 bag returnable/)).toBeTruthy();
    fireEvent.click(hit);
    await screen.findByText("Return · INV-501");
  });
});
