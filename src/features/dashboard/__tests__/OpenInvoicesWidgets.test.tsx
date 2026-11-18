import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => ({}),
}));

vi.mock("@/features/dashboard/api/dashboard.api", () => ({
  fetchDashboardConfig: vi.fn(),
  fetchKPIs: vi.fn(),
  fetchUtilizationSparkline: vi.fn(),
  fetchReturnsDueToday: vi.fn(),
  fetchMaintenanceQueue: vi.fn(),
  fetchOpenInvoices: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(async () => ({ data: { ok: true } })),
    patch: vi.fn(async () => ({})),
  },
}));

vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({
  WhatsAppButton: ({ templateKey, disabled }: any) => (
    <button
      type="button"
      data-testid="whatsapp-btn"
      data-template={templateKey}
      disabled={!!disabled}
    >
      WhatsApp
    </button>
  ),
}));

import * as dashboardApi from "@/features/dashboard/api/dashboard.api";
import { api } from "@/lib/api";
import OpenMoneyWidget from "../widgets/OpenMoneyWidget";
import OpenReturnsWidget from "../widgets/OpenReturnsWidget";
import { suggestedTemplateForOpenInvoice } from "@/features/whatsapp/lib/whatsapp";
import { ReadOnlyInvoiceModal } from "@/features/invoices/components/ReadOnlyInvoiceModal";
import { useAddPayment } from "@/features/invoices/hooks/useInvoiceHooks";
import type { OpenInvoicesData } from "../types";

const createTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithQuery = (ui: React.ReactElement, client = createTestClient()) =>
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);

const sampleOpenMoneyData: OpenInvoicesData = {
  summary: {
    money: { count: 2, owed: 45000, owedWithItemsOut: 15000, accruedCharges: 1200 },
    returns: { count: 1, unitsOut: 4, overdueCount: 1 },
    both: { count: 1, owed: 15000 },
  },
  buckets: [
    { key: "0_7", count: 1, owed: 5000 },
    { key: "8_14", count: 1, owed: 15000 },
    { key: "15_30", count: 0, owed: 0 },
    { key: "31_90", count: 1, owed: 30000 },
    { key: "90_plus", count: 0, owed: 0 },
  ],
  rows: [
    {
      invoice_id: 131,
      issued_date: "2026-11-05",
      age_days: 13,
      status: "Active",
      customer: { customer_id: 7, name: "Ranjith Nimal", phone_number: "0771234567" },
      live_total: 15000,
      paid: 0,
      owed: 15000,
      accrued_charges: 1200,
      units_out: 4,
      items_out: [
        { name: "Scaffolding (3*5)", qty: 3 },
        { name: "Concrete Mixer", qty: 1 },
      ],
      earliest_due_date: "2026-11-11",
      days_overdue: 7,
      is_unpaid: true,
      has_items_out: true,
    },
    {
      invoice_id: 118,
      issued_date: "2026-10-01",
      age_days: 48,
      status: "PendingPayment",
      customer: { customer_id: 9, name: "Silva Traders", phone_number: null },
      live_total: 30000,
      paid: 0,
      owed: 30000,
      accrued_charges: 0,
      units_out: 0,
      items_out: [],
      earliest_due_date: null,
      days_overdue: 0,
      is_unpaid: true,
      has_items_out: false,
    },
  ],
  totalCount: 2,
};

const emptyData: OpenInvoicesData = {
  summary: {
    money: { count: 0, owed: 0, owedWithItemsOut: 0, accruedCharges: 0 },
    returns: { count: 0, unitsOut: 0, overdueCount: 0 },
    both: { count: 0, owed: 0 },
  },
  buckets: [
    { key: "0_7", count: 0, owed: 0 },
    { key: "8_14", count: 0, owed: 0 },
    { key: "15_30", count: 0, owed: 0 },
    { key: "31_90", count: 0, owed: 0 },
    { key: "90_plus", count: 0, owed: 0 },
  ],
  rows: [],
  totalCount: 0,
};

