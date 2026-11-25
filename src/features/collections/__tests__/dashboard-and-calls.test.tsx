import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => ({}),
  useParams: () => ({}),
}));

vi.mock("@/features/dashboard/api/dashboard.api", () => ({
  fetchDashboardConfig: vi.fn(),
  fetchKPIs: vi.fn(),
  fetchUtilizationSparkline: vi.fn(),
  fetchReturnsDueToday: vi.fn(),
  fetchMaintenanceQueue: vi.fn(),
  fetchOpenInvoices: vi.fn(),
}));

vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useMyDevices: vi.fn(() => ({ data: { devices: [] }, isLoading: false })),
  useInvoiceSignatures: vi.fn(() => ({ data: { signatures: [] } })),
}));

vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({
  WhatsAppButton: () => <button type="button">WhatsApp</button>,
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(async () => ({ data: {} })),
    post: vi.fn(async () => ({ data: { ok: true } })),
    patch: vi.fn(async () => ({ data: { ok: true } })),
    delete: vi.fn(async () => ({ data: { ok: true } })),
  },
}));

import * as dashboardApi from "@/features/dashboard/api/dashboard.api";
import { useMyDevices } from "@/features/signatures/hooks/useSignatures";
import { api } from "@/lib/api";
import { useDashboardStore, normalizeLayoutItem } from "@/stores/useDashboardStore";
import OpenMoneyWidget from "@/features/dashboard/widgets/OpenMoneyWidget";
import OpenReturnsWidget from "@/features/dashboard/widgets/OpenReturnsWidget";
import ActionableReturnsTable from "@/features/dashboard/widgets/ActionableReturnsTable";
import { LastCallLine } from "../components/LastCallLine";
import { CallCardPopover } from "../components/CallCardPopover";
import { RecordingPlayer } from "../components/RecordingPlayer";
import { useAuthStore } from "@/stores/useAuthStore";
import type { OpenInvoicesData, ReturnsData } from "@/features/dashboard/types";

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const wrap = (ui: React.ReactElement) => (
  <QueryClientProvider client={createClient()}>{ui}</QueryClientProvider>
);

const sampleOpenData: OpenInvoicesData = {
  summary: {
    money: { count: 1, owed: 15000, owedWithItemsOut: 15000, accruedCharges: 0 },
    returns: { count: 1, unitsOut: 3, overdueCount: 1 },
    both: { count: 1, owed: 15000 },
  },
  buckets: [
    { key: "0_7", count: 0, owed: 0 },
    { key: "8_14", count: 1, owed: 15000 },
    { key: "15_30", count: 0, owed: 0 },
    { key: "31_90", count: 0, owed: 0 },
    { key: "90_plus", count: 0, owed: 0 },
  ],
  callCounts: {
    not_called_today: 4,
    no_answer: 2,
    promised: 3,
    promise_missed: 1,
    call_again_today: 2,
    calls_to_note: 1,
  },
  rows: [
    {
      invoice_id: 101,
      issued_date: "2026-11-10",
      age_days: 15,
      status: "Active",
      customer: { customer_id: 11, name: "Kasun Perera", phone_number: "0771234567" },
      live_total: 15000,
      paid: 0,
      owed: 15000,
      accrued_charges: 0,
      units_out: 3,
      items_out: [{ name: "Mixer", qty: 3 }],
      earliest_due_date: "2026-11-18",
      days_overdue: 7,
      is_unpaid: true,
      has_items_out: true,
      last_call: {
        call_id: 55,
        started_at: new Date(Date.now() - 20 * 60_000).toISOString(),
        outcome: "answered",
        suggested_outcome: "answered",
        staff_name: "Nimal",
      },
    },
  ],
  totalCount: 1,
};

const sampleReturnsToday: ReturnsData = {
  total: 1,
  overdueCount: 1,
  callCounts: { not_called_today: 1 },
  items: [
    {
      line_id: 9,
      invoice_id: 202,
      customer_id: 12,
      first_name: "Ruwan",
      last_name: "Silva",
      company_name: null,
      customer_type: "Individual",
      phone_number: "0779998888",
      equipment_name: "Scaffolding",
      expected_return_date: "2026-11-24",
      borrow_quantity: 5,
      days_overdue: 1,
      last_call: null,
    },
  ],
};

