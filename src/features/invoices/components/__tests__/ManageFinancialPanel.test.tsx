import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useAuthStore } from "@/stores/useAuthStore";

const pay = vi.fn();
const fees = vi.fn();
const complete = vi.fn();
const reopen = vi.fn();
const vault = vi.fn();
vi.mock("../../hooks/useInvoiceHooks", () => ({
  useAddPayment: () => ({ mutate: pay, isPending: false }),
  useUpdateFees: () => ({ mutate: fees, isPending: false }),
  useCompleteInvoice: () => ({ mutate: complete, isPending: false }),
  useReopenInvoice: () => ({ mutate: reopen, isPending: false }),
  useToggleVault: () => ({ mutate: vault, isPending: false }),
}));
vi.mock("../ReceiptPrintDialog", () => ({ ReceiptPrintDialog: () => null }));
vi.mock("../InvoicePrintHistoryDialog", () => ({ InvoicePrintHistoryDialog: () => null }));
vi.mock("../DeleteInvoiceDialog", () => ({ DeleteInvoiceDialog: () => null }));
vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({ WhatsAppButton: () => null }));

import { ManageFinancialPanel } from "../ManageFinancialPanel";

const line = (over = {}) => ({ line_id: 1, borrow_quantity: 2, good_returned_qty: 2, defective_returned_qty: 0, ...over });
const invoice = (over: Record<string, unknown> = {}) => ({
  invoice_id: 42,
  status: "PendingPayment",
  sub_total: "10000",
  transport_fee: "0",
  discount_amount: "0",
  total_amount: "10000",
  id_card_status: 1,
  InvoiceLines: [line()],
  Payments: [{ payment_id: 1, payment_amount: "10000", method: "Cash", payment_date: "2026-10-20T05:00:00Z" }],
  ...over,
});
const showToast = vi.fn();
const renderPanel = (inv = invoice()) => render(<ManageFinancialPanel invoice={inv} showToast={showToast} isCollapsed={false} onToggleCollapse={vi.fn()} />);
const completeBtn = () => screen.getByRole("button", { name: "Complete invoice" });

beforeEach(() => {
  [pay, fees, complete, reopen, vault, showToast].forEach((f) => f.mockReset());
  useAuthStore.setState({ user: { permissions: [], roles: ["admin"] } as any });
});

describe("ManageFinancialPanel", () => {
  it("returned and settled → can be completed (with the ID card released)", () => {
    renderPanel();
    expect(screen.getByText("Returned · open")).toBeInTheDocument();
    expect(screen.getByText("All items returned")).toBeInTheDocument();
    expect(screen.getByText("Money settled")).toBeInTheDocument();
    fireEvent.click(completeBtn());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("checkbox", { name: "Give the customer's ID card back" })).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "Complete invoice" }));
    expect(complete).toHaveBeenCalledWith({ id: 42, release_id_card: true }, expect.any(Object));
  });

  it("an advance still owed back blocks completion and pre-fills the refund", () => {
    renderPanel(invoice({ Payments: [{ payment_id: 1, payment_amount: "12000", method: "Cash" }] }));
    expect(screen.getByTestId("money-hero")).toHaveTextContent("Rs. 2,000");
    expect(screen.getAllByText("Refund due to customer").length).toBeGreaterThan(0);
    expect(screen.getByText("Refund Rs. 2,000 to the customer first")).toBeInTheDocument();
    expect(completeBtn()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refund" })).toHaveAttribute("aria-pressed", "true"); // preselected
    fireEvent.click(screen.getByText("Fill Rs. 2,000"));
    fireEvent.click(screen.getByRole("button", { name: "Refund Rs. 2,000" }));
    expect(pay).toHaveBeenCalledWith({ id: 42, data: { amount: 2000, method: "Cash", is_refund: true } }, expect.any(Object));
  });

  it("a balance owed blocks completion; collecting uses the chosen method", () => {
    renderPanel(invoice({ Payments: [{ payment_id: 1, payment_amount: "4000", method: "Cash" }] }));
    expect(screen.getByText("Collect Rs. 6,000 or give a discount first")).toBeInTheDocument();
    expect(completeBtn()).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "6000" } });
    fireEvent.click(screen.getByText("Bank transfer"));
    fireEvent.click(screen.getByRole("button", { name: "Collect Rs. 6,000" }));
    expect(pay).toHaveBeenCalledWith({ id: 42, data: { amount: 6000, method: "Transfer", is_refund: false } }, expect.any(Object));
  });

  it("items still out block completion", () => {
    renderPanel(invoice({ status: "Active", InvoiceLines: [line({ good_returned_qty: 1 })] }));
    expect(screen.getByText("1 item still out")).toBeInTheDocument();
    expect(completeBtn()).toBeDisabled();
  });

  it("the discount stays editable until completion and saves on its own", () => {
    renderPanel(invoice({ Payments: [{ payment_id: 1, payment_amount: "8000", method: "Cash" }] }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Discount" }));
    const box = screen.getByRole("textbox", { name: "Discount" });
    fireEvent.change(box, { target: { value: "2000" } });
    expect(screen.getByRole("textbox", { name: "Discount" })).toBe(box); // keeps focus/identity while typing
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(fees).toHaveBeenCalledWith({ id: 42, data: { transport_fee: 0, discount_amount: 2000 } }, expect.any(Object));
  });

  it("completed: read-only money, no payment box, can be reopened", () => {
    renderPanel(invoice({ status: "Completed" }));
    expect(screen.getByText("Invoice completed")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Amount" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Discount" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    expect(reopen).toHaveBeenCalledWith(42, expect.any(Object));
  });

  it("refund is unavailable when nothing was paid", () => {
    renderPanel(invoice({ Payments: [] }));
    expect(screen.getByRole("button", { name: "Refund" })).toBeDisabled();
  });

  it("ignores voided payments", () => {
    renderPanel(invoice({ Payments: [{ payment_id: 1, payment_amount: "10000", method: "Cash" }, { payment_id: 2, payment_amount: "5000", method: "Cash", is_voided: true }] }));
    expect(screen.getByText("Money settled")).toBeInTheDocument();
  });
});
