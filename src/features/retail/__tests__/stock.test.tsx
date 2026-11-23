import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { payload, products, sali } from "./catalogFixtures";

const api = {
  fetchCatalogPayload: vi.fn(),
  fetchProducts: vi.fn(),
  fetchProduct: vi.fn(),
  createFamily: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  learnBarcode: vi.fn(),
  fetchCategories: vi.fn(),
};
vi.mock("../api/catalog.api", async (orig) => ({
  ...(await orig<typeof import("../api/catalog.api")>()),
  fetchCatalogPayload: (...a: any[]) => api.fetchCatalogPayload(...a),
  fetchProducts: (...a: any[]) => api.fetchProducts(...a),
  fetchProduct: (...a: any[]) => api.fetchProduct(...a),
  createFamily: (...a: any[]) => api.createFamily(...a),
  createProduct: (...a: any[]) => api.createProduct(...a),
  updateProduct: (...a: any[]) => api.updateProduct(...a),
  learnBarcode: (...a: any[]) => api.learnBarcode(...a),
  fetchCategories: (...a: any[]) => api.fetchCategories(...a),
}));
vi.mock("../api/retail.api", async (orig) => ({
  ...(await orig<typeof import("../api/retail.api")>()),
  fetchRetailSettings: vi.fn(async () => ({ approvalMethod: "either", defaultWarehouseId: 1 })),
}));
const stockApi = {
  fetchStockLevels: vi.fn(),
  fetchStockSummary: vi.fn(),
  updateStockThresholds: vi.fn(),
  fetchStockMovements: vi.fn(),
  fetchStockDocuments: vi.fn(),
  fetchStockDocument: vi.fn(),
};
vi.mock("../api/stock.api", async (orig) => ({
  ...(await orig<typeof import("../api/stock.api")>()),
  fetchStockLevels: (...a: any[]) => stockApi.fetchStockLevels(...a),
  fetchStockSummary: (...a: any[]) => stockApi.fetchStockSummary(...a),
  updateStockThresholds: (...a: any[]) => stockApi.updateStockThresholds(...a),
  fetchStockMovements: (...a: any[]) => stockApi.fetchStockMovements(...a),
  fetchStockDocuments: (...a: any[]) => stockApi.fetchStockDocuments(...a),
  fetchStockDocument: (...a: any[]) => stockApi.fetchStockDocument(...a),
}));
vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({
  useWarehouseOptions: () => ({ data: [{ warehouse_id: 1, location_name: "Main Store" }] }),
  useSingleLocation: () => ({ single: true, only: { warehouse_id: 1, location_name: "Main Store" } }),
}));
const prefs: Record<string, unknown> = {};
vi.mock("@/features/retail/api/preferences.api", () => ({
  fetchUiPreferences: vi.fn(async () => ({ ...prefs })),
  putUiPreference: vi.fn(async (k: string, v: unknown) => {
    prefs[k] = v;
    return {};
  }),
}));

import { StockPage } from "../stock/StockPage";
import { ShortcutHost } from "@/components/command/ShortcutHost";
import { RetailCatalogHost } from "../catalog/RetailCatalogHost";
import { canOpenStock } from "../stockAccess";
import { startPathFor, startPageOptionsFor } from "@/app/startPage";
import { NEW_ITEM_OVERLAY_ID, ITEM_CARD_OVERLAY_ID } from "../catalog/overlayIds";
import "../catalog/registerCatalog";
import { useOverlay } from "@/components/overlay";
import { ALL_RETAIL_PERMISSIONS, renderCatalogUi, signIn } from "./catalogTestUtils";

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  Object.values(stockApi).forEach((m) => m.mockReset());
  Object.keys(prefs).forEach((k) => delete prefs[k]);
  api.fetchCatalogPayload.mockResolvedValue(payload());
  api.fetchProducts.mockResolvedValue({ rows: [{ ...sali(10), product_id: 7777, family_id: null, name: "Old SALI bit", is_active: false }], total: 1 });
  api.updateProduct.mockImplementation(async (id: number, input: any) => ({ ...products.find((p) => p.product_id === id)!, ...input }));
  stockApi.fetchStockLevels.mockResolvedValue({
    server_time: "2026-11-24T10:00:00Z",
    levels: [
      { product_id: 1003, warehouse_id: 1, qty_on_hand: 15, reorder_level: 5, reorder_qty: 20, counted_at: "2026-11-24T09:00:00Z", updatedAt: "2026-11-24T09:00:00Z" },
      { product_id: 1004, warehouse_id: 1, qty_on_hand: 3, reorder_level: 5, reorder_qty: 20, counted_at: "2026-11-24T09:00:00Z", updatedAt: "2026-11-24T09:00:00Z" },
      { product_id: 2006, warehouse_id: 1, qty_on_hand: 0, reorder_level: 2, reorder_qty: 10, counted_at: "2026-11-24T09:00:00Z", updatedAt: "2026-11-24T09:00:00Z" },
    ],
  });
  stockApi.fetchStockSummary.mockResolvedValue({
    items_counted: 3,
    items_not_counted: 4,
    low_stock_count: 2,
    out_of_stock_count: 1,
    stock_value: 45000,
  });
  window.history.replaceState(null, "");
  signIn({ permissions: ALL_RETAIL_PERMISSIONS });
});

