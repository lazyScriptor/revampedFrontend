import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockNavigate = vi.fn();
let mockParams: Record<string, any> = { customerId: "11" };
let mockSearch: Record<string, any> = { owes_money: "1" };

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useSearch: () => mockSearch,
}));

vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({
  WhatsAppButton: () => <button type="button">WhatsApp</button>,
}));

vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useMyDevices: () => ({ data: { devices: [] } }),
  useInvoiceSignatures: () => ({ data: { signatures: [] } }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(async () => ({ data: { ok: true } })),
    patch: vi.fn(async () => ({ data: { ok: true } })),
  },
}));

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import CollectionsReportPage from "../pages/CollectionsReportPage";
import CustomerCollectionDetailPage from "../pages/CustomerCollectionDetailPage";
import { CollectionsSettingsSection } from "../components/CollectionsSettingsSection";
import { InvoiceReceipt } from "@/features/invoices/components/InvoiceReceipt";
import enLocale from "@/i18n/locales/en.json";
import siLocale from "@/i18n/locales/si.json";

const wrap = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
};

const sampleCollectionsResponse = {
  rows: [
    {
      customer_id: 11,
      name: "Kasun Perera",
      nic_number: "901234567V",
      phone_number: "0771234567",
      rating: 4,
      is_blacklisted: false,
      revenue: 50000,
      paid: 32000,
      balance: 18000,
      overdue_machines_count: 3,
      overdue_max_days: 14,
      overdue_amount: 12000,
      has_items_out: true,
      machines_out: [
        { equipment_id: 1, name: "Scaffolding (3×5)", qty: 8, max_days_out: 14, days_overdue: 14 },
      ],
      invoice_ids: [101],
      last_call: null,
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
  totals: {
    customer_count: 1,
    revenue: 50000,
    paid: 32000,
    balance: 18000,
    machines_out: 8,
    overdue_amount: 12000,
  },
  option_counts: {
    owes_money: 12,
    not_returned: 8,
    late: 5,
    everyone: 30,
  },
};

describe("Slice 2 Collections Report, Customer Page, Settings & Receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { customerId: "11" };
    mockSearch = { owes_money: "1" };
    useAuthStore.setState({
      user: { user_id: 1, username: "admin", permissions: ["calls:listen"], configData: {} } as any,
    });
  });

  it("renders option cards, date basis switch, filters, totals row, and two-half rows", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: sampleCollectionsResponse } as any);

    render(wrap(<CollectionsReportPage />));
    expect(await screen.findByText("Kasun Perera")).toBeTruthy();

    // Two-half row: machines out chip
    expect(screen.getByText(/Scaffolding \(3×5\) × 8/)).toBeTruthy();

    // Totals row equals rows
    expect(screen.getByText(/1.*customers/i)).toBeTruthy();
    expect(screen.getAllByText(/Rs 18,000/).length).toBeGreaterThan(0);

    // Date basis switch
    const basisSwitch = screen.getByLabelText(/Switch between Bill date and Due back date/i);
    fireEvent.click(basisSwitch);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/reports/customers/collections",
        expect.objectContaining({
          params: expect.objectContaining({ date_basis: "due_date" }),
        }),
      );
    });

    // Option card toggle (Machines not returned)
    fireEvent.click(screen.getByText("Machines not returned"));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/reports/customers/collections",
        expect.objectContaining({
          params: expect.objectContaining({ options: expect.stringContaining("not_returned") }),
        }),
      );
    });

    // Filter chip
    fireEvent.click(screen.getByText("Overdue only"));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/reports/customers/collections",
        expect.objectContaining({
          params: expect.objectContaining({ overdue_only: true }),
        }),
      );
    });
  }, 15000);

  it("renders CustomerCollectionDetailPage banner, Filters on/off switch, and calls section", async () => {
    vi.mocked(api.get).mockImplementation(async (_url, config: any) => {
      const filtersOn = config?.params?.filters_on !== false;
      return {
        data: {
          customer: sampleCollectionsResponse.rows[0],
          filters_on: filtersOn,
          filter_summary: "bills dated 1 Oct – 25 Nov · owes money",
          filtered_totals: { revenue: 30000, paid: 12000, balance: 18000, machines_out: 3 },
          all_totals: { revenue: 50000, paid: 25000, balance: 25000, machines_out: 5 },
          timeline: [{ invoice_id: 101, issued_date: "2026-11-01", state: "open_owing", balance: 18000 }],
          not_complete_bills: [
            {
              invoice_id: 101,
              issued_date: "2026-11-01",
              status: "Active",
              is_complete: false,
              revenue: 30000,
              paid: 12000,
              balance: 18000,
              running_charge: 5000,
              discount_amount: 0,
              days_late: 4,
              has_items_out: true,
              lines: [],
              payments: [],
            },
          ],
          complete_bills: [],
          calls_summary: {
            total: 2,
            answered: 1,
            no_answer: 1,
            unreachable: 0,
            by_staff: [{ staff_id: 5, staff_name: "Kasun", count: 2 }],
            promises_count: 1,
            promises_amount: 5000,
          },
          calls: [
            {
              call_id: 77,
              customer_id: 11,
              direction: "OUTGOING",
              source: "phone",
              started_at: "2026-11-25T10:00:00Z",
              duration_seconds: 75,
              staff_id: 5,
              staff_name: "Kasun",
              outcome: "answered",
              note: null,
              recording_id: 501,
              recording_duration_seconds: 75,
            },
          ],
        },
      } as any;
    });

    render(wrap(<CustomerCollectionDetailPage />));
    expect(await screen.findByText(/These details are for the filters you chose/i)).toBeTruthy();
    expect(screen.getAllByText(/Rs 18,000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rs 25,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/No note entered/i)).toBeTruthy();
    expect(screen.getByText(/Only calls from paired GearGrid phones/i)).toBeTruthy();

    // Flip Filters on -> Show everything
    fireEvent.click(screen.getByLabelText(/Filters on or Show everything/i));
    expect(await screen.findByText(/Showing everything for this customer/i)).toBeTruthy();
  });

  it("requires legal confirmation before enabling call recording in settings", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} } as any);
    render(wrap(<CollectionsSettingsSection />));

    const toggle = await screen.findByLabelText(/Enable call recording/i);
    fireEvent.click(toggle);

    expect(await screen.findByText(/Confirm call recording legal notice/i)).toBeTruthy();
    const confirmBtn = screen.getByRole("button", { name: /Enable recording/i });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/I have taken legal advice/i));
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirmBtn);
  }, 15000);

  it("prints call-recording line in InvoiceReceipt terms block when enabled", () => {
    const invoice = {
      invoice_id: 300,
      status: "Active",
      issued_date: "2026-11-25T10:00:00Z",
      sub_total: 1000,
      total_amount: 1000,
      terms_call_recording: "Calls with our shop may be recorded for service and record-keeping.",
      Customer: { first_name: "A", last_name: "B", phone_number: "0771234567" },
      InvoiceLines: [],
      Payments: [],
    };

    render(wrap(<InvoiceReceipt id="test-receipt" invoice={invoice} showTerms />));
    expect(
      screen.getByText("Calls with our shop may be recorded for service and record-keeping."),
    ).toBeTruthy();
  });

  it("has real Sinhala translations for all collections keys", () => {
    const enCols = (enLocale as any).collections;
    const siCols = (siLocale as any).collections;
    expect(enCols).toBeTruthy();
    expect(siCols).toBeTruthy();
    expect(siCols.report.title).toBe("අයකිරීම්");
    expect(siCols.callCard.answered).toBe("පිළිතුරු දුන්නා");
    expect(siCols.settings.legalCheckbox).toBe("මම නීති උපදෙස් ලබාගෙන ඇත");
  });
});