describe("Slice 2 Dashboard, Call Tracking & Recording Player", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardApi.fetchOpenInvoices).mockResolvedValue(sampleOpenData);
    vi.mocked(dashboardApi.fetchReturnsDueToday).mockResolvedValue(sampleReturnsToday);
  });

  it("preserves user-resized height in dashboard layout store", () => {
    const normalized = normalizeLayoutItem({ i: "open_money", x: 0, y: 3, w: 2, h: 6 });
    expect(normalized.h).toBe(6);
    expect(normalized.minH).toBe(2);

    useDashboardStore.getState().loadConfig({
      layout: [{ i: "open_money", x: 2, y: 3, w: 2, h: 5 }],
      savedFilters: null,
      widgetCatalog: [],
    });
    const saved = useDashboardStore.getState().layout.find((i) => i.i === "open_money");
    expect(saved?.h).toBe(5);
  });

  it("opens full-screen expand overlay and navigates See all with presets", async () => {
    render(wrap(<OpenMoneyWidget />));
    expect(await screen.findByText("Kasun Perera")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: /See all/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/reports/customers/collections",
      search: { owes_money: "1" },
    });

    vi.clearAllMocks();
    cleanup();
    render(wrap(<OpenReturnsWidget />));
    await screen.findByText("Kasun Perera");
    fireEvent.click(screen.getAllByRole("button", { name: /See all/i }).slice(-1)[0]);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/reports/customers/collections",
      search: { not_returned: "1" },
    });

    vi.clearAllMocks();
    cleanup();
    render(wrap(<ActionableReturnsTable />));
    await screen.findByText("Ruwan Silva");
    fireEvent.click(screen.getAllByRole("button", { name: /See all/i }).slice(-1)[0]);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/reports/customers/collections",
      search: { not_returned: "1", date_basis: "due_date" },
    });
  }, 15000);

  it("renders every call filter chip with counts and passes callFilter to API", async () => {
    render(wrap(<OpenMoneyWidget />));
    await screen.findByText("Kasun Perera");

    const chips = [
      { label: /Not called today \(4\)/i, key: "not_called_today" },
      { label: /No answer \(2\)/i, key: "no_answer" },
      { label: /Promised \(3\)/i, key: "promised" },
      { label: /Promise missed \(1\)/i, key: "promise_missed" },
      { label: /Call again today \(2\)/i, key: "call_again_today" },
      { label: /Calls to note \(1\)/i, key: "calls_to_note" },
    ];

    for (const chip of chips) {
      fireEvent.click(screen.getByText(chip.label));
      await waitFor(() => {
        expect(dashboardApi.fetchOpenInvoices).toHaveBeenCalledWith(
          expect.objectContaining({ callFilter: chip.key }),
        );
      });
    }
  });

  it("renders all LastCallLine states", () => {
    const { rerender } = render(<LastCallLine lastCall={null} />);
    expect(screen.getByText(/Not called yet/i)).toBeTruthy();

    rerender(<LastCallLine lastCall={{ needs_note: true }} />);
    expect(screen.getByText(/Call needs a note/i)).toBeTruthy();

    rerender(
      <LastCallLine
        lastCall={{
          promise_status: "missed",
          promise_amount: 5000,
          promise_date: "2026-11-28",
        }}
      />,
    );
    expect(screen.getByText(/Promise missed/i)).toBeTruthy();

    rerender(
      <LastCallLine
        lastCall={{
          promise_status: "waiting",
          promise_amount: 5000,
          promise_date: "2026-11-28",
        }}
      />,
    );
    expect(screen.getByText(/Promised Rs 5,000/i)).toBeTruthy();

    rerender(
      <LastCallLine
        lastCall={{
          outcome: "no_answer",
          started_at: new Date(Date.now() - 120 * 60_000).toISOString(),
          tries_today: 3,
        }}
      />,
    );
    expect(screen.getByText(/No answer.*3rd try today/i)).toBeTruthy();

    rerender(
      <LastCallLine
        lastCall={{
          outcome: "answered",
          staff_name: "Nimal",
          started_at: new Date(Date.now() - 20 * 60_000).toISOString(),
        }}
      />,
    );
    expect(screen.getByText(/Called by Nimal 20 min ago/i)).toBeTruthy();
  });

  it("handles CallCardPopover pre-chosen outcome, Other required note, promise fields, and save", async () => {
    const onSaved = vi.fn();
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);

    render(
      wrap(
        <CallCardPopover
          anchorEl={anchor}
          open
          onClose={vi.fn()}
          customerId={11}
          customerName="Kasun Perera"
          phone="0771234567"
          invoiceIds={[101]}
          initialCall={{ call_id: 55, suggested_outcome: "no_answer" }}
          onSaved={onSaved}
        />,
      ),
    );

    // Switch to Answered
    fireEvent.click(screen.getByRole("button", { name: /^Answered$/i }));

    // Select Other -> requires note
    fireEvent.click(screen.getByText("Other"));
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    expect(await screen.findByText(/Please enter a short note for Other/i)).toBeTruthy();

    // Select Will pay on a date -> promise fields appear
    fireEvent.click(screen.getByText("Will pay on a date"));
    fireEvent.change(screen.getByLabelText(/Promise amount/i), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText(/Promise date/i), { target: { value: "2026-11-30" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/calls/55/notes",
        expect.objectContaining({
          customer_id: 11,
          outcome: "answered",
          result: "will_pay_date",
          promise_amount: 5000,
          promise_date: "2026-11-30",
        }),
      );
      expect(onSaved).toHaveBeenCalled();
    });
  }, 15000);

  it("uses Call from my phone when paired phone exists", async () => {
    vi.mocked(useMyDevices).mockReturnValue({
      data: { devices: [{ device_id: "phone-1", status: "ACTIVE" }] },
    } as any);

    render(wrap(<OpenMoneyWidget />));
    await screen.findByText("Kasun Perera");

    const dialBtn = screen.getByRole("button", { name: /Call from my phone/i });
    fireEvent.click(dialBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/calls/dial", {
        phone: "0771234567",
        customer_id: 11,
        invoice_ids: [101],
      });
    });
  });

  it("hides RecordingPlayer without calls:listen permission and shows it with permission", async () => {
    useAuthStore.setState({
      user: { user_id: 1, username: "cashier", permissions: ["inventory_permission"] } as any,
    });

    const { rerender } = render(
      wrap(<RecordingPlayer callId={10} recordingId={99} durationSeconds={85} />),
    );
    expect(screen.queryByRole("button", { name: /Play recording/i })).toBeNull();
    expect(screen.queryByText(/No recording/i)).toBeNull();

    useAuthStore.setState({
      user: { user_id: 2, username: "admin", permissions: ["calls:listen"] } as any,
    });
    rerender(wrap(<RecordingPlayer callId={10} recordingId={99} durationSeconds={85} />));

    expect(screen.getByRole("button", { name: /Play recording/i })).toBeTruthy();
    expect(screen.getByText("1:25")).toBeTruthy();
    expect(screen.getByText("1×")).toBeTruthy();
  });
});
