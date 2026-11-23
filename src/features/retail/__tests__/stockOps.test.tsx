import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { payload, products, sali } from "./catalogFixtures";

const catalogApi = {
  fetchCatalogPayload: vi.fn(),
  fetchProduct: vi.fn(),
};
const stockApi = {
  fetchStockLevels: vi.fn(),
  fetchStockSummary: vi.fn(),
  updateStockThresholds: vi.fn(),
  postAdjust: vi.fn(),
  postCount: vi.fn(),
  postOpening: vi.fn(),
  fetchStockMovements: vi.fn(),
  fetchStockDocuments: vi.fn(),
  fetchStockDocument: vi.fn(),
};

vi.mock("../api/catalog.api", async (orig) => ({
  ...(await orig<typeof import("../api/catalog.api")>()),
  fetchCatalogPayload: (...a: any[]) => catalogApi.fetchCatalogPayload(...a),
  fetchProduct: (...a: any[]) => catalogApi.fetchProduct(...a),
}));
vi.mock("../api/stock.api", async (orig) => ({
  ...(await orig<typeof import("../api/stock.api")>()),
  fetchStockLevels: (...a: any[]) => stockApi.fetchStockLevels(...a),
  fetchStockSummary: (...a: any[]) => stockApi.fetchStockSummary(...a),
  updateStockThresholds: (...a: any[]) => stockApi.updateStockThresholds(...a),
  postAdjust: (...a: any[]) => stockApi.postAdjust(...a),
  postCount: (...a: any[]) => stockApi.postCount(...a),
  postOpening: (...a: any[]) => stockApi.postOpening(...a),
  fetchStockMovements: (...a: any[]) => stockApi.fetchStockMovements(...a),
  fetchStockDocuments: (...a: any[]) => stockApi.fetchStockDocuments(...a),
  fetchStockDocument: (...a: any[]) => stockApi.fetchStockDocument(...a),
}));
vi.mock("../api/retail.api", async (orig) => ({
  ...(await orig<typeof import("../api/retail.api")>()),
  fetchRetailSettings: vi.fn(async () => ({ approvalMethod: "either", defaultWarehouseId: 1 })),
}));
vi.mock("@/features/retail/api/preferences.api", () => ({
  fetchUiPreferences: vi.fn(async () => ({})),
  putUiPreference: vi.fn(async () => ({})),
}));
vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({
  useWarehouseOptions: () => ({ data: [{ warehouse_id: 1, location_name: "Main Store" }, { warehouse_id: 2, location_name: "Yard" }] }),
  useSingleLocation: () => ({ single: false, only: null }),
}));
vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(async () => ({ data: { users: [] } })), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { useOverlay } from "@/components/overlay";
import { ShortcutHost } from "@/components/command/ShortcutHost";
import { RetailCatalogHost } from "../catalog/RetailCatalogHost";
import { ItemFinder } from "../finder/ItemFinder";
import { StockPage } from "../stock/StockPage";
import { CORRECT_OVERLAY_ID, COUNT_OVERLAY_ID, HISTORY_OVERLAY_ID, ITEM_CARD_OVERLAY_ID } from "../catalog/overlayIds";
import "../catalog/registerCatalog";
import { ALL_RETAIL_PERMISSIONS, renderCatalogUi, signIn } from "./catalogTestUtils";

function Launcher() {
  const { open } = useOverlay();
  return (
    <div>
      <button onClick={() => open(CORRECT_OVERLAY_ID, { productId: 1004, warehouseId: 1 })}>open-correct</button>
      <button onClick={() => open(COUNT_OVERLAY_ID, { mode: "count", warehouseId: 1 })}>open-count</button>
      <button onClick={() => open(COUNT_OVERLAY_ID, { mode: "opening", warehouseId: 1 })}>open-opening</button>
      <button onClick={() => open(HISTORY_OVERLAY_ID, { warehouseId: 1 })}>open-history</button>
      <button onClick={() => open(ITEM_CARD_OVERLAY_ID, { productId: 1004, warehouseId: 1 })}>open-item</button>
    </div>
  );
}

