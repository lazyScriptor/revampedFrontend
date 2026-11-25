import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const apiMocks = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
vi.mock("@/lib/api", () => ({
  api: {
    get: (...a: unknown[]) => apiMocks.get(...a),
    post: (...a: unknown[]) => apiMocks.post(...a),
    put: (...a: unknown[]) => apiMocks.put(...a),
    delete: (...a: unknown[]) => apiMocks.delete(...a),
  },
}));
vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({
  useWarehouseOptions: () => ({ data: [{ warehouse_id: 1, location_name: "Main Store" }, { warehouse_id: 2, location_name: "Yard" }] }),
  useSingleLocation: () => ({ single: false, only: null }),
}));
vi.mock("../api/retail.api", async (orig) => ({
  ...(await orig<typeof import("../api/retail.api")>()),
  fetchRetailSettings: vi.fn(async () => ({ approvalMethod: "either", defaultWarehouseId: 2 })),
}));

import {
  fetchStockDocument,
  fetchStockLevels,
  fetchStockMovements,
  fetchStockSummary,
  fetchSupplierItems,
} from "../api/stock.api";
import { fetchProduct } from "../api/catalog.api";
import { groupStockSummary, mergeStockLevels, statusForProduct } from "../stock/levelsModel";
import { STOCK_LEVELS_KEY, useStockLevels } from "../stock/useStockLevels";
import { ALL_RETAIL_PERMISSIONS, signIn } from "./catalogTestUtils";
import { sali } from "./catalogFixtures";

beforeEach(() => {
  Object.values(apiMocks).forEach((m) => m.mockReset());
  signIn({ permissions: ALL_RETAIL_PERMISSIONS });
});

