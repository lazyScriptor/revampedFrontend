import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  native: true,
  getSyncStatus: vi.fn(),
  syncNow: vi.fn(),
  searchCustomers: vi.fn(),
  getAppPrefs: vi.fn(),
  authenticateAppLock: vi.fn(),
  navigate: vi.fn(),
  devicePolicy: vi.fn(),
  signedIn: false,
}));

vi.mock("../lib/nativeBridge", () => ({
  isNativePhoneApp: () => mocks.native,
  callDeviceContract: vi.fn(),
  nativeBridge: {
    getSyncStatus: mocks.getSyncStatus,
    syncNow: mocks.syncNow,
    searchCustomers: mocks.searchCustomers,
    getAppPrefs: mocks.getAppPrefs,
    authenticateAppLock: mocks.authenticateAppLock,
    setAppLanguage: vi.fn(),
    setAppTextSize: vi.fn(),
    setCallTextScale: vi.fn(),
    setAppLock: vi.fn(),
  },
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("../components/DeviceShell", () => ({ DeviceShell: ({ children }: any) => children }));
vi.mock("../hooks/useShopDevices", () => ({ useDevicePolicy: () => mocks.devicePolicy() }));
vi.mock("@/stores/useAuthStore", () => ({
  useAuthStore: Object.assign(() => null, { getState: () => ({ user: mocks.signedIn ? { id: 1 } : null }) }),
}));

import { DeviceSyncCard } from "../components/DeviceSyncCard";
import { OfflineCustomerSearch } from "../pages/device/DeviceCallsPage";
import { DeviceAppGatePage } from "../pages/device/DeviceAppGatePage";
import { syncFreshness } from "../lib/phoneAppState";

const wrap = (ui: ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

beforeEach(() => {
  mocks.native = true;
  mocks.signedIn = false;
  mocks.navigate.mockReset();
  mocks.getSyncStatus.mockReset().mockResolvedValue({
    lastBriefSyncAt: minutesAgo(5), lastContactSyncAt: minutesAgo(200), cachedBriefs: 120, outboxPending: 3,
    staleAfterMinutes: 60, showSyncFooter: "always", online: true,
  });
  mocks.syncNow.mockReset().mockResolvedValue({});
  mocks.searchCustomers.mockReset().mockResolvedValue({ hits: [], cachedBriefs: 120 });
  mocks.getAppPrefs.mockReset().mockResolvedValue({ appLanguage: "en", appTextSize: "default", callTextScale: null, appLockEnabled: false });
  mocks.authenticateAppLock.mockReset().mockResolvedValue({ ok: true });
  mocks.devicePolicy.mockReset().mockReturnValue({ isLoading: false, isError: false, data: { effective_capabilities: { full_app: true }, capability_reasons: {} } });
});

describe("sync freshness", () => {
  it("classifies never / fresh / stale from the shop limit", () => {
    const base = { lastContactSyncAt: null, cachedBriefs: 1, outboxPending: 0, staleAfterMinutes: 60, showSyncFooter: "always" as const, online: true };
    expect(syncFreshness(null)).toBe("never");
    expect(syncFreshness({ ...base, lastBriefSyncAt: null })).toBe("never");
    expect(syncFreshness({ ...base, lastBriefSyncAt: minutesAgo(10) })).toBe("fresh");
    expect(syncFreshness({ ...base, lastBriefSyncAt: minutesAgo(90) })).toBe("stale");
  });
});

describe("DeviceSyncCard", () => {
  it("shows what is cached and waiting, and reports a clear result for Sync now", async () => {
    mocks.getSyncStatus
      .mockResolvedValueOnce({ lastBriefSyncAt: minutesAgo(5), lastContactSyncAt: null, cachedBriefs: 100, outboxPending: 3, staleAfterMinutes: 60, showSyncFooter: "always", online: true })
      .mockResolvedValue({ lastBriefSyncAt: minutesAgo(0), lastContactSyncAt: null, cachedBriefs: 114, outboxPending: 0, staleAfterMinutes: 60, showSyncFooter: "always", online: true });
    wrap(<DeviceSyncCard />);
    expect(await screen.findByText(/3 items waiting to upload/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sync now" }));
    expect(await screen.findByText("Updated 14 customers")).toBeInTheDocument();
  });

  it("says No connection when offline instead of failing silently", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    wrap(<DeviceSyncCard />);
    fireEvent.click(await screen.findByRole("button", { name: "Sync now" }));
    expect(await screen.findByText("No connection")).toBeInTheDocument();
    expect(mocks.syncNow).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });
});

describe("OfflineCustomerSearch (D8)", () => {
  it("searches the local cache by name and lists customers", async () => {
    mocks.searchCustomers.mockResolvedValue({
      cachedBriefs: 120,
      hits: [{ kind: "customer", id: 5, name: "Nimal Perera", phone: "0771234567", rating: 4, status: "Active", summary: "Has dues" }],
    });
    wrap(<OfflineCustomerSearch />);
    fireEvent.change(screen.getByRole("textbox", { name: "Find a customer" }), { target: { value: "nimal" } });
    expect(await screen.findByText("Nimal Perera")).toBeInTheDocument();
    expect(mocks.searchCustomers).toHaveBeenCalledWith("nimal", 15);
  });

  it("explains the 9-digit rule when a short number finds nothing", async () => {
    wrap(<OfflineCustomerSearch />);
    fireEvent.change(screen.getByRole("textbox", { name: "Find a customer" }), { target: { value: "07712" } });
    expect(await screen.findByText(/Phone contacts show only after 9 digits/)).toBeInTheDocument();
  });

  it("marks phone contacts as contacts", async () => {
    mocks.searchCustomers.mockResolvedValue({ cachedBriefs: 1, hits: [{ kind: "contact", id: 9, name: "Sunil", phone: "0771234567" }] });
    wrap(<OfflineCustomerSearch />);
    fireEvent.change(screen.getByRole("textbox", { name: "Find a customer" }), { target: { value: "0771234567" } });
    expect(await screen.findByText("Phone contact")).toBeInTheDocument();
  });

  it("tells a browser user that search needs the app", () => {
    mocks.native = false;
    wrap(<OfflineCustomerSearch />);
    expect(screen.getByText(/works inside the GearGrid Phone app/)).toBeInTheDocument();
  });
});

describe("DeviceAppGatePage", () => {
  it("explains why the full application is off when the shop turned it off", () => {
    mocks.devicePolicy.mockReturnValue({ isLoading: false, isError: false, data: { effective_capabilities: { full_app: false }, capability_reasons: { full_app: "shop_policy" } } });
    wrap(<DeviceAppGatePage />);
    expect(screen.getByText("The full application is not available on this phone")).toBeInTheDocument();
    expect(screen.getByText("Your shop has turned the full application off for phones.")).toBeInTheDocument();
  });

  it("asks for the app lock first and opens the sign-in page when nobody is signed in", async () => {
    mocks.getAppPrefs.mockResolvedValue({ appLanguage: "en", appTextSize: "default", callTextScale: null, appLockEnabled: true });
    wrap(<DeviceAppGatePage />);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" }));
    expect(mocks.authenticateAppLock).toHaveBeenCalled();
  });

  it("does not open the application when the lock fails", async () => {
    mocks.getAppPrefs.mockResolvedValue({ appLanguage: "en", appTextSize: "default", callTextScale: null, appLockEnabled: true });
    mocks.authenticateAppLock.mockResolvedValue({ ok: false });
    wrap(<DeviceAppGatePage />);
    expect(await screen.findByText("Unlock your phone to open GearGrid.")).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("opens the dashboard when signed in", async () => {
    mocks.signedIn = true;
    wrap(<DeviceAppGatePage />);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard" }));
  });
});
