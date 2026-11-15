import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  listShopDevices: vi.fn(),
  setShopDeviceStatus: vi.fn(),
  wipeShopDevice: vi.fn(),
  testShopDevicePush: vi.fn(),
  updateShopDevice: vi.fn(),
  getShopDeviceAudit: vi.fn(),
  getPhoneAssistantPolicy: vi.fn(),
  updatePhoneAssistantPolicy: vi.fn(),
  getPushSettings: vi.fn(),
  updatePushSettings: vi.fn(),
  sendPushTest: vi.fn(),
  getMyPushPreferences: vi.fn(),
  updateMyPushPreferences: vi.fn(),
  getDevicePushPreferences: vi.fn(),
  updateDevicePushPreferences: vi.fn(),
  listMyDevices: vi.fn(),
  getRoles: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/lib/socket", () => ({
  connectSocket: vi.fn(),
  getSocket: () => ({ on: vi.fn(), off: vi.fn() }),
}));

vi.mock("@/features/signatures/lib/deviceShell", () => ({
  useDeviceManifest: vi.fn(),
  useScreenWakeLock: vi.fn(),
}));

vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useMyDevices: () => mocks.listMyDevices(),
}));

vi.mock("@/features/admin/api/admin.api", () => ({
  roleApi: {
    getRoles: mocks.getRoles,
  },
}));

vi.mock("../lib/nativeBridge", () => ({
  isNativePhoneApp: () => false,
  callDeviceContract: vi.fn(),
}));

vi.mock("../api/phoneAssistantApi", () => ({
  listShopDevices: mocks.listShopDevices,
  setShopDeviceStatus: mocks.setShopDeviceStatus,
  wipeShopDevice: mocks.wipeShopDevice,
  testShopDevicePush: mocks.testShopDevicePush,
  updateShopDevice: mocks.updateShopDevice,
  getShopDeviceAudit: mocks.getShopDeviceAudit,
  getPhoneAssistantPolicy: mocks.getPhoneAssistantPolicy,
  updatePhoneAssistantPolicy: mocks.updatePhoneAssistantPolicy,
  getPushSettings: mocks.getPushSettings,
  updatePushSettings: mocks.updatePushSettings,
  sendPushTest: mocks.sendPushTest,
  getMyPushPreferences: mocks.getMyPushPreferences,
  updateMyPushPreferences: mocks.updateMyPushPreferences,
  getDevicePushPreferences: mocks.getDevicePushPreferences,
  updateDevicePushPreferences: mocks.updateDevicePushPreferences,
}));

import { DeviceConsolePage } from "../pages/DeviceConsolePage";
import { PushSettingsPanel } from "../components/PushSettingsPanel";
import { MyPushPreferences } from "../components/MyPushPreferences";
import { DeviceNotificationsPage } from "../pages/DeviceNotificationsPage";

const wrap = (ui: ReactElement) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );

