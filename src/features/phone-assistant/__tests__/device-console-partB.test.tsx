import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  getPairingCodePreview: vi.fn(),
  claimPairingCode: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/lib/socket", () => ({
  connectSocket: vi.fn(),
  getSocket: () => ({ on: vi.fn(), off: vi.fn() }),
}));

vi.mock("@/features/phone-assistant/api/phoneAssistantApi", () => ({
  listShopDevices: mocks.listShopDevices,
  setShopDeviceStatus: mocks.setShopDeviceStatus,
  wipeShopDevice: mocks.wipeShopDevice,
  testShopDevicePush: mocks.testShopDevicePush,
  updateShopDevice: mocks.updateShopDevice,
  getShopDeviceAudit: mocks.getShopDeviceAudit,
  getPhoneAssistantPolicy: mocks.getPhoneAssistantPolicy,
  updatePhoneAssistantPolicy: mocks.updatePhoneAssistantPolicy,
}));

vi.mock("@/features/signatures/api/signatureApi", () => ({
  mintPairingCode: vi.fn(),
  getPairingCodePreview: mocks.getPairingCodePreview,
  claimPairingCode: mocks.claimPairingCode,
  getDeviceStatus: vi.fn().mockResolvedValue({ paired: false, operator: null, tenant: null }),
  getDevicePendingSignatures: vi.fn().mockResolvedValue({ pending: [] }),
  listMyDevices: vi.fn().mockResolvedValue({ devices: [] }),
  unpairDevice: vi.fn(),
}));

vi.mock("@/features/signatures/lib/deviceShell", () => ({
  useDeviceManifest: vi.fn(),
}));

vi.mock("@/features/phone-assistant/lib/nativeBridge", () => ({
  isNativePhoneApp: () => false,
  nativeBridge: { getSetupStatus: vi.fn(), setCredentials: vi.fn() },
  registerDeviceWithServer: vi.fn().mockResolvedValue(null),
}));

import { DeviceConsolePage } from "@/features/phone-assistant/pages/DeviceConsolePage";
import { PairDevicePage } from "@/features/signatures/components/PairDevicePage";

const wrap = (ui: ReactElement) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );

const sampleDevices = [
  {
    operator_device_id: 101,
    user_id: 2,
    staff_name: "Nimal",
    staff_email: "nimal@shop.lk",
    staff_role_name: "Counter",
    staff_is_admin: false,
    device_id: "dev-101",
    device_label: "Pixel 7",
    device_model: "Google Pixel 7",
    os_version: "Android 14",
    app_version: "1.1.0",
    is_native_app: true,
    status: "PENDING",
    paired_at: "2026-11-15T10:00:00.000Z",
    last_seen_at: "2026-11-15T10:05:00.000Z",
    approved_by: null,
    approved_at: null,
    revoked_at: null,
    muted: false,
    brief_profile_id: null,
    contact_sync_enabled: false,
    contact_sync_mode: "off",
    contacts_synced_at: null,
    contact_count: 0,
    call_logging_scope: "customers_and_contacts",
    calls_logged_count: 0,
    sim_filter: null,
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
    effective_capabilities: {
      signatures: false,
      photos: false,
      caller_brief: false,
      bill_view: false,
      push: false,
      contact_sync: false,
      call_logging: false,
      click_to_call: false,
    },
    capability_reasons: {
      signatures: "device_pending",
      caller_brief: "device_pending",
    },
    reported_state: null,
    health_warnings: [],
  },
  {
    operator_device_id: 102,
    user_id: 1,
    staff_name: "Kamal",
    staff_email: "kamal@shop.lk",
    staff_role_name: "Owner",
    staff_is_admin: true,
    device_id: "dev-102",
    device_label: "Galaxy A54",
    device_model: "Samsung SM-A546",
    os_version: "Android 14",
    app_version: "1.1.0",
    is_native_app: true,
    status: "ACTIVE",
    paired_at: "2026-11-14T08:00:00.000Z",
    last_seen_at: "2026-11-15T10:30:00.000Z",
    approved_by: 1,
    approved_at: "2026-11-14T08:00:00.000Z",
    revoked_at: null,
    muted: false,
    brief_profile_id: null,
    contact_sync_enabled: true,
    contact_sync_mode: "all",
    contacts_synced_at: "2026-11-15T10:30:00.000Z",
    contact_count: 42,
    call_logging_scope: "customers_and_contacts",
    calls_logged_count: 7,
    sim_filter: null,
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
    effective_capabilities: {
      signatures: true,
      photos: true,
      caller_brief: true,
      bill_view: true,
      push: true,
      contact_sync: true,
      call_logging: true,
      click_to_call: true,
    },
    capability_reasons: {},
    reported_state: null,
    health_warnings: ["sync_stale"],
  },
];

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);

  mocks.navigate.mockReset();
  mocks.listShopDevices.mockReset().mockResolvedValue({
    devices: sampleDevices,
    counts: { total: 2, pending: 1, active: 1, suspended: 0, revoked: 0 },
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
    },
  });
  mocks.setShopDeviceStatus.mockReset().mockResolvedValue({ device: sampleDevices[0] });
  mocks.wipeShopDevice.mockReset().mockResolvedValue({ wiped: true, pushed: true });
  mocks.updatePhoneAssistantPolicy.mockReset().mockResolvedValue({
    policy: {
      approval_mode: "auto_approve_admin_phones",
      auto_suspend_days: 0,
      offline_wipe_days: 14,
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
    },
  });
  mocks.getPairingCodePreview.mockReset().mockResolvedValue({
    code: "ABC-XYZ",
    shop_name: "Test Hardware",
    staff_name: "Nimal Perera",
    expires_at: "2026-11-15T12:00:00.000Z",
    requested_capabilities: {
      signatures: true,
      photos: true,
      caller_brief: true,
      bill_view: true,
      push: true,
      contact_sync: true,
      call_logging: true,
      click_to_call: true,
    },
    approval_mode: "auto_approve_admin_phones",
    will_require_approval: true,
  });
  mocks.claimPairingCode.mockReset().mockResolvedValue({
    operator_device_id: 101,
    device_id: "gg-new-phone",
    status: "PENDING",
    operator: { user_id: 2, operator_name: "Nimal Perera", has_saved_signature: false },
    tenant: {
      business_display_name: "Test Hardware",
      logo_url: null,
      primary_color: "#f59e0b",
      secondary_color: "#b45309",
    },
    paired_at: "2026-11-15T10:35:00.000Z",
  });
});

