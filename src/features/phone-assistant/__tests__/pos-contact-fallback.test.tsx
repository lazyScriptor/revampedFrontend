import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const state = vi.hoisted(() => ({
  canPhoneContacts: true,
  canInvoiceEdit: true,
  hasPhoneAssistantPlan: true,
  customerResults: [] as any[],
  customerLoading: false,
  contactMatches: [
    {
      contact_id: 9,
      operator_device_id: 3,
      device_label: "Counter Samsung",
      display_name: "Nimal Perera",
      phone_e164: "94771234567",
      raw_phone: "0771234567",
    },
  ],
  phoneSearchEnabledCalls: [] as boolean[],
  useContactMutateAsync: vi.fn(),
  createCustomerMutate: vi.fn(),
  reviewInvoiceMutate: vi.fn(),
  invoiceListCalls: [] as any[],
  invoiceListData: {
    invoices: [
      {
        invoice_id: 501,
        status: "Active",
        total_amount: 1500,
        amount_paid: 0,
        issued_date: "2026-11-15T10:00:00Z",
        source_contact_id: 9,
        contact_reviewed_at: null,
        Customer: { first_name: "Nimal", last_name: "Perera", phone_number: "0771234567" },
      },
    ],
    totalItems: 1,
    counts: { all: 5, active: 2, completed: 3, from_contacts: 1 },
  },
}));

vi.mock("@/components/auth/Can", () => ({
  useCanPerform: (perm: string) => {
    if (perm === "phone_contacts:view") return state.canPhoneContacts;
    if (perm === "invoice:edit") return state.canInvoiceEdit;
    return true;
  },
}));

vi.mock("@/features/plan/usePlan", () => ({
  usePlanChecker: () => (key: string) =>
    key === "phone_assistant" ? state.hasPhoneAssistantPlan : true,
}));

vi.mock("@/features/invoices/hooks/usePosSearch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/invoices/hooks/usePosSearch")>();
  return {
    ...actual,
    usePosCustomerSearch: () => ({
      data: state.customerResults,
      isLoading: state.customerLoading,
    }),
  };
});

