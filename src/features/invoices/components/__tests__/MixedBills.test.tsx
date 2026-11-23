import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "@/app/theme";
import "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";

const listSpy = vi.fn();
const feesMutate = vi.fn();
const mockInvoices = [
  {
    invoice_id: 601,
    status: "Active",
    bill_kind: "mixed",
    total_amount: 1900,
    items_sold_count: 3,
    issued_date: "2026-11-23T10:00:00Z",
    Customer: { first_name: "Nimal", last_name: "Perera" },
    Payments: [],
  },
  {
    invoice_id: 501,
    status: "Completed",
    bill_kind: "sale",
    total_amount: 1250,
    items_sold_count: 1,
    issued_date: "2026-11-22T10:00:00Z",
    Customer: { first_name: "Walk-in", last_name: "customer" },
    Payments: [{ payment_amount: 1250, method: "Cash" }],
  },
  {
    invoice_id: 401,
    status: "Active",
    bill_kind: "rental",
    total_amount: 3000,
    items_sold_count: 0,
    issued_date: "2026-11-21T10:00:00Z",
    Customer: { first_name: "Kamal", last_name: "Silva" },
    Payments: [],
  },
];
vi.mock("../../hooks/useInvoiceHooks", () => ({
  useInvoiceSearch: () => ({ data: [], isLoading: false }),
  useInvoiceList: (...args: any[]) => {
    listSpy(...args);
    return { data: { invoices: mockInvoices, counts: { all: 3, active: 2, completed: 1 } }, isLoading: false, isFetching: false };
  },
  useAddPayment: () => ({ mutate: vi.fn(), isPending: false }),
  useToggleVault: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateFees: () => ({ mutate: feesMutate, isPending: false }),
  useCompleteInvoice: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenInvoice: () => ({ mutate: vi.fn(), isPending: false }),
  useProcessReturn: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/features/reviews/hooks/useInvoiceReviews", () => ({
  useInvoiceReviews: () => ({ data: [], isLoading: false }),
  useCreateReview: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/features/reviews/components/ReviewThread", () => ({ ReviewThread: () => null }));
vi.mock("@/features/reviews/components/ReviewComposer", () => ({ ReviewComposer: () => null }));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useInvoiceSignatures: () => ({ data: { signatures: [] } }),
}));
vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({ WhatsAppButton: () => null }));
vi.mock("../ReceiptPrintDialog", () => ({ ReceiptPrintDialog: () => null }));
vi.mock("../InvoicePrintHistoryDialog", () => ({ InvoicePrintHistoryDialog: () => null }));