beforeEach(() => {
  Object.values(catalogApi).forEach((m) => m.mockReset());
  Object.values(stockApi).forEach((m) => m.mockReset());
  catalogApi.fetchCatalogPayload.mockResolvedValue(
    payload({
      products: products.map((p) => (p.product_id === 1004 ? { ...p, avg_cost: 60, last_cost: 60 } : p)),
    }),
  );
  catalogApi.fetchProduct.mockResolvedValue({
    ...sali(4, { avg_cost: 60, last_cost: 60 }),
    stock: [
      { warehouse_id: 1, location_name: "Main Store", qty_on_hand: 10, counted_at: "2026-11-23T09:00:00Z", reorder_level: 3, reorder_qty: 15 },
      { warehouse_id: 2, location_name: "Yard", qty_on_hand: 4, counted_at: "2026-11-23T09:00:00Z", reorder_level: null, reorder_qty: null },
    ],
    recent_movements: [
      {
        movement_id: 50,
        product_id: 1004,
        warehouse_id: 1,
        qty_change: 10,
        qty_after: 10,
        type: "RECEIVE",
        doc_id: 12,
        doc_no: "RCV-00012",
        location_name: "Main Store",
        user_name: "Kamal",
        occurred_at: "2026-11-23T09:00:00Z",
      },
    ],
  });
  stockApi.fetchStockLevels.mockResolvedValue({
    server_time: "2026-11-23T10:00:00Z",
    levels: [
      { product_id: 1003, warehouse_id: 1, qty_on_hand: 12, reorder_level: 2, reorder_qty: null, counted_at: "2026-11-23T09:00:00Z", updatedAt: "2026-11-23T09:00:00Z" },
      { product_id: 1004, warehouse_id: 1, qty_on_hand: 10, reorder_level: 3, reorder_qty: 15, counted_at: "2026-11-23T09:00:00Z", updatedAt: "2026-11-23T09:00:00Z" },
    ],
  });
  stockApi.fetchStockSummary.mockResolvedValue({ items_counted: 2, items_not_counted: 5, low_stock_count: 0, out_of_stock_count: 0, stock_value: 5000 });
  stockApi.fetchStockMovements.mockResolvedValue({
    movements: [
      {
        movement_id: 50,
        product_id: 1004,
        warehouse_id: 1,
        product_name: "SALI Steel Drill Bit 4mm",
        base_unit: "pcs",
        qty_change: 10,
        qty_after: 10,
        type: "RECEIVE",
        doc_id: 12,
        doc_no: "RCV-00012",
        user_name: "Kamal",
        occurred_at: "2026-11-23T09:00:00Z",
      },
    ],
    total: 1,
    page: 1,
    limit: 30,
  });
  stockApi.fetchStockDocuments.mockResolvedValue({
    documents: [
      {
        doc_id: 12,
        doc_type: "receive",
        status: "posted",
        doc_no: "RCV-00012",
        warehouse_id: 1,
        location_name: "Main Store",
        supplier_name: "SALI Lanka",
        total_cost: 600,
        user_name: "Kamal",
        occurred_at: "2026-11-23T09:00:00Z",
        version: 1,
        lines: [],
      },
    ],
    total: 1,
    page: 1,
    limit: 25,
  });
  stockApi.fetchStockDocument.mockResolvedValue({
    doc_id: 12,
    doc_type: "receive",
    status: "posted",
    doc_no: "RCV-00012",
    warehouse_id: 1,
    location_name: "Main Store",
    supplier_name: "SALI Lanka",
    total_cost: 600,
    version: 1,
    occurred_at: "2026-11-23T09:00:00Z",
    lines: [{ line_id: 1, product_id: 1004, product_name: "SALI Steel Drill Bit 4mm", qty: 10, base_qty: 10, unit_cost: 60, unit_id: null }],
  });
  window.history.replaceState(null, "");
  signIn({ permissions: ALL_RETAIL_PERMISSIONS });
});

