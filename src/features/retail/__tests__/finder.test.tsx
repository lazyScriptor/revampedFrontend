import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { payload, products, sali } from "./catalogFixtures";

const api = {
  fetchCatalogPayload: vi.fn(),
  lookupProduct: vi.fn(),
  learnBarcode: vi.fn(),
  fetchProduct: vi.fn(),
  finderSearch: vi.fn(),
  finderBrowse: vi.fn(),
};
vi.mock("../api/catalog.api", async (orig) => ({
  ...(await orig<typeof import("../api/catalog.api")>()),
  fetchCatalogPayload: (...a: any[]) => api.fetchCatalogPayload(...a),
  lookupProduct: (...a: any[]) => api.lookupProduct(...a),
  learnBarcode: (...a: any[]) => api.learnBarcode(...a),
  fetchProduct: (...a: any[]) => api.fetchProduct(...a),
  finderSearch: (...a: any[]) => api.finderSearch(...a),
  finderBrowse: (...a: any[]) => api.finderBrowse(...a),
}));
vi.mock("@/features/retail/api/preferences.api", () => ({ fetchUiPreferences: vi.fn(async () => ({})), putUiPreference: vi.fn(async () => ({})) }));

import { ItemFinder } from "../finder/ItemFinder";
import { ALL_RETAIL_PERMISSIONS, renderCatalogUi, signIn } from "./catalogTestUtils";

const scan = (input: HTMLElement, code: string) => {
  for (const ch of code) fireEvent.keyDown(input, { key: ch });
  fireEvent.keyDown(input, { key: "Enter" });
};

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  api.fetchCatalogPayload.mockResolvedValue(payload({ products: [...products, { ...sali(12), barcodes: [{ barcode: "4790001112223" }] }] }));
  api.lookupProduct.mockResolvedValue(null);
  api.learnBarcode.mockResolvedValue({});
  window.history.replaceState(null, "");
  signIn({ permissions: ALL_RETAIL_PERMISSIONS });
});

const box = () => screen.findByLabelText("Search or scan");

describe("item finder", () => {
  it("finds by words in any order, grouped with size chips, and picks a size", async () => {
    const onPick = vi.fn();
    renderCatalogUi(<ItemFinder onPick={onPick} />);
    fireEvent.change(await box(), { target: { value: "6mm hss sali" } });
    const row = await screen.findByTestId("finder-row");
    expect(within(row).getByText("SALI Steel Drill Bit")).toBeTruthy();
    fireEvent.click(within(row).getByText("6mm"));
    expect(onPick.mock.calls[0][0].product_id).toBe(1006);
  });

  it("a scanner burst picks the item at once; slow typing does not", async () => {
    const onPick = vi.fn();
    renderCatalogUi(<ItemFinder onPick={onPick} />);
    const input = await box();
    await waitFor(() => expect(api.fetchCatalogPayload).toHaveBeenCalled());
    await screen.findByText("Drill bits"); // catalogue is loaded
    // typing with human gaps then Enter: no scan, Enter picks the top search result (none: nothing happens)
    for (const ch of "47900") {
      fireEvent.keyDown(input, { key: ch });
      await new Promise((r) => setTimeout(r, 60));
    }
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPick).not.toHaveBeenCalled();
    act(() => scan(input, "4790001112223"));
    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));
    expect(onPick.mock.calls[0][0].product_id).toBe(1012);
  });

  it("asks the server when the local copy does not know a barcode, then learns it", async () => {
    const onPick = vi.fn();
    api.lookupProduct.mockResolvedValueOnce(null);
    renderCatalogUi(<ItemFinder onPick={onPick} />);
    const input = await box();
    await screen.findByText("Drill bits");
    act(() => scan(input, "9990001112223"));
    expect(await screen.findByTestId("learn-banner")).toBeTruthy();
    expect(api.lookupProduct).toHaveBeenCalledWith("9990001112223");
    // tap-through to the item
    fireEvent.click(await screen.findByText("Drill bits"));
    fireEvent.click(await screen.findByText("Steel"));
    fireEvent.click(await screen.findByText("SALI"));
    const row = await screen.findByTestId("finder-row");
    fireEvent.click(within(row).getByText("4mm"));
    await waitFor(() => expect(api.learnBarcode).toHaveBeenCalledWith({ barcode: "9990001112223", product_id: 1004, unit_id: null }));
    await waitFor(() => expect(onPick).toHaveBeenCalled());
    expect(onPick.mock.calls[0][0].product_id).toBe(1004);
  });

  it("names the other item when the barcode is already taken (409)", async () => {
    api.learnBarcode.mockRejectedValue({ response: { status: 409, data: { product_name: "Tolsen Wood Drill Bit 6mm" } } });
    renderCatalogUi(<ItemFinder onPick={vi.fn()} />);
    const input = await box();
    await screen.findByText("Drill bits");
    act(() => scan(input, "5550001112223"));
    await screen.findByTestId("learn-banner");
    fireEvent.click(await screen.findByText("Garden"));
    fireEvent.click(await screen.findByText("Rs 2,500"));
    expect(await screen.findByText(/already belongs to Tolsen Wood Drill Bit 6mm/)).toBeTruthy();
  });

  it("tap-through shows only levels that have items", async () => {
    renderCatalogUi(<ItemFinder onPick={vi.fn()} />);
    const nodes = await screen.findByTestId("browse-nodes");
    expect(within(nodes).getByText("Drill bits")).toBeTruthy();
    expect(within(nodes).getByText("Garden")).toBeTruthy();
    expect(within(nodes).queryByText("Abrasives")).toBeNull(); // no items: hidden
  });

  it("offers Create here only when nothing matches and the user can manage the catalogue", async () => {
    const { unmount } = renderCatalogUi(<ItemFinder onPick={vi.fn()} />);
    fireEvent.change(await box(), { target: { value: "zzzz" } });
    expect(await screen.findByText("Create here")).toBeTruthy();
    unmount();
    signIn({ permissions: ["retail:view"] });
    renderCatalogUi(<ItemFinder onPick={vi.fn()} />);
    fireEvent.change(await box(), { target: { value: "zzzz" } });
    await screen.findByText("Nothing found");
    expect(screen.queryByText("Create here")).toBeNull();
  });
});