describe("stock page", () => {
  it("groups by family with size chips and real stock dots/numbers, and shows the R2 KPIs", async () => {
    renderCatalogUi(<StockPage />);
    const rows = await screen.findAllByTestId("stock-row");
    expect(rows).toHaveLength(3); // SALI family, Tolsen family, hose
    const first = rows.find((r) => within(r).queryByText("SALI Steel Drill Bit"))!;
    for (const size of ["3mm", "4mm", "5mm", "6mm", "8mm"]) expect(within(first).getByText(size)).toBeTruthy();
    expect(within(first).getByTestId("stock-dot-low")).toBeTruthy();
    expect(within(first).getByText("18 pcs")).toBeTruthy();
    const tolsen = rows.find((r) => within(r).queryByText("Tolsen Wood Drill Bit"))!;
    expect(within(tolsen).getByTestId("stock-dot-out")).toBeTruthy();
    const hose = rows.find((r) => within(r).queryByText("Garden Hose 15m"))!;
    expect(within(hose).getByTestId("stock-dot-not_counted")).toBeTruthy();
    // KPIs from GET /stock/summary: Items (3+4=7), Low stock (2), Not counted (4), Stock value (Rs 45,000)
    await waitFor(() => expect(screen.getByText("Rs 45,000")).toBeTruthy());
    expect(screen.getAllByText("Low stock").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not counted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
  });

  it("filters by the category rail and by typed words", async () => {
    renderCatalogUi(<StockPage />);
    await screen.findAllByTestId("stock-row");
    fireEvent.click(screen.getAllByTestId("rail-tile").find((b) => b.textContent?.includes("Garden"))!);
    await waitFor(() => expect(screen.getAllByTestId("stock-row")).toHaveLength(1));
    fireEvent.click(document.querySelector("[data-testid=rail-chips] .MuiChip-root") as HTMLElement); // "All" in the phone chip row
    fireEvent.change(screen.getByLabelText("Search or scan"), { target: { value: "hss 6" } });
    await waitFor(() => expect(screen.getAllByTestId("stock-row")).toHaveLength(1));
  });

  it("saved views: 'No barcode' filters and is remembered through preferences; 'Archived' lists the server's rows", async () => {
    renderCatalogUi(<StockPage />);
    await screen.findAllByTestId("stock-row");
    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    expect(await screen.findByText("Old SALI bit")).toBeTruthy();
    expect(prefs["stock.view"]).toBe("archived");
    fireEvent.click(screen.getByRole("button", { name: "No barcode" }));
    await waitFor(() => expect(screen.queryByText("Old SALI bit")).toBeNull());
    expect(prefs["stock.view"]).toBe("no_barcode");
  });

  it("opens the item card from a row and hides cost without retail:cost_view", async () => {
    api.fetchProduct.mockImplementation(async (id: number) => ({ ...products.find((p) => p.product_id === id)!, avg_cost: 80, last_cost: 85 }));
    renderCatalogUi(<StockPage />);
    fireEvent.click((await screen.findAllByTestId("stock-row"))[0]);
    expect(await screen.findByText("Average cost")).toBeTruthy();
  });

  it("the item card shows no cost to a user without retail:cost_view", async () => {
    signIn({ permissions: ["retail:view", "retail:product_manage"] });
    api.fetchProduct.mockImplementation(async (id: number) => ({ ...products.find((p) => p.product_id === id)!, avg_cost: 80, last_cost: 85 }));
    renderCatalogUi(<StockPage />);
    fireEvent.click((await screen.findAllByTestId("stock-row"))[0]);
    await screen.findByText("Prices");
    expect(screen.queryByText("Average cost")).toBeNull();
    expect(screen.queryByText("Last cost")).toBeNull();
  });
});

describe("local catalogue", () => {
  it("loads everything first, then asks only for what changed since the last answer", async () => {
    const { client } = renderCatalogUi(<StockPage />);
    await screen.findAllByTestId("stock-row");
    expect(api.fetchCatalogPayload.mock.calls[0][0]).toBeFalsy();
    api.fetchCatalogPayload.mockResolvedValue(payload({ products: [{ ...sali(6), sell_price: 321 }], archived_ids: [1003], server_time: "2026-11-24T10:05:00Z", categories: undefined, brands: undefined, families: undefined, aliases: undefined }));
    await client.invalidateQueries({ queryKey: ["retail", "catalog"] });
    await waitFor(() => expect(api.fetchCatalogPayload).toHaveBeenCalledTimes(2));
    expect(api.fetchCatalogPayload.mock.calls[1][0]).toBe("2026-11-24T10:00:00Z");
    const cached: any = client.getQueryData(["retail", "catalog"]);
    expect(cached.products).toHaveLength(products.length - 1);
    expect(cached.categories.length).toBeGreaterThan(0);
  });

  it("is marked to persist so a cold start is instant", async () => {
    const { client } = renderCatalogUi(<StockPage />);
    await screen.findAllByTestId("stock-row");
    expect(client.getQueryCache().find({ queryKey: ["retail", "catalog"] })?.meta).toEqual({ persist: true });
  });
});

describe("F3", () => {
  it("opens the finder overlay anywhere in a retail shop", async () => {
    renderCatalogUi(
      <>
        <ShortcutHost />
        <RetailCatalogHost />
      </>,
    );
    await waitFor(() => expect(api.fetchCatalogPayload).toHaveBeenCalled());
    fireEvent.keyDown(window, { key: "F3" });
    expect(await screen.findByLabelText("Search or scan")).toBeTruthy();
  });
});

describe("edit as sheet", () => {
  it("sends only the changed cells, one PUT per changed product", async () => {
    renderCatalogUi(<StockPage />);
    await screen.findAllByTestId("stock-row");
    fireEvent.click(screen.getByRole("button", { name: "Sheet" }));
    const cell = await screen.findByLabelText("Sell SALI Steel Drill Bit 6mm");
    fireEvent.change(cell, { target: { value: "175" } });
    fireEvent.change(screen.getByLabelText("Reorder SALI Steel Drill Bit 3mm"), { target: { value: "10" } });
    // an edit put back to the old value is not a change
    const other = screen.getByLabelText("Sell SALI Steel Drill Bit 4mm");
    fireEvent.change(other, { target: { value: "999" } });
    fireEvent.change(other, { target: { value: "140" } });
    expect(screen.getByTestId("sheet-count").textContent).toContain("2");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.updateProduct).toHaveBeenCalledTimes(2));
    expect(api.updateProduct).toHaveBeenCalledWith(1006, { sell_price: 175 });
    expect(api.updateProduct).toHaveBeenCalledWith(1003, { reorder_level: 10 });
  });

  it("keeps a refused row's edits and marks its cell", async () => {
    api.updateProduct.mockRejectedValue({ response: { status: 400, data: { errors: { sell_price: "Below cost" } } } });
    renderCatalogUi(<StockPage />);
    await screen.findAllByTestId("stock-row");
    fireEvent.click(screen.getByRole("button", { name: "Sheet" }));
    const cell = await screen.findByLabelText("Sell SALI Steel Drill Bit 6mm");
    fireEvent.change(cell, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(cell.getAttribute("aria-invalid")).toBe("true"));
    expect((cell as HTMLInputElement).value).toBe("5");
  });

  it("is not offered without retail:product_manage", async () => {
    signIn({ permissions: ["retail:view"] });
    renderCatalogUi(<StockPage />);
    await screen.findAllByTestId("stock-row");
    expect(screen.queryByRole("button", { name: "Sheet" })).toBeNull();
    expect(screen.queryByRole("button", { name: "New" })).toBeNull();
  });
});

