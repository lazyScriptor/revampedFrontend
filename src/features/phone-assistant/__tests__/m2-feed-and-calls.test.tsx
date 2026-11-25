import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { DeviceAlertsPage } from "../pages/device/DeviceAlertsPage";
import { DeviceCallCardPage } from "../pages/device/DeviceCallCardPage";
import { CallsToNoteList } from "../components/CallsToNoteList";
import { buildActivityQueryParams, fetchActivityComments, fetchActivitySummary } from "@/features/activity/api/activityApi";
import { DEFAULT_ACTIVITY_FILTERS } from "@/features/activity/constants";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  syncBadge: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ pathname: "/device/alerts", search: {} }),
  useSearch: () => ({}),
}));

vi.mock("../lib/nativeBridge", () => ({
  isNativePhoneApp: () => false,
  deviceApi: {
    get: (...a: unknown[]) => mocks.get(...a),
    post: (...a: unknown[]) => mocks.post(...a),
    delete: (...a: unknown[]) => mocks.del(...a),
  },
  nativeBridge: {
    getAlerts: vi.fn().mockResolvedValue([]),
    getAppPrefs: vi.fn().mockResolvedValue(null),
    getSyncStatus: vi.fn().mockResolvedValue(null),
    setStatusBarTheme: vi.fn(),
    getSetupStatus: vi.fn().mockResolvedValue(null),
    syncBadge: mocks.syncBadge,
  },
}));

vi.mock("@/features/signatures/lib/deviceId", () => ({
  getDeviceId: () => "dev-1",
  getDeviceToken: () => "token",
  getDeviceTenantDb: () => "shop",
}));
vi.mock("@/features/signatures/lib/deviceShell", () => ({
  isRequestFinished: () => false,
  useDeviceManifest: () => undefined,
  useScreenWakeLock: () => undefined,
}));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useDeviceStatus: () => ({ data: { paired: true, device_status: "ACTIVE" } }),
  useDevicePendingSignatures: () => ({ data: { pending: [] } }),
}));
vi.mock("@/features/equipment/hooks/useEquipmentPhoto", () => ({
  useDevicePendingPhotos: () => ({ data: { pending: [] } }),
}));
vi.mock("../lib/useSetupWarnings", () => ({ useSetupWarningCount: () => 0 }));
vi.mock("recharts", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 360, height: 200 }}>{children}</div>
    ),
  };
});

const EVENT = {
  event_id: 41,
  type: "payment",
  risk: "high",
  invoice_id: 345,
  customer_id: 11,
  customer_name: "Saman Perera",
  actor_user_id: 2,
  actor_name: "Nimal",
  amount: 5000,
  sentence: { en: "Payment Rs 5,000 · INV-345", si: "ගෙවීම Rs 5,000" },
  data: {},
  occurred_at: "2026-11-25T05:00:00Z",
  after_hours: false,
  checked_by: null,
  checked_by_name: null,
  checked_at: null,
  comment_count: 0,
  is_read: true,
  created_at: "2026-11-25T05:00:00Z",
};

// Exactly what the server's summary sends.
const SUMMARY = {
  granularity: "day",
  see_amounts: true,
  totals: { count: 6, amount: 24500, high_count: 2, not_checked: 3 },
  by_type: { payment: { count: 4, amount: 20000, high_count: 1 }, discount: { count: 2, amount: 4500, high_count: 1 } },
  buckets: [{ bucket: "2026-11-25", types: { payment: { count: 4, amount: 20000 } }, total_count: 4 }],
  not_checked: 3,
  high_not_checked: 1,
  by_staff: null,
  can_check: true,
};

