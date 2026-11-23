import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { payload, product, products, sali } from "./catalogFixtures";

const catalogApi = {
  fetchCatalogPayload: vi.fn(),
  addFamilyVariants: vi.fn(),
  lookupProduct: vi.fn(),
};
const stockApi = {
  fetchStockLevels: vi.fn(),
  fetchStockSummary: vi.fn(),
  fetchSuppliers: vi.fn(),
  fetchSupplierItems: vi.fn(),
  fetchStockDocuments: vi.fn(),
  fetchStockDocument: vi.fn(),
  createReceive: vi.fn(),
  updateReceiveDraft: vi.fn(),
  postReceiveDraft: vi.fn(),
  deleteReceiveDraft: vi.fn(),
};

vi.mock("../api/catalog.api", async (orig) => ({
  ...(await orig<typeof import("../api/catalog.api")>()),
  fetchCatalogPayload: (...a: any[]) => catalogApi.fetchCatalogPayload(...a),
  addFamilyVariants: (...a: any[]) => catalogApi.addFamilyVariants(...a),
  lookupProduct: (...a: any[]) => catalogApi.lookupProduct(...a),
}));
vi.mock("../api/stock.api", async (orig) => ({
  ...(await orig<typeof import("../api/stock.api")>()),
  fetchStockLevels: (...a: any[]) => stockApi.fetchStockLevels(...a),
  fetchStockSummary: (...a: any[]) => stockApi.fetchStockSummary(...a),
  fetchSuppliers: (...a: any[]) => stockApi.fetchSuppliers(...a),
  fetchSupplierItems: (...a: any[]) => stockApi.fetchSupplierItems(...a),
  fetchStockDocuments: (...a: any[]) => stockApi.fetchStockDocuments(...a),
  fetchStockDocument: (...a: any[]) => stockApi.fetchStockDocument(...a),
  createReceive: (...a: any[]) => stockApi.createReceive(...a),
  updateReceiveDraft: (...a: any[]) => stockApi.updateReceiveDraft(...a),
  postReceiveDraft: (...a: any[]) => stockApi.postReceiveDraft(...a),
  deleteReceiveDraft: (...a: any[]) => stockApi.deleteReceiveDraft(...a),
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
  useWarehouseOptions: () => ({ data: [{ warehouse_id: 1, location_name: "Main Store" }] }),
  useSingleLocation: () => ({ single: true, only: { warehouse_id: 1, location_name: "Main Store" } }),
}));

import { useOverlay } from "@/components/overlay";
import { STOCK_IN_OVERLAY_ID } from "../catalog/overlayIds";
import "../catalog/registerCatalog";
import { ALL_RETAIL_PERMISSIONS, renderCatalogUi, signIn } from "./catalogTestUtils";

const scan = (input: HTMLElement, code: string) => {
  for (const ch of code) fireEvent.keyDown(input, { key: ch });
  fireEvent.keyDown(input, { key: "Enter" });
};

function OpenStockIn({ draftId }: { draftId?: number }) {
  const { open } = useOverlay();
  return <button onClick={() => open(STOCK_IN_OVERLAY_ID, { warehouseId: 1, draftId })}>open-in</button>;
}

const serialGen = product({
  product_id: 4001,
  code: "HW-GEN1",
  name: "Honda Generator 2kVA",
  tracking: "serial",
  serial_capture: "receive",
  sell_price: 85000,
  last_cost: 65000,
});

const boxSali6 = {
  ...sali(6, {
    last_cost: 70,
    avg_cost: 70,
    units: [{ unit_id: 9, unit_name: "box", factor: 25, sell_price: 4000 }],
    barcodes: [
      { barcode: "4790001116001", unit_id: null },
      { barcode: "4790001116025", unit_id: 9 },
    ],
  }),
};

const richCatalog = () =>
  payload({
    products: [...products.filter((p) => p.product_id !== 1006), boxSali6, serialGen],
  });