function OpenNew({ words }: { words?: string }) {
  const { open } = useOverlay();
  return <button onClick={() => open(NEW_ITEM_OVERLAY_ID, { prefillWords: words })}>open-new</button>;
}

describe("step-by-tile set-up", () => {
  const openNew = async (words?: string) => {
    renderCatalogUi(<OpenNew words={words} />);
    fireEvent.click(screen.getByText("open-new"));
  };

  it("creates a family with one variant per chosen size and the right payload", async () => {
    api.createFamily.mockResolvedValue({ family: null, products: [sali(4), sali(6)] });
    await openNew();
    fireEvent.click(await screen.findByText("Drill bits"));
    fireEvent.click(await screen.findByText("Steel"));
    fireEvent.click(await screen.findByText("SALI"));
    // the generated name is always visible, built from the category's item name
    expect((await screen.findByTestId("name-preview")).textContent).toContain("SALI Steel Drill Bit");
    fireEvent.click(await screen.findByText("4"));
    fireEvent.click(screen.getByText("6"));
    expect(screen.getByTestId("name-preview").textContent).toContain("SALI Steel Drill Bit 4mm");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const sell = await screen.findByLabelText("Sell 4");
    fireEvent.change(sell, { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText("Contractor 4"), { target: { value: "110" } });
    fireEvent.click(screen.getByRole("button", { name: "Same for all" }));
    expect((screen.getByLabelText("Sell 6") as HTMLInputElement).value).toBe("120");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.createFamily).toHaveBeenCalledTimes(1));
    const input = api.createFamily.mock.calls[0][0];
    expect(input).toMatchObject({
      name: "SALI Steel Drill Bit",
      category_id: 11,
      brand_id: 1,
      option_label: "Diameter",
      option_unit: "mm",
      shared: { tracking: "counted", base_unit: "pcs" },
    });
    expect(input.variants).toEqual([
      { variant_label: "4", sell_price: 120, contractor_price: 110 },
      { variant_label: "6", sell_price: 120, contractor_price: 110 },
    ]);
    // the cost field is only there with retail:cost_view
    expect(input.variants[0]).not.toHaveProperty("cost");
  });

  it("asks for a cost only with retail:cost_view", async () => {
    signIn({ permissions: ["retail:view", "retail:product_manage"] });
    await openNew();
    fireEvent.click(await screen.findByText("Garden"));
    fireEvent.click(await screen.findByText("No brand"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByTestId("price-strip");
    expect(screen.queryByLabelText(/^Cost/)).toBeNull();
  });

  it("pre-fills brand, sub-category and size from the words typed in the finder", async () => {
    await openNew("sali steel 6mm");
    await waitFor(() => expect(screen.getByTestId("name-preview").textContent).toContain("SALI Steel Drill Bit 6mm"));
  });

  it("one price row and a stand-alone product when no size is chosen", async () => {
    api.createProduct.mockResolvedValue(products[6]);
    await openNew();
    fireEvent.click(await screen.findByText("Garden"));
    fireEvent.click(await screen.findByText("No brand"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(await screen.findByLabelText("Sell"), { target: { value: "2500" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);
    await waitFor(() => expect(api.createProduct).toHaveBeenCalledTimes(1));
    expect(api.createProduct.mock.calls[0][0]).toMatchObject({ name: "Garden", category_id: 3, brand_id: null, sell_price: 2500, tracking: "counted" });
    expect(api.createFamily).not.toHaveBeenCalled();
  });
});

describe("access", () => {
  const user = (retail: boolean, perms: string[], roles: string[] = []) => ({ roles, permissions: perms, plan: { features: { retail } } });
  it("Stock needs the retail feature and retail:view", () => {
    expect(canOpenStock(user(false, ["retail:view"]))).toBe(false);
    expect(canOpenStock(user(true, []))).toBe(false);
    expect(canOpenStock(user(true, ["retail:view"]))).toBe(true);
    expect(canOpenStock(user(true, [], ["Admin"]))).toBe(true);
    expect(canOpenStock({ permissions: ["retail:view"], plan: null })).toBe(false);
  });
  it("is a start-page choice only for retail shops", () => {
    expect(startPageOptionsFor(user(false, ["retail:view"]) as any).some((o) => o.key === "stock")).toBe(false);
    expect(startPageOptionsFor(user(true, ["retail:view"]) as any).some((o) => o.key === "stock")).toBe(true);
    expect(startPathFor({ start_page: "stock", permissions: ["retail:view"], plan: { tier: "x", features: { retail: true }, limits: {} } } as any)).toBe("/stock");
  });
});

void ITEM_CARD_OVERLAY_ID;