const CARD = {
  call: {
    call_id: 7,
    client_call_id: "c-7",
    customer_id: 11,
    customer_name: "Saman Perera",
    direction: "OUTGOING",
    raw_number: "0771234567",
    started_at: "2026-11-25T05:00:00Z",
    duration_seconds: 80,
    suggested_outcome: "answered",
  },
  bills: [
    { invoice_id: 101, units_out: 0, owed: 5000, selected: true },
    { invoice_id: 102, units_out: 3, owed: 0, selected: true },
  ],
  call_results: [
    { key: "will_pay_on_date", label_en: "Will pay on a date", label_si: "දිනයක ගෙවනවා", requires_promise: true, requires_date: true },
    { key: "will_return_machines", label_en: "Will bring machines back", label_si: "x", requires_date: true },
    { key: "other", label_en: "Other", label_si: "වෙනත්", requires_note: true },
  ],
  answered_threshold_seconds: 5,
  see_amounts: true,
  note: null,
};

const answer = (url: string, config?: { params?: Record<string, unknown> }) => {
  if (url === "/device/activity/summary") return { status: "success", data: SUMMARY };
  if (url === "/device/activity") {
    const unread = config?.params?.unread === "true";
    return { status: "success", data: { events: [EVENT], total: unread ? 9 : 1, page: 1, limit: 50, see_amounts: true } };
  }
  if (url.endsWith("/comments")) {
    return { status: "success", data: { comments: [{ comment_id: 1, event_id: 41, user_id: 2, author_name: "Kasun Silva", body: "Asked him", created_at: "2026-11-25T05:00:00Z" }] } };
  }
  if (url === "/device/calls/c-7/card") return { status: "success", data: CARD };
  if (url === "/device/calls/to-note") {
    return { status: "success", data: { items: [{ ...CARD.call, open_bills: 2 }], total: 1 } };
  }
  throw new Error(`unexpected ${url}`);
};

const wrap = (ui: React.ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createTheme()}>
        <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const listParams = () =>
  mocks.get.mock.calls
    .filter(([url, c]) => url === "/device/activity" && (c as any)?.params?.limit === 50)
    .map(([, c]) => (c as any).params);

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mocks.navigate.mockReset();
  mocks.get.mockReset().mockImplementation(async (url: string, config?: any) => answer(url, config));
  mocks.post.mockReset().mockResolvedValue({ status: "success", data: {} });
  mocks.syncBadge.mockReset();
});
afterEach(cleanup);

describe("activity API shapes the server really sends", () => {
  it("turns the server's buckets and summary into what the charts read", async () => {
    const summary = await fetchActivitySummary(DEFAULT_ACTIVITY_FILTERS, "device");
    expect(summary.buckets[0]).toMatchObject({ date: "2026-11-25", label: "25/11", counts: { payment: 4 }, total: 4 });
    expect(summary.totals).toEqual({ count: 6, amount: 24500, high_count: 2, not_checked_count: 3 });
    expect(summary.high_not_checked_count).toBe(1);
    expect(summary.can_check).toBe(true);
  });

  it("names the comment's author", async () => {
    const [comment] = await fetchActivityComments(41, "device");
    expect(comment.user_name).toBe("Kasun Silva");
  });

  it("leaves the preset out when one day is tapped, because the server prefers it", () => {
    const params = buildActivityQueryParams({ preset: "this_month", from: "2026-11-20", to: "2026-11-20" });
    expect(params).toEqual({ from: "2026-11-20", to: "2026-11-20" });
  });
});

