import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getDevicePolicy: vi.fn(),
  updateDeviceSettings: vi.fn(),
  deleteDeviceContacts: vi.fn(),
  deleteDeviceCalls: vi.fn(),
  unpairCurrentDevice: vi.fn(),
  wipeLocalContacts: vi.fn(),
  updatePrivacySelection: vi.fn(),
  clearCredentials: vi.fn(),
  listShopDevices: vi.fn(),
  setShopDeviceStatus: vi.fn(),
  wipeShopDevice: vi.fn(),
  testShopDevicePush: vi.fn(),
  updateShopDevice: vi.fn(),
  getShopDeviceAudit: vi.fn(),
  getPhoneAssistantPolicy: vi.fn(),
  updatePhoneAssistantPolicy: vi.fn(),
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

vi.mock("../lib/nativeBridge", () => ({
  isNativePhoneApp: () => false,
  callDeviceContract: vi.fn(),
  nativeBridge: {
    wipeLocalContacts: mocks.wipeLocalContacts,
    updatePrivacySelection: mocks.updatePrivacySelection,
    clearCredentials: mocks.clearCredentials,
  },
}));

vi.mock("../api/phoneAssistantApi", () => ({
  getDevicePolicy: mocks.getDevicePolicy,
  updateDeviceSettings: mocks.updateDeviceSettings,
  deleteDeviceContacts: mocks.deleteDeviceContacts,
  deleteDeviceCalls: mocks.deleteDeviceCalls,
  unpairCurrentDevice: mocks.unpairCurrentDevice,
  listShopDevices: mocks.listShopDevices,
  setShopDeviceStatus: mocks.setShopDeviceStatus,
  wipeShopDevice: mocks.wipeShopDevice,
  testShopDevicePush: mocks.testShopDevicePush,
  updateShopDevice: mocks.updateShopDevice,
  getShopDeviceAudit: mocks.getShopDeviceAudit,
  getPhoneAssistantPolicy: mocks.getPhoneAssistantPolicy,
  updatePhoneAssistantPolicy: mocks.updatePhoneAssistantPolicy,
}));

vi.mock("../components/DeviceShell", () => ({ DeviceShell: ({ children }: any) => children }));

import { DevicePrivacyPage } from "../pages/DevicePrivacyPage";
import { DeviceConsolePage } from "../pages/DeviceConsolePage";

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
  return { listbox, option };
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("geargrid.device_id", "gg-test-device-99");
  mocks.navigate.mockReset();
  mocks.wipeLocalContacts.mockReset().mockResolvedValue({ wiped: true });
  mocks.updatePrivacySelection.mockReset().mockResolvedValue(null);
  mocks.clearCredentials.mockReset().mockResolvedValue({ cleared: true });
  mocks.unpairCurrentDevice.mockReset().mockResolvedValue({ unpaired: true });
  mocks.updateDeviceSettings.mockReset().mockResolvedValue({
    muted: false,
    contact_sync_mode: "selected_labels",
    call_logging_scope: "customers_only",
    sim_filter: "SIM 1",
    effective_capabilities: {},
    capability_reasons: {},
  });
  mocks.deleteDeviceContacts.mockReset().mockResolvedValue({ deleted: 48 });
  mocks.deleteDeviceCalls.mockReset().mockResolvedValue({ deleted: 19 });

  mocks.getDevicePolicy.mockReset().mockResolvedValue({
    device_status: "ACTIVE",
    effective_capabilities: {
      caller_brief: true,
      contact_sync: true,
      call_logging: true,
      push: true,
    },
    capability_reasons: {},
    brief_profile: {
      id: "counter",
      name: "Counter safe",
      fields: ["name", "rating", "active_rentals"],
      lock_screen: "name_only",
      amounts: "flag_only",
    },
    cache_scope: "all",
    overlay: { position: "top", auto_dismiss_seconds: 12, show_for: "incoming" },
    unknown_caller: "show_not_in_geargrid",
    shared_number: "list_all",
    offline_wipe_days: 7,
    contact_sync_mode: "selected_labels",
    call_logging_scope: "customers_and_contacts",
    sim_filter: null,
    muted: false,
    contact_sync_policy: {
      allowed_modes: ["off", "selected_labels"],
      fields: ["name_and_number"],
    },
    call_logging_policy: {
      allowed_scopes: ["off", "customers_only", "customers_and_contacts"],
      store_unknown_numbers: false,
      business_hours_only: true,
      business_hours: { from: "08:00", to: "18:00" },
      retention_days: 90,
    },
    contact_count: 48,
    contacts_synced_at: "2026-11-15T09:00:00.000Z",
    calls_logged_this_month: 19,
    paired_at: "2026-10-01T08:00:00.000Z",
    consented_capabilities: {
      caller_brief: true,
      contact_sync: true,
      call_logging: true,
    },
  });

  mocks.listShopDevices.mockReset().mockResolvedValue({
    devices: [],
    counts: { total: 0, pending: 0, active: 0, suspended: 0, revoked: 0 },
  });
  mocks.getPhoneAssistantPolicy.mockReset().mockResolvedValue({
    policy: {
      approval_mode: "admin_approves_all",
      auto_suspend_days: 30,
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
          id: "counter",
          name: "Counter staff",
          fields: ["name", "rating"],
          lock_screen: "name_only",
          amounts: "flag_only",
        },
      ],
      default_profile_by_role: {},
      fallback_profile: "counter",
      cache_scope: "all",
      overlay: { position: "top", auto_dismiss_seconds: 12, show_for: "incoming" },
      unknown_caller: "show_not_in_geargrid",
      shared_number: "list_all",
      desktop_popup: true,
      contact_sync: {
        allowed_modes: ["off", "selected_labels", "selected_accounts", "all"],
        fields: ["name_and_number"],
      },
      call_logging: {
        allowed_scopes: ["off", "customers_only", "customers_and_contacts", "all"],
        store_unknown_numbers: true,
        business_hours_only: false,
        business_hours: { from: "08:00", to: "18:00" },
        retention_days: 180,
      },
    },
  });
  mocks.updatePhoneAssistantPolicy.mockReset().mockResolvedValue({ policy: {} });
});