const deleteMutate = vi.fn();
const restoreMutate = vi.fn();
const toast = { showSuccess: vi.fn(), showError: vi.fn() };
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => toast }));
vi.mock("../../hooks/useInvoiceDeletionHooks", async (orig) => ({
  ...(await orig<typeof import("../../hooks/useInvoiceDeletionHooks")>()),
  useDeleteInvoice: () => ({ mutate: deleteMutate, isPending: false }),
  useRestoreInvoice: () => ({ mutate: restoreMutate, isPending: false }),
  useDeletedInvoices: () => ({
    data: {
      total: 2,
      page: 1,
      summary: { totalDeleted: 2, flaggedCount: 0 },
      invoices: [
        { invoice_id: 601, issued_date: "2026-11-23", total_amount: 1900, bill_kind: "mixed", sale_total: 450, status: "Deleted", customer: { first_name: "Nimal", last_name: "Perera" }, deleted_at: "2026-11-24", deleted_by_name: "Cashier", deleted_by_role: "Cashier", delete_reason: "Test entry", delete_note: null, delete_flagged: false, voided_amount: 0 },
        { invoice_id: 402, issued_date: "2026-11-23", total_amount: 3000, bill_kind: "rental", sale_total: 0, status: "Deleted", customer: { first_name: "Kamal", last_name: "Silva" }, deleted_at: "2026-11-24", deleted_by_name: "Cashier", deleted_by_role: "Cashier", delete_reason: "Test entry", delete_note: null, delete_flagged: false, voided_amount: 0 },
      ],
    },
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}));

import { ManageLedgerPanel, ManageSearchPanel } from "../ManageInvoiceViews";
import { ManageFinancialPanel } from "../ManageFinancialPanel";
import { ReadOnlyInvoiceModal } from "../ReadOnlyInvoiceModal";
import { InvoiceReceipt } from "../InvoiceReceipt";
import { ReturnSettlementDialog } from "../ReturnSettlementDialog";
import { DeleteInvoiceDialog } from "../DeleteInvoiceDialog";
import DeletedInvoicesReport from "@/features/reports/invoices/DeletedInvoicesReport";

// Rent 1500 (2 days of a Rs 750 drill) + goods 500 before a Rs 100 bill discount (goods share 50).
const mixedInvoice = {
  invoice_id: 601,
  status: "Active",
  bill_kind: "mixed",
  job_site: "Galle Site",
  issued_date: "2026-11-23T10:00:00Z",
  sub_total: 2000,
  sale_total: 450,
  transport_fee: 0,
  discount_amount: 100,
  total_amount: 1900,
  id_card_status: 1,
  Customer: { first_name: "Nimal", last_name: "Perera", customer_type: "Individual", phone_number: "0771234567", nic_number: "199012345678" },
  InvoiceLines: [
    {
      line_id: 11,
      equipment_id: 1,
      borrow_quantity: 1,
      good_returned_qty: 0,
      defective_returned_qty: 0,
      borrow_date: "2026-11-22",
      expected_return_date: "2026-11-24",
      locked_base_price: 750,
      locked_minimum_days: 1,
      locked_extra_daily_rate: 750,
      line_total_amount: 1500,
      line_status: "Active",
      track_overdue: false,
      Equipment: { equipment_name: "Hammer Drill", serial_number: "EQ-1" },
    },
  ],
  SaleLines: [
    { sale_line_id: 1, product_id: 1006, line_kind: "item", description: "SALI Steel Drill Bit 6mm", unit_label: "pcs", unit_factor: 1, qty: 2, base_qty: 2, unit_price: 250, line_discount: 0, bill_discount_share: 50, line_total: 450, status: "sold" },
  ],
  Payments: [{ payment_id: 1, payment_amount: 500, method: "Cash", payment_date: "2026-11-23T10:00:00Z" }],
};

const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ThemeProvider theme={createAppTheme()}>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  [listSpy, feesMutate, deleteMutate, restoreMutate, toast.showSuccess, toast.showError].forEach((f) => f.mockReset());
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      id: 1,
      username: "cashier",
      roles: ["admin"],
      permissions: ["retail:view", "invoice:restore", "invoice:delete:any"],
      plan: { tier: "pro", features: { retail: true }, limits: {} },
    } as any,
  });
});

describe("Manage: bill list", () => {
  it("has All · Rental · Sale · Mixed and filters by Mixed", () => {
    wrap(<ManageSearchPanel onSelectInvoice={vi.fn()} />);
    const group = screen.getByRole("group", { name: "Bill kind" });
    expect(Array.from(group.querySelectorAll(".MuiChip-root")).map((c) => c.textContent)).toEqual(["All", "Rent", "Sale", "Mixed"]);
    fireEvent.click(screen.getByTestId("bill-kind-mixed"));
    expect(listSpy).toHaveBeenLastCalledWith(1, 25, undefined, "mixed");
  });

  it("shows how many items were sold on sale and mixed rows only", () => {
    wrap(<ManageSearchPanel onSelectInvoice={vi.fn()} />);
    const counts = screen.getAllByTestId("items-sold-count").map((c) => c.textContent);
    expect(counts).toEqual(["3 items sold", "1 item sold"]);
  });
});

