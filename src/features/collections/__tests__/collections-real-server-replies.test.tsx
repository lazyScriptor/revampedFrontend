/**
 * The Collections pages against replies captured from the real server
 * (`collectionsReportService` on a local copy, names/phones replaced).
 * The older tests fed the pages hand-written data in the page's own shape, which hid that the
 * server uses other names: the customer page crashed on live ("reading 'balance'") and the
 * filters were never sent in a form the server reads.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import replies from "./__fixtures__/collectionsServerReplies.json";

let mockParams: Record<string, any> = {};
let mockSearch: Record<string, any> = {};
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => mockParams,
  useSearch: () => mockSearch,
}));
vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({ WhatsAppButton: () => null }));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useMyDevices: () => ({ data: { devices: [] } }),
  useInvoiceSignatures: () => ({ data: { signatures: [] } }),
}));
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

import { api } from "@/lib/api";
import CollectionsReportPage from "../pages/CollectionsReportPage";
import CustomerCollectionDetailPage from "../pages/CustomerCollectionDetailPage";
import { normalizeCollectionDetail, normalizeCollectionsList, normalizeCallsReport, toServerCallsParams } from "../api/normalizeCollectionDetail";
import { toServerCollectionsParams } from "../api/collectionsParams";

const R = replies as any;
// api.ts unwraps axios' response.data, so the API layer receives the JSON body { status, data }.
const body = (data: unknown) => ({ status: "success", data });

const wrap = (ui: React.ReactElement) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
);

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url.startsWith("/reports/customers/collections/")) return body(R.detail);
    if (url.startsWith("/reports/customers/collections")) return body(R.list);
    if (url.startsWith("/reports/calls")) return body(R.calls);
    return body({});
  });
});

describe("Collections: real server replies", () => {
  it("the customer page opens without crashing and shows the balance", async () => {
    mockParams = { customerId: String(R.detail.customer.customer_id) };
    mockSearch = {};
    render(wrap(<CustomerCollectionDetailPage />));
    await waitFor(() => expect(screen.getAllByText(R.detail.customer.name).length).toBeGreaterThan(0));
    expect(document.body.textContent).toMatch(/Balance/);
  });

  it("the list renders the real rows, totals and option counts", async () => {
    mockParams = {};
    mockSearch = {};
    render(wrap(<CollectionsReportPage />));
    await waitFor(() => expect(screen.getAllByText(R.list.rows[0].name).length).toBeGreaterThan(0));
    const list = normalizeCollectionsList(R.list);
    expect(list.total).toBe(R.list.pagination.total);
    expect(list.option_counts.everyone).toBe(R.list.optionCounts.everyone);
  });

  it("maps the detail reply to the page's names", () => {
    const d = normalizeCollectionDetail(R.detail)!;
    expect(d.filtered_totals.balance).toBe(R.detail.both_totals.filtered.balance);
    expect(d.all_totals.balance).toBe(R.detail.both_totals.all.balance);
    const bills = [...d.not_complete_bills, ...d.complete_bills];
    const raw = [...R.detail.not_complete_bills, ...R.detail.complete_bills];
    bills.forEach((b, i) => expect(b.balance).toBe(raw[i].owed));
    expect(d.calls_summary.total).toBe(R.detail.calls_section.summary.total_calls);
  });

  it("sends the filters under the names the server reads", async () => {
    const p = toServerCollectionsParams({ owes_money: true, late: true, date_preset: "this_month", return_status: "not_returned", sort_by: "overdue_max_days" } as any);
    expect(p).toMatchObject({ options: "owes_money,late", preset: "this_month", machine_status: "not_returned", sort_by: "overdue_days" });
    expect(p).not.toHaveProperty("owes_money");
    expect(toServerCallsParams({ startDate: "2026-11-01T00:00:00Z", endDate: "2026-11-26" })).toMatchObject({ preset: "custom", from: "2026-11-01", to: "2026-11-26" });

    mockParams = {};
    mockSearch = { owes_money: "1" };
    render(wrap(<CollectionsReportPage />));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const [, cfg] = vi.mocked(api.get).mock.calls.find(([u]) => String(u) === "/reports/customers/collections")!;
    expect((cfg as any).params.options).toContain("owes_money");
  });

  it("maps the calls report", () => {
    const c = normalizeCallsReport(R.calls);
    expect(c.total).toBe(R.calls.pagination.total);
    expect(c.summary.answered).toBe(R.calls.totals.answered_count);
  });
});