describe("OpenInvoicesWidgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton while loading", () => {
    vi.mocked(dashboardApi.fetchOpenInvoices).mockReturnValue(new Promise(() => {}));
    renderWithQuery(<OpenMoneyWidget />);
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
  });

  it("shows empty state for money and returns widgets", async () => {
    vi.mocked(dashboardApi.fetchOpenInvoices).mockResolvedValue(emptyData);

    renderWithQuery(<OpenMoneyWidget />);
    expect(await screen.findByText(/Nothing owed older than 1 week/i)).toBeTruthy();

    renderWithQuery(<OpenReturnsWidget />);
    expect(await screen.findByText(/All equipment is back/i)).toBeTruthy();
  });

  it("renders rows with both payment & return status icons and updates query when filter chip or aging bar is clicked", async () => {
    vi.mocked(dashboardApi.fetchOpenInvoices).mockResolvedValue(sampleOpenMoneyData);

    const { container } = renderWithQuery(<OpenMoneyWidget />);

    expect(await screen.findByText("Ranjith Nimal")).toBeTruthy();
    expect(screen.getByText("INV-131")).toBeTruthy();
    expect(screen.getByText("Owes + items out")).toBeTruthy();
    expect(screen.getByText(/charges so far/i)).toBeTruthy();

    // Both status icons rendered
    expect(container.querySelectorAll('[data-status="unpaid"]').length).toBe(2);
    expect(container.querySelectorAll('[data-status="out"]').length).toBe(1);
    expect(container.querySelectorAll('[data-status="returned"]').length).toBe(1);

    // Filter chip click triggers query with olderThanDays: 30
    fireEvent.click(screen.getByText("> 1 month"));
    await waitFor(() => {
      expect(dashboardApi.fetchOpenInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ view: "money", olderThanDays: 30 }),
      );
    });

    // Clicking aging bar segment 90_plus sets filter to 90 (or 31_90 sets 30 -> test 8_14 -> 7)
    fireEvent.click(screen.getByTestId("aging-segment-8_14"));
    await waitFor(() => {
      expect(dashboardApi.fetchOpenInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ view: "money", olderThanDays: 7 }),
      );
    });
  });

  it("OpenReturnsWidget toggles Only overdue switch", async () => {
    vi.mocked(dashboardApi.fetchOpenInvoices).mockResolvedValue({
      ...sampleOpenMoneyData,
      rows: [sampleOpenMoneyData.rows[0]],
      totalCount: 1,
    });

    renderWithQuery(<OpenReturnsWidget />);
    expect(await screen.findByText(/Scaffolding \(3\*5\) × 3/i)).toBeTruthy();

    const toggle = screen.getByLabelText("Only overdue");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(dashboardApi.fetchOpenInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ view: "returns", onlyOverdue: true }),
      );
    });
  });

  it("suggestedTemplateForOpenInvoice selects the right template for each state", () => {
    expect(
      suggestedTemplateForOpenInvoice({ hasItemsOut: true, daysOverdue: 3, isUnpaid: true }),
    ).toBe("overdue_return");
    expect(
      suggestedTemplateForOpenInvoice({ hasItemsOut: true, daysOverdue: 0, isUnpaid: true }),
    ).toBe("payment_reminder");
    expect(
      suggestedTemplateForOpenInvoice({ hasItemsOut: false, daysOverdue: 0, isUnpaid: true }),
    ).toBe("payment_reminder");
    expect(
      suggestedTemplateForOpenInvoice({ hasItemsOut: true, daysOverdue: 0, isUnpaid: false }),
    ).toBe("return_due_today");
    expect(
      suggestedTemplateForOpenInvoice({ hasItemsOut: false, daysOverdue: 0, isUnpaid: false }),
    ).toBe("receipt");
  });

  it("ReadOnlyInvoiceModal keeps default behaviour without new props and renders Open invoice & template override with them", () => {
    const invoice = {
      invoice_id: 55,
      status: "Active",
      issued_date: "2026-11-10T10:00:00Z",
      sub_total: 1000,
      total_amount: 1000,
      Customer: { first_name: "A", last_name: "B", phone_number: "0771234567" },
      InvoiceLines: [],
      Payments: [],
    };

    const { rerender } = render(
      <ReadOnlyInvoiceModal open onClose={vi.fn()} invoice={invoice} />,
    );
    expect(screen.queryByRole("button", { name: /Open invoice/i })).toBeNull();
    expect(screen.getByTestId("whatsapp-btn").getAttribute("data-template")).toBe("receipt");

    const onOpen = vi.fn();
    rerender(
      <ReadOnlyInvoiceModal
        open
        onClose={vi.fn()}
        invoice={invoice}
        onOpenInvoice={onOpen}
        whatsAppTemplate="overdue_return"
      />,
    );
    const openBtn = screen.getByRole("button", { name: /Open invoice/i });
    fireEvent.click(openBtn);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("whatsapp-btn").getAttribute("data-template")).toBe("overdue_return");
  });

  it("invalidates ['dashboard', 'open-invoices'] after recording a payment", async () => {
    const client = createTestClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    vi.mocked(api.post).mockResolvedValueOnce({ data: { ok: true } } as any);

    let trigger!: () => Promise<any>;
    const Probe = () => {
      const m = useAddPayment();
      trigger = () => m.mutateAsync({ id: 77, data: { amount: 500, method: "Cash", is_refund: false } });
      return null;
    };

    renderWithQuery(<Probe />, client);
    await act(async () => {
      await trigger();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["dashboard", "open-invoices"],
    });
  });
});
