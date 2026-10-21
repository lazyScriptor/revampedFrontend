import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import InvoicesRoute from "../Invoices";

const renderRoute = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <InvoicesRoute />
    </QueryClientProvider>,
  );

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ mode: "dispatch" }),
}));

vi.mock("@/features/invoices/hooks/useInvoiceHooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/invoices/hooks/useInvoiceHooks")>();
  return {
    ...actual,
    useInvoiceDetails: () => ({ data: null, isLoading: false }),
    useProcessReturn: () => ({ mutate: vi.fn(), isPending: false }),
    handlePrintInvoice: vi.fn(),
  };
});

vi.mock("@/features/invoices/components/PosCustomerPanel", () => ({
  PosCustomerPanel: () => <div data-testid="pos-customer-panel">Customer Panel</div>,
}));

vi.mock("@/features/invoices/components/PosLedgerPanel", () => ({
  PosLedgerPanel: () => <div data-testid="pos-ledger-panel">Ledger Panel</div>,
  calculateLineMath: () => ({ lineCost: 0 }),
}));

vi.mock("@/features/invoices/components/PosCheckoutPanel", () => ({
  PosCheckoutPanel: () => <div data-testid="pos-checkout-panel">Checkout Panel</div>,
}));

vi.mock("@/features/invoices/components/ManageInvoiceViews", () => ({
  ManageSearchPanel: () => <div data-testid="manage-search-panel">Manage Search</div>,
  ManageLedgerPanel: () => <div data-testid="manage-ledger-panel">Manage Ledger</div>,
  ManageFinancialPanel: () => <div data-testid="manage-financial-panel">Manage Financial</div>,
}));

describe("InvoicesRoute Component Tests", () => {
  it("renders InvoicesRoute in dispatch mode with Chip and panels without throwing reference errors", () => {
    renderRoute();

    // Step 1 Chip is rendered in Pane 1
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByTestId("pos-customer-panel")).toBeInTheDocument();
    expect(screen.getByTestId("pos-ledger-panel")).toBeInTheDocument();
    expect(screen.getByTestId("pos-checkout-panel")).toBeInTheDocument();
  });

  it("switches to manage mode and renders Index Chip and management panels", async () => {
    renderRoute();

    const manageBtn = screen.getByRole("button", { name: /manage orders/i });
    fireEvent.click(manageBtn);

    expect(await screen.findByText("Index")).toBeInTheDocument();
    expect(screen.getByTestId("manage-search-panel")).toBeInTheDocument();
    expect(screen.getByTestId("manage-ledger-panel")).toBeInTheDocument();
    expect(screen.getByTestId("manage-financial-panel")).toBeInTheDocument();
  });
});