describe("CorrectOverlay", () => {
  it("sends signed qty and reason to POST /stock/adjust (three taps for broken item)", async () => {
    stockApi.postAdjust.mockResolvedValue({ doc_id: 9, doc_no: "ADJ-00009" });
    renderCatalogUi(<Launcher />);
    fireEvent.click(screen.getByText("open-correct"));

    expect(await screen.findByText("SALI Steel Drill Bit 4mm")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByText("Damaged"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(stockApi.postAdjust).toHaveBeenCalledTimes(1));
    expect(stockApi.postAdjust).toHaveBeenCalledWith({
      warehouse_id: 1,
      reason: "damaged",
      note: null,
      lines: [{ product_id: 1004, qty: -3 }],
    });
  });
});

describe("CountOverlay & Opening mode", () => {
  it("hides system qty by default and reviews only the differences before POST /stock/count", async () => {
    stockApi.postCount.mockResolvedValue({ doc_id: 30, doc_no: "CNT-00030" });
    renderCatalogUi(<Launcher />);
    fireEvent.click(screen.getByText("open-count"));

    const tiles = await screen.findByTestId("count-category-tiles");
    fireEvent.click(within(tiles).getByText("Drill bits"));

    // Blind by default: System column header not rendered
    expect(screen.queryByText("System")).toBeNull();

    // 1003 system=12 (enter 12 -> unchanged), 1004 system=10 (enter 8 -> -2 diff)
    fireEvent.change(await screen.findByLabelText("Counted SALI Steel Drill Bit 3mm"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Counted SALI Steel Drill Bit 4mm"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    const review = await screen.findByTestId("count-review");
    expect(within(review).getByTestId("review-row-1004")).toBeTruthy();
    expect(within(review).queryByTestId("review-row-1003")).toBeNull();
    expect(within(review).getByText("−2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(stockApi.postCount).toHaveBeenCalledTimes(1));
    expect(stockApi.postCount).toHaveBeenCalledWith({
      warehouse_id: 1,
      lines: [
        { product_id: 1003, counted_qty: 12 },
        { product_id: 1004, counted_qty: 8 },
      ],
    });
  });

  it("limits opening mode to not-counted items with optional cost and posts to POST /stock/opening", async () => {
    stockApi.postOpening.mockResolvedValue({ doc_id: 31, doc_no: "OPN-00031" });
    renderCatalogUi(<Launcher />);
    fireEvent.click(screen.getByText("open-opening"));

    const tiles = await screen.findByTestId("count-category-tiles");
    fireEvent.click(within(tiles).getByText("Garden"));

    // Already-counted 1003 / 1004 are excluded; Garden Hose 3001 is not counted
    fireEvent.change(await screen.findByLabelText("Counted Garden Hose 15m"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Cost Garden Hose 15m"), { target: { value: "1800" } });
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => expect(stockApi.postOpening).toHaveBeenCalledTimes(1));
    expect(stockApi.postOpening).toHaveBeenCalledWith({
      warehouse_id: 1,
      lines: [{ product_id: 3001, qty: 7, unit_cost: 1800 }],
    });
  });

  it("hides cost columns in opening mode and count review without retail:cost_view", async () => {
    signIn({ permissions: ["retail:view", "retail:stock_adjust"] });
    renderCatalogUi(<Launcher />);
    fireEvent.click(screen.getByText("open-opening"));

    const tiles = await screen.findByTestId("count-category-tiles");
    fireEvent.click(within(tiles).getByText("Garden"));
    await screen.findByLabelText("Counted Garden Hose 15m");
    expect(screen.queryByLabelText("Cost Garden Hose 15m")).toBeNull();
  });
});

describe("HistoryOverlay & ItemCardOverlay", () => {
  it("filters movements, switches to Documents tab, opens document detail, and hides cost without cost_view", async () => {
    signIn({ permissions: ["retail:view"] });
    renderCatalogUi(<Launcher />);
    fireEvent.click(screen.getByText("open-history"));

    expect(await screen.findByTestId("movement-row")).toBeTruthy();

    // Filter movements by type chip
    fireEvent.click(screen.getByRole("button", { name: "Adjust −" }));
    await waitFor(() =>
      expect(stockApi.fetchStockMovements).toHaveBeenLastCalledWith(expect.objectContaining({ type: "ADJUST_OUT" })),
    );

    // Documents tab hides Total cost without retail:cost_view
    fireEvent.click(screen.getByRole("tab", { name: "Documents" }));
    const docRow = await screen.findByTestId("document-row");
    expect(within(docRow).getByText("RCV-00012")).toBeTruthy();
    expect(within(docRow).queryByText("Rs 600")).toBeNull();

    // Clicking document opens Document Detail
    fireEvent.click(docRow);
    const detail = await screen.findByTestId("doc-detail");
    expect(await within(detail).findByText("RCV-00012")).toBeTruthy();
    expect(within(detail).getByText("SALI Steel Drill Bit 4mm")).toBeTruthy();
  });

  it("ItemCard shows stock per location, quick ± button, reorder editing, and last 20 movements", async () => {
    stockApi.updateStockThresholds.mockResolvedValue({ product_id: 1004, warehouse_id: 1, qty_on_hand: 10, reorder_level: 5, reorder_qty: 20, counted_at: "2026-11-23T09:00:00Z", updatedAt: null });
    renderCatalogUi(<Launcher />);
    fireEvent.click(screen.getByText("open-item"));

    const loc1 = await screen.findByTestId("item-loc-1");
    expect(within(loc1).getByText("Main Store")).toBeTruthy();
    expect(within(loc1).getByText("10 pcs")).toBeTruthy();

    const movs = await screen.findByTestId("item-movements");
    expect(within(movs).getByText("RCV-00012")).toBeTruthy();

    // Edit reorder level/qty for Main Store
    fireEvent.click(within(loc1).getByLabelText("Edit reorder levels"));
    fireEvent.change(within(loc1).getByLabelText("Reorder level"), { target: { value: "5" } });
    fireEvent.change(within(loc1).getByLabelText("Reorder qty"), { target: { value: "20" } });
    fireEvent.click(within(loc1).getByLabelText("Save"));
    await waitFor(() =>
      expect(stockApi.updateStockThresholds).toHaveBeenCalledWith(1004, 1, { reorder_level: 5, reorder_qty: 20 }),
    );

    // Quick ± button opens Correct pre-filled
    fireEvent.click(within(loc1).getByLabelText("Correct stock at Main Store"));
    expect(await screen.findByText("Correct stock")).toBeTruthy();
  });
});

describe("F2 and F4 shortcuts", () => {
  it("F2 opens Stock in and F4 opens Correct stock", async () => {
    renderCatalogUi(
      <>
        <ShortcutHost />
        <RetailCatalogHost />
      </>,
    );
    await waitFor(() => expect(catalogApi.fetchCatalogPayload).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: "F2" });
    expect(await screen.findByText("Stock in")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByText("Stock in")).toBeNull());

    fireEvent.keyDown(window, { key: "F4" });
    expect(await screen.findByText("Correct stock")).toBeTruthy();
  });
});

describe("StockPage new views and Finder stock badges", () => {
  it("filters Low stock, Out of stock, Not counted and Recently received views", async () => {
    catalogApi.fetchCatalogPayload.mockResolvedValue(
      payload({
        products: products.map((p) =>
          p.product_id === 1003
            ? { ...p, last_received_at: "2026-11-23T08:00:00Z" }
            : p,
        ),
      }),
    );
    stockApi.fetchStockLevels.mockResolvedValue({
      server_time: "2026-11-23T10:00:00Z",
      levels: [
        { product_id: 1003, warehouse_id: 1, qty_on_hand: 2, reorder_level: 5, reorder_qty: null, counted_at: "2026-11-23T09:00:00Z", updatedAt: null },
        { product_id: 2006, warehouse_id: 1, qty_on_hand: 0, reorder_level: 2, reorder_qty: null, counted_at: "2026-11-23T09:00:00Z", updatedAt: null },
      ],
    });
    renderCatalogUi(<StockPage />);
    await screen.findAllByTestId("stock-row");

    fireEvent.click(screen.getByRole("button", { name: "Low stock" }));
    await waitFor(() => expect(screen.getAllByTestId("stock-row")).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Out of stock" }));
    await waitFor(() => expect(screen.getAllByTestId("stock-row")).toHaveLength(1));
    expect(screen.getByText("Tolsen Wood Drill Bit")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Not counted" }));
    await waitFor(() => expect(screen.getAllByTestId("stock-row")).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Recently received" }));
    await waitFor(() => expect(screen.getAllByTestId("stock-row")).toHaveLength(1));
    expect(screen.getByText("SALI Steel Drill Bit")).toBeTruthy();
  });

  it("shows stock dots and quantities on Finder variant chips", async () => {
    renderCatalogUi(<ItemFinder mode="pick" onPick={vi.fn()} warehouseId={1} />);
    const input = await screen.findByLabelText("Search or scan");
    await screen.findByText("Drill bits");

    fireEvent.change(input, { target: { value: "sali steel" } });
    const row = await screen.findByTestId("finder-row");
    await waitFor(() => expect(within(row).getByText("12")).toBeTruthy());
    expect(within(row).getByText("10")).toBeTruthy();
    expect(within(row).getAllByTestId("stock-dot-in_stock").length).toBeGreaterThanOrEqual(2);
  });
});
