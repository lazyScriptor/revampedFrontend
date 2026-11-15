import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  listCalls: vi.fn(),
  createStaffCallNote: vi.fn(),
  listMissedCalls: vi.fn(),
  markCallHandled: vi.fn(),
  listFollowUps: vi.fn(),
  updateFollowUp: vi.fn(),
  listDeviceMissedCalls: vi.fn(),
  markDeviceCallHandled: vi.fn(),
  listDeviceFollowUps: vi.fn(),
  updateDeviceFollowUp: vi.fn(),
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
    wipeLocalContacts: vi.fn(),
    updatePrivacySelection: vi.fn(),
    clearCredentials: vi.fn(),
  },
}));

vi.mock("../api/phoneAssistantApi", () => ({
  listCalls: mocks.listCalls,
  createStaffCallNote: mocks.createStaffCallNote,
  listMissedCalls: mocks.listMissedCalls,
  markCallHandled: mocks.markCallHandled,
  listFollowUps: mocks.listFollowUps,
  updateFollowUp: mocks.updateFollowUp,
  listDeviceMissedCalls: mocks.listDeviceMissedCalls,
  markDeviceCallHandled: mocks.markDeviceCallHandled,
  listDeviceFollowUps: mocks.listDeviceFollowUps,
  updateDeviceFollowUp: mocks.updateDeviceFollowUp,
  listShopDevices: mocks.listShopDevices,
  setShopDeviceStatus: mocks.setShopDeviceStatus,
  wipeShopDevice: mocks.wipeShopDevice,
  testShopDevicePush: mocks.testShopDevicePush,
  updateShopDevice: mocks.updateShopDevice,
  getShopDeviceAudit: mocks.getShopDeviceAudit,
  getPhoneAssistantPolicy: mocks.getPhoneAssistantPolicy,
  updatePhoneAssistantPolicy: mocks.updatePhoneAssistantPolicy,
}));

import { CustomerCallsTab } from "@/features/customers/components/CustomerCallsTab";
import { MissedCallsAndFollowUpsPanel } from "../components/MissedCallsAndFollowUpsPanel";
import { DeviceConsolePage } from "../pages/DeviceConsolePage";

const wrap = (ui: ReactElement) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );

beforeEach(() => {
  mocks.navigate.mockReset();
  mocks.listCalls.mockReset().mockResolvedValue({
    calls: [
      {
        call_id: 101,
        operator_device_id: 5,
        client_call_id: "c-101",
        phone_e164: "94771234567",
        raw_number: "0771234567",
        direction: "INCOMING",
        customer_id: 41,
        contact_id: null,
        started_at: "2026-11-15T09:00:00.000Z",
        ended_at: "2026-11-15T09:01:20.000Z",
        duration_seconds: 80,
        device_label: "Counter Phone",
        sim_label: "SIM 1",
        notes: [
          {
            note_id: 901,
            call_id: 101,
            customer_id: 41,
            contact_id: null,
            tags: ["Extension"],
            note: "Asked for 2 more days",
            follow_up_on: "2026-11-18",
            follow_up_done_at: null,
            created_by_user_id: 1,
            author_name: "Nimal Silva",
            created_at: "2026-11-15T09:02:00.000Z",
          },
        ],
      },
    ],
    total: 1,
    page: 1,
    limit: 50,
  });
  mocks.createStaffCallNote.mockReset().mockResolvedValue({
    note: {
      note_id: 902,
      call_id: 101,
      customer_id: 41,
      contact_id: null,
      tags: ["Booking", "Payment promise"],
      note: "Will settle Friday",
      follow_up_on: "2026-11-20",
      follow_up_done_at: null,
      created_by_user_id: 1,
      author_name: "Nimal Silva",
      created_at: "2026-11-15T10:00:00.000Z",
    },
  });
  mocks.listMissedCalls.mockReset().mockResolvedValue({
    items: [
      {
        call_id: 201,
        operator_device_id: 5,
        client_call_id: "m-201",
        phone_e164: "94779998888",
        raw_number: "0779998888",
        direction: "MISSED",
        customer_id: 42,
        contact_id: null,
        started_at: "2026-11-15T08:30:00.000Z",
        ended_at: "2026-11-15T08:30:20.000Z",
        duration_seconds: 0,
        customer_name: "Sunil builders",
        contact_name: null,
        brief: {
          customer_id: 42,
          display_name: "Sunil builders",
          phones: ["94779998888"],
          status: "Active",
          summary_line: "2 items out · Rs. 15,000 due",
          updated_at: "2026-11-15T08:30:00.000Z",
        },
      },
    ],
  });
  mocks.markCallHandled.mockReset().mockResolvedValue({
    call_id: 201,
    callback_handled_at: "2026-11-15T11:00:00.000Z",
  });
  mocks.listFollowUps.mockReset().mockResolvedValue({
    items: [
      {
        note_id: 301,
        call_id: 101,
        customer_id: 41,
        contact_id: null,
        tags: ["Payment promise"],
        note: "Call before 4pm",
        follow_up_on: "2026-11-15",
        follow_up_done_at: null,
        created_by_user_id: 1,
        author_name: "Nimal Silva",
        created_at: "2026-11-15T08:00:00.000Z",
        customer_name: "Kamal Perera",
        contact_name: null,
        phone_e164: "94771234567",
        raw_number: "0771234567",
      },
    ],
  });
  mocks.updateFollowUp.mockReset().mockResolvedValue({
    follow_up: {
      note_id: 301,
      call_id: 101,
      customer_id: 41,
      contact_id: null,
      tags: ["Payment promise"],
      note: "Call before 4pm",
      follow_up_on: "2026-11-16",
      follow_up_done_at: null,
      created_by_user_id: 1,
      author_name: "Nimal Silva",
      created_at: "2026-11-15T08:00:00.000Z",
      customer_name: "Kamal Perera",
      contact_name: null,
      phone_e164: "94771234567",
      raw_number: "0771234567",
    },
  });
  mocks.listShopDevices.mockReset().mockResolvedValue({
    devices: [],
    counts: { total: 0, pending: 0, active: 0, suspended: 0, revoked: 0 },
  });
  mocks.getPhoneAssistantPolicy.mockReset().mockResolvedValue({
    policy: {
      approval_mode: "auto_approve_admin_phones",
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
      after_call_card: {
        enabled: true,
        tags: ["Booking", "Payment promise", "Extension"],
        auto_dismiss_seconds: 25,
      },
    },
  });
  mocks.updatePhoneAssistantPolicy.mockReset().mockResolvedValue({
    policy: {
      approval_mode: "auto_approve_admin_phones",
      auto_suspend_days: 30,
      offline_wipe_days: 7,
      capabilities: {},
      after_call_card: {
        enabled: false,
        tags: ["Booking", "VIP"],
        auto_dismiss_seconds: 15,
      },
    },
  });
});

