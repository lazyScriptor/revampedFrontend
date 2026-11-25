import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/i18n";

vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({
  WhatsAppButton: () => <button type="button">WhatsApp</button>,
}));

vi.mock("@/features/invoices/hooks/usePosSearch", () => ({
  usePosCustomerSearch: vi.fn(() => ({
    data: [
      {
        customer_id: 42,
        first_name: "Nimal",
        last_name: "Perera",
        phone_number: "0771234567",
        nic_number: "199012345678",
        deposit_balance: 1500,
      },
    ],
    isLoading: false,
  })),
}));

vi.mock("@/features/activity/hooks/useActivityHooks", () => ({
  useActivitySettings: vi.fn(() => ({
    data: {
      reasons: {
        discount: [
          { key: "regular_customer", label_en: "Regular customer", label_si: "නිත්‍ය පාරිභෝගිකයා", active: true },
          { key: "other", label_en: "Other", label_si: "වෙනත්", active: true },
        ],
        backdate: [
          { key: "forgot_to_enter", label_en: "Forgot to enter", label_si: "ඇතුළත් කිරීමට අමතක විය", active: true },
          { key: "other", label_en: "Other", label_si: "වෙනත්", active: true },
        ],
      },
    },
  })),
}));

vi.mock("@/features/invoices/hooks/useInvoiceHooks", () => ({
  useInvoiceDetails: vi.fn(() => ({ data: null })),
}));

vi.mock("../api/settlementApi", () => ({
  fetchSettlementOverview: vi.fn(),
  fetchCustomerOpenBills: vi.fn(),
  previewCustomerSettlement: vi.fn(),
  commitCustomerSettlement: vi.fn(),
  completeSettlementBills: vi.fn(),
  voidSettlement: vi.fn(),
  fetchSettlementDetail: vi.fn(),
}));

import * as settlementApi from "../api/settlementApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { CustomerSettlementView } from "../components/CustomerSettlementView";
import type {
  OpenBillsResponse,
  SettlementCommitResponse,
  SettlementOverviewResponse,
  SettlementPreviewResponse,
} from "../types";

const mockOverview: SettlementOverviewResponse = {
  customer: {
    customer_id: 42,
    name: "Nimal Perera",
    phone_number: "0771234567",
    nic_number: "199012345678",
    deposit_balance: 1500,
  },
  summary: {
    total_owed: 18000,
    open_bills_count: 2,
    machines_out_count: 40,
    oldest_unpaid_bill_date: "2026-10-01",
    id_cards_held_count: 1,
    last_payment: { amount: 5000, date: "2026-11-10", method: "Cash" },
  },
  bills_bar: [
    {
      invoice_id: 1012,
      issued_date: "2026-10-01",
      status: "Active",
      id_card_status: 1,
      live_total: 12000,
      amount_paid: 2000,
      owed: 10000,
      age_days: 45,
      age_bucket: "red",
    },
    {
      invoice_id: 1015,
      issued_date: "2026-11-15",
      status: "Active",
      id_card_status: 0,
      live_total: 8000,
      amount_paid: 0,
      owed: 8000,
      age_days: 10,
      age_bucket: "amber",
    },
  ],
  machines_bar: [
    {
      equipment_id: 7,
      equipment_name: "Scaffolding",
      equipment_name_si: "පලංචි",
      is_bulk_item: true,
      units_out: 40,
      bills_count: 2,
      invoice_ids: [1012, 1015],
      oldest_due_date: "2026-11-05",
      daily_rate: 50,
    },
  ],
};

const mockOpenBills: OpenBillsResponse = {
  bills: [
    {
      invoice_id: 1012,
      issued_date: "2026-10-01",
      status: "Active",
      age_days: 45,
      age_bucket: "red",
      live_total: 12000,
      billed_total_amount: 12000,
      accrued_charges: 0,
      discount_amount: 0,
      amount_paid: 2000,
      balance: 10000,
      growing_per_day: 400,
      machines_out_count: 20,
      machine_counts: [
        {
          equipment_id: 7,
          equipment_name: "Scaffolding",
          equipment_name_si: "පලංචි",
          is_bulk_item: true,
          out_qty: 20,
          returned_qty: 0,
          total_qty: 20,
          invoice_line_id: 501,
        },
      ],
      id_card_status: 1,
    },
    {
      invoice_id: 1015,
      issued_date: "2026-11-15",
      status: "Active",
      age_days: 10,
      age_bucket: "amber",
      live_total: 8000,
      billed_total_amount: 8000,
      accrued_charges: 0,
      discount_amount: 0,
      amount_paid: 0,
      balance: 8000,
      growing_per_day: 200,
      machines_out_count: 20,
      machine_counts: [
        {
          equipment_id: 7,
          equipment_name: "Scaffolding",
          equipment_name_si: "පලංචි",
          is_bulk_item: true,
          out_qty: 20,
          returned_qty: 0,
          total_qty: 20,
          invoice_line_id: 502,
        },
      ],
      id_card_status: 0,
    },
  ],
  total: 2,
  page: 1,
  limit: 30,
  total_pages: 1,
};