describe("DeviceConsolePage & PairDevicePage Part B (Device Trust)", () => {
  it("renders pending approval banner, health warnings, and executes approve / suspend / wipe / policy save", async () => {
    wrap(<DeviceConsolePage />);

    expect(await screen.findByText(/awaiting administrator approval/i)).toBeInTheDocument();
    expect(screen.getByText(/Sync stale/i)).toBeInTheDocument();

    // Approve pending device (in banner or device card)
    const approveButtons = screen.getAllByRole("button", { name: /^approve$/i });
    fireEvent.click(approveButtons[0]);
    await waitFor(() => {
      expect(mocks.setShopDeviceStatus).toHaveBeenCalledWith(101, {
        status: "ACTIVE",
        reason: undefined,
      });
    });

    // Suspend active device
    fireEvent.click(screen.getByRole("button", { name: /^suspend$/i }));
    await waitFor(() => {
      expect(mocks.setShopDeviceStatus).toHaveBeenCalledWith(102, {
        status: "SUSPENDED",
        reason: undefined,
      });
    });

    // Wipe active device cache
    fireEvent.click(screen.getByRole("button", { name: /wipe cache/i }));
    await waitFor(() => {
      expect(mocks.wipeShopDevice).toHaveBeenCalledWith(
        102,
        "Remote cache wipe from admin console",
      );
    });

    // Update policy offline wipe days and save
    const wipeDaysInput = screen.getByLabelText(/offline wipe timeout/i);
    fireEvent.change(wipeDaysInput, { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: /save policy/i }));
    await waitFor(() => {
      expect(mocks.updatePhoneAssistantPolicy).toHaveBeenCalledWith(
        expect.objectContaining({ offline_wipe_days: 14 }),
      );
    });
  });

  it("shows pairing code transparency preview and submits consented capabilities", async () => {
    wrap(<PairDevicePage />);

    const codeInput = await screen.findByLabelText(/pairing code/i);
    fireEvent.change(codeInput, { target: { value: "ABCXYZ" } });

    expect(await screen.findByText(/Test Hardware · Nimal Perera/i)).toBeInTheDocument();
    expect(screen.getByText(/This shop will be able to:/i)).toBeInTheDocument();
    expect(screen.getByText(/This phone will send \(if enabled\):/i)).toBeInTheDocument();
    expect(screen.getByText(/administrator must approve this phone/i)).toBeInTheDocument();

    // Uncheck Contact sync before claiming
    const contactSyncCheckbox = screen.getByLabelText(/contact sync/i);
    fireEvent.click(contactSyncCheckbox);

    fireEvent.click(screen.getByRole("button", { name: /pair this phone/i }));
    await waitFor(() => {
      expect(mocks.claimPairingCode).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "ABC-XYZ",
          consented_capabilities: expect.objectContaining({
            contact_sync: false,
            signatures: true,
          }),
        }),
      );
    });
  });
});