vi.mock("@/features/customers/hooks/useCustomerHooks", () => ({
  useCustomerDetails: () => ({ data: null }),
  useCustomerInvoices: () => ({ data: { invoices: [], stats: { total: 0, active: 0, completed: 0 } }, isLoading: false }),
  useCreateCustomer: () => ({ mutate: state.createCustomerMutate, isPending: false }),
  useUpdateCustomer: () => ({ mutate: vi.fn(), isPending: false }),
  useParentCustomerOptions: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/features/phone-assistant/hooks/usePhoneContacts", () => ({
  usePhoneContactSearch: (_term: string, enabled = true) => {
    state.phoneSearchEnabledCalls.push(Boolean(enabled));
    return {
      data: enabled ? state.contactMatches : [],
      isLoading: false,
    };
  },
  useUsePhoneContact: () => ({
    mutateAsync: state.useContactMutateAsync,
    isPending: false,
  }),
  useReviewContactInvoice: () => ({
    mutate: state.reviewInvoiceMutate,
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock("@/features/invoices/hooks/useInvoiceHooks", () => ({
  useInvoiceSearch: () => ({ data: [], isLoading: false }),
  useInvoiceList: (...args: any[]) => {
    state.invoiceListCalls.push(args);
    return {
      data: state.invoiceListData,
      isLoading: false,
      isFetching: false,
    };
  },
}));

import { PosCustomerPanel } from "@/features/invoices/components/PosCustomerPanel";
import { CustomerFormDialog } from "@/features/customers/components/CustomerFormDialog";
import { ManageSearchPanel } from "@/features/invoices/components/ManageInvoiceViews";

const wrap = (ui: ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
    </QueryClientProvider>,
  );

beforeEach(() => {
  state.canPhoneContacts = true;
  state.canInvoiceEdit = true;
  state.hasPhoneAssistantPlan = true;
  state.customerResults = [];
  state.customerLoading = false;
  state.phoneSearchEnabledCalls = [];
  state.invoiceListCalls = [];
  state.useContactMutateAsync.mockReset().mockResolvedValue({
    contact_id: 9,
    first_name: "Nimal",
    last_name: "Perera",
    phone_number: "0771234567",
  });
  state.createCustomerMutate.mockReset();
  state.reviewInvoiceMutate.mockReset();
});

describe("POS phone contact fallback & From contacts tab (A7)", () => {
  it("hides contact fallback without phone_contacts:view permission or phone_assistant plan", () => {
    state.canPhoneContacts = false;
    wrap(<PosCustomerPanel selectedCustomer={null} onSelectCustomer={vi.fn()} />);

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "0771" } });

    expect(state.phoneSearchEnabledCalls.some(Boolean)).toBe(false);
    expect(screen.queryByText("From phone contacts")).not.toBeInTheDocument();

    state.canPhoneContacts = true;
    state.hasPhoneAssistantPlan = false;
    state.phoneSearchEnabledCalls = [];
    wrap(<PosCustomerPanel selectedCustomer={null} onSelectCustomer={vi.fn()} />);
    expect(state.phoneSearchEnabledCalls.some(Boolean)).toBe(false);
  });

  it("does not enable fallback when regular customer search returns matches", () => {
    state.customerResults = [
      {
        customer_id: 1,
        customer_type: "Individual",
        first_name: "Existing",
        last_name: "Client",
        phone_number: "0771112223",
      },
    ];
    wrap(<PosCustomerPanel selectedCustomer={null} onSelectCustomer={vi.fn()} />);

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Existing" } });

    expect(state.phoneSearchEnabledCalls.some(Boolean)).toBe(false);
    expect(screen.queryByText("From phone contacts")).not.toBeInTheDocument();
  });

  it("a typed name finds nobody and never offers to add a duplicate customer", async () => {
    const user = userEvent.setup({ delay: null });
    wrap(<PosCustomerPanel selectedCustomer={null} onSelectCustomer={vi.fn()} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "Nimal");

    expect(
      await screen.findByText("Customers are found by phone number only. Type their phone number."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /as new/i })).not.toBeInTheDocument();
    expect(state.phoneSearchEnabledCalls.some(Boolean)).toBe(false);
  });

  it("shows contact matches when empty, confirms before calling /use, and prefills CustomerFormDialog", async () => {
    const user = userEvent.setup({ delay: null });
    wrap(<PosCustomerPanel selectedCustomer={null} onSelectCustomer={vi.fn()} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "0771");

    expect(await screen.findByText("From phone contacts")).toBeInTheDocument();
    expect(screen.getByText("Nimal Perera")).toBeInTheDocument();
    expect(screen.getByText("Counter Samsung")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Nimal Perera"));
    expect(await screen.findByText("Use this contact for this bill?")).toBeInTheDocument();

    // Cancelling must not call POST /phone-contacts/:id/use
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText("Use this contact for this bill?")).not.toBeInTheDocument();
    });
    expect(state.useContactMutateAsync).not.toHaveBeenCalled();

    // Confirming calls /use and opens CustomerFormDialog prefilled
    await user.click(input);
    await user.type(input, "0771");
    fireEvent.click(await screen.findByText("Nimal Perera"));
    fireEvent.click(await screen.findByRole("button", { name: "Use contact" }));

    await waitFor(() => {
      expect(state.useContactMutateAsync).toHaveBeenCalledWith(9);
    });
    expect(await screen.findByDisplayValue("0771234567")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Nimal")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Perera")).toBeInTheDocument();
  }, 15000);

  it("sends source_contact_id when CustomerFormDialog creates a contact-sourced customer", async () => {
    wrap(
      <CustomerFormDialog
        open={true}
        onClose={vi.fn()}
        prefill={{
          first_name: "Kamal",
          last_name: "Silva",
          phone_number: "0779998887",
          nic_number: "901234567V",
        }}
        sourceContactId={42}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: /create|save|register/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(state.createCustomerMutate).toHaveBeenCalled();
    });
    const sentPayload = state.createCustomerMutate.mock.calls[0][0];
    expect(sentPayload.source_contact_id).toBe(42);
    expect(sentPayload.first_name).toBe("Kamal");
  });

  it("renders From contacts tab with count, switches via initialTab, and calls mark reviewed", () => {
    wrap(
      <ManageSearchPanel
        onSelectInvoice={vi.fn()}
        initialTab="from-contacts"
      />,
    );

    expect(screen.getByText("From contacts (1)")).toBeInTheDocument();
    expect(state.invoiceListCalls[0]).toEqual([1, 25, undefined, { contactSourced: true }]);

    const markBtn = screen.getByRole("button", { name: "Mark reviewed" });
    fireEvent.click(markBtn);
    expect(state.reviewInvoiceMutate).toHaveBeenCalledWith(501);
  });
});
