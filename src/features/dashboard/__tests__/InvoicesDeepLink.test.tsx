import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockNavigate = vi.fn();
let mockSearchState: { mode?: "dispatch" | "manage"; invoiceId?: number } = {};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearchState,
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(async (url: string) => {
      if (url.startsWith("/invoices/")) {
        return { data: { invoice: { invoice_id: 321, status: "Active", InvoiceLines: [], Payments: [] } } };
      }
      return { data: { invoices: [], totalItems: 0 } };
    }),
    post: vi.fn(async () => ({})),
    patch: vi.fn(async () => ({})),
  },
}));

vi.mock("@/features/invoices/components/PosCustomerPanel", () => ({
  PosCustomerPanel: () => <div data-testid="pos-customer-panel" />,
}));
vi.mock("@/features/invoices/components/PosLedgerPanel", () => ({
  PosLedgerPanel: () => <div data-testid="pos-ledger-panel" />,
  calculateLineMath: () => ({ lineCost: 0 }),
}));
vi.mock("@/features/invoices/components/PosCheckoutPanel", () => ({
  PosCheckoutPanel: () => <div data-testid="pos-checkout-panel" />,
}));
vi.mock("@/features/invoices/components/ManageInvoiceViews", () => ({
  ManageSearchPanel: ({ selectedInvoiceId }: any) => (
    <div data-testid="manage-search" data-selected-id={selectedInvoiceId ?? ""} />
  ),
  ManageLedgerPanel: ({ invoice }: any) => (
    <div data-testid="manage-ledger" data-invoice-id={invoice?.invoice_id ?? ""} />
  ),
  ManageFinancialPanel: () => <div data-testid="manage-financial" />,
}));
vi.mock("@/features/invoices/components/ReturnSettlementDialog", () => ({
  ReturnSettlementDialog: () => null,
}));
vi.mock("@/features/invoices/components/InvoiceReceipt", () => ({
  InvoiceReceipt: () => null,
}));
vi.mock("@/features/invoices/components/ReceiptPrintDialog", () => ({
  ReceiptPrintDialog: () => null,
}));
vi.mock("@/features/invoices/hooks/usePosEquipmentCatalog", () => ({
  POS_CATALOG_KEY: ["pos-catalog"],
}));

import InvoicesRoute from "@/routes/Invoices";

describe("/invoices deep link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchState = { mode: "manage", invoiceId: 321 };
  });

  it("selects invoiceId in manage mode and clears the invoiceId search param", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { getByTestId } = render(
      <QueryClientProvider client={qc}>
        <InvoicesRoute />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("manage-search").getAttribute("data-selected-id")).toBe("321");
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/invoices",
      search: { mode: "manage" },
      replace: true,
    });
  });
});
