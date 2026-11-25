import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  native: true,
  navigate: vi.fn(),
  pathname: "/invoices",
  search: {} as Record<string, any>,
  signedIn: true,
  hasPermission: vi.fn(() => true),
  getAlerts: vi.fn(),
  getDeviceInvoice: vi.fn(),
  getAppPrefs: vi.fn(),
  authenticateAppLock: vi.fn(),
  setStatusBarTheme: vi.fn(),
  getSyncStatus: vi.fn(),
}));

vi.mock("../lib/nativeBridge", () => ({
  isNativePhoneApp: () => mocks.native,
  callDeviceContract: vi.fn(),
  nativeBridge: {
    getAlerts: mocks.getAlerts,
    clearAlerts: vi.fn(),
    getAppPrefs: mocks.getAppPrefs,
    authenticateAppLock: mocks.authenticateAppLock,
    setStatusBarTheme: mocks.setStatusBarTheme,
    getSyncStatus: mocks.getSyncStatus,
    setAppLanguage: vi.fn(),
    setAppTextSize: vi.fn(),
    setCallTextScale: vi.fn(),
    setAppLock: vi.fn(),
    setSignedIn: vi.fn(),
    getSetupStatus: vi.fn().mockResolvedValue(null),
    sharePdf: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ pathname: mocks.pathname, search: mocks.search }),
  useSearch: () => mocks.search,
}));

vi.mock("@/stores/useAuthStore", () => ({
  useAuthStore: Object.assign(
    (sel?: (s: any) => any) => {
      const state = {
        user: mocks.signedIn ? { user_id: 1, username: "kasun" } : null,
        hasPermission: mocks.hasPermission,
      };
      return sel ? sel(state) : state;
    },
    {
      getState: () => ({
        user: mocks.signedIn ? { user_id: 1, username: "kasun" } : null,
        hasPermission: mocks.hasPermission,
      }),
    },
  ),
}));

vi.mock("@/features/signatures/lib/deviceId", () => ({
  getDeviceId: () => "dev-123",
  clearDeviceId: vi.fn(),
}));

vi.mock("@/features/signatures/lib/deviceShell", () => ({
  isRequestFinished: () => false,
  useDeviceManifest: vi.fn(),
  useScreenWakeLock: vi.fn(),
}));

vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useDeviceStatus: () => ({
    data: { paired: true, device_status: "ACTIVE", shop_inactive: false },
  }),
  useDevicePendingSignatures: () => ({ data: { pending: [] } }),
}));

vi.mock("@/features/equipment/hooks/useEquipmentPhoto", () => ({
  useDevicePendingPhotos: () => ({ data: { pending: [] } }),
}));

vi.mock("../hooks/useCalls", () => ({
  useDeviceMissedCalls: () => ({ data: { items: [{ call_id: 1 }] } }),
  useDeviceFollowUps: () => ({ data: { items: [{ call_id: 2 }, { call_id: 3 }] } }),
}));

