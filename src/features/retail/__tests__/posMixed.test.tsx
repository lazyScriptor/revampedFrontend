import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { payload, product, sali } from "./catalogFixtures";
import { renderCatalogUi, signIn } from "./catalogTestUtils";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ mode: "dispatch" }),
}));

vi.mock("@/features/retail/api/preferences.api", () => ({
  fetchUiPreferences: vi.fn(async () => ({})),
  putUiPreference: vi.fn(async () => ({})),
}));

const customerSearchSpy = vi.fn();
vi.mock("@/features/invoices/hooks/usePosSearch", () => ({
  usePosCustomerSearch: (q: string) => {
    customerSearchSpy(q);
    return {
      data: q.toLowerCase().includes("nimal")
        ? [
            {
              customer_id: 44,
              customer_type: "Individual",
              first_name: "Nimal",
              last_name: "Contractors",
              nic_number: "198812345678",
              phone_number: "0771112222",
              price_level: "contractor",
              deposit_balance: 0,
            },
          ]
        : [],
      isLoading: false,
      isFetching: false,
    };
  },
  useDebounce: (v: string) => v,
}));

vi.mock("@/features/customers/hooks/useCustomerHooks", async (orig) => ({
  ...(await orig<typeof import("@/features/customers/hooks/useCustomerHooks")>()),
  useCustomerDetails: () => ({ data: null }),
  useCustomerInvoices: () => ({ data: { stats: { total: 0, active: 0, completed: 0 }, invoices: [] }, isLoading: false }),
  useParentCustomerOptions: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/features/phone-assistant/hooks/usePhoneContacts", () => ({
  usePhoneContactSearch: () => ({ data: [], isLoading: false }),
  useUsePhoneContact: () => ({ mutate: vi.fn(), isPending: false }),
}));