describe("Alerts screen", () => {
  it("shows tiles with counts and money, the totals strip and the not-checked chip", async () => {
    wrap(<DeviceAlertsPage />);
    const tile = await screen.findByTestId("device-type-tile-payment");
    expect(tile).toHaveTextContent("4");
    expect(tile).toHaveTextContent("20,000");
    await waitFor(() => expect(screen.getByTestId("device-alerts-totals-strip")).toHaveTextContent("24,500"));
    expect(screen.getByTestId("device-not-checked-highlight")).toHaveTextContent("3");
  });

  it("filters the list by a tapped tile and keeps the other tiles", async () => {
    wrap(<DeviceAlertsPage />);
    fireEvent.click(await screen.findByTestId("device-type-tile-discount"));
    await waitFor(() => expect(listParams().some((p) => p.types === "discount")).toBe(true));
    expect(screen.getByTestId("device-type-tile-payment")).toBeInTheDocument();
  });

  it("ticks Checked with the phone's own endpoint", async () => {
    wrap(<DeviceAlertsPage />);
    const row = await screen.findByTestId("activity-row-41");
    fireEvent.click(await within(row).findByRole("button", { name: i18n.t("activity.markChecked") }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/device/activity/41/check"));
  });

  it("opens the bill from a row", async () => {
    wrap(<DeviceAlertsPage />);
    fireEvent.click(await screen.findByText("Payment Rs 5,000 · INV-345"));
    expect(mocks.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/device/invoice/$id", params: { id: "345" } }),
    );
  });

  it("copies the feed's unread count to the badge", async () => {
    wrap(<DeviceAlertsPage />);
    await waitFor(() => expect(mocks.syncBadge).toHaveBeenCalledWith(9));
  });

  it("links to the calls that still need a note", async () => {
    wrap(<DeviceAlertsPage />);
    fireEvent.click(await screen.findByTestId("device-calls-to-note-chip"));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/device/calls" });
  });

  it("falls back to the phone's saved alerts when the feed is refused", async () => {
    mocks.get.mockRejectedValue(new Error("403"));
    wrap(<DeviceAlertsPage />);
    expect(await screen.findByText(i18n.t("phoneShell.alerts.feedUnavailable"))).toBeInTheDocument();
  });
});

describe("call card", () => {
  const open = async () => {
    wrap(<DeviceCallCardPage clientCallId="c-7" />);
    await screen.findByText("Saman Perera");
  };
  const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
  const sentNote = () => mocks.post.mock.calls.find(([url]) => url === "/device/calls/c-7/note")?.[1];

  it("pre-chooses the outcome from the server and ticks the open bills", async () => {
    await open();
    expect(screen.getByTestId("call-summary")).toHaveTextContent("1 min 20 s");
    expect(screen.getByRole("button", { name: "Answered" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /INV-101/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /INV-102.*3 machines out/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("requires the promise before saving, then sends it with only the ticked bills", async () => {
    await open();
    press("Will pay on a date");
    press("Save");
    expect(await screen.findByText(i18n.t("collections.callCard.promiseRequired"))).toBeInTheDocument();
    expect(sentNote()).toBeUndefined();

    fireEvent.change(screen.getByLabelText(i18n.t("collections.callCard.promiseAmount")), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText(i18n.t("collections.callCard.promiseDate")), { target: { value: "2027-01-15" } });
    press(/INV-102/);
    press("Save");
    await waitFor(() =>
      expect(sentNote()).toEqual({
        outcome: "answered",
        result: "will_pay_on_date",
        note: null,
        promise_amount: 5000,
        promise_date: "2027-01-15",
        follow_up_on: null,
        invoice_ids: [101],
      }),
    );
    expect(await screen.findByText(i18n.t("phoneShell.callCard.saved"))).toBeInTheDocument();
  });

  it("drops the result when the call was not answered", async () => {
    await open();
    press("Other");
    press("No answer");
    press("Save");
    await waitFor(() => expect(sentNote()).toMatchObject({ outcome: "no_answer", result: null, promise_amount: null }));
  });

  it("keeps the return date as the reminder", async () => {
    await open();
    press("Will bring machines back");
    fireEvent.change(screen.getByLabelText(i18n.t("collections.callCard.expectedReturnDate")), { target: { value: "2027-02-01" } });
    press("Save");
    await waitFor(() => expect(sentNote()).toMatchObject({ result: "will_return_machines", follow_up_on: "2027-02-01" }));
  });

  it("says when saving failed", async () => {
    mocks.post.mockRejectedValue(new Error("offline"));
    await open();
    press("Save");
    expect(await screen.findByText(i18n.t("collections.callCard.saveFailed"))).toBeInTheDocument();
  });
});

describe("calls to note", () => {
  it("lists the call and opens its card", async () => {
    wrap(<CallsToNoteList />);
    const row = await screen.findByRole("button", { name: /Saman Perera/ });
    expect(row).toHaveTextContent("2 open bills");
    fireEvent.click(row);
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/device/call/$callId", params: { callId: "c-7" } });
  });
});