describe("Manage: a mixed bill", () => {
  it("shows the rental tracking board and the Items sold section together, with the handover button", () => {
    wrap(<ManageLedgerPanel invoice={mixedInvoice} onOpenReturn={vi.fn()} />);
    expect(screen.getByText("Asset Tracking Board")).toBeTruthy();
    expect(screen.getByText("Hammer Drill")).toBeTruthy();
    expect(screen.getByTestId("items-sold-section")).toBeTruthy();
    expect(screen.getByText("SALI Steel Drill Bit 6mm")).toBeTruthy();
    expect(screen.getByText("Mixed")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Process Handover/i })).toBeTruthy();
  });

  it("the totals panel reads Rent · Items · Discount · Total · Paid · Balance", () => {
    wrap(<ManageFinancialPanel invoice={mixedInvoice} showToast={vi.fn()} isCollapsed={false} onToggleCollapse={vi.fn()} />);
    const row = (label: string) => screen.getByText(label).parentElement as HTMLElement;
    expect(row("Rent").textContent).toContain("Rs. 1,500");
    expect(row("Items").textContent).toContain("Rs. 500");
    expect(row("Discount").textContent).toContain("Rs. 100");
    expect(row("Grand Total").textContent).toContain("Rs. 1,900");
    expect(screen.queryByText(/Late Fees/i)).toBeNull();
    expect(row("Total Paid").textContent).toContain("Rs. 500");
    expect(screen.getByTestId("money-hero").textContent).toContain("Rs. 1,400");
  });

  it("a discount the server refuses on a mixed bill shows the server's 409 message", () => {
    const showToast = vi.fn();
    feesMutate.mockImplementation((_a: any, opts: any) => opts.onError({ message: "Discount is more than the rental part of this bill" }));
    wrap(<ManageFinancialPanel invoice={mixedInvoice} showToast={showToast} isCollapsed={false} onToggleCollapse={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Discount" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Discount" }), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(showToast).toHaveBeenCalledWith("Discount is more than the rental part of this bill", "error");
  });

  it("the read-only modal shows both sections and Rent / Items rows", () => {
    wrap(<ReadOnlyInvoiceModal open onClose={vi.fn()} invoice={mixedInvoice} />);
    expect(screen.getByText("Mixed")).toBeTruthy();
    expect(screen.getByTestId("items-sold-section")).toBeTruthy();
    expect(screen.getByText("Hammer Drill")).toBeTruthy();
    expect(screen.getByTestId("totals-rent").textContent).toContain("Rs. 1,500");
    expect(screen.getByTestId("totals-items").textContent).toContain("Rs. 500");
    expect(screen.getAllByText("Rs. 1,900").length).toBeGreaterThan(0);
  });

  it("the return dialog lists the machines and never the sold items", () => {
    wrap(<ReturnSettlementDialog open onClose={vi.fn()} invoice={mixedInvoice} showToast={vi.fn()} />);
    expect(screen.getByText(/Hammer Drill/)).toBeTruthy();
    expect(screen.queryByText(/SALI Steel Drill Bit/)).toBeNull();
  });
});

describe("receipt for a mixed bill", () => {
  it("lists the rental then the sold items, with a total that matches the bill", () => {
    const { container } = wrap(<InvoiceReceipt id="mixed-r" invoice={mixedInvoice} isPreview showBarcode={false} design="minimal" />);
    const text = container.textContent || "";
    expect(text).toContain("Hammer Drill");
    expect(text).toContain("SALI Steel Drill Bit 6mm");
    expect(text.indexOf("Hammer Drill")).toBeLessThan(text.indexOf("SALI Steel Drill Bit 6mm"));
    expect(text).toContain("Rs. 1,900.00");
    // the sub_total already holds the goods, so they are not added a second time
    expect(text).not.toContain("Rs. 2,450.00");
    expect(text).not.toContain("Rs. 2,500.00");
    expect(text).not.toContain("N/A → N/A");
  });
});

describe("deleting and restoring bills with goods", () => {
  it("the delete confirm says the items go back to stock, only when the bill has goods", () => {
    const { unmount } = wrap(<DeleteInvoiceDialog open onClose={vi.fn()} invoice={mixedInvoice} />);
    expect(screen.getByTestId("delete-goods-effect").textContent).toBe("Items go back to stock.");
    unmount();
    wrap(<DeleteInvoiceDialog open onClose={vi.fn()} invoice={{ invoice_id: 401, bill_kind: "rental", Payments: [] }} />);
    expect(screen.queryByTestId("delete-goods-effect")).toBeNull();
  });

  it("the deleted-bills list shows the kind chip and the goods total", () => {
    wrap(<DeletedInvoicesReport />);
    expect(screen.getByTestId("deleted-kind-601").textContent).toBe("Mixed");
    expect(screen.queryByTestId("deleted-kind-402")).toBeNull();
    expect(screen.getByText("LKR 450.00")).toBeTruthy();
  });

  it("a restore refused for stock shows the server's message as it is", () => {
    const msg = "Cannot restore: not enough stock for SALI Steel Drill Bit 6mm (needs 2, 1 available)";
    restoreMutate.mockImplementation((_id: number, opts: any) => opts.onError({ message: msg }));
    wrap(<DeletedInvoicesReport />);
    fireEvent.click(screen.getAllByRole("button", { name: "Restore" })[0]);
    expect(toast.showError).toHaveBeenCalledWith(msg);
  });
});
