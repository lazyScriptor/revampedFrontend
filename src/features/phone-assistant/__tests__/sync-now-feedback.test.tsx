import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { PhoneAssistantSetupStatus } from "@/features/phone-assistant/lib/nativeBridge";

const baseStatus: PhoneAssistantSetupStatus = {
  isNative: true,
  hasCredentials: true,
  callScreeningRole: true,
  overlayPermission: true,
  notificationsPermission: true,
  contactsPermission: true,
  callLogPermission: true,
  batteryOptimizationExempt: true,
  contactSyncEnabled: true,
  contactsConsented: true,
  contactsSyncedAt: "2026-11-15T09:00:00Z",
  contactsSyncError: null,
  briefsSyncedAt: null,
  manufacturer: "Google",
};

const mocks = vi.hoisted(() => ({
  bridge: {
    getSetupStatus: vi.fn(),
    syncNow: vi.fn(),
  },
}));

vi.mock("@/features/phone-assistant/lib/nativeBridge", () => ({
  isNativePhoneApp: () => true,
  nativeBridge: mocks.bridge,
  registerDeviceWithServer: vi.fn().mockResolvedValue({}),
}));

import { NativeSetupChecklist } from "@/features/phone-assistant/components/NativeSetupChecklist";

const renderAndClickSync = async () => {
  render(<NativeSetupChecklist />);
  const button = await screen.findByRole("button", { name: /sync now/i });
  await act(async () => {
    fireEvent.click(button);
  });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mocks.bridge.getSetupStatus.mockReset().mockResolvedValue(baseStatus);
  mocks.bridge.syncNow.mockReset().mockResolvedValue(baseStatus);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Sync now feedback", () => {
  it("shows Syncing while it waits, then Contacts synced when the sync time changes", async () => {
    mocks.bridge.getSetupStatus
      .mockResolvedValueOnce(baseStatus)
      .mockResolvedValue({ ...baseStatus, contactsSyncedAt: "2026-11-15T09:05:00Z" });

    await renderAndClickSync();
    expect(screen.getByRole("button", { name: /syncing/i })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(screen.getByText("Contacts synced.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync now/i })).toBeEnabled();
  });

  it("explains a sync error reported by the app", async () => {
    const failed = { ...baseStatus, contactsSyncError: "forbidden" };
    mocks.bridge.syncNow.mockResolvedValue(failed);
    mocks.bridge.getSetupStatus.mockResolvedValueOnce(baseStatus).mockResolvedValue(failed);

    await renderAndClickSync();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(screen.getByText("Phone Assistant isn't switched on for this shop.")).toBeInTheDocument();
  });

  it("says it is still syncing when nothing changes within the wait", async () => {
    await renderAndClickSync();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40000);
    });
    expect(screen.getByText(/still syncing in the background/i)).toBeInTheDocument();
  });
});
