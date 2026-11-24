import { fireEvent, screen, waitFor } from "@testing-library/react";
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

import InvoicesRoute from "@/routes/Invoices";
import { ShortcutHost } from "@/components/command/ShortcutHost";
import { usePosCartStore, selectSaleLines } from "@/features/invoices/store/posCartStore";

let settingsReceipt: Record<string, any> = {};
beforeEach(() => {
  settingsReceipt = {};
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
    receipt: settingsReceipt,
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


const sellOneWithPayment = async (tendered: string) => {
  renderCatalogUi(
    <>
      <ShortcutHost />
      <InvoicesRoute />
    </>,
  );
  fireEvent.click(await screen.findByTestId("quick-pad-btn-1006"));
  await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)).toHaveLength(1));
  fireEvent.keyDown(window, { key: "F8" });
  await waitFor(() => expect(screen.getByTestId("walk-in-chip")).toBeTruthy());
  await waitFor(() => expect(retailApi.fetchRetailSettings).toHaveBeenCalled());
  const total = selectSaleLines(usePosCartStore.getState().lines).reduce((s, l) => s + l.line_total, 0);
  fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: tendered } });
  fireEvent.keyDown(window, { key: "F9" });
  await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
  return total;
};

describe("Sell & print prints the short sale receipt", () => {
  it("logs SALE_RECEIPT and passes the change the server reported", async () => {
    posApi.postSaleInvoice.mockResolvedValue({ invoice_id: 777, status: "Completed", bill_kind: "sale", change_due: 4000 });
    await sellOneWithPayment("5000");
    const [id, options] = printSpy.mock.calls[0];
    expect(id).toBe("pos-dispatch-silent-receipt");
    expect(options).toMatchObject({ docType: "SALE_RECEIPT", invoiceId: 777, docNumber: "INV-777", changeDue: 4000 });
    expect(options.billSnapshot).toMatchObject({ bill_kind: "sale", change_due: 4000 });
    expect(options.billSnapshot.SaleLines).toHaveLength(1);
  });

  it("works the change out itself when the server did not send it", async () => {
    posApi.postSaleInvoice.mockResolvedValue({ invoice_id: 778, status: "Completed", bill_kind: "sale" });
    const total = await sellOneWithPayment("5000");
    expect(printSpy.mock.calls[0][1].changeDue).toBe(Math.round((5000 - total) * 100) / 100);
    expect(printSpy.mock.calls[0][1].docType).toBe("SALE_RECEIPT");
  });

  it("an exact payment has no change", async () => {
    posApi.postSaleInvoice.mockResolvedValue({ invoice_id: 779, status: "Completed", bill_kind: "sale" });
    renderCatalogUi(
      <>
        <ShortcutHost />
        <InvoicesRoute />
      </>,
    );
    fireEvent.click(await screen.findByTestId("quick-pad-btn-1006"));
    await waitFor(() => expect(selectSaleLines(usePosCartStore.getState().lines)).toHaveLength(1));
    fireEvent.keyDown(window, { key: "F8" });
    await waitFor(() => expect(screen.getByTestId("walk-in-chip")).toBeTruthy());
    fireEvent.keyDown(window, { key: "F9" });
    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    expect(printSpy.mock.calls[0][1].changeDue).toBeNull();
  });

  it("with the short receipt switched off the full bill is logged as before", async () => {
    settingsReceipt = { shortSaleReceipt: false };
    retailApi.fetchRetailSettings.mockImplementation(async () => ({ approvalMethod: "pin", negativeStock: "block", discountLimitPct: 10, quickPad: [1006], exceptions: {}, receipt: settingsReceipt }));
    posApi.postSaleInvoice.mockResolvedValue({ invoice_id: 780, status: "Completed", bill_kind: "sale" });
    await sellOneWithPayment("5000");
    expect(printSpy.mock.calls[0][1].docType).toBe("COMPLETED");
  });
});