function selectMuiOption(combobox: HTMLElement, optionRegex: RegExp) {
  fireEvent.mouseDown(combobox);
  const listbox = screen.getByRole("listbox");
  const option = within(listbox).getByRole("option", { name: optionRegex });
  fireEvent.click(option);
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.navigate.mockReset();

  mocks.listShopDevices.mockReset().mockResolvedValue({
    devices: [
      {
        operator_device_id: 102,
        user_id: 2,
        staff_name: "Nimal Perera",
        staff_email: "nimal@shop.lk",
        staff_role_name: "Counter",
        staff_is_admin: false,
        device_id: "dev-102",
        device_label: "Counter Vivo",
        device_model: "Vivo Y27",
        os_version: "Android 14",
        app_version: "1.2.0",
        is_native_app: true,
        status: "ACTIVE",
        paired_at: "2026-11-15T09:00:00.000Z",
        last_seen_at: "2026-11-15T10:00:00.000Z",
        approved_by: 1,
        approved_at: "2026-11-15T09:05:00.000Z",
        revoked_at: null,
        muted: false,
        brief_profile_id: "counter",
        contact_sync_enabled: true,
        contact_sync_mode: "all",
        contacts_synced_at: null,
        contact_count: 10,
        call_logging_scope: "customers_and_contacts",
        calls_logged_count: 3,
        sim_filter: null,
        capabilities: {
          signatures: true,
          photos: true,
          caller_brief: true,
          bill_view: false,
          push: true,
          contact_sync: true,
          call_logging: true,
          click_to_call: true,
        },
        effective_capabilities: {
          signatures: true,
          photos: true,
          caller_brief: true,
          bill_view: false,
          push: true,
          contact_sync: true,
          call_logging: true,
          click_to_call: true,
        },
        capability_reasons: { bill_view: "role" },
        reported_state: null,
        health_warnings: [],
      },
    ],
    counts: { total: 1, pending: 0, active: 1, suspended: 0, revoked: 0 },
  });

  mocks.getPhoneAssistantPolicy.mockReset().mockResolvedValue({
    policy: {
      approval_mode: "auto_approve_admin_phones",
      auto_suspend_days: 0,
      offline_wipe_days: 7,
      capabilities: {
        signatures: true,
        photos: true,
        caller_brief: true,
        bill_view: true,
        push: true,
        contact_sync: true,
        call_logging: true,
        click_to_call: true,
      },
      brief_profiles: [
        {
          id: "owner",
          name: "Owner (full brief)",
          fields: ["name", "rating", "balance"],
          lock_screen: "name_rating",
          amounts: "exact",
        },
        {
          id: "counter",
          name: "Counter staff",
          fields: ["name", "rating", "overdue_alert"],
          lock_screen: "name_only",
          amounts: "flag_only",
        },
      ],
      fallback_profile: "counter",
      cache_scope: "all",
      overlay: { position: "top", auto_dismiss_seconds: 12, show_for: "incoming" },
      unknown_caller: "show_not_in_geargrid",
      shared_number: "list_all",
    },
  });

  mocks.updatePhoneAssistantPolicy.mockReset().mockImplementation(async (policy) => ({ policy }));
  mocks.updateShopDevice.mockReset().mockImplementation(async (_id, body) => ({
    device: { operator_device_id: 102, ...body },
  }));

  mocks.getRoles.mockReset().mockResolvedValue({
    data: {
      roles: [
        { role_id: 1, role_name: "Admin" },
        { role_id: 2, role_name: "Manager" },
      ],
    },
  });

  mocks.getPushSettings.mockReset().mockResolvedValue({
    settings: {
      events: {
        invoice_created: {
          enabled: true,
          min_amount: 0,
          recipient_role_ids: [],
          hide_customer_name: false,
          delivery: "instant",
        },
        payment_received: {
          enabled: true,
          min_amount: 0,
          recipient_role_ids: [],
          hide_customer_name: false,
          delivery: "instant",
        },
      },
      quiet_hours: { enabled: false, from: "21:00", to: "07:00" },
      include_amounts: true,
      notify_actor: false,
      digest_minutes: 30,
      daily_summary: {
        enabled: false,
        send_time: "20:00",
        recipient_role_ids: [],
        sections: {
          bills: true,
          payments: true,
          returns: true,
          due_tomorrow: true,
          overdue: true,
        },
      },
    },
    catalog: [
      { key: "invoice_created", group: "bills", default_enabled: true, has_amount: true },
      { key: "payment_received", group: "payments", default_enabled: true, has_amount: true },
      { key: "daily_summary", group: "digest", default_enabled: false, has_amount: false },
    ],
  });
  mocks.updatePushSettings.mockReset().mockImplementation(async (s) => ({ settings: s }));
  mocks.sendPushTest.mockReset().mockResolvedValue({ reached: 1 });

  mocks.listMyDevices.mockReset().mockReturnValue({
    data: { devices: [] },
  });

  mocks.getMyPushPreferences.mockReset().mockResolvedValue({
    preferences: [
      {
        event_key: "invoice_created",
        group: "bills",
        eligible: true,
        shop_enabled: true,
        has_amount: true,
        shop_min_amount: 0,
        enabled: true,
        min_amount: null,
      },
    ],
    quiet_hours: { enabled: false, from: "21:00", to: "07:00" },
  });
  mocks.updateMyPushPreferences.mockReset().mockImplementation(async (prefs, opts) => ({
    preferences: prefs,
    quiet_hours: opts?.quiet_hours ?? { enabled: false, from: "21:00", to: "07:00" },
  }));

  mocks.getDevicePushPreferences.mockReset().mockResolvedValue({
    preferences: [
      {
        event_key: "payment_received",
        group: "payments",
        eligible: true,
        shop_enabled: true,
        has_amount: true,
        shop_min_amount: 0,
        enabled: true,
        min_amount: null,
      },
    ],
    quiet_hours: { enabled: false, from: "21:00", to: "07:00" },
    muted: false,
  });
  mocks.updateDevicePushPreferences.mockReset().mockImplementation(async (prefs, opts) => ({
    preferences: prefs,
    quiet_hours: opts?.quiet_hours ?? { enabled: false, from: "21:00", to: "07:00" },
    muted: opts?.muted ?? false,
  }));
});