beforeEach(() => {
  Object.values(catalogApi).forEach((m) => m.mockReset());
  Object.values(stockApi).forEach((m) => m.mockReset());
  catalogApi.fetchCatalogPayload.mockResolvedValue(richCatalog());
  catalogApi.lookupProduct.mockResolvedValue(null);
  stockApi.fetchStockLevels.mockResolvedValue({ server_time: "2026-11-23T10:00:00Z", levels: [] });
  stockApi.fetchSuppliers.mockResolvedValue(["SALI Lanka", "Tolsen Traders"]);
  stockApi.fetchSupplierItems.mockResolvedValue([]);
  stockApi.fetchStockDocuments.mockResolvedValue({ documents: [], total: 0, page: 1, limit: 50 });
  window.history.replaceState(null, "");
  signIn({ permissions: ALL_RETAIL_PERMISSIONS });
});

const openIn = async (draftId?: number) => {
  renderCatalogUi(<OpenStockIn draftId={draftId} />);
  fireEvent.click(screen.getByText("open-in"));
  return screen.findByLabelText("Search or scan");
};

describe("StockInOverlay", () => {
  it("renders a family size row, supports typing, pack switching with base qty, and + size", async () => {
    catalogApi.addFamilyVariants.mockResolvedValue({
      family: { family_id: 1, name: "SALI Steel Drill Bit", option_unit: "mm" },
      products: [sali(10, { product_id: 1010 })],
    });
    const finderInput = await openIn();
    await waitFor(() => expect(catalogApi.fetchCatalogPayload).toHaveBeenCalled());

    fireEvent.change(finderInput, { target: { value: "sali steel" } });
    const row = await screen.findByTestId("finder-row");
    fireEvent.click(within(row).getByText("6mm"));

    const familyBox = await screen.findByTestId("family-row-1");
    expect(within(familyBox).getByText("3mm")).toBeTruthy();
    expect(within(familyBox).getByText("8mm")).toBeTruthy();

    // Type quantities under 4mm and 6mm
    fireEvent.change(within(familyBox).getByLabelText("Qty 4mm"), { target: { value: "3" } });
    fireEvent.change(within(familyBox).getByLabelText("Qty 6mm"), { target: { value: "2" } });
    expect(within(familyBox).getByText("= 5 pcs")).toBeTruthy();

    // Switch pack unit -> box (×25) shows base qty 50 pcs (plus 3*1 for 4mm without box unit = 53 pcs)
    fireEvent.click(within(familyBox).getByTestId("pack-switch"));
    expect(within(familyBox).getByText(/= 5 box \(53 pcs\)/)).toBeTruthy();

    // + size creates a new variant in the family
    fireEvent.click(within(familyBox).getByRole("button", { name: "Size" }));
    fireEvent.change(within(familyBox).getByLabelText("Size"), { target: { value: "10" } });
    fireEvent.click(within(familyBox).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(catalogApi.addFamilyVariants).toHaveBeenCalledWith(1, [expect.objectContaining({ variant_label: "10" })]));
    expect(await within(familyBox).findByText("10mm")).toBeTruthy();
  });

  it("repeat barcode scan adds 1, and pack barcode scan adds 1 pack", async () => {
    const finderInput = await openIn();
    await screen.findByText("Drill bits"); // catalogue loaded

    act(() => scan(finderInput, "4790001116001"));
    const familyBox = await screen.findByTestId("family-row-1");
    expect((within(familyBox).getByLabelText("Qty 6mm") as HTMLInputElement).value).toBe("1");

    // Scan same barcode again -> adds 1
    act(() => scan(finderInput, "4790001116001"));
    await waitFor(() => expect((within(familyBox).getByLabelText("Qty 6mm") as HTMLInputElement).value).toBe("2"));

    // Scan pack barcode -> switches to box and adds 1
    act(() => scan(finderInput, "4790001116025"));
    await waitFor(() => expect((within(familyBox).getByLabelText("Qty 6mm") as HTMLInputElement).value).toBe("3"));
    expect(within(familyBox).getByTestId("pack-switch").textContent).toContain("box");
  });

  it("matches pasted Excel rows and places unmatched rows in 'Match these'", async () => {
    await openIn();
    await screen.findByText("Drill bits");

    fireEvent.click(screen.getByRole("button", { name: "Paste" }));
    const pasteBox = await screen.findByLabelText("Paste");
    fireEvent.change(pasteBox, {
      target: { value: "Code\tQty\tCost\nHW-S4\t5\t65\nMystery Bolt 99\t3\t40" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Match rows" }));

    const familyBox = await screen.findByTestId("family-row-1");
    expect((within(familyBox).getByLabelText("Qty 4mm") as HTMLInputElement).value).toBe("5");
    expect((within(familyBox).getByLabelText("Cost 4mm") as HTMLInputElement).value).toBe("65");

    const unmatchedBox = await screen.findByTestId("unmatched-list");
    expect(within(unmatchedBox).getByText(/Mystery Bolt 99 × 3/)).toBeTruthy();
  });

  it("enforces exact serial scan count on serial-capture=receive items before posting", async () => {
    const finderInput = await openIn();
    await screen.findByText("Drill bits");

    fireEvent.change(screen.getByLabelText("Supplier"), { target: { value: "Honda Lanka" } });
    fireEvent.change(finderInput, { target: { value: "generator" } });
    const row = await screen.findByTestId("finder-row");
    fireEvent.click(within(row).getByText("Rs 85,000"));

    const lineBox = await screen.findByTestId("standalone-row-4001");
    expect(within(lineBox).getByText("0/1")).toBeTruthy();

    // Trying to post without scanning serial is blocked
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    expect(await screen.findByText("Scan all required serial numbers before posting.")).toBeTruthy();

    // Open serial scanner and scan 1 serial
    fireEvent.click(within(lineBox).getByText("0/1"));
    const serialField = await screen.findByLabelText("Scan or type serial number");
    fireEvent.change(serialField, { target: { value: "GEN-9901" } });
    fireEvent.keyDown(serialField, { key: "Enter" });
    expect(await screen.findByText("1 of 1 scanned")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(within(lineBox).getByText("1/1")).toBeTruthy();
  });

  it("shows draft 409 conflict message and completes the post + print slip flow", async () => {
    stockApi.fetchStockDocument.mockResolvedValue({
      doc_id: 22,
      doc_type: "receive",
      status: "draft",
      doc_no: "RCV-00022",
      warehouse_id: 1,
      supplier_name: "SALI Lanka",
      supplier_ref: "INV-88",
      delivery_charge: 100,
      version: 3,
      occurred_at: "2026-11-23T10:00:00Z",
      lines: [{ product_id: 1004, qty: 4, base_qty: 4, entered_unit_cost: 60, unit_id: null }],
    });
    stockApi.updateReceiveDraft.mockRejectedValueOnce({ response: { status: 409, data: { message: "Conflict" } } });

    await openIn(22);
    await screen.findByTestId("family-row-1");

    // Trigger 409 on Save draft
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByTestId("draft-conflict")).toBeTruthy();
    expect(screen.getByText(/Draft changed elsewhere/)).toBeTruthy();

    // Reload clears conflict, then Post flow confirms and calls POST /stock/receive/:id/post
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    await waitFor(() => expect(screen.queryByTestId("draft-conflict")).toBeNull());

    stockApi.postReceiveDraft.mockResolvedValueOnce({
      doc_id: 22,
      doc_type: "receive",
      status: "posted",
      doc_no: "RCV-00022",
      warehouse_id: 1,
      location_name: "Main Store",
      supplier_name: "SALI Lanka",
      total_cost: 340,
      delivery_charge: 100,
      version: 4,
      occurred_at: "2026-11-23T10:00:00Z",
      lines: [{ product_id: 1004, product_name: "SALI Steel Drill Bit 4mm", qty: 4, base_qty: 4, entered_unit_cost: 60, unit_id: null }],
    });

    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    expect(await screen.findByText("Post stock in")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & post" }));

    await waitFor(() => expect(stockApi.postReceiveDraft).toHaveBeenCalledWith(22, 3));
    expect(await screen.findByTestId("stock-in-posted")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Print slip" })).toBeTruthy();
  });

  it("disables back-date input without retail:backdate and hides all costs without retail:cost_view", async () => {
    signIn({ permissions: ["retail:view", "retail:stock_receive"] });
    const finderInput = await openIn();
    await screen.findByText("Drill bits");

    const dateInput = screen.getByLabelText("Date") as HTMLInputElement;
    expect(dateInput.disabled).toBe(true);
    expect(screen.queryByLabelText("Delivery")).toBeNull();

    fireEvent.change(finderInput, { target: { value: "sali steel" } });
    const row = await screen.findByTestId("finder-row");
    fireEvent.click(within(row).getByText("4mm"));

    await screen.findByTestId("family-row-1");
    expect(screen.queryByLabelText(/^Cost/)).toBeNull();
    expect(screen.queryByText(/Total:/)).toBeNull();
  });
});
