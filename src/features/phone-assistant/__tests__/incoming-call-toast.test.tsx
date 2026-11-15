import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const state = vi.hoisted(() => ({
  canCallsView: true,
  hasPhoneAssistantPlan: true,
  navigate: vi.fn(),
  getCallById: vi.fn(),
  usePhoneContact: vi.fn(),
  handlers: new Map<string, Set<(payload: any) => void>>(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => state.navigate,
}));

vi.mock("@/components/auth/Can", () => ({
  useCanPerform: (perm: string) => (perm === "calls:view" ? state.canCallsView : true),
}));

vi.mock("@/features/plan/usePlan", () => ({
  usePlanChecker: () => (key: string) =>
    key === "phone_assistant" ? state.hasPhoneAssistantPlan : true,
}));

vi.mock("@/lib/socket", () => ({
  connectSocket: vi.fn(),
  getSocket: () => ({
    on: (event: string, fn: (payload: any) => void) => {
      if (!state.handlers.has(event)) state.handlers.set(event, new Set());
      state.handlers.get(event)!.add(fn);
    },
    off: (event: string, fn: (payload: any) => void) => {
      state.handlers.get(event)?.delete(fn);
    },
  }),
}));

vi.mock("../api/phoneAssistantApi", () => ({
  getCallById: (...args: any[]) => state.getCallById(...args),
  usePhoneContact: (...args: any[]) => state.usePhoneContact(...args),
  listCalls: vi.fn(),
  searchPhoneContacts: vi.fn(),
  reviewContactInvoice: vi.fn(),
}));

vi.mock("@/features/customers/components/CustomerFormDialog", () => ({
  CustomerFormDialog: ({ open, prefill, sourceContactId }: any) =>
    open ? (
      <div data-testid="mock-customer-form-dialog">
        <span>{prefill?.first_name}</span>
        <span>{prefill?.last_name}</span>
        <span>{prefill?.phone_number}</span>
        <span>{`source:${sourceContactId ?? "none"}`}</span>
      </div>
    ) : null,
}));

import { IncomingCallToast } from "../components/IncomingCallToast";

const emitSocket = (event: string, payload: any) => {
  const fns = state.handlers.get(event);
  if (!fns) return;
  for (const fn of fns) {
    fn(payload);
  }
};

const renderWithQuery = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("IncomingCallToast (D2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.canCallsView = true;
    state.hasPhoneAssistantPlan = true;
    state.handlers.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing and does not subscribe when permission or plan feature is missing", () => {
    state.canCallsView = false;
    const { unmount } = renderWithQuery(<IncomingCallToast />);
    expect(state.handlers.size).toBe(0);
    expect(screen.queryByTestId("incoming-call-toast")).not.toBeInTheDocument();
    unmount();

    state.canCallsView = true;
    state.hasPhoneAssistantPlan = false;
    renderWithQuery(<IncomingCallToast />);
    expect(state.handlers.size).toBe(0);
    expect(screen.queryByTestId("incoming-call-toast")).not.toBeInTheDocument();
  });

  it("displays customer brief with blacklisted banner and navigates on Open customer / New bill", async () => {
    state.getCallById.mockResolvedValue({
      call: {
        call_id: 55,
        operator_device_id: 2,
        client_call_id: "call-55",
        phone_e164: "94771234567",
        raw_number: "0771234567",
        direction: "INCOMING",
        customer_id: 41,
        contact_id: null,
        started_at: "2026-11-15T10:00:00.000Z",
        ended_at: null,
        duration_seconds: null,
        device_label: "Counter Samsung",
      },
      match: "customer",
      brief: {
        customer_id: 41,
        display_name: "Kamal Perera",
        company_name: "Kamal Builders",
        parent_company: null,
        phones: ["94771234567"],
        rating: 2.5,
        status: "Blacklisted",
        balance_due: 25000,
        deposit_balance: 0,
        id_retained: true,
        active_items: [],
        invoice_count: 3,
        first_rental: "2025-01-01",
        last_rental: "2026-11-01",
        last_payment: null,
        last_review_comment: null,
        summary_line: "Rs. 25,000 due · 1 overdue · ID kept",
        updated_at: "2026-11-15T09:50:00.000Z",
      },
      contact: null,
    });

    renderWithQuery(<IncomingCallToast />);

    act(() => {
      emitSocket("call:incoming", { call_id: 55, started_at: "2026-11-15T10:00:00.000Z" });
    });

    await screen.findByText("Kamal Perera");
    expect(screen.getByTestId("incoming-call-blacklisted-banner")).toHaveTextContent(
      "Blacklisted customer",
    );
    expect(screen.getByText("Rs. 25,000 due · 1 overdue · ID kept")).toBeInTheDocument();
    expect(screen.getByText("via Counter Samsung")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New bill" }));
    expect(state.navigate).toHaveBeenCalledWith({
      to: "/invoices",
      search: { mode: "dispatch" },
    });
    expect(screen.queryByTestId("incoming-call-toast")).not.toBeInTheDocument();

    act(() => {
      emitSocket("call:incoming", { call_id: 55, started_at: "2026-11-15T10:00:00.000Z" });
    });
    await screen.findByText("Kamal Perera");
    fireEvent.click(screen.getByRole("button", { name: "Open customer" }));
    expect(state.navigate).toHaveBeenCalledWith({ to: "/customers" });
  });

  it("displays contact match and opens CustomerFormDialog when Add as customer is clicked", async () => {
    state.getCallById.mockResolvedValue({
      call: {
        call_id: 77,
        operator_device_id: 3,
        client_call_id: "call-77",
        phone_e164: "94775554444",
        raw_number: "0775554444",
        direction: "INCOMING",
        customer_id: null,
        contact_id: 88,
        started_at: "2026-11-15T10:00:00.000Z",
        ended_at: null,
        duration_seconds: null,
        device_label: "Boss Phone",
      },
      match: "contact",
      brief: null,
      contact: {
        contact_id: 88,
        display_name: "Hardware Sunimal",
        phone_e164: "94775554444",
        device_label: "Boss Phone",
      },
    });
    state.usePhoneContact.mockResolvedValue({
      contact_id: 88,
      first_name: "Hardware",
      last_name: "Sunimal",
      phone_number: "0775554444",
    });

    renderWithQuery(<IncomingCallToast />);

    act(() => {
      emitSocket("call:incoming", { call_id: 77, started_at: "2026-11-15T10:00:00.000Z" });
    });

    await screen.findByText("Hardware Sunimal");
    expect(screen.getByText("From Boss Phone phone")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add as customer" }));

    await waitFor(() => {
      expect(state.usePhoneContact).toHaveBeenCalledWith(88, "94775554444");
    });
    const dialog = await screen.findByTestId("mock-customer-form-dialog");
    expect(dialog).toHaveTextContent("Hardware");
    expect(dialog).toHaveTextContent("Sunimal");
    expect(dialog).toHaveTextContent("0775554444");
    expect(dialog).toHaveTextContent("source:88");
  });

  it("shows duration on call:ended and auto-dismisses after 10 seconds", async () => {
    state.getCallById.mockResolvedValue({
      call: {
        call_id: 91,
        operator_device_id: 2,
        client_call_id: "call-91",
        phone_e164: "94710001111",
        raw_number: "0710001111",
        direction: "INCOMING",
        customer_id: null,
        contact_id: null,
        started_at: "2026-11-15T10:00:00.000Z",
        ended_at: null,
        duration_seconds: null,
        device_label: "Shop Phone",
      },
      match: "none",
      brief: null,
      contact: null,
    });

    renderWithQuery(<IncomingCallToast />);

    act(() => {
      emitSocket("call:incoming", { call_id: 91, started_at: "2026-11-15T10:00:00.000Z" });
    });
    await screen.findByText("Not in GearGrid");
    expect(screen.getByText("0710001111")).toBeInTheDocument();

    vi.useFakeTimers();

    act(() => {
      emitSocket("call:ended", { call_id: 91, duration_seconds: 42 });
    });

    expect(screen.getByText("Call ended")).toBeInTheDocument();
    expect(screen.getByText("42s")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(9999);
    });
    expect(screen.getByTestId("incoming-call-toast")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("incoming-call-toast")).not.toBeInTheDocument();
  });
});