describe("Part D1, D2, D3, D6 frontend flows", () => {
  it("1. CustomerCallsTab renders call history with existing notes and submits a new call note", async () => {
    wrap(<CustomerCallsTab customerId={41} />);

    await screen.findByText(/0771234567/);
    expect(screen.getByText(/Asked for 2 more days/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add note/i }));
    fireEvent.click(screen.getByText("Booking"));
    fireEvent.click(screen.getByText("Payment promise"));

    const noteField = screen.getByLabelText(/call note/i);
    fireEvent.change(noteField, { target: { value: "Will settle Friday" } });

    const followDateField = screen.getByLabelText(/follow-up date/i);
    fireEvent.change(followDateField, { target: { value: "2026-11-20" } });

    fireEvent.click(screen.getByRole("button", { name: /save note/i }));

    await waitFor(() => {
      expect(mocks.createStaffCallNote).toHaveBeenCalledWith(101, {
        tags: ["Booking", "Payment promise"],
        note: "Will settle Friday",
        follow_up_on: "2026-11-20",
      });
    });
  });

  it("2. MissedCallsAndFollowUpsPanel handles missed calls and completes or snoozes follow-ups", async () => {
    wrap(<MissedCallsAndFollowUpsPanel mode="staff" />);

    await screen.findByText("Sunil builders");
    expect(screen.getByText(/2 items out · Rs\. 15,000 due/)).toBeInTheDocument();
    expect(screen.getByText("Kamal Perera")).toBeInTheDocument();
    expect(screen.getByText("Call before 4pm")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mark handled/i }));
    await waitFor(() => {
      expect(mocks.markCallHandled).toHaveBeenCalledWith(201);
    });

    fireEvent.click(screen.getByRole("button", { name: /\+1d snooze/i }));
    await waitFor(() => {
      expect(mocks.updateFollowUp).toHaveBeenCalledWith(301, {
        snooze_to: "2026-11-16",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /mark done/i }));
    await waitFor(() => {
      expect(mocks.updateFollowUp).toHaveBeenCalledWith(301, {
        done: true,
      });
    });
  });

  it("3. DeviceConsolePage saves D1 after_call_card policy configuration", async () => {
    wrap(<DeviceConsolePage />);

    const afterCallSwitch = await screen.findByRole("switch", {
      name: /show after-call card when call ends/i,
    });
    expect(afterCallSwitch).toBeChecked();

    fireEvent.click(afterCallSwitch);
    expect(afterCallSwitch).not.toBeChecked();

    const tagsField = screen.getByLabelText(/quick tags/i);
    fireEvent.change(tagsField, { target: { value: "Booking, VIP" } });

    const dismissField = screen.getByLabelText(/after-call card auto-dismiss/i);
    fireEvent.change(dismissField, { target: { value: "15" } });

    fireEvent.click(screen.getByRole("button", { name: /save policy/i }));

    await waitFor(() => {
      expect(mocks.updatePhoneAssistantPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          after_call_card: {
            enabled: false,
            tags: ["Booking", "VIP"],
            auto_dismiss_seconds: 15,
          },
        }),
      );
    });
  });
});
