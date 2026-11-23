import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { payload, product, sali } from "./catalogFixtures";
import { makeFakeSocket, signIn } from "./testUtils";
import { renderCatalogUi } from "./catalogTestUtils";

const deskApi = {
  fetchDesk: vi.fn(),
  decideApproval: vi.fn(),
  fetchRetailSettings: vi.fn(),
};
vi.mock("../api/retail.api", async (orig) => ({
  ...(await orig<typeof import("../api/retail.api")>()),
  fetchDesk: (...a: any[]) => deskApi.fetchDesk(...a),
  decideApproval: (...a: any[]) => deskApi.decideApproval(...a),
  fetchRetailSettings: (...a: any[]) => deskApi.fetchRetailSettings(...a),
}));

const toSortApi = {
  fetchToSortDesk: vi.fn(),
  linkUnlistedLines: vi.fn(),
  createUnlistedItem: vi.fn(),
  markUnlistedOneOff: vi.fn(),
};
vi.mock("../api/pos.api", async (orig) => ({
  ...(await orig<typeof import("../api/pos.api")>()),
  fetchToSortDesk: (...a: any[]) => toSortApi.fetchToSortDesk(...a),
  linkUnlistedLines: (...a: any[]) => toSortApi.linkUnlistedLines(...a),
  createUnlistedItem: (...a: any[]) => toSortApi.createUnlistedItem(...a),
  markUnlistedOneOff: (...a: any[]) => toSortApi.markUnlistedOneOff(...a),
}));

vi.mock("../api/catalog.api", async (orig) => ({
  ...(await orig<typeof import("../api/catalog.api")>()),
  fetchCatalogPayload: vi.fn(async () => payload({ products: [sali(6), product({ product_id: 90, name: "Electrical Tape" })] })),
}));

vi.mock("../api/stock.api", async (orig) => ({
  ...(await orig<typeof import("../api/stock.api")>()),
  fetchStockLevels: vi.fn(async () => ({ server_time: "2026-11-24T10:00:00Z", levels: [] })),
}));

vi.mock("@/features/retail/api/preferences.api", () => ({
  fetchUiPreferences: vi.fn(async () => ({})),
  putUiPreference: vi.fn(async () => ({})),
}));
vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({
  useWarehouseOptions: () => ({ data: [{ warehouse_id: 1, location_name: "Main" }] }),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

const socket = makeFakeSocket();
vi.mock("@/lib/socket", () => ({ connectSocket: vi.fn(), getSocket: () => socket }));

import { RetailTopBar } from "../RetailTopBar";
import "../catalog/registerCatalog";

beforeEach(() => {
  Object.values(deskApi).forEach((m) => m.mockReset());
  Object.values(toSortApi).forEach((m) => m.mockReset());

  deskApi.fetchRetailSettings.mockResolvedValue({ approvalMethod: "either" });
  deskApi.fetchDesk.mockResolvedValue({ rows: [], total: 1, totals: [] });
  toSortApi.fetchToSortDesk.mockResolvedValue({
    total: 2,
    groups: [
      {
        key: "black tape",
        description: "Black tape",
        count: 3,
        total_qty: 5,
        last_price: 220,
        last_date: "2026-11-24T09:00:00Z",
        bills: [
          { invoice_id: 101, doc_number: "INV-101" },
          { invoice_id: 102, doc_number: "INV-102" },
        ],
        scanned_barcode: "479888",
        sale_line_ids: [11, 12, 13],
      },
      {
        key: "garden wire",
        description: "Garden wire",
        count: 1,
        total_qty: 2,
        last_price: 150,
        last_date: "2026-11-24T10:00:00Z",
        bills: [{ invoice_id: 103, doc_number: "INV-103" }],
        scanned_barcode: null,
        sale_line_ids: [14],
      },
    ],
  });
  toSortApi.linkUnlistedLines.mockResolvedValue({ linked_count: 3 });
  toSortApi.createUnlistedItem.mockResolvedValue({ products: [product({ product_id: 500, name: "Black tape" })] });
  toSortApi.markUnlistedOneOff.mockResolvedValue({ marked_count: 1 });

  signIn({ permissions: ["approvals:decide", "retail:confirm_unlisted", "retail:view", "retail:product_manage", "retail:stock_adjust"] });
});

describe("Manager Desk To sort tab and badge", () => {
  it("badge combines waiting + to_sort counts, and Link / Create + opening qty / One-off call desk endpoints", async () => {
    renderCatalogUi(<RetailTopBar />);

    // Badge = 1 waiting + 2 to_sort = 3
    await waitFor(() => expect(screen.getByText("3")).toBeTruthy());

    fireEvent.click(screen.getByLabelText("Manager desk"));
    fireEvent.click(await screen.findByRole("tab", { name: "To sort (2)" }));

    const rows = await screen.findAllByTestId("to-sort-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("Black tape");
    expect(rows[0].textContent).toContain("×3");
    expect(rows[0].textContent).toContain("INV-101");
    expect(rows[0].textContent).toContain("479888");

    // 1. One-off on Garden wire (2nd row)
    fireEvent.click(screen.getAllByRole("button", { name: "One-off" })[1]);
    await waitFor(() => expect(toSortApi.markUnlistedOneOff).toHaveBeenCalledWith({ sale_line_ids: [14] }));

    // 2. Link on Black tape -> opens ItemFinder, pick SALI Steel Drill Bit 6mm (or Electrical Tape)
    fireEvent.click(screen.getAllByRole("button", { name: "Link" })[0]);
    fireEvent.change(await screen.findByLabelText("Search or scan"), { target: { value: "Electrical Tape" } });
    const tapeRow = (await screen.findByText("Electrical Tape")).closest("[data-testid='finder-row']") as HTMLElement;
    fireEvent.click(within(tapeRow).getByRole("button"));
    await waitFor(() => expect(toSortApi.linkUnlistedLines).toHaveBeenCalledWith({ sale_line_ids: [11, 12, 13], product_id: 90 }));

    // 3. Create on Black tape -> prefilled NewItemOverlay + optional Opening qty
    fireEvent.click(screen.getAllByRole("button", { name: "Create" })[0]);
    fireEvent.click(await screen.findByText("Garden"));
    fireEvent.click(await screen.findByText("No brand"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const sellInput = (await screen.findByLabelText("Sell")) as HTMLInputElement;
    expect(sellInput.value).toBe("220");
    fireEvent.change(screen.getByLabelText("Opening qty"), { target: { value: "10" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await waitFor(() => expect(toSortApi.createUnlistedItem).toHaveBeenCalledTimes(1));
    expect(toSortApi.createUnlistedItem.mock.calls[0][0]).toMatchObject({
      sale_line_ids: [11, 12, 13],
      opening_qty: 10,
      item: { sell_price: 220, barcode: "479888" },
    });
  });
});