const mockPreview: SettlementPreviewResponse = {
  customer_id: 42,
  customer_name: "Nimal Perera",
  return_date: "2026-11-25",
  split_rule: "oldest_first",
  cheaper_alternative: { available: true, saving: 1800, total_late_fees: 200 },
  totals: {
    owed_before: 18000,
    owed_after: 8000,
    machines_out_before: 40,
    machines_out_after: 15,
    payment_total: 10000,
    wallet_used: 0,
    leftover_amount: 0,
    leftover_mode: "credit",
  },
  bills: [
    {
      invoice_id: 1012,
      issued_date: "2026-10-01",
      queue_position: 1,
      changed: true,
      status_before: "Active",
      status_after: "Active",
      id_card_status: 1,
      before: { balance: 10000, paid: 2000, total: 12000, machines_out: 20, discount: 0 },
      after: { balance: 0, paid: 12000, total: 12000, machines_out: 0, discount: 0 },
      changes: [
        { type: "return", label_en: "20 returned", label_si: "20 ක් ආපසු", amount: 20 },
        { type: "payment", label_en: "+Rs 10,000 paid", label_si: "+රු. 10,000 ගෙවීය", amount: 10000 },
      ],
      lines: [
        {
          invoice_line_id: 501,
          equipment_id: 7,
          equipment_name: "Scaffolding",
          equipment_name_si: "පලංචි",
          is_bulk_item: true,
          out_before: 20,
          out_after: 0,
          returned_qty: 20,
          damaged_qty: 0,
        },
      ],
      stamps: { paid_off: true, ready_to_close: true },
      payment_allocated: 10000,
    },
    {
      invoice_id: 1015,
      issued_date: "2026-11-15",
      queue_position: 2,
      changed: false,
      status_before: "Active",
      status_after: "Active",
      id_card_status: 0,
      before: { balance: 8000, paid: 0, total: 8000, machines_out: 20, discount: 0 },
      after: { balance: 8000, paid: 0, total: 8000, machines_out: 15, discount: 0 },
      changes: [],
      lines: [
        {
          invoice_line_id: 502,
          equipment_id: 7,
          equipment_name: "Scaffolding",
          equipment_name_si: "පලංචි",
          is_bulk_item: true,
          out_before: 20,
          out_after: 15,
          returned_qty: 5,
          damaged_qty: 0,
        },
      ],
      stamps: { paid_off: false, ready_to_close: false },
      payment_allocated: 0,
    },
  ],
  summary: {
    en: "25 scaffolding returned and Rs 10,000 paid across 2 bills.",
    si: "බිල්පත් 2 ක් හරහා පලංචි 25 ක් ආපසු භාරදී රු. 10,000 ක් ගෙවන ලදී.",
  },
  preview_version: "v1-hash",
};

const wrap = (ui: React.ReactElement) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
};

