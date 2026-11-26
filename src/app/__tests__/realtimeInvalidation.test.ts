import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const handlers = new Map<string, (p: any) => void>();
vi.mock("@/lib/socket", () => ({
  connectSocket: vi.fn(),
  getSocket: () => ({
    on: (e: string, fn: (p: any) => void) => handlers.set(e, fn),
    off: (e: string) => handlers.delete(e),
  }),
}));

import { applyDataChanges, startRealtimeInvalidation } from "../realtimeInvalidation";

const seed = (qc: QueryClient) => {
  for (const key of [
    ["equipment", "pos-catalog", { search: "" }],
    ["equipment-stats"],
    ["customers", 1, 50, {}],
    ["invoice", 7],
    ["invoice", 8],
    ["invoices", 1, 20],
    ["dashboard", "kpis", {}],
    ["dashboard", "open-invoices", "money"],
    ["dashboard", "config"],
  ]) qc.setQueryData(key, { ok: true });
};
const stale = (qc: QueryClient, key: unknown[]) => qc.getQueryState(key)?.isInvalidated;

describe("data:changed -> cache refresh", () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = new QueryClient();
    seed(qc);
    handlers.clear();
  });

  it("a stock movement refreshes the equipment caches only", () => {
    applyDataChanges(qc, [{ topics: ["equipment"] }]);
    expect(stale(qc, ["equipment", "pos-catalog", { search: "" }])).toBe(true);
    expect(stale(qc, ["equipment-stats"])).toBe(true);
    expect(stale(qc, ["customers", 1, 50, {}])).toBe(false);
    expect(stale(qc, ["invoice", 7])).toBe(false);
  });

  it("a payment on bill 7 refreshes that bill, the lists and the dashboard, not bill 8", () => {
    applyDataChanges(qc, [{ topics: ["invoices", "dashboard"], invoice_id: 7 }]);
    expect(stale(qc, ["invoice", 7])).toBe(true);
    expect(stale(qc, ["invoice", 8])).toBe(false);
    expect(stale(qc, ["invoices", 1, 20])).toBe(true);
    expect(stale(qc, ["dashboard", "kpis", {}])).toBe(true);
    expect(stale(qc, ["dashboard", "open-invoices", "money"])).toBe(true);
    expect(stale(qc, ["dashboard", "config"])).toBe(false);
  });

  it("batches a burst of notices into one refresh", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const stop = startRealtimeInvalidation(qc, { delayMs: 400 });
    const emit = handlers.get("data:changed")!;
    emit({ topics: ["customers"] });
    emit({ topics: ["customers"], customer_id: 3 });
    expect(spy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(spy.mock.calls.filter(([f]: any) => f?.queryKey?.[0] === "customers")).toHaveLength(1);
    stop();
    expect(handlers.has("data:changed")).toBe(false);
    vi.useRealTimers();
  });
});
