import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RecordingSetupStep } from "@/features/phone-assistant/components/RecordingSetupStep";
import { listShopDevices } from "@/features/phone-assistant/api/phoneAssistantApi";
import type { PhoneAssistantSetupStatus } from "@/features/phone-assistant/lib/nativeBridge";

const mocks = vi.hoisted(() => ({
  user: null as null | { roles: string[] },
  request: vi.fn(),
}));

vi.mock("@/stores/useAuthStore", () => ({
  useAuthStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({ user: mocks.user }),
    { getState: () => ({ user: mocks.user, token: null }) },
  ),
}));

vi.mock("@/lib/api", () => ({ default: { request: mocks.request }, api: { request: mocks.request } }));

const status = (extra: Partial<PhoneAssistantSetupStatus> = {}) =>
  ({
    manufacturer: "samsung",
    callRecordingEnabled: true,
    callRecordingSetupAllowed: true,
    audioPermission: false,
    ...extra,
  }) as PhoneAssistantSetupStatus;

const show = (s: PhoneAssistantSetupStatus, onGrant = vi.fn()) =>
  render(<RecordingSetupStep status={s} busy={false} onGrant={onGrant} />);

beforeEach(() => {
  mocks.user = null;
  mocks.request.mockReset();
});

describe("call recording setup step (M3)", () => {
  it("shows an administrator the Samsung guide and asks for the audio permission", () => {
    const onGrant = vi.fn();
    show(status(), onGrant);
    expect(screen.getByText(/Samsung: Phone app/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fix" }));
    expect(onGrant).toHaveBeenCalled();
  });

  it("shows the Vivo guide, and Ready once the permission is allowed", () => {
    show(status({ manufacturer: "vivo", audioPermission: true }));
    expect(screen.getByText(/Vivo: Phone app/)).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows nothing when the shop's recording setting is off", () => {
    mocks.user = { roles: ["Admin"] };
    const { container } = show(status({ callRecordingEnabled: false }));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing on a cashier's phone", () => {
    const { container } = show(status({ callRecordingSetupAllowed: false }));
    expect(container).toBeEmptyDOMElement();
  });

  it("hides it from a cashier signed in on an administrator's phone", () => {
    mocks.user = { roles: ["Cashier"] };
    const { container } = show(status());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows it to an administrator signed in on a cashier's phone", () => {
    mocks.user = { roles: ["Admin"] };
    show(status({ callRecordingSetupAllowed: false }));
    expect(screen.getByTestId("recording-setup-step")).toBeInTheDocument();
  });
});

describe("paired-phone list (M3)", () => {
  it("keeps the recording dates the console warning needs", async () => {
    const device = {
      operator_device_id: 1,
      user_id: 1,
      staff_name: "Kasun",
      staff_email: null,
      staff_role_name: null,
      staff_is_admin: false,
      device_id: "gg-1",
      device_label: null,
      device_model: null,
      os_version: null,
      app_version: null,
      is_native_app: true,
      status: "ACTIVE",
      paired_at: "2026-11-01T00:00:00.000Z",
      last_seen_at: null,
      approved_by: null,
      approved_at: null,
      revoked_at: null,
      muted: false,
      brief_profile_id: null,
      contact_sync_enabled: false,
      contact_sync_mode: "off",
      contacts_synced_at: null,
      contact_count: 0,
      call_logging_scope: "all",
      calls_logged_count: 0,
      sim_filter: null,
      capabilities: {},
      effective_capabilities: {},
      capability_reasons: {},
      reported_state: null,
      health_warnings: [],
      last_recording_received_at: "2026-11-20T00:00:00.000Z",
      recording_missing_since: "2026-11-20T00:00:00.000Z",
    };
    mocks.request.mockResolvedValue({
      status: "success",
      data: { devices: [device], counts: { total: 1, pending: 0, active: 1, suspended: 0, revoked: 0 } },
    });
    const result = await listShopDevices();
    expect(result.devices[0]).toMatchObject({
      recording_missing_since: "2026-11-20T00:00:00.000Z",
      last_recording_received_at: "2026-11-20T00:00:00.000Z",
    });
  });
});