describe("Slice 3 — DevicePrivacyPage & Shop C.3/C.4 Policy Controls", () => {
  it("renders transparency metrics, disables policy-forbidden options, and saves switches via PUT /device/settings", async () => {
    wrap(<DevicePrivacyPage />);

    expect(await screen.findByText(/48 contacts on server/i)).toBeTruthy();
    expect(screen.getByText(/19 calls logged this month/i)).toBeTruthy();
    expect(screen.getByText(/Counter safe/i)).toBeTruthy();
    expect(screen.getByText(/08:00–18:00/i)).toBeTruthy();

    // Open contact sync mode select and verify "All phone contacts" is disabled by shop policy
    const contactSelect = screen.getByLabelText(/contact sync mode/i);
    fireEvent.mouseDown(contactSelect);
    const contactListbox = screen.getByRole("listbox");
    const forbiddenOption = within(contactListbox).getByRole("option", {
      name: /All phone contacts.*Disabled by shop policy/i,
    });
    expect(forbiddenOption.getAttribute("aria-disabled")).toBe("true");
    // Pick allowed option
    fireEvent.click(
      within(contactListbox).getByRole("option", { name: /^Selected contact labels only$/i }),
    );

    // Choose allowed call logging scope and SIM 1
    selectMuiOption(screen.getByLabelText(/call logging scope/i), /^Existing customers only$/i);
    selectMuiOption(screen.getByLabelText(/which sim logs work calls/i), /^SIM 1$/i);

    fireEvent.click(screen.getByRole("button", { name: /save privacy settings/i }));

    await waitFor(() => {
      expect(mocks.updateDeviceSettings).toHaveBeenCalledWith({
        contact_sync_mode: "selected_labels",
        call_logging_scope: "customers_only",
        sim_filter: "SIM 1",
        muted: false,
      });
    });
  });

  it("deletes synced contacts and sets contact_sync_mode to 'off' after confirmation", async () => {
    wrap(<DevicePrivacyPage />);

    await screen.findByText(/48 contacts on server/i);
    fireEvent.click(screen.getByTestId("delete-device-contacts-btn"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Delete synced contacts\?/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByTestId("privacy-confirm-action-btn"));

    await waitFor(() => {
      expect(mocks.deleteDeviceContacts).toHaveBeenCalledTimes(1);
    });
    expect(mocks.wipeLocalContacts).toHaveBeenCalledTimes(1);
    expect(mocks.updateDeviceSettings).toHaveBeenCalledWith({
      contact_sync_mode: "off",
    });
  });

  it("deletes call history after confirmation", async () => {
    wrap(<DevicePrivacyPage />);

    await screen.findByText(/19 calls logged this month/i);
    fireEvent.click(screen.getByTestId("delete-device-calls-btn"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Delete call history\?/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByTestId("privacy-confirm-action-btn"));

    await waitFor(() => {
      expect(mocks.deleteDeviceCalls).toHaveBeenCalledTimes(1);
    });
  });

  it("renders C.3/C.4 shop policy controls on DeviceConsolePage and saves retention, masking & business hours", async () => {
    wrap(<DeviceConsolePage canManagePolicy />);

    const retentionInput = await screen.findByLabelText(/call history retention/i);
    fireEvent.change(retentionInput, { target: { value: "90" } });

    const storeUnknownSwitch = screen.getByRole("switch", {
      name: /save full numbers for unknown callers/i,
    });
    fireEvent.click(storeUnknownSwitch);

    const businessHoursSwitch = screen.getByRole("switch", {
      name: /log calls during shop business hours only/i,
    });
    fireEvent.click(businessHoursSwitch);

    fireEvent.click(screen.getByRole("button", { name: /save policy/i }));

    await waitFor(() => {
      expect(mocks.updatePhoneAssistantPolicy).toHaveBeenCalledTimes(1);
    });
    const saved = mocks.updatePhoneAssistantPolicy.mock.calls[0][0];
    expect(saved.call_logging).toMatchObject({
      retention_days: 90,
      store_unknown_numbers: false,
      business_hours_only: true,
    });
  });
});