describe("stock.api real backend shapes", () => {
  it("normalizes Sequelize include names, decimal strings, JSON serials and product stock/movements", async () => {
    apiMocks.get.mockResolvedValueOnce({
      status: "success",
      data: {
        server_time: "2026-11-23T10:00:00.000Z",
        levels: [
          {
            product_id: 10,
            warehouse_id: 1,
            qty_on_hand: "14.500",
            reorder_level: "5.000",
            reorder_qty: "20.000",
            counted_at: "2026-11-23T09:00:00.000Z",
            updatedAt: "2026-11-23T09:30:00.000Z",
          },
        ],
      },
    });
    const lvls = await fetchStockLevels();
    expect(lvls.levels[0]).toMatchObject({
      product_id: 10,
      warehouse_id: 1,
      qty_on_hand: 14.5,
      reorder_level: 5,
      reorder_qty: 20,
    });

    apiMocks.get.mockResolvedValueOnce({
      data: {
        doc_id: 4,
        doc_type: "receive",
        status: "posted",
        doc_no: "RCV-00004",
        warehouse_id: 1,
        delivery_charge: "250.00",
        total_cost: "3250.00",
        Warehouse: { warehouse_id: 1, name: "Main Store" },
        User: { user_id: 1, first_name: "Kamal", last_name: "Silva", username: "kamal" },
        Lines: [
          {
            line_id: 12,
            product_id: 10,
            unit_id: 3,
            qty: "2.000",
            base_qty: "50.000",
            entered_unit_cost: "1500.0000",
            unit_cost: "65.0000",
            serials: '["SN-01","SN-02"]',
            RetailProduct: { product_id: 10, code: "HW-00010", name: "Bosch Grinder", base_unit: "pcs" },
            Unit: { unit_id: 3, unit_name: "box", factor: "25.000" },
          },
        ],
        serials: [{ serial_id: 1, product_id: 10, serial_no: "SN-01", status: "in_stock" }],
      },
    });
    const doc = await fetchStockDocument(4);
    expect(doc.location_name).toBe("Main Store");
    expect(doc.user_name).toBe("Kamal Silva");
    expect(doc.delivery_charge).toBe(250);
    expect(doc.lines[0]).toMatchObject({
      product_name: "Bosch Grinder",
      unit_name: "box",
      unit_factor: 25,
      base_qty: 50,
      serials: ["SN-01", "SN-02"],
    });
    expect(doc.serials?.[0]?.serial_no).toBe("SN-01");

    apiMocks.get.mockResolvedValueOnce({
      data: {
        movements: [
          {
            movement_id: 99,
            product_id: 10,
            warehouse_id: 1,
            qty_change: "-2.000",
            qty_after: "12.500",
            type: "ADJUST_OUT",
            reason: "damaged",
            doc_id: 8,
            Document: { doc_id: 8, doc_no: "ADJ-00008", doc_type: "adjust" },
            User: { user_id: 2, first_name: "Saman", last_name: "", username: "saman" },
            RetailProduct: { product_id: 10, code: "HW-00010", name: "Bosch Grinder", base_unit: "pcs" },
            Warehouse: { warehouse_id: 1, name: "Main Store" },
            occurred_at: "2026-11-23T11:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        limit: 30,
      },
    });
    const movs = await fetchStockMovements();
    expect(movs.movements[0]).toMatchObject({
      qty_change: -2,
      qty_after: 12.5,
      doc_no: "ADJ-00008",
      user_name: "Saman",
      location_name: "Main Store",
    });

    apiMocks.get.mockResolvedValueOnce({
      data: {
        items_counted: 10,
        items_not_counted: 5,
        low_stock_count: 2,
        out_of_stock_count: 1,
        // stock_value omitted when user lacks retail:cost_view
      },
    });
    const sum = await fetchStockSummary();
    expect(sum.stock_value).toBeUndefined();

    apiMocks.get.mockResolvedValueOnce({
      data: [
        {
          product_id: 10,
          times_received: 3,
          last_received_at: "2026-11-20T10:00:00Z",
          last_unit_cost: "1500.00",
          last_unit_id: 3,
          RetailProduct: { product_id: 10, name: "Bosch Grinder", code: "HW-00010", sell_price: "2500.00" },
          Unit: { unit_id: 3, unit_name: "box", factor: "25.000" },
        },
      ],
    });
    const supItems = await fetchSupplierItems("Lanka Tools");
    expect(supItems[0]).toMatchObject({
      product_id: 10,
      last_unit_cost: 1500,
      last_unit: { unit_id: 3, unit_name: "box", factor: 25 },
    });

    apiMocks.get.mockResolvedValueOnce({
      data: {
        product: {
          product_id: 10,
          name: "Bosch Grinder",
          sell_price: "2500",
          stock: [{ warehouse_id: 1, location_name: "Main Store", qty_on_hand: "12.5", counted_at: "2026-11-20T00:00:00Z", reorder_level: "3", reorder_qty: "10" }],
          recent_movements: [{ movement_id: 1, product_id: 10, warehouse_id: 1, qty_change: "12.5", qty_after: "12.5", type: "OPENING", doc_id: 1, doc_no: "OPN-00001", occurred_at: "2026-11-20T00:00:00Z" }],
        },
      },
    });
    const pd = await fetchProduct(10);
    expect(pd.stock?.[0]).toMatchObject({ warehouse_id: 1, qty_on_hand: 12.5, reorder_level: 3, reorder_qty: 10 });
    expect(pd.recent_movements?.[0]).toMatchObject({ doc_no: "OPN-00001", qty_change: 12.5 });
  });
});

describe("levelsModel", () => {
  it("merges delta levels by (product_id, warehouse_id)", () => {
    const initial = mergeStockLevels(
      undefined,
      {
        server_time: "2026-11-23T10:00:00Z",
        levels: [
          { product_id: 1, warehouse_id: 1, qty_on_hand: 10, reorder_level: 3, reorder_qty: null, counted_at: "2026-11-20T00:00:00Z", updatedAt: "2026-11-20T00:00:00Z" },
          { product_id: 2, warehouse_id: 1, qty_on_hand: 5, reorder_level: null, reorder_qty: null, counted_at: "2026-11-20T00:00:00Z", updatedAt: "2026-11-20T00:00:00Z" },
        ],
      },
      false,
    );
    const merged = mergeStockLevels(
      initial,
      {
        server_time: "2026-11-23T10:01:00Z",
        levels: [
          { product_id: 2, warehouse_id: 1, qty_on_hand: 8, reorder_level: null, reorder_qty: null, counted_at: "2026-11-23T10:01:00Z", updatedAt: "2026-11-23T10:01:00Z" },
          { product_id: 2, warehouse_id: 2, qty_on_hand: 3, reorder_level: null, reorder_qty: null, counted_at: "2026-11-23T10:01:00Z", updatedAt: "2026-11-23T10:01:00Z" },
        ],
      },
      true,
    );
    expect(merged.serverTime).toBe("2026-11-23T10:01:00Z");
    expect(merged.levels).toHaveLength(3);
    expect(merged.levels.find((l) => l.product_id === 1 && l.warehouse_id === 1)?.qty_on_hand).toBe(10);
    expect(merged.levels.find((l) => l.product_id === 2 && l.warehouse_id === 1)?.qty_on_hand).toBe(8);
    expect(merged.levels.find((l) => l.product_id === 2 && l.warehouse_id === 2)?.qty_on_hand).toBe(3);
  });

  it("computes status rules including not counted, untracked, out, low (with location override) and in_stock", () => {
    expect(statusForProduct({ tracking: "untracked", reorder_level: 5 }, undefined)).toBe("untracked");
    expect(statusForProduct({ tracking: "service", reorder_level: 5 }, undefined)).toBe("untracked");
    expect(statusForProduct({ tracking: "counted", reorder_level: 5 }, undefined)).toBe("not_counted");
    expect(
      statusForProduct(
        { tracking: "counted", reorder_level: 5 },
        { product_id: 1, warehouse_id: 1, qty_on_hand: 0, reorder_level: null, reorder_qty: null, counted_at: null, updatedAt: null },
      ),
    ).toBe("not_counted");
    expect(
      statusForProduct(
        { tracking: "counted", reorder_level: 5 },
        { product_id: 1, warehouse_id: 1, qty_on_hand: 0, reorder_level: null, reorder_qty: null, counted_at: "2026-11-23T00:00:00Z", updatedAt: null },
      ),
    ).toBe("out");
    expect(
      statusForProduct(
        { tracking: "counted", reorder_level: 5 },
        { product_id: 1, warehouse_id: 1, qty_on_hand: 5, reorder_level: null, reorder_qty: null, counted_at: "2026-11-23T00:00:00Z", updatedAt: null },
      ),
    ).toBe("low");
    // Location reorder_level overrides product default (e.g. location says 2, qty is 5 -> in_stock)
    expect(
      statusForProduct(
        { tracking: "counted", reorder_level: 5 },
        { product_id: 1, warehouse_id: 1, qty_on_hand: 5, reorder_level: 2, reorder_qty: null, counted_at: "2026-11-23T00:00:00Z", updatedAt: null },
      ),
    ).toBe("in_stock");

    const grp = groupStockSummary([sali(3), sali(4)], (id) =>
      id === 1003
        ? { product_id: 1003, warehouse_id: 1, qty_on_hand: 10, reorder_level: 2, reorder_qty: null, counted_at: "2026-11-23T00:00:00Z", updatedAt: null }
        : { product_id: 1004, warehouse_id: 1, qty_on_hand: 0, reorder_level: 2, reorder_qty: null, counted_at: "2026-11-23T00:00:00Z", updatedAt: null },
    );
    expect(grp.status).toBe("low");
    expect(grp.totalQty).toBe(10);
  });
});

describe("useStockLevels hook", () => {
  it("persists cache, defaults to settings.defaultWarehouseId, and delta-syncs with ?since=", async () => {
    apiMocks.get
      .mockResolvedValueOnce({
        data: {
          server_time: "2026-11-23T10:00:00Z",
          levels: [
            { product_id: 1003, warehouse_id: 2, qty_on_hand: "20.000", counted_at: "2026-11-23T09:00:00Z", reorder_level: "5", reorder_qty: null, updatedAt: "2026-11-23T09:00:00Z" },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          server_time: "2026-11-23T10:05:00Z",
          levels: [
            { product_id: 1003, warehouse_id: 2, qty_on_hand: "18.000", counted_at: "2026-11-23T09:00:00Z", reorder_level: "5", reorder_qty: null, updatedAt: "2026-11-23T10:05:00Z" },
          ],
        },
      });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useStockLevels(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.warehouseId).toBe(2);
    expect(result.current.qtyFor(1003)).toBe(20);
    expect(result.current.statusFor(sali(3))).toBe("in_stock");
    expect(client.getQueryCache().find({ queryKey: STOCK_LEVELS_KEY })?.meta).toEqual({ persist: true });
    expect(apiMocks.get.mock.calls[0][1]).toEqual({ params: {} });

    await client.invalidateQueries({ queryKey: STOCK_LEVELS_KEY });
    await waitFor(() => expect(result.current.qtyFor(1003)).toBe(18));
    expect(apiMocks.get.mock.calls[1][1]).toEqual({ params: { since: "2026-11-23T10:00:00Z" } });
  });
});