const machine = {
  equipment_id: 1,
  equipment_name: "Hammer Drill",
  equipment_name_si: null,
  serial_number: "EQ-0001",
  image_url: null,
  available_qty: 3,
  is_bulk_item: true,
  base_rental_price: 1500,
  minimum_rental_days: 1,
  extra_daily_rate: 1500,
  EquipmentCategory: { category_name: "Power Tools" },
};
vi.mock("@/features/invoices/hooks/usePosEquipmentCatalog", () => ({
  usePosEquipmentCatalog: () => ({
    items: [machine],
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

vi.mock("@/features/equipment/hooks/useCategoryHooks", () => ({
  useCategoryOptions: () => ({ data: [] }),
}));

const printSpy = vi.fn();
vi.mock("@/features/invoices/hooks/useInvoiceHooks", async (orig) => ({
  ...(await orig<typeof import("@/features/invoices/hooks/useInvoiceHooks")>()),
  handlePrintInvoice: (...a: any[]) => printSpy(...a),
}));

vi.mock("@/features/invoices/components/ReceiptPrintDialog", () => ({
  ReceiptPrintDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="receipt-print-dialog" /> : null),
}));
vi.mock("@/features/invoices/components/InvoiceReceipt", () => ({
  InvoiceReceipt: () => null,
}));
vi.mock("@/features/invoices/components/ReturnSettlementDialog", () => ({
  ReturnSettlementDialog: () => null,
}));

vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({
  useWarehouseOptions: () => ({ data: [{ warehouse_id: 1, location_name: "Main Store" }] }),
  useSingleLocation: () => ({ single: true, only: { warehouse_id: 1, location_name: "Main Store" } }),
}));

const catalogProducts = [
  sali(6, {
    contractor_price: 140,
    units: [{ unit_id: 99, unit_name: "box", factor: 10, sell_price: 1500 }],
  }),
  product({
    product_id: 4001,
    code: "HW-CBL",
    name: "Copper Cable",
    base_unit: "m",
    allow_decimal: true,
    sell_price: 100,
  }),
  product({
    product_id: 5001,
    code: "HW-DRL",
    name: "Makita Impact Driver",
    tracking: "serial",
    serial_capture: "sale",
    sell_price: 25000,
  }),
];

vi.mock("../api/catalog.api", async (orig) => ({
  ...(await orig<typeof import("../api/catalog.api")>()),
  fetchCatalogPayload: vi.fn(async () => payload({ products: catalogProducts })),
  lookupProduct: vi.fn(async () => null),
}));

vi.mock("../api/stock.api", async (orig) => ({
  ...(await orig<typeof import("../api/stock.api")>()),
  fetchStockLevels: vi.fn(async () => ({
    server_time: "2026-11-24T10:00:00Z",
    levels: [
      { product_id: 1006, warehouse_id: 1, qty_on_hand: 20, reorder_level: 3, counted_at: "2026-11-24T08:00:00Z" },
      { product_id: 4001, warehouse_id: 1, qty_on_hand: 50, reorder_level: 5, counted_at: "2026-11-24T08:00:00Z" },
      { product_id: 5001, warehouse_id: 1, qty_on_hand: 2, reorder_level: 1, counted_at: "2026-11-24T08:00:00Z" },
    ],
  })),
  fetchSerials: vi.fn(async () => [
    { serial_id: 1, product_id: 5001, serial_no: "MK-1001", warehouse_id: 1, status: "in_stock", location_name: "Main" },
    { serial_id: 2, product_id: 5001, serial_no: "MK-1002", warehouse_id: 1, status: "in_stock", location_name: "Main" },
  ]),
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

const posApi = {
  fetchWalkInCustomer: vi.fn(),
  postSaleInvoice: vi.fn(),
};
vi.mock("../api/pos.api", async (orig) => ({
  ...(await orig<typeof import("../api/pos.api")>()),
  fetchWalkInCustomer: (...a: any[]) => posApi.fetchWalkInCustomer(...a),
  postSaleInvoice: (...a: any[]) => posApi.postSaleInvoice(...a),
}));

import "../approval/ApprovalOverlay";
import InvoicesRoute from "@/routes/Invoices";
import { ShortcutHost } from "@/components/command/ShortcutHost";
import { usePosCartStore, selectSaleLines, selectRentalLines } from "@/features/invoices/store/posCartStore";


const named = { customer_id: 44, customer_type: "Individual", first_name: "Nimal", last_name: "Contractors", price_level: "retail", deposit_balance: 0 };
const walkIn = { customer_id: 999, first_name: "Walk-in", last_name: "customer", is_walk_in: true, price_level: "retail" };

beforeEach(() => {
  usePosCartStore.getState().resetAll();
  printSpy.mockReset();
  customerSearchSpy.mockClear();
  retailApi.fetchRetailSettings.mockReset();
  retailApi.fetchApprovers.mockReset();
  retailApi.approveHere.mockReset();
  posApi.fetchWalkInCustomer.mockReset();
  posApi.postSaleInvoice.mockReset();
  retailApi.fetchRetailSettings.mockResolvedValue({
    approvalMethod: "pin",
    negativeStock: "block",
    discountLimitPct: 10,
    quickPad: [1006, 4001, 5001],
    showContractorPrice: true,
    exceptions: { price_change: "approve", discount_over_limit: "approve", negative_stock: "approve" },
  });
  retailApi.fetchApprovers.mockResolvedValue([{ id: 77, display_name: "Manager" }]);
  posApi.fetchWalkInCustomer.mockResolvedValue({ ...walkIn, nic_number: "WALK-IN", phone_number: "0000000000", deposit_balance: 0 });
  posApi.postSaleInvoice.mockResolvedValue({ invoice_id: 901, status: "Active", bill_kind: "mixed" });
  signIn({ permissions: ["retail:view", "retail:sell"] });
});

const searchBox = () => document.querySelector("[data-scan]") as HTMLInputElement;
const addMachineFromCatalog = async () => {
  fireEvent.focus(searchBox());
  fireEvent.click(await screen.findByRole("group", { name: "Hammer Drill" }));
  fireEvent.click(await screen.findByRole("button", { name: "Done" }));
};
const addItem = async () => fireEvent.click(await screen.findByTestId("quick-pad-btn-4001"));
const rentals = () => selectRentalLines(usePosCartStore.getState().lines);
const sales = () => selectSaleLines(usePosCartStore.getState().lines);

describe("R4: one cart for machines and hardware", () => {
  it("adds items then a machine, groups show their own subtotals, checkout shows the mixed rows", async () => {
    renderCatalogUi(<InvoicesRoute />);
    act(() => usePosCartStore.getState().setSelectedCustomer(named));

    await addItem();
    await addMachineFromCatalog();

    await waitFor(() => expect(rentals()).toHaveLength(1));
    expect(sales()).toHaveLength(1);
    expect(screen.getByTestId("cart-group-rent").textContent).toContain("Rs. 1,500");
    expect(screen.getByTestId("cart-group-items").textContent).toContain("Rs. 100");
    expect(screen.getByTestId("mixed-row-rent").textContent).toContain("Rs. 1,500");
    expect(screen.getByTestId("mixed-row-items").textContent).toContain("Rs. 100");
    expect(screen.getByTestId("checkout-total").textContent).toContain("Rs. 1,600");
    expect(screen.queryByText(/Clear (hardware sales|rental items)/i)).toBeNull();
  });

  it("adds a machine first, then an item (either order); an empty group is hidden", async () => {
    renderCatalogUi(<InvoicesRoute />);
    act(() => usePosCartStore.getState().setSelectedCustomer(named));

    await addMachineFromCatalog();
    await waitFor(() => expect(rentals()).toHaveLength(1));
    expect(screen.queryByTestId("cart-group-rent")).toBeNull(); // rental-only cart: unchanged layout
    expect(screen.queryByTestId("cart-group-items")).toBeNull();

    await addItem();
    await waitFor(() => expect(sales()).toHaveLength(1));
    expect(screen.getByTestId("cart-group-rent")).toBeTruthy();
    expect(screen.getByTestId("cart-group-items")).toBeTruthy();
  });

  it("walk-in + machine opens the customer search with the hint; the machine is added once a customer is picked", async () => {
    renderCatalogUi(<InvoicesRoute />);
    act(() => usePosCartStore.getState().setSelectedCustomer(walkIn));

    await addMachineFromCatalog();
    const hint = await screen.findByTestId("rent-needs-customer");
    expect(hint.textContent).toContain("Choose a customer to rent equipment");
    expect(hint.textContent).toContain("Hammer Drill");
    expect(rentals()).toHaveLength(0);

    act(() => usePosCartStore.getState().setSelectedCustomer(named));
    await waitFor(() => expect(rentals()).toHaveLength(1));
    expect(screen.queryByTestId("rent-needs-customer")).toBeNull();
  });

  it("cancelling the customer prompt drops the machine", async () => {
    renderCatalogUi(<InvoicesRoute />);
    act(() => usePosCartStore.getState().setSelectedCustomer(walkIn));
    await addMachineFromCatalog();
    const hint = await screen.findByTestId("rent-needs-customer");
    fireEvent.click(within(hint).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByTestId("rent-needs-customer")).toBeNull());
    expect(usePosCartStore.getState().pendingRental).toBeNull();
    act(() => usePosCartStore.getState().setSelectedCustomer(named));
    expect(rentals()).toHaveLength(0);
  });

  it("the Walk-in button and F8 are off while machines are in the cart, with the hint as tooltip", async () => {
    renderCatalogUi(
      <>
        <ShortcutHost />
        <InvoicesRoute />
      </>,
    );
    act(() => usePosCartStore.getState().setSelectedCustomer(named));
    const btn = (await screen.findByTestId("walk-in-btn")) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);

    await addMachineFromCatalog();
    await waitFor(() => expect(rentals()).toHaveLength(1));
    await waitFor(() => expect((screen.getByTestId("walk-in-btn") as HTMLButtonElement).disabled).toBe(true));
    const fetchesBefore = posApi.fetchWalkInCustomer.mock.calls.length; // the button prefetches the walk-in on mount
    fireEvent.keyDown(window, { key: "F8" });
    await new Promise((r) => setTimeout(r, 30));
    expect(posApi.fetchWalkInCustomer.mock.calls.length).toBe(fetchesBefore);
    expect(usePosCartStore.getState().selectedCustomer?.customer_id).toBe(44);
    fireEvent.mouseOver(screen.getByTestId("walk-in-btn").parentElement as HTMLElement);
    expect(await screen.findByText("Choose a customer to rent equipment")).toBeTruthy();
  });
});

describe("R4: mixed checkout", () => {
  const setupMixed = async () => {
    renderCatalogUi(<InvoicesRoute />);
    act(() => usePosCartStore.getState().setSelectedCustomer(named));
    await addItem();
    await addMachineFromCatalog();
    await waitFor(() => expect(rentals()).toHaveLength(1));
  };

  it("suggests items + deposit, has no settle_now / change due, and the main button is the rental one", async () => {
    await setupMixed();
    const pay = (await screen.findByLabelText("Items + deposit")) as HTMLInputElement;
    await waitFor(() => expect(pay.value).toBe("100"));
    expect(screen.queryByRole("button", { name: /Sell & print/i })).toBeNull();
    expect(screen.queryByText(/Change due/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Dispatch & print/i })).toBeTruthy();

    // the cashier can change it (a deposit on top of the goods)
    fireEvent.change(pay, { target: { value: "600" } });
    expect(usePosCartStore.getState().fees.advance).toBe(600);
    expect(screen.getByTestId("checkout-total").textContent).toContain("Rs. 1,600");
  });

  it("posts items + sale_items with the Idempotency-Key, line tokens and one payment on fees", async () => {
    await setupMixed();
    act(() => {
      const line = sales()[0];
      usePosCartStore.getState().updateSaleLine(line.cart_id, { price_approval_token: "tok-price-1" });
    });
    fireEvent.change(await screen.findByLabelText("Items + deposit"), { target: { value: "600" } });
    const key = usePosCartStore.getState().idempotencyKey;

    fireEvent.click(screen.getByRole("button", { name: /Dispatch & print/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Confirm & Dispatch|Confirm Dispatch/i }));

    await waitFor(() => expect(posApi.postSaleInvoice).toHaveBeenCalledTimes(1));
    const [body, usedKey] = posApi.postSaleInvoice.mock.calls[0];
    expect(usedKey).toBe(key);
    expect(body.customer_id).toBe(44);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).not.toHaveProperty("kind");
    expect(body.sale_items).toHaveLength(1);
    expect(body.sale_items[0].approval_tokens).toEqual({ price_change: "tok-price-1" });
    expect(body.fees).toMatchObject({ advance: 600, advance_payment_method: "Cash" });
    expect(body).not.toHaveProperty("settle_now");
    expect(body).not.toHaveProperty("payment");
    // success empties the whole cart and rotates the key
    await waitFor(() => expect(usePosCartStore.getState().lines).toHaveLength(0));
    expect(usePosCartStore.getState().idempotencyKey).not.toBe(key);
  });

  it("409 price_changed keeps the rentals in the cart, then confirms with the same key", async () => {
    await setupMixed();
    const key = usePosCartStore.getState().idempotencyKey;
    posApi.postSaleInvoice.mockRejectedValueOnce({
      status: 409,
      data: { code: "price_changed", data: { current_prices: [{ product_id: 4001, unit_id: null, requested_unit_price: 100, current_unit_price: 120 }] } },
    });
    fireEvent.click(screen.getByRole("button", { name: /Dispatch & print/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Confirm & Dispatch|Confirm Dispatch/i }));

    expect(await screen.findByText(/Prices updated/i)).toBeTruthy();
    expect(rentals()).toHaveLength(1); // nothing lost from the rental part
    expect(sales()[0].unit_price).toBe(120);

    fireEvent.click(screen.getByRole("button", { name: /Confirm & sell/i }));
    await waitFor(() => expect(posApi.postSaleInvoice).toHaveBeenCalledTimes(2));
    expect(posApi.postSaleInvoice.mock.calls[1][1]).toBe(key);
    expect(posApi.postSaleInvoice.mock.calls[1][0].items).toHaveLength(1);
  });

  it("409 out_of_stock marks the goods and keeps the rentals", async () => {
    await setupMixed();
    posApi.postSaleInvoice.mockRejectedValueOnce({
      status: 409,
      data: { code: "out_of_stock", data: { code: "out_of_stock", product_id: 4001, warehouse_id: 1, available: 0, requested: 1 } },
    });
    fireEvent.click(screen.getByRole("button", { name: /Dispatch & print/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Confirm & Dispatch|Confirm Dispatch/i }));
    await waitFor(() => expect(sales()[0].out_of_stock).toBe(true));
    expect(rentals()).toHaveLength(1);
  });

  it("422 walk-in opens the customer search", async () => {
    await setupMixed();
    posApi.postSaleInvoice.mockRejectedValueOnce({ status: 422, data: { message: "Choose a customer to rent equipment" } });
    fireEvent.click(screen.getByRole("button", { name: /Dispatch & print/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Confirm & Dispatch|Confirm Dispatch/i }));
    expect(await screen.findByTestId("rent-needs-customer")).toBeTruthy();
    expect(rentals()).toHaveLength(1);
  });
});
