import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isNative: false,
  getPushSettings: vi.fn(),
  updatePushSettings: vi.fn(),
  sendPushTest: vi.fn(),
  getMyPushPreferences: vi.fn(),
  updateMyPushPreferences: vi.fn(),
  getDevicePushPreferences: vi.fn(),
  updateDevicePushPreferences: vi.fn(),
  getDeviceInvoice: vi.fn(),
  listMyDevices: vi.fn(),
  getRoles: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/features/signatures/lib/deviceShell", () => ({
  useDeviceManifest: vi.fn(),
  useScreenWakeLock: vi.fn(),
}));

vi.mock("../lib/nativeBridge", () => ({
  isNativePhoneApp: () => mocks.isNative,
  callDeviceContract: vi.fn(),
}));

vi.mock("../api/phoneAssistantApi", () => ({
  getPushSettings: mocks.getPushSettings,
  updatePushSettings: mocks.updatePushSettings,
  sendPushTest: mocks.sendPushTest,
  getMyPushPreferences: mocks.getMyPushPreferences,
  updateMyPushPreferences: mocks.updateMyPushPreferences,
  getDevicePushPreferences: mocks.getDevicePushPreferences,
  updateDevicePushPreferences: mocks.updateDevicePushPreferences,
  getDeviceInvoice: mocks.getDeviceInvoice,
}));

vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useMyDevices: () => mocks.listMyDevices(),
}));

vi.mock("@/features/admin/api/admin.api", () => ({
  roleApi: {
    getRoles: mocks.getRoles,
  },
}));

import { PushSettingsPanel } from "../components/PushSettingsPanel";
import { MyPushPreferences } from "../components/MyPushPreferences";
import { DeviceInvoicePage } from "../pages/DeviceInvoicePage";
import { DeviceNotificationsPage } from "../pages/DeviceNotificationsPage";

const CATALOG = [
  { key: "invoice_created", default_enabled: true, has_amount: true },
  { key: "payment_received", default_enabled: true, has_amount: true },
  { key: "return_processed", default_enabled: true, has_amount: true },
  { key: "invoice_deleted", default_enabled: true, has_amount: false },
  { key: "invoice_restored", default_enabled: true, has_amount: false },
  { key: "payment_voided", default_enabled: true, has_amount: true },
  { key: "contact_used", default_enabled: true, has_amount: false },
  { key: "customer_blacklisted", default_enabled: true, has_amount: false },
];

const DEFAULT_SETTINGS = {
  events: {
    invoice_created: { enabled: true, min_amount: 0, recipient_role_ids: [] },
    payment_received: { enabled: true, min_amount: 500, recipient_role_ids: [2] },
    return_processed: { enabled: true, min_amount: 0, recipient_role_ids: [] },
    invoice_deleted: { enabled: true, min_amount: 0, recipient_role_ids: [] },
    invoice_restored: { enabled: true, min_amount: 0, recipient_role_ids: [] },
    payment_voided: { enabled: false, min_amount: 0, recipient_role_ids: [] },
    contact_used: { enabled: true, min_amount: 0, recipient_role_ids: [] },
    customer_blacklisted: { enabled: true, min_amount: 0, recipient_role_ids: [] },
  },
  quiet_hours: { enabled: false, from: "21:00", to: "07:00" },
  include_amounts: true,
  notify_actor: false,
};

const wrap = (ui: ReactElement) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );

