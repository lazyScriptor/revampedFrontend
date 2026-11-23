import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { payload, product, sali } from "./catalogFixtures";
import { renderCatalogUi, signIn } from "./catalogTestUtils";

const prefs: Record<string, unknown> = {};
vi.mock("@/features/retail/api/preferences.api", () => ({
  fetchUiPreferences: vi.fn(async () => ({ ...prefs })),
  putUiPreference: vi.fn(async (k: string, v: unknown) => {
    prefs[k] = v;
    return {};
  }),
}));

const catalogApi = {
  fetchCatalogPayload: vi.fn(),
  lookupProduct: vi.fn(),
};
vi.mock("../api/catalog.api", async (orig) => ({
  ...(await orig<typeof import("../api/catalog.api")>()),
  fetchCatalogPayload: (...a: any[]) => catalogApi.fetchCatalogPayload(...a),
  lookupProduct: (...a: any[]) => catalogApi.lookupProduct(...a),
}));

const retailApi = {
  fetchRetailSettings: vi.fn(),
  fetchApprovers: vi.fn(),
  approveHere: vi.fn(),
};
vi.mock("../api/retail.api", async (orig) => ({
  ...(await orig<typeof import("../api/retail.api")>()),
  fetchRetailSettings: (...a: any[]) => retailApi.fetchRetailSettings(...a),
  fetchApprovers: (...a: any[]) => retailApi.fetchApprovers(...a),
  approveHere: (...a: any[]) => retailApi.approveHere(...a),
}));

vi.mock("../api/stock.api", async (orig) => ({
  ...(await orig<typeof import("../api/stock.api")>()),
  fetchStockLevels: vi.fn(async () => ({
    server_time: "2026-11-24T10:00:00Z",
    levels: [
      { product_id: 1006, warehouse_id: 1, qty_on_hand: 15, reorder_level: 3, counted_at: "2026-11-24T08:00:00Z" },
      { product_id: 3001, warehouse_id: 1, qty_on_hand: 4, reorder_level: 2, counted_at: "2026-11-24T08:00:00Z" },
    ],
  })),
}));

vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({
  useWarehouseOptions: () => ({ data: [{ warehouse_id: 1, location_name: "Main Store" }] }),
  useSingleLocation: () => ({ single: true, only: { warehouse_id: 1, location_name: "Main Store" } }),
}));

vi.mock("@/features/equipment/hooks/useCategoryHooks", () => ({
  useCategoryOptions: () => ({ data: [] }),
}));

vi.mock("@/features/invoices/hooks/usePosEquipmentCatalog", () => ({
  usePosEquipmentCatalog: () => ({
    items: [
      {
        equipment_id: 901,
        equipment_name: "Concrete Mixer",
        serial_number: "EQ-901",
        available_qty: 2,
        is_bulk_item: false,
        base_rental_price: 3500,
        minimum_rental_days: 1,
        extra_daily_rate: 3500,
      },
    ],
    isLoading: false,
    isFetching: false,
    isError: false,
    isSettling: false,
    isPlaceholderData: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    total: 1,
  }),
  POS_CATALOG_KEY: ["pos-catalog"],
}));

import "../approval/ApprovalOverlay";
import { PosLedgerPanel } from "@/features/invoices/components/PosLedgerPanel";
import { usePosCartStore, selectSaleLines } from "@/features/invoices/store/posCartStore";

const bit6 = sali(6, {
  contractor_price: 140,
  barcodes: [
    { barcode: "479001", unit_id: null },
    { barcode: "479002", unit_id: 99 },
  ],
  units: [{ unit_id: 99, unit_name: "box", factor: 10, sell_price: 1500 }],
});
const hose = product({
  product_id: 3001,
  code: "HW-G1",
  name: "Garden Hose 15m",
  sell_price: 2500,
  barcodes: [{ barcode: "479099", unit_id: null }],
});

const simulateScan = (code: string) => {
  let ts = 100;
  for (const ch of code) {
    ts += 5;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: ch, bubbles: true, cancelable: true, timeStamp: ts } as any));
  }
  ts += 5;
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, timeStamp: ts } as any));
};

const showToast = vi.fn();

