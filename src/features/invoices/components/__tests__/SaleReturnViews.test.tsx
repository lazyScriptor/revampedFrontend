import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";
import { ItemsSoldSection } from "../ItemsSoldSection";
import { ReadOnlyInvoiceModal } from "../ReadOnlyInvoiceModal";
import { invoiceTotals } from "../../lib/invoiceTotals";

vi.mock("@/features/signatures/hooks/useSignatures", () => ({ useInvoiceSignatures: () => ({ data: { signatures: [] } }) }));
vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({ WhatsAppButton: () => null }));

const line = (over: Record<string, any>) => ({
  sale_line_id: 1,
  product_id: 5,
  line_kind: "item",
  description: "Steel nail",
  unit_label: "pcs",
  unit_factor: 1,
  qty: 3,
  base_qty: 3,
  unit_price: 1000,
  line_discount: 0,
  bill_discount_share: 0,
  line_total: 3000,
  status: "sold",
  ...over,
});

const invoice = (over: Record<string, any> = {}) => ({
  invoice_id: 700,
  status: "Completed",
  bill_kind: "sale",
  sale_total: 4030,
  total_amount: 4030,
  returned_total: 970,
  issued_date: "2026-11-23T10:00:00Z",
  Customer: { first_name: "Walk-in", is_walk_in: true },
  InvoiceLines: [],
  Payments: [{ payment_id: 1, payment_amount: 4030, method: "Cash" }],
  SaleLines: [
    line({ sale_line_id: 1, returned_base_qty: 1, status: "partly_returned" }),
    line({ sale_line_id: 2, description: "Tape", qty: 1, base_qty: 1, line_total: 500, returned_base_qty: 1, status: "returned" }),
  ],
  InvoiceTraces: [
    { trace_id: 1, event_category: "RETAIL", event_action: "SALE_RETURN", createdAt: "2026-11-23T11:00:00Z", state_payload: { lines: [{}, {}], value: 1180, settlement: { refunded: 1180, method: "Cash" } } },
  ],
  ...over,
});

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: true,
    user: { id: 1, email: "a@b.c", username: "c", roles: [], permissions: ["retail:return"] } as any,
  });
});

describe("bill views after a return", () => {
  it("shows Returned 1 of 3 on the line, greys a fully returned line, and offers Return only where something is left", () => {
    render(<ItemsSoldSection invoice={invoice()} />);
    const chips = screen.getAllByTestId("returned-chip");
    expect(chips[0].textContent).toContain("Returned 1 of 3");
    const rows = screen.getAllByTestId("sold-line");
    expect(rows[0].hasAttribute("data-returned")).toBe(false);
    expect(rows[1].getAttribute("data-returned")).toBe("true");
    expect(screen.getAllByRole("button", { name: /^Return Steel nail/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /^Return Tape/ })).toBeNull();
    expect(screen.getByTestId("return-items-btn")).toBeTruthy();
  });

  it("hides every Return action when the bill is deleted, nothing is returnable, or the user may not return", () => {
    const { unmount } = render(<ItemsSoldSection invoice={invoice({ is_deleted: true })} />);
    expect(screen.queryByTestId("return-items-btn")).toBeNull();
    unmount();
    useAuthStore.setState({ user: { id: 1, roles: [], permissions: [] } as any });
    render(<ItemsSoldSection invoice={invoice()} />);
    expect(screen.queryByTestId("return-items-btn")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Return Steel nail/ })).toBeNull();
  });

  it("totals read the server's figures and add a Returned row", () => {
    expect(invoiceTotals(invoice()).returned).toBe(970);
    expect(invoiceTotals(invoice({ returned_total: undefined })).returned).toBe(0);
    render(<ReadOnlyInvoiceModal open onClose={vi.fn()} invoice={invoice()} />);
    expect(screen.getByTestId("totals-returned").textContent).toContain("− Rs. 970");
  });

  it("writes the SALE_RETURN event in words", () => {
    render(<ReadOnlyInvoiceModal open onClose={vi.fn()} invoice={invoice()} />);
    expect(screen.getByText(/Returned 2 items · Rs 1,180 refunded in cash/)).toBeTruthy();
  });

  it("closes the read-only modal before the return overlay opens", () => {
    const onClose = vi.fn();
    render(<ReadOnlyInvoiceModal open onClose={onClose} invoice={invoice()} />);
    fireEvent.click(screen.getByTestId("return-items-btn"));
    expect(onClose).toHaveBeenCalled();
  });
});