beforeEach(() => {
  window.localStorage.clear();
  mocks.navigate.mockReset();
  mocks.isNative = false;

  mocks.getRoles.mockReset().mockResolvedValue({
    data: {
      roles: [
        { role_id: 1, role_name: "Admin" },
        { role_id: 2, role_name: "Manager" },
      ],
    },
  });

  mocks.getPushSettings.mockReset().mockResolvedValue({
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    catalog: CATALOG,
  });

  mocks.updatePushSettings.mockReset().mockImplementation(async (payload) => ({
    settings: payload,
  }));

  mocks.sendPushTest.mockReset().mockResolvedValue({ reached: 2 });

  mocks.listMyDevices.mockReset().mockReturnValue({
    data: {
      devices: [
        {
          operator_device_id: 7,
          device_id: "dev-vivo-1",
          device_label: "Shop Counter Vivo",
          is_native_app: true,
          app_version: "1.0.0",
        },
        {
          operator_device_id: 8,
          device_id: "dev-browser-1",
          device_label: "Chrome Tab",
          is_native_app: false,
        },
      ],
    },
  });

  mocks.getMyPushPreferences.mockReset().mockResolvedValue({
    preferences: [
      {
        event_key: "invoice_created",
        eligible: true,
        shop_enabled: true,
        has_amount: true,
        shop_min_amount: 1000,
        enabled: true,
        min_amount: null,
      },
      {
        event_key: "contact_used",
        eligible: true,
        shop_enabled: true,
        has_amount: false,
        shop_min_amount: 0,
        enabled: true,
        min_amount: null,
      },
      {
        event_key: "payment_voided",
        eligible: true,
        shop_enabled: false,
        has_amount: true,
        shop_min_amount: 0,
        enabled: true,
        min_amount: null,
      },
      {
        event_key: "customer_blacklisted",
        eligible: false,
        shop_enabled: true,
        has_amount: false,
        shop_min_amount: 0,
        enabled: true,
        min_amount: null,
      },
    ],
  });

  mocks.updateMyPushPreferences.mockReset().mockImplementation(async (updates) => ({
    preferences: updates.map((u: any) => ({
      event_key: u.event_key,
      eligible: true,
      shop_enabled: true,
      has_amount: u.event_key === "invoice_created",
      shop_min_amount: u.event_key === "invoice_created" ? 1000 : 0,
      enabled: u.enabled,
      min_amount: u.min_amount ?? null,
    })),
  }));

  mocks.getDevicePushPreferences.mockReset().mockResolvedValue({
    preferences: [
      {
        event_key: "payment_received",
        eligible: true,
        shop_enabled: true,
        has_amount: true,
        shop_min_amount: 500,
        enabled: true,
        min_amount: 1000,
      },
      {
        event_key: "customer_blacklisted",
        eligible: false,
        shop_enabled: true,
        has_amount: false,
        shop_min_amount: 0,
        enabled: true,
        min_amount: null,
      },
    ],
  });

  mocks.updateDevicePushPreferences.mockReset().mockImplementation(async (updates) => ({
    preferences: [
      {
        event_key: "payment_received",
        eligible: true,
        shop_enabled: true,
        has_amount: true,
        shop_min_amount: 500,
        enabled: updates[0]?.enabled ?? false,
        min_amount: updates[0]?.min_amount ?? 1000,
      },
    ],
  }));

  mocks.getDeviceInvoice.mockReset().mockResolvedValue({
    invoice_id: 42,
    invoice_number: "INV-2026-009",
    status: "dispatched",
    issued_at: "2026-11-15T06:00:00Z",
    customer: {
      customer_id: 9,
      name: "Kamal Perera",
      phone: "+94771234567",
    },
    items: [
      { name: "Makita Breaker", quantity: 2, line_total: 10000 },
      { name: "Plate Compactor", quantity: 1, line_total: 5000 },
    ],
    total_amount: 15000,
    paid_amount: 6000,
    balance_due: 9000,
    issued_by: "Kasun",
  });
});

