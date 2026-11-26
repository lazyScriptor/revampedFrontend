import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }));
import { api } from "@/lib/api";
import { useInvoiceDetails } from "../useInvoiceHooks";

const listRow = { invoice_id: 7, total_amount: "1000.00", Payments: [], InvoiceLines: [] };
const fullBill = { ...listRow, total_amount: "1150.00", late_fee: "150.00" };

describe("Manage: opening a bill", () => {
  let qc: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["invoices", 1, 20, "All", undefined], { invoices: [listRow] });
    vi.mocked(api.get).mockReset();
  });

  it("shows the list row at once (locked), then the full bill", async () => {
    let release!: () => void;
    vi.mocked(api.get).mockImplementation(
      () => new Promise((resolve) => (release = () => resolve({ status: "success", data: { invoice: fullBill } }))) as any,
    );
    const { result } = renderHook(() => useInvoiceDetails(7), { wrapper });
    expect(result.current.data).toMatchObject({ invoice_id: 7, total_amount: "1000.00" });
    expect(result.current.isPlaceholderData).toBe(true);
    release();
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data).toMatchObject({ total_amount: "1150.00" });
  });

  it("cancels the previous bill's request when another is opened", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(api.get).mockImplementation((_url: string, cfg: any) => {
      signals.push(cfg.signal);
      return new Promise(() => {}) as any;
    });
    const { rerender } = renderHook(({ id }) => useInvoiceDetails(id), { wrapper, initialProps: { id: 7 } });
    await waitFor(() => expect(signals).toHaveLength(1));
    rerender({ id: 8 });
    await waitFor(() => expect(signals).toHaveLength(2));
    // No one is looking at bill 7 any more, so TanStack Query aborts its request by itself.
    await waitFor(() => expect(signals[0].aborted).toBe(true));
    expect(signals[1].aborted).toBe(false);
  });
});