vi.mock("../hooks/usePushSettings", () => ({
  useDeviceInvoice: (id: number | null) => ({
    data: id ? mocks.getDeviceInvoice(id) : undefined,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

import { startFullApp } from "../lib/openGearGrid";
import { PhoneAppBar } from "../components/PhoneAppBar";
import { DeviceShell } from "../components/DeviceShell";
import { DeviceAlertsPage } from "../pages/device/DeviceAlertsPage";
import { DeviceInvoicePage } from "../pages/DeviceInvoicePage";
import { getCachedBill, putCachedBill } from "../lib/billCache";

const wrap = (ui: ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
    </QueryClientProvider>,
  );

beforeEach(() => {
  window.localStorage.clear();
  mocks.native = true;
  mocks.signedIn = true;
  mocks.pathname = "/invoices";
  mocks.search = {};
  mocks.navigate.mockReset();
  mocks.hasPermission.mockReturnValue(true);
  mocks.getAppPrefs.mockResolvedValue({
    appLanguage: "en",
    appTextSize: "default",
    callTextScale: null,
    appLockEnabled: false,
  });
  mocks.authenticateAppLock.mockResolvedValue({ ok: true });
  mocks.setStatusBarTheme.mockResolvedValue(true);
  mocks.getSyncStatus.mockResolvedValue(null);
  mocks.getAlerts.mockResolvedValue([
    {
      id: "a-1",
      receivedAt: "2026-11-25T10:00:00.000Z",
      title: "Discount Rs 2,000",
      body: "INV-42 · Kasun",
      group: "bills",
      invoiceId: "42",
      eventId: "101",
    },
  ]);
  mocks.getDeviceInvoice.mockReturnValue({
    invoice_id: 42,
    invoice_number: "INV-42",
    status: "Active",
    bill_kind: "rental",
    issued_at: "2026-11-25T10:00:00.000Z",
    backdated_days: 2,
    can_see_money: true,
    customer: {
      customer_id: 7,
      name: "Nimal Perera",
      phone: "0771234567",
      id_card_status: 1,
    },
    items: [
      {
        line_id: 1,
        name: "Concrete Mixer",
        quantity: 2,
        borrow_date: "2026-11-20",
        expected_return_date: "2026-11-22",
        line_status: "Active",
        days_late: 3,
        line_total: 5500,
      },
    ],
    sale_lines: [],
    total_amount: 5500,
    paid_amount: 2000,
    balance_due: 3500,
    discount_amount: 500,
    discount_reason_key: "regular_customer",
    discount_reason_note: "VIP",
    payments: [
      {
        payment_id: 1,
        amount: 2000,
        method: "Cash",
        payment_date: "2026-11-24T00:00:00.000Z",
        entered_at: "2026-11-25T09:00:00.000Z",
        staff_name: "Kasun",
      },
    ],
    settlement_id: 88,
    history: [
      {
        id: "act-101",
        source: "activity",
        type: "discount",
        sentence_en: "Discount Rs 500 added by Kasun",
        sentence_si: "Kasun විසින් රු. 500 වට්ටමක්",
        occurred_at: "2026-11-25T09:00:00.000Z",
        risk: "high",
      },
    ],
    issued_by: "Kasun",
  });
});

describe("M1 Phone App Fixes, Bill Details & Landing Screen", () => {
  it("startFullApp pushes to history without replace: true", async () => {
    const ok = await startFullApp(mocks.navigate);
    expect(ok).toBe(true);
    expect(mocks.navigate).toHaveBeenCalledWith({ to: expect.any(String) });
    expect(mocks.navigate.mock.calls[0][0].replace).toBeUndefined();
  });

  it("PhoneAppBar renders only in native phone app and navigates home to /device/alerts", async () => {
    mocks.native = false;
    const { rerender } = wrap(<PhoneAppBar />);
    expect(screen.queryByTestId("native-phone-bar")).not.toBeInTheDocument();

    mocks.native = true;
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <PhoneAppBar />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("native-phone-bar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /phone home/i }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/device/alerts" });
  });

  it("DeviceShell puts Alerts first in bottom navigation", async () => {
    wrap(
      <DeviceShell active="alerts">
        <div>body</div>
      </DeviceShell>,
    );
    const tabs = await screen.findAllByRole("button");
    expect(tabs[0]).toHaveTextContent(/alerts/i);
    expect(tabs[1]).toHaveTextContent(/calls/i);
    expect(tabs[2]).toHaveTextContent(/geargrid/i);
    expect(tabs[3]).toHaveTextContent(/settings/i);
  });

  it("DeviceAlertsPage opens /device/invoice/$id even when signed in", async () => {
    wrap(<DeviceAlertsPage />);
    const row = await screen.findByText("Discount Rs 2,000");
    fireEvent.click(row);
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/device/invoice/$id",
      params: { id: "42" },
      search: { from: "101" },
    });
  });

  it("DeviceInvoicePage renders full M1 details, Open in GearGrid, and hides money for non-money roles", async () => {
    window.history.replaceState({}, "", "/device/invoice/42?from=101");
    wrap(<DeviceInvoicePage invoiceId={42} />);
    expect(await screen.findByText("INV-42")).toBeInTheDocument();
    expect(screen.getByText(/You opened this from:/i)).toBeInTheDocument();
    expect(screen.getByText(/Part of settlement #S-88/i)).toBeInTheDocument();
    expect(screen.getByText(/Back-dated 2 days/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Discount Rs 500 added by Kasun/i).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: /open in geargrid/i }));
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/invoices",
      search: { mode: "manage", invoice: 42 },
    });

    // Non-money role hides amounts
    cleanup();
    mocks.getDeviceInvoice.mockReturnValue({
      ...mocks.getDeviceInvoice(42),
      can_see_money: false,
      total_amount: null,
      paid_amount: null,
      balance_due: null,
    });
    wrap(<DeviceInvoicePage invoiceId={43} />);
    expect(screen.queryByText("Rs. 3,500.00")).not.toBeInTheDocument();
  });

  it("billCache keeps at most 30 bills in LRU order", () => {
    for (let i = 1; i <= 35; i++) {
      putCachedBill(i, { invoice_id: i });
    }
    expect(getCachedBill(1)).toBeNull();
    expect(getCachedBill(5)).toBeNull();
    expect(getCachedBill(6)).not.toBeNull();
    expect(getCachedBill(35)).not.toBeNull();
  });
});
