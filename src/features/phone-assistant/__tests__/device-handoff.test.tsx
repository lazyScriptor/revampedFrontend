import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isNative: true,
  claimMutateAsync: vi.fn(),
  registerWithServer: vi.fn().mockResolvedValue({ is_admin: false, contact_sync_enabled: false, features: { phone_assistant: true } }),
  setupStatus: {
    isNative: true,
    hasCredentials: true,
    callScreeningRole: false,
    overlayPermission: true,
    notificationsPermission: true,
    contactsPermission: false,
    callLogPermission: true,
    batteryOptimizationExempt: false,
    contactSyncEnabled: false,
    contactsConsented: false,
    contactsSyncedAt: null,
    briefsSyncedAt: "2026-11-15T10:00:00Z",
    manufacturer: "Vivo",
  },
  bridge: {
    setCredentials: vi.fn().mockResolvedValue({ saved: true }),
    clearCredentials: vi.fn().mockResolvedValue({ cleared: true }),
    getSetupStatus: vi.fn(),
    requestCallScreeningRole: vi.fn(),
    requestOverlayPermission: vi.fn(),
    requestNotificationsPermission: vi.fn(),
    requestContactsPermission: vi.fn(),
    requestCallLogPermission: vi.fn(),
    requestBatteryExemption: vi.fn(),
    openVendorAutostart: vi.fn().mockResolvedValue({ opened: false }),
    syncNow: vi.fn(),
    setContactSyncEnabled: vi.fn(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/features/signatures/lib/deviceShell", () => ({
  useDeviceManifest: vi.fn(),
  useScreenWakeLock: vi.fn(),
  isStandalone: () => false,
  isRequestFinished: () => false,
}));

vi.mock("@/features/equipment/hooks/useEquipmentPhoto", () => ({
  useDevicePendingPhotos: () => ({ data: { pending: [] } }),
}));

vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useDeviceStatus: () => ({
    isLoading: false,
    isSuccess: true,
    isError: false,
    data: {
      paired: false,
    },
  }),
  useClaimPairingCode: () => ({
    mutateAsync: mocks.claimMutateAsync,
    isPending: false,
  }),
  usePairingCodePreview: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useDevicePendingSignatures: () => ({
    data: { pending: [] },
    isError: false,
  }),
}));

vi.mock("@/features/phone-assistant/lib/nativeBridge", () => ({
  isNativePhoneApp: () => mocks.isNative,
  nativeBridge: mocks.bridge,
  registerDeviceWithServer: mocks.registerWithServer,
}));

import { PairDevicePage } from "@/features/signatures/components/PairDevicePage";
import { NativeSetupChecklist } from "@/features/phone-assistant/components/NativeSetupChecklist";
import {
  clearDeviceId,
  getDeviceId,
  getDeviceTenantDb,
  getDeviceToken,
} from "@/features/signatures/lib/deviceId";

const wrap = (ui: ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
    </QueryClientProvider>,
  );

beforeEach(() => {
  window.localStorage.clear();
  mocks.navigate.mockReset();
  mocks.isNative = true;
  mocks.claimMutateAsync.mockReset().mockResolvedValue({
    operator_device_id: 12,
    device_id: "gg-test-device",
    device_token: "tok-secret-hex",
    tenant_db_name: "geargrid_shop1",
    operator: { user_id: 1, operator_name: "Kamal", has_saved_signature: false },
    tenant: { business_display_name: "Shop 1", logo_url: null, primary_color: "#f59e0b", secondary_color: "#b45309" },
    paired_at: "2026-11-15T10:00:00Z",
  });
  mocks.registerWithServer.mockClear();
  mocks.bridge.setCredentials.mockClear();
  mocks.bridge.getSetupStatus.mockReset().mockResolvedValue({ ...mocks.setupStatus });
  mocks.bridge.requestCallScreeningRole.mockReset().mockResolvedValue({
    ...mocks.setupStatus,
    callScreeningRole: true,
  });
  mocks.bridge.setContactSyncEnabled.mockReset().mockResolvedValue({
    ...mocks.setupStatus,
    contactSyncEnabled: true,
    contactsConsented: true,
  });
});

describe("Native phone pairing handoff & setup checklist (A8)", () => {
  it("persists device_token and tenant_db_name on pairing and hands credentials to native plugin", async () => {
    wrap(<PairDevicePage />);

    const codeInput = screen.getByLabelText(/pairing code/i);
    fireEvent.change(codeInput, { target: { value: "ABCXYZ" } });

    const submit = screen.getByRole("button", { name: /pair this phone/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mocks.claimMutateAsync).toHaveBeenCalled();
    });

    expect(getDeviceToken()).toBe("tok-secret-hex");
    expect(getDeviceTenantDb()).toBe("geargrid_shop1");
    expect(mocks.bridge.setCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: getDeviceId(),
        deviceToken: "tok-secret-hex",
        tenantDb: "geargrid_shop1",
      }),
    );

    clearDeviceId();
    expect(getDeviceToken()).toBeNull();
    expect(getDeviceTenantDb()).toBeNull();
  });

  it("requires privacy consent before enabling contact sync and hides contacts permission row while sync is off", async () => {
    wrap(<NativeSetupChecklist />);

    expect(await screen.findByText("Phone assistant setup")).toBeInTheDocument();
    expect(screen.queryByText("Read contacts permission")).not.toBeInTheDocument();
    expect(screen.getByText(/Vivo Funtouch\/OriginOS/i)).toBeInTheDocument();

    const toggle = screen.getByRole("switch", {
      name: /share phone contacts for pos fallback/i,
    });
    expect(toggle).not.toBeChecked();

    // Toggling on opens privacy consent dialog instead of enabling immediately
    fireEvent.click(toggle);
    expect(await screen.findByText("Enable contact sync?")).toBeInTheDocument();
    expect(mocks.bridge.setContactSyncEnabled).not.toHaveBeenCalled();

    // Cancelling keeps it off
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText("Enable contact sync?")).not.toBeInTheDocument();
    });
    expect(mocks.bridge.setContactSyncEnabled).not.toHaveBeenCalled();

    // Accepting consent enables sync + shows Contacts permission row
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole("button", { name: /agree & enable sync/i }));

    await waitFor(() => {
      expect(mocks.bridge.setContactSyncEnabled).toHaveBeenCalledWith(true, true);
    });
    expect(mocks.registerWithServer).toHaveBeenCalledWith({
      app_version: "1.0.0",
      contact_sync_enabled: true,
    });
    expect(await screen.findByText("Read contacts permission")).toBeInTheDocument();
  });

  it("triggers Fix actions and shows vendor fallback instructions when OEM settings intent cannot open", async () => {
    wrap(<NativeSetupChecklist />);
    expect(await screen.findByText("Phone assistant setup")).toBeInTheDocument();

    const fixButtons = screen.getAllByRole("button", { name: "Fix" });
    // First Fix button corresponds to Caller ID role
    fireEvent.click(fixButtons[0]);
    await waitFor(() => {
      expect(mocks.bridge.requestCallScreeningRole).toHaveBeenCalled();
    });

    // Last Fix button corresponds to vendor autostart guidance
    fireEvent.click(fixButtons[fixButtons.length - 1]);
    expect(
      await screen.findByText(/open phone settings → apps → geargrid phone/i),
    ).toBeInTheDocument();
  });
});