beforeEach(() => {
  usePosCartStore.getState().resetAll();
  Object.keys(prefs).forEach((k) => delete prefs[k]);
  showToast.mockClear();
  catalogApi.fetchCatalogPayload.mockReset();
  catalogApi.lookupProduct.mockReset();
  retailApi.fetchRetailSettings.mockReset();
  retailApi.fetchApprovers.mockReset();
  retailApi.approveHere.mockReset();

  catalogApi.fetchCatalogPayload.mockResolvedValue(
    payload({
      products: [sali(3), sali(4), bit6, hose],
    }),
  );
  catalogApi.lookupProduct.mockResolvedValue(null);
  retailApi.fetchRetailSettings.mockResolvedValue({
    approvalMethod: "either",
    negativeStock: "warn",
    discountLimitPct: 10,
    quickPad: [1006, 3001],
    showContractorPrice: true,
    exceptions: { unlisted_item: "record" },
  });
  retailApi.fetchApprovers.mockResolvedValue([{ id: 77, display_name: "Nimal Manager" }]);
  retailApi.approveHere.mockResolvedValue({ approval_token: "tok-unlisted-99", exception_id: 1 });

  signIn({ permissions: ["retail:view", "retail:sell", "retail:add_unlisted"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POS Sell Catalogue, Scanner, Quick Pad, Unlisted & Sundry", () => {
  it("All/Rent/Sell tabs switch views, persist preference, show size chips, contractor prices, and Rentals first on All", async () => {
    renderCatalogUi(<PosLedgerPanel cartItems={[]} setCartItems={vi.fn()} showToast={showToast} />);

    // Open All tab first -> Rentals appear above Hardware / Sell
    fireEvent.click(await screen.findByRole("tab", { name: "All" }));
    await waitFor(() => expect(screen.getByText("Concrete Mixer")).toBeTruthy());
    expect(await screen.findByText("Hardware / Sell")).toBeTruthy();
    const mixerEl = screen.getByText("Concrete Mixer");
    const hwEl = screen.getByText("Hardware / Sell");
    expect(mixerEl.compareDocumentPosition(hwEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Switch to Sell tab -> persisted via useUiPreference, shows size chips
    fireEvent.click(screen.getByRole("tab", { name: "Sell" }));
    await waitFor(() => expect(prefs["pos.catalogTab"]).toBe("sell"));
    expect(screen.getByTestId("size-chip-1006").textContent).toContain("6mm · Rs 160");

    // Selecting contractor customer switches displayed price to Contractor tier
    act(() => {
      usePosCartStore.getState().setSelectedCustomer({ customer_id: 22, price_level: "contractor" });
    });
    await waitFor(() => expect(screen.getByTestId("size-chip-1006").textContent).toContain("6mm · Rs 140"));

    // Click size chip -> adds item to sale cart with contractor price
    fireEvent.click(screen.getByTestId("size-chip-1006"));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    const sales = selectSaleLines(usePosCartStore.getState().lines);
    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({ product_id: 1006, unit_price: 140, price_source: "contractor", qty: 1 });
  });

  it("scanner adds single item and pack unit immediately", async () => {
    renderCatalogUi(<PosLedgerPanel cartItems={[]} setCartItems={vi.fn()} showToast={showToast} />);
    await screen.findByTestId("quick-pad");

    act(() => simulateScan("479001"));
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)).toHaveLength(1));
    expect(selectSaleLines(usePosCartStore.getState().lines)[0]).toMatchObject({
      product_id: 1006,
      unit_id: null,
      unit_factor: 1,
      unit_price: 160,
    });

    // Scan pack barcode -> adds 1 box (factor 10, pack sell_price 1500)
    act(() => simulateScan("479002"));
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)).toHaveLength(2));
    expect(selectSaleLines(usePosCartStore.getState().lines)[1]).toMatchObject({
      product_id: 1006,
      unit_id: 99,
      unit_label: "box",
      unit_factor: 10,
      qty: 1,
      base_qty: 10,
      unit_price: 1500,
    });
  });

  it("unlisted add flow respects permission vs manager approval", async () => {
    // 1. With retail:add_unlisted -> direct add on not-found scan
    const first = renderCatalogUi(<PosLedgerPanel cartItems={[]} setCartItems={vi.fn()} showToast={showToast} />);
    await screen.findByTestId("quick-pad");
    act(() => simulateScan("88888888"));
    fireEvent.change(await screen.findByLabelText("Item name"), { target: { value: "PVC Glue" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)).toHaveLength(1));
    expect(selectSaleLines(usePosCartStore.getState().lines)[0]).toMatchObject({
      line_kind: "unlisted",
      description: "PVC Glue",
      unit_price: 250,
      scanned_barcode: "88888888",
    });
    expect(retailApi.approveHere).not.toHaveBeenCalled();
    first.unmount();

    // 2. Without retail:add_unlisted -> asks manager PIN approval and attaches token
    usePosCartStore.getState().resetAll();
    signIn({ permissions: ["retail:view", "retail:sell"] });
    renderCatalogUi(<PosLedgerPanel cartItems={[]} setCartItems={vi.fn()} showToast={showToast} />);
    fireEvent.click(await screen.findByRole("button", { name: /Unlisted/i }));
    fireEvent.change(await screen.findByLabelText("Item name"), { target: { value: "Hacksaw blade" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByTestId("approval-summary")).toBeTruthy();
    await screen.findByText("Nimal Manager");
    for (const d of ["1", "2", "3", "4"]) {
      fireEvent.click(screen.getByRole("button", { name: d }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(retailApi.approveHere).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)).toHaveLength(1));
    expect(selectSaleLines(usePosCartStore.getState().lines)[0].unlisted_approval_token).toBe("tok-unlisted-99");
  });

  it("quick pad tap adds 1, long press asks for quantity, and Sundry button adds sundry line", async () => {
    renderCatalogUi(<PosLedgerPanel cartItems={[]} setCartItems={vi.fn()} showToast={showToast} />);
    const btn = await screen.findByTestId("quick-pad-btn-1006");

    // Tap adds 1
    fireEvent.click(btn);
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)[0].qty).toBe(1));

    // Long press (timer) opens quantity dialog
    vi.useFakeTimers();
    fireEvent.pointerDown(btn, { button: 0 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    vi.useRealTimers();
    fireEvent.pointerUp(btn);

    expect(await screen.findByText("×5")).toBeTruthy();
    fireEvent.click(screen.getByText("×5"));
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)[0].qty).toBe(6));

    // Sundry button adds sundry line
    fireEvent.click(await screen.findByRole("button", { name: "Sundry" }));
    fireEvent.change(await screen.findByLabelText("Description"), { target: { value: "Thread cutting" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)).toHaveLength(2));
    expect(selectSaleLines(usePosCartStore.getState().lines)[1]).toMatchObject({
      line_kind: "sundry",
      description: "Thread cutting",
      unit_price: 300,
    });
  });
});