describe("Slice B Push Notification Settings & Device Pages (B5–B6)", () => {
  it("renders PushSettingsPanel for all 8 events, saves updates, and sends a test notification", async () => {
    wrap(<PushSettingsPanel />);

    expect(await screen.findByText("New invoice created")).toBeInTheDocument();
    expect(screen.getByText("Customer blacklisted")).toBeInTheDocument();
    expect(screen.getByText("Payment voided / refunded")).toBeInTheDocument();

    expect(
      screen.getAllByText("Admins only (hierarchy ≥ 100)").length,
    ).toBeGreaterThan(0);

    // Toggle Quiet hours on
    const quietSwitch = screen.getByRole("switch", { name: /quiet hours/i });
    fireEvent.click(quietSwitch);

    // Save shop push settings
    const saveBtn = screen.getByRole("button", { name: /save push settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mocks.updatePushSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          quiet_hours: { enabled: true, from: "21:00", to: "07:00" },
        }),
      );
    });
    expect(
      await screen.findByText("Shop push notification settings saved."),
    ).toBeInTheDocument();

    // Send test push
    fireEvent.click(screen.getByRole("button", { name: /send test notification/i }));
    await waitFor(() => {
      expect(mocks.sendPushTest).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText("Test push delivered to 2 paired phone(s)."),
    ).toBeInTheDocument();
  });

  it("narrows MyPushPreferences to shop_enabled & eligible events and validates personal minimum", async () => {
    wrap(<MyPushPreferences />);

    expect(await screen.findByText("New invoice created")).toBeInTheDocument();
    expect(screen.getByText("Phone contact used for bill")).toBeInTheDocument();
    // Disabled or ineligible events must not appear
    expect(screen.queryByText("Payment voided / refunded")).not.toBeInTheDocument();
    expect(screen.queryByText("Customer blacklisted")).not.toBeInTheDocument();
    // Shows paired native Android device chip, ignoring browser device
    expect(screen.getByText(/Shop Counter Vivo · v1\.0\.0/)).toBeInTheDocument();
    expect(screen.queryByText(/Chrome Tab/)).not.toBeInTheDocument();

    // Entering below shop_min_amount (1000) shows validation message and blocks save
    const amountInput = screen.getByLabelText(/only alert above/i);
    fireEvent.change(amountInput, { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: /save threshold/i }));
    expect(
      await screen.findByText(/must be at least the shop minimum of rs\. 1,000/i),
    ).toBeInTheDocument();
    expect(mocks.updateMyPushPreferences).not.toHaveBeenCalled();

    // Toggling personal event switch saves via API
    const invoiceSwitch = screen.getByRole("switch", {
      name: /new invoice created/i,
    });
    fireEvent.click(invoiceSwitch);
    await waitFor(() => {
      expect(mocks.updateMyPushPreferences).toHaveBeenCalledWith([
        {
          event_key: "invoice_created",
          enabled: false,
          min_amount: null,
        },
      ]);
    });
  });

  it("renders DeviceInvoicePage summary with line totals and clickable phone link, and handles 403", async () => {
    wrap(<DeviceInvoicePage invoiceId={42} />);

    expect(await screen.findByText("INV-2026-009")).toBeInTheDocument();
    expect(screen.getByText("Kamal Perera")).toBeInTheDocument();
    expect(screen.getByText("Makita Breaker")).toBeInTheDocument();
    expect(screen.getByText("Rs. 15,000.00")).toBeInTheDocument();
    expect(screen.getByText("Rs. 6,000.00")).toBeInTheDocument();
    expect(screen.getByText("Rs. 9,000.00")).toBeInTheDocument();

    const phoneLink = screen.getByRole("link", { name: "+94771234567" });
    expect(phoneLink).toHaveAttribute("href", "tel:+94771234567");

    // 403 error message for non-admin phone
    mocks.getDeviceInvoice.mockRejectedValue(
      Object.assign(new Error("Only shop admins can view invoices"), { status: 403 }),
    );
    wrap(<DeviceInvoicePage invoiceId={99} />);
    expect(
      await screen.findByText(
        "Only shop administrators can view full invoice summaries on mobile.",
      ),
    ).toBeInTheDocument();
  });

  it("toggles and saves personal push preferences on DeviceNotificationsPage", async () => {
    window.localStorage.setItem("geargrid.device_id", "dev-vivo-123");
    wrap(<DeviceNotificationsPage />);

    expect(await screen.findByText("Payment received")).toBeInTheDocument();
    expect(screen.queryByText("Customer blacklisted")).not.toBeInTheDocument();

    const toggle = screen.getByRole("switch", { name: /payment received/i });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mocks.updateDevicePushPreferences).toHaveBeenCalledWith([
        {
          event_key: "payment_received",
          enabled: false,
          min_amount: 1000,
        },
      ]);
    });
    expect(
      await screen.findByText("Push preferences saved."),
    ).toBeInTheDocument();
  });
});