describe("CustomerSettlementView (Release 4 Slice 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    i18n.changeLanguage("en");
    useAuthStore.setState({
      user: {
        user_id: 1,
        username: "admin",
        role: "Administrator",
        permissions: ["inventory_permission"],
      } as any,
      token: "test-token",
    });
    vi.mocked(settlementApi.fetchSettlementOverview).mockResolvedValue(mockOverview);
    vi.mocked(settlementApi.fetchCustomerOpenBills).mockResolvedValue(mockOpenBills);
    vi.mocked(settlementApi.previewCustomerSettlement).mockResolvedValue(mockPreview);
    vi.mocked(settlementApi.commitCustomerSettlement).mockResolvedValue({
      ...mockPreview,
      settlement_id: 777,
      settled_at: "2026-11-25T10:00:00Z",
    } as SettlementCommitResponse);
    vi.mocked(settlementApi.completeSettlementBills).mockResolvedValue({
      completed_invoice_ids: [1012],
      count: 1,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders customer card, age bar, bills, and allows picking into Working-on group", async () => {
    render(wrap(<CustomerSettlementView initialCustomerId={42} />));

    await waitFor(() => {
      expect(screen.getByTestId("settlement-customer-card")).toBeInTheDocument();
    });
    expect(screen.getByTestId("settlement-age-bar")).toBeInTheDocument();
    expect(screen.getByText(/INV-1012/)).toBeInTheDocument();
    expect(screen.getByTestId("settlement-scope-words")).toHaveTextContent(/all 2 open bills/i);

    fireEvent.click(screen.getByLabelText("Pick INV-1012"));
    expect(screen.getByTestId("settlement-working-on-group")).toHaveTextContent(/Working on 1 bills/i);
    expect(screen.getByTestId("settlement-scope-words")).toHaveTextContent(/1 picked bills/i);
  });

  it("Step 3: machines bar, manual +/- placement keeps total fixed, and cheaper-for-customer chip toggles split_rule", async () => {
    render(wrap(<CustomerSettlementView initialCustomerId={42} />));

    await waitFor(() => {
      expect(screen.getByText(/INV-1012/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("settlement-step-3"));
    await waitFor(() => {
      expect(screen.getByTestId("settlement-machines-bar")).toBeInTheDocument();
    });

    const retInput = screen.getByLabelText("Returned quantity");
    fireEvent.change(retInput, { target: { value: "25" } });

    await waitFor(() => {
      expect(settlementApi.previewCustomerSettlement).toHaveBeenCalled();
    });

    // Cheaper for customer chip appears and toggles split_rule
    const cheaperChip = await screen.findByTestId("cheaper-for-customer-chip");
    fireEvent.click(cheaperChip);

    await waitFor(() => {
      const calls = vi.mocked(settlementApi.previewCustomerSettlement).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall?.[1]?.split_rule).toBe("cheaper_for_customer");
    });

    // Manual +/- move on INV-1015 keeps total fixed at 25
    const moveOnBtn = screen.getByLabelText("Move 1 unit onto INV-1015");
    fireEvent.click(moveOnBtn);

    await waitFor(() => {
      const calls = vi.mocked(settlementApi.previewCustomerSettlement).mock.calls;
      const lastCall = calls[calls.length - 1];
      const placement = lastCall?.[1]?.returns?.[0]?.placement;
      expect(placement).toBeTruthy();
      const totalMoved = placement!.reduce((s: number, p: any) => s + p.qty, 0);
      expect(totalMoved).toBe(25);
    });
  });

  it("Step 4: payment queue reorder, discount requires ReasonChips, and leftover choice", async () => {
    render(wrap(<CustomerSettlementView initialCustomerId={42} />));

    await waitFor(() => {
      expect(screen.getByText(/INV-1012/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("settlement-step-4"));
    await waitFor(() => {
      expect(screen.getByTestId("settlement-paying-box")).toBeInTheDocument();
    });

    // Enter amount > total owed to surface leftover choice
    const amountInput = screen.getByLabelText("Payment amount");
    fireEvent.change(amountInput, { target: { value: "20000" } });

    await waitFor(() => {
      expect(settlementApi.previewCustomerSettlement).toHaveBeenCalled();
    });

    // Open discount editor on INV-1012
    const discountBtns = screen.getAllByRole("button", { name: /Discount/i });
    fireEvent.click(discountBtns[0]);
    const discValueInput = screen.getByLabelText("Discount value");
    fireEvent.change(discValueInput, { target: { value: "500" } });

    // Apply button disabled without reason
    const applyBtn = screen.getByRole("button", { name: /Apply discount/i });
    expect(applyBtn).toBeDisabled();

    // Select "Other" without note -> still disabled
    fireEvent.click(screen.getByText("Other"));
    expect(applyBtn).toBeDisabled();

    // Select "Regular customer" -> enabled
    fireEvent.click(screen.getByText("Regular customer"));
    expect(applyBtn).not.toBeDisabled();
    fireEvent.click(applyBtn);

    // Move INV-1015 first in queue
    const payFirstBtn = screen.getByRole("button", { name: /Pay this first/i });
    fireEvent.click(payFirstBtn);

    await waitFor(() => {
      const calls = vi.mocked(settlementApi.previewCustomerSettlement).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall?.[1]?.queue_order?.[0]).toBe(1015);
      expect(lastCall?.[1]?.discounts?.[0]?.reason?.key).toBe("regular_customer");
    });
  });

  it("debounces preview requests (~300ms) and cancels stale requests", async () => {
    vi.useFakeTimers();
    render(wrap(<CustomerSettlementView initialCustomerId={42} />));

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByTestId("settlement-step-4"));
    const amountInput = screen.getByLabelText("Payment amount");

    vi.mocked(settlementApi.previewCustomerSettlement).mockClear();
    fireEvent.change(amountInput, { target: { value: "1000" } });
    fireEvent.change(amountInput, { target: { value: "2000" } });
    fireEvent.change(amountInput, { target: { value: "5000" } });

    // Before 300ms: not yet called for the debounced changes
    expect(settlementApi.previewCustomerSettlement).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(settlementApi.previewCustomerSettlement).toHaveBeenCalledTimes(1);
    expect(vi.mocked(settlementApi.previewCustomerSettlement).mock.calls[0]?.[1]?.payments?.[0]?.amount).toBe(5000);
  });

  it("Step 5: review styling, 409 re-confirm keeping Idempotency-Key, close bills + ID card, and receipt matching review", async () => {
    // First save returns 409 settlement_changed, second save succeeds
    const conflictErr = Object.assign(new Error("Settlement changed"), {
      status: 409,
      code: "settlement_changed",
      data: {
        code: "settlement_changed",
        preview: { ...mockPreview, preview_version: "v2-hash" },
      },
    });
    vi.mocked(settlementApi.commitCustomerSettlement)
      .mockRejectedValueOnce(conflictErr)
      .mockResolvedValueOnce({
        ...mockPreview,
        preview_version: "v2-hash",
        settlement_id: 777,
        settled_at: "2026-11-25T10:00:00Z",
      });

    render(wrap(<CustomerSettlementView initialCustomerId={42} />));

    await waitFor(() => {
      expect(screen.getByText(/INV-1012/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("settlement-step-4"));
    fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "10000" } });

    await waitFor(() => {
      expect(settlementApi.previewCustomerSettlement).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTestId("settlement-step-5"));

    // Only changed bill (INV-1012) is shown; unchanged (INV-1015) is behind "Show the other 1 bills"
    expect(await screen.findByTestId("review-bill-card-1012")).toBeInTheDocument();
    expect(screen.queryByTestId("review-bill-card-1015")).not.toBeInTheDocument();
    expect(screen.getByTestId("review-change-chip-1012-payment")).toBeInTheDocument();
    expect(screen.getByTestId("line-ticked-501")).toBeInTheDocument();

    // Save -> triggers 409
    fireEvent.click(screen.getByTestId("settlement-save-btn"));
    expect(await screen.findByTestId("settlement-conflict-alert")).toBeInTheDocument();

    // Confirm & save again -> succeeds with same Idempotency-Key
    fireEvent.click(screen.getByTestId("settlement-save-btn"));
    expect(await screen.findByTestId("settlement-saved-alert")).toBeInTheDocument();

    const calls = vi.mocked(settlementApi.commitCustomerSettlement).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][2]).toBe(calls[1][2]); // Idempotency-Key preserved across retry
    expect(calls[1][1].preview_version).toBe("v2-hash");

    // Close bills + Give back ID card
    fireEvent.click(screen.getByTestId("settlement-close-bills-btn"));
    await waitFor(() => {
      expect(settlementApi.completeSettlementBills).toHaveBeenCalledWith(42, {
        invoice_ids: [1012],
        release_id_card: true,
      });
    });

    // Receipt matches review (before -> after)
    fireEvent.click(screen.getByTestId("settlement-open-receipt-btn"));
    const receipt = await screen.findByTestId("settlement-receipt-preview");
    expect(receipt).toHaveTextContent(/18,000/);
    expect(receipt).toHaveTextContent(/8,000/);
    expect(receipt).toHaveTextContent(/INV-1012/);
  });

  it("renders cleanly at phone width and in Sinhala", async () => {
    const origMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    await act(async () => {
      await i18n.changeLanguage("si");
    });

    render(wrap(<CustomerSettlementView initialCustomerId={42} />));

    await waitFor(() => {
      expect(screen.getByTestId("settlement-customer-card")).toBeInTheDocument();
    });
    expect(screen.getByText(/පාරිභෝගිකයා/)).toBeInTheDocument();

    window.matchMedia = origMatchMedia;
  });
});
