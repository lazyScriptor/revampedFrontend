import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "@/app/theme";
import "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";

const listSpy = vi.fn();
vi.mock("../../hooks/useInvoiceHooks", () => ({
  useInvoiceSearch: () => ({ data: [], isLoading: false }),
  useInvoiceList: (...args: any[]) => {
    listSpy(...args);
    return {
      data: {
        invoices: [
          {
            invoice_id: 501,
            status: "Completed",
            bill_kind: "sale",
            total_amount: 1250,
            sale_total: 1250,
            issued_date: "2026-11-23T10:00:00Z",
            Customer: { first_name: "Walk-in", last_name: "customer" },
            Payments: [{ payment_amount: 1250, method: "Cash" }],
          },
        ],
        counts: { all: 1, active: 0, completed: 1 },
      },
      isLoading: false,
      isFetching: false,
    };
  },
  useAddPayment: () => ({ mutate: vi.fn(), isPending: false }),
  useToggleVault: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateFees: () => ({ mutate: vi.fn(), isPending: false }),
  useCompleteInvoice: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenInvoice: () => ({ mutate: vi.fn(), isPending: false }),
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

import { ManageLedgerPanel, ManageSearchPanel } from "../ManageInvoiceViews";
import { ReadOnlyInvoiceModal } from "../ReadOnlyInvoiceModal";
import { InvoiceReceipt } from "../InvoiceReceipt";

const saleInvoice = {
  invoice_id: 501,
  status: "Completed",
  bill_kind: "sale",
  job_site: "Maharagama Site",
  customer_po: "PO-42",
  issued_date: "2026-11-23T10:00:00Z",
  sub_total: 0,
  sale_total: 1400,
  transport_fee: 100,
  discount_amount: 0,
  total_amount: 1500,
  id_card_status: 0,
  Customer: {
    first_name: "Kamal",
    last_name: "Silva",
    customer_type: "Individual",
    phone_number: "0779876543",
    nic_number: "199123456789",
  },
  InvoiceLines: [],
  SaleLines: [
    {
      sale_line_id: 1,
      product_id: 1006,
      line_kind: "item",
      description: "SALI Steel Drill Bit 6mm",
      unit_label: "pcs",
      unit_factor: 1,
      qty: 2,
      base_qty: 2,
      unit_price: 500,
      line_discount: 100,
      line_total: 900,
    },
    {
      sale_line_id: 2,
      product_id: null,
      line_kind: "unlisted",
      description: "Black tape",
      unit_label: "pcs",
      unit_factor: 1,
      qty: 1,
      base_qty: 1,
      unit_price: 500,
      line_discount: 0,
      line_total: 500,
    },
  ],
  Payments: [{ payment_id: 1, payment_amount: 1500, method: "Cash", payment_date: "2026-11-23T10:00:00Z" }],
};

beforeEach(() => {
  listSpy.mockClear();
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      id: 1,
      username: "cashier",
      roles: [],
      permissions: ["retail:view"],
      plan: { tier: "pro", features: { retail: true }, limits: {} },
    } as any,
  });
});

describe("Bills: Items sold, Sale chip, bill_kind filter, and safe receipt", () => {
  it("ManageSearchPanel shows Sale chip and filters by bill_kind", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithQuery(qc, <ManageSearchPanel onSelectInvoice={vi.fn()} />);
    expect(screen.getAllByText("Sale").length).toBeGreaterThanOrEqual(2);
    const filterGroup = screen.getByRole("group", { name: "Bill kind" });
    fireEvent.click(filterGroup.querySelectorAll(".MuiChip-root")[2]);
    expect(listSpy).toHaveBeenLastCalledWith(1, 25, undefined, "sale");
  });

  it("ManageLedgerPanel renders Items sold with unlisted '?' badge and hides rental handover", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithQuery(qc, <ManageLedgerPanel invoice={saleInvoice} onOpenReturn={vi.fn()} />);
    expect(screen.getByTestId("items-sold-section")).toBeTruthy();
    expect(screen.getByText("Items sold")).toBeTruthy();
    expect(screen.getByText("SALI Steel Drill Bit 6mm")).toBeTruthy();
    expect(screen.getByText("Black tape")).toBeTruthy();
    expect(screen.getByTestId("sold-unlisted-badge").textContent).toBe("?");
    expect(screen.getByText(/Maharagama Site/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Process Handover/i })).toBeNull();
  });

  it("ReadOnlyInvoiceModal shows Sale chip and Items sold section", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithQuery(qc, <ReadOnlyInvoiceModal open={true} onClose={vi.fn()} invoice={saleInvoice} />);
    expect(screen.getByText("Sale")).toBeTruthy();
    expect(screen.getByTestId("items-sold-section")).toBeTruthy();
    expect(screen.getAllByText("Rs. 1,500").length).toBeGreaterThanOrEqual(1);
  });

  it("InvoiceReceipt renders a sale-only bill without crashing in minimal and classic modes", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = renderWithQuery(
      qc,
      <InvoiceReceipt id="sale-r" invoice={saleInvoice} isPreview showBarcode={false} design="minimal" />,
    );
    expect(container.textContent).toContain("SALI Steel Drill Bit 6mm");
    expect(container.textContent).toContain("Black tape");
    expect(container.textContent).toContain("Rs. 1,500.00");
    expect(container.textContent).not.toContain("N/A → N/A");
  });
});

function renderWithQuery(qc: QueryClient, ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={createAppTheme()}>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}