describe("Slice 2 Frontend (Part C.1 Brief Policy + Part C.2 Extended Push)", () => {
  it("DeviceConsolePage renders brief & overlay policy controls, saves policy, and updates device brief profile + mute", async () => {
    wrap(<DeviceConsolePage />);

    expect(await screen.findByText(/Brief: counter/i)).toBeInTheDocument();

    // Update Offline brief sync scope & auto-dismiss seconds, then save policy
    const cacheScopeSelect = screen.getByLabelText(/offline brief sync scope/i);
    selectMuiOption(cacheScopeSelect, /only with dues or active rentals/i);

    const dismissInput = screen.getByLabelText(/auto-dismiss after/i);
    fireEvent.change(dismissInput, { target: { value: "20" } });

    fireEvent.click(screen.getByRole("button", { name: /save policy/i }));
    await waitFor(() => {
      expect(mocks.updatePhoneAssistantPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          cache_scope: "with_dues_or_active",
          overlay: expect.objectContaining({
            auto_dismiss_seconds: 20,
          }),
        }),
      );
    });

    // Open Edit Phone Access dialog and change brief profile + mute switch
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    const editDialog = await screen.findByRole("dialog");
    const profileSelect = within(editDialog).getByLabelText(/^caller brief profile$/i);
    selectMuiOption(profileSelect, /owner \(full brief\)/i);

    const muteSwitch = within(editDialog).getByRole("switch", {
      name: /mute push notifications on this phone/i,
    });
    fireEvent.click(muteSwitch);

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      expect(mocks.updateShopDevice).toHaveBeenCalledWith(
        102,
        expect.objectContaining({
          brief_profile_id: "owner",
          muted: true,
        }),
      );
    });
  });

  it("PushSettingsPanel configures hide_customer_name, delivery digest mode, digest interval, and daily summary", async () => {
    wrap(<PushSettingsPanel />);

    expect(await screen.findByText("New invoice created")).toBeInTheDocument();

    // Toggle hide customer name on New invoice created
    const hideNameSwitch = screen.getByRole("switch", {
      name: /new invoice created hide customer name/i,
    });
    fireEvent.click(hideNameSwitch);

    // Switch delivery mode to digest on first card
    const deliverySelects = screen.getAllByLabelText(/^delivery$/i);
    selectMuiOption(deliverySelects[0], /batched digest/i);

    // Change digest batch interval to 60 minutes
    const digestIntervalSelect = screen.getByLabelText(/digest batch interval/i);
    selectMuiOption(digestIntervalSelect, /every 60 minutes/i);

    // Enable daily shop summary and toggle Overdue section off
    const dailySwitch = screen.getByRole("switch", { name: /daily shop summary/i });
    fireEvent.click(dailySwitch);

    const overdueCheckbox = screen.getByRole("checkbox", { name: /overdue/i });
    fireEvent.click(overdueCheckbox);

    fireEvent.click(screen.getByRole("button", { name: /save push settings/i }));
    await waitFor(() => {
      expect(mocks.updatePushSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          digest_minutes: 60,
          events: expect.objectContaining({
            invoice_created: expect.objectContaining({
              hide_customer_name: true,
              delivery: "digest",
            }),
          }),
          daily_summary: expect.objectContaining({
            enabled: true,
            sections: expect.objectContaining({
              overdue: false,
            }),
          }),
        }),
      );
    });
  });

  it("MyPushPreferences saves personal quiet hours without disturbing existing preference list", async () => {
    wrap(<MyPushPreferences />);

    expect(await screen.findByText("New invoice created")).toBeInTheDocument();

    const qhSwitch = screen.getByRole("switch", { name: /personal quiet hours/i });
    fireEvent.click(qhSwitch);

    const fromInput = screen.getByLabelText(/^from$/i);
    const toInput = screen.getByLabelText(/^to$/i);
    fireEvent.change(fromInput, { target: { value: "22:00" } });
    fireEvent.change(toInput, { target: { value: "06:30" } });

    fireEvent.click(screen.getByRole("button", { name: /save quiet hours/i }));
    await waitFor(() => {
      expect(mocks.updateMyPushPreferences).toHaveBeenCalledWith(
        [
          {
            event_key: "invoice_created",
            enabled: true,
            min_amount: null,
          },
        ],
        {
          quiet_hours: {
            enabled: true,
            from: "22:00",
            to: "06:30",
          },
        },
      );
    });
  });

  it("DeviceNotificationsPage toggles per-device mute and saves personal quiet hours", async () => {
    window.localStorage.setItem("geargrid.device_id", "dev-vivo-123");
    wrap(<DeviceNotificationsPage />);

    expect(await screen.findByText("Payment received")).toBeInTheDocument();

    const muteSwitch = screen.getByRole("switch", {
      name: /mute notifications on this phone/i,
    });
    fireEvent.click(muteSwitch);

    await waitFor(() => {
      expect(mocks.updateDevicePushPreferences).toHaveBeenCalledWith(
        [
          {
            event_key: "payment_received",
            enabled: true,
            min_amount: null,
          },
        ],
        { muted: true },
      );
    });

    const qhSwitch = screen.getByRole("switch", { name: /personal quiet hours/i });
    fireEvent.click(qhSwitch);
    fireEvent.click(screen.getByRole("button", { name: /save quiet hours/i }));

    await waitFor(() => {
      expect(mocks.updateDevicePushPreferences).toHaveBeenCalledWith(
        [
          {
            event_key: "payment_received",
            enabled: true,
            min_amount: null,
          },
        ],
        {
          quiet_hours: {
            enabled: true,
            from: "21:00",
            to: "07:00",
          },
        },
      );
    });
  });
});
