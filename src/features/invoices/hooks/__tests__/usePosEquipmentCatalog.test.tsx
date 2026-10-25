import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ api: { get: (...a: unknown[]) => get(...a) } }));

import { usePosEquipmentCatalog, dedupeById } from "../usePosEquipmentCatalog";

const eq = (id: number) => ({ equipment_id: id, equipment_name: `M${id}`, available_qty: 1 });
const page = (ids: number[], currentPage: number, totalPages: number) => ({
  data: { equipment: ids.map(eq), currentPage, totalPages, total: 99 },
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const hook = (over: Partial<Parameters<typeof usePosEquipmentCatalog>[0]> = {}) =>
  renderHook((props) => usePosEquipmentCatalog({ search: "", categoryId: null, inStockOnly: true, enabled: true, ...props }), {
    wrapper,
    initialProps: over,
  });

beforeEach(() => get.mockReset());

describe("dedupeById", () => {
  it("keeps the first occurrence and the order", () => {
    expect(dedupeById([eq(1), eq(2), eq(1), eq(3), eq(2)]).map((r) => r.equipment_id)).toEqual([1, 2, 3]);
  });
});

describe("usePosEquipmentCatalog", () => {
  it("browses with no search: first page, in-stock only", async () => {
    get.mockResolvedValue(page([1, 2], 1, 1));
    const { result } = hook();
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(get).toHaveBeenCalledWith("/equipment", {
      params: { page: 1, limit: 24, search: undefined, category_id: undefined, availability: "in_stock" },
    });
  });

  it("never lists a machine twice even when pages overlap", async () => {
    get.mockResolvedValueOnce(page([1, 2, 3], 1, 2)).mockResolvedValueOnce(page([3, 4], 2, 2));
    const { result } = hook();
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.items.map((i) => i.equipment_id)).toEqual([1, 2, 3, 4]));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("ignores the in-stock filter while searching so out-of-stock matches still show", async () => {
    get.mockResolvedValue(page([5], 1, 1));
    const { result } = hook({ search: "drill" });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const params = get.mock.calls[0][1].params;
    expect(params.search).toBe("drill");
    expect(params.availability).toBeUndefined();
  });

  it("sends the category filter", async () => {
    get.mockResolvedValue(page([6], 1, 1));
    const { result } = hook({ categoryId: 7 });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(get.mock.calls[0][1].params.category_id).toBe(7);
  });

  it("does not fetch while the catalog is closed", async () => {
    hook({ enabled: false });
    await new Promise((r) => setTimeout(r, 30));
    expect(get).not.toHaveBeenCalled();
  });

  it("reports isSettling while typed text has not reached the server", async () => {
    get.mockResolvedValue(page([1], 1, 1));
    const { result, rerender } = hook({ search: "" });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    rerender({ search: "dr" });
    expect(result.current.isSettling).toBe(true);
    await waitFor(() => expect(result.current.isSettling).toBe(false));
  });
});
