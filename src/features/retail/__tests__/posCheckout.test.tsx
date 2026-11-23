import { act, fireEvent, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/features/invoices/hooks/usePosEquipmentCatalog", () => ({
  usePosEquipmentCatalog: () => ({
    items: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    isSettling: false,
    isPlaceholderData: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    total: 0,
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
import { usePosCartStore, selectSaleLines } from "@/features/invoices/store/posCartStore";
import { buildSaleLineFromProduct } from "../pos/posPricing";

const enterPinAndApprove = async () => {
  const summaryEl = await screen.findByTestId("approval-summary");
  const prevCalls = retailApi.approveHere.mock.calls.length;
  await screen.findByRole("button", { name: /Manager/i });
  for (const d of ["1", "2", "3", "4"]) {
    fireEvent.click(screen.getByRole("button", { name: d }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await waitFor(() => expect(retailApi.approveHere.mock.calls.length).toBeGreaterThan(prevCalls));
  await waitFor(() => expect(screen.queryByTestId("approval-summary")).not.toBe(summaryEl));
};

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
    exceptions: {
      price_change: "approve",
      discount_over_limit: "approve",
      negative_stock: "approve",
    },
  });
  retailApi.fetchApprovers.mockResolvedValue([{ id: 77, display_name: "Manager" }]);
  let tokSeq = 1;
  retailApi.approveHere.mockImplementation(async (inp: any) => ({
    approval_token: `tok-${inp.type}-${tokSeq++}`,
    exception_id: tokSeq,
  }));
  posApi.fetchWalkInCustomer.mockResolvedValue({
    customer_id: 999,
    first_name: "Walk-in",
    last_name: "customer",
    nic_number: "WALK-IN",
    phone_number: "0000000000",
    is_walk_in: true,
    price_level: "retail",
    deposit_balance: 0,
  });
  posApi.postSaleInvoice.mockResolvedValue({ invoice_id: 777, status: "Completed", bill_kind: "sale" });

  signIn({ permissions: ["retail:view", "retail:sell"] });
});

describe("POS Cart Lines, Approvals, Walk-in (F8), Credit, Sell & print (F9) & 409 Flows", () => {
  it("handles price change approval + discount over limit + pack switch + decimal qty + Walk-in (F8) + Sell & print (F9) + reset", async () => {
    renderCatalogUi(
      <>
        <ShortcutHost />
        <InvoicesRoute />
      </>,
    );

    // Tap SALI 6mm on Quick Pad
    fireEvent.click(await screen.findByTestId("quick-pad-btn-1006"));
    let line = await waitFor(() => {
      const s = selectSaleLines(usePosCartStore.getState().lines);
      expect(s).toHaveLength(1);
      return s[0];
    });

    // Switch pack unit to box (x10)
    fireEvent.click(screen.getByLabelText("Switch unit"));
    fireEvent.click(await screen.findByText(/box \(×10\)/));
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)[0].unit_label).toBe("box"));

    // Tap price -> lower price + apply 20% discount (over 10% limit) -> two manager approvals -> tokens saved on line
    fireEvent.click(screen.getByTestId(`edit-price-${line.cart_id}`));
    fireEvent.change(await screen.findByLabelText("Unit price"), { target: { value: "1300" } });
    fireEvent.change(screen.getByLabelText("Line discount"), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    // 1st approval: price_change
    await enterPinAndApprove();
    // 2nd approval: discount_over_limit
    await enterPinAndApprove();

    await waitFor(() => {
      const updated = selectSaleLines(usePosCartStore.getState().lines)[0];
      expect(updated.unit_price).toBe(1300);
      expect(updated.line_discount).toBe(300);
      expect(updated.price_approval_token).toBe("tok-price_change-1");
      expect(updated.discount_approval_token).toBe("tok-discount_over_limit-2");
    });

    // Add decimal item & enter 2.5m
    fireEvent.click(screen.getByTestId("quick-pad-btn-4001"));
    const qtyInputs = await screen.findAllByLabelText("Qty");
    fireEvent.change(qtyInputs[0], { target: { value: "2.5" } });
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)[1].qty).toBe(2.5));

    // Press F8 -> fetches Walk-in, hides Credit button, enforces full payment
    fireEvent.keyDown(window, { key: "F8" });
    await waitFor(() => expect(posApi.fetchWalkInCustomer).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("walk-in-chip")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Credit" })).toBeNull();

    // Job / site & PO no.
    fireEvent.change(screen.getByLabelText(/Job \/ site/i), { target: { value: "Colombo Port" } });
    fireEvent.change(screen.getByLabelText(/PO no\./i), { target: { value: "PO-991" } });

    // Underpayment disables Sell & print for Walk-in
    const payInput = screen.getByLabelText("Payment amount");
    fireEvent.change(payInput, { target: { value: "500" } });
    expect((screen.getByRole("button", { name: /Sell & print/i }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(payInput, { target: { value: "1250" } });

    // Capture idempotency key before F9 Sell & print
    const usedKey = usePosCartStore.getState().idempotencyKey;
    fireEvent.keyDown(window, { key: "F9" });

    await waitFor(() => expect(posApi.postSaleInvoice).toHaveBeenCalledTimes(1));
    const [payloadArg, keyArg] = posApi.postSaleInvoice.mock.calls[0];
    expect(keyArg).toBe(usedKey);
    expect(payloadArg).toMatchObject({
      customer_id: 999,
      settle_now: true,
      job_site: "Colombo Port",
      customer_po: "PO-991",
      payment: { amount: 1250, method: "Cash" },
      approval_tokens: {
        price_change: "tok-price_change-1",
        discount_over_limit: "tok-discount_over_limit-2",
      },
    });
    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    expect(selectSaleLines(usePosCartStore.getState().lines)).toHaveLength(0);
    expect(usePosCartStore.getState().idempotencyKey).not.toBe(usedKey);
  }, 15000);

  it("contractor customer switches price level, serial picker selects serials, Credit submits settle_now: false", async () => {
    renderCatalogUi(<InvoicesRoute />);

    // Add serial item via quick pad -> Sell & print stays disabled until serial picked
    fireEvent.click(await screen.findByTestId("quick-pad-btn-5001"));
    fireEvent.click(await screen.findByText(/Pick serial \(0\/1\)/));
    fireEvent.click(await screen.findByText("MK-1002"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)[0].serials).toEqual(["MK-1002"]));

    // Add SALI 6mm and select contractor customer -> reprices to 140 and shows Contractor chip
    fireEvent.click(screen.getByTestId("quick-pad-btn-1006"));
    act(() => {
      usePosCartStore.getState().setSelectedCustomer({
        customer_id: 44,
        customer_type: "Individual",
        first_name: "Nimal",
        last_name: "Contractors",
        price_level: "contractor",
      });
    });
    expect(await screen.findByTestId("price-level-chip")).toBeTruthy();
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)[1].unit_price).toBe(140));

    // Switch to Credit -> payment resets to 0 and submits settle_now: false
    fireEvent.click(await screen.findByRole("button", { name: "Credit" }));
    fireEvent.click(screen.getByRole("button", { name: /Sell & print/i }));

    await waitFor(() => expect(posApi.postSaleInvoice).toHaveBeenCalledTimes(1));
    const [body] = posApi.postSaleInvoice.mock.calls[0];
    expect(body.settle_now).toBe(false);
    expect(body.payment.amount).toBe(0);
    expect(body.sale_items[0].serials).toEqual(["MK-1002"]);
  });

  it("handles 409 price_changed with confirm & same idempotency key, and 409 out_of_stock with 'Sell anyway' approval", async () => {
    renderCatalogUi(<InvoicesRoute />);
    await screen.findByTestId("quick-pad");

    act(() => {
      usePosCartStore.getState().setSelectedCustomer({
        customer_id: 999,
        first_name: "Walk-in",
        last_name: "customer",
        is_walk_in: true,
        price_level: "retail",
      });
      usePosCartStore.getState().addSaleLine(buildSaleLineFromProduct(catalogProducts[0], { warehouseId: 1, priceLevel: "retail", qty: 2 }));
    });

    const keyBefore = usePosCartStore.getState().idempotencyKey;

    // 1st attempt -> 409 price_changed (160 -> 190)
    posApi.postSaleInvoice.mockRejectedValueOnce({
      status: 409,
      data: {
        code: "price_changed",
        data: { current_prices: [{ product_id: 1006, unit_id: null, requested_unit_price: 160, current_unit_price: 190 }] },
      },
    });
    // 2nd attempt -> 409 out_of_stock (available 1)
    posApi.postSaleInvoice.mockRejectedValueOnce({
      status: 409,
      data: { code: "out_of_stock", data: { code: "out_of_stock", product_id: 1006, warehouse_id: 1, available: 1, requested: 2 } },
    });
    // 3rd attempt -> success
    posApi.postSaleInvoice.mockResolvedValueOnce({ invoice_id: 888, status: "Completed", bill_kind: "sale" });

    fireEvent.click(screen.getByRole("button", { name: /Sell & print/i }));

    // Confirm updated price (160 -> 190)
    expect(await screen.findByText(/Prices updated/i)).toBeTruthy();
    expect(screen.getByText(/Rs 160 → Rs 190/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Confirm & sell/i }));

    // Second attempt sent new total (380) with same Idempotency-Key
    await waitFor(() => expect(posApi.postSaleInvoice).toHaveBeenCalledTimes(2));
    expect(posApi.postSaleInvoice.mock.calls[1][0].payment.amount).toBe(380);
    expect(posApi.postSaleInvoice.mock.calls[1][1]).toBe(keyBefore);

    // Marked red out of stock with Only 1 available + Sell anyway
    expect(await screen.findByText("Only 1 available")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sell anyway" }));
    await enterPinAndApprove();

    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)[0].stock_approval_token).toBe("tok-negative_stock-1"));

    fireEvent.click(screen.getByRole("button", { name: /Sell & print/i }));
    await waitFor(() => expect(posApi.postSaleInvoice).toHaveBeenCalledTimes(3));
    expect(posApi.postSaleInvoice.mock.calls[2][0].approval_tokens).toMatchObject({ negative_stock: "tok-negative_stock-1" });
    expect(posApi.postSaleInvoice.mock.calls[2][1]).toBe(keyBefore);
  });
});
