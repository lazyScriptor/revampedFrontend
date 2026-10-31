import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { LockerStatus } from "../api/locker.api";

const closingMutate = vi.fn();
const openingMutate = vi.fn();
const startMutate = vi.fn();
let statusState: any = { data: undefined };
let previewState: any = { data: undefined, isLoading: false };
const idle = { isPending: false, isError: false, error: null, reset: vi.fn() };

vi.mock("../hooks/useLocker", () => ({
  useLockerStatus: () => statusState,
  useRecordClosing: () => ({ ...idle, mutate: closingMutate }),
  useRecordOpening: () => ({ ...idle, mutate: openingMutate }),
  useStartLocker: () => ({ ...idle, mutate: startMutate }),
  useStartPreview: () => previewState,
  useSetFloat: () => ({ ...idle, mutate: vi.fn() }),
}));
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));

let authUser: any = null;
let manage = false;
vi.mock("@/stores/useAuthStore", () => ({
  useAuthStore: (sel: any) => sel({ user: authUser, hasPermission: (c: string) => (c === "locker:manage" ? manage : true) }),
}));

import { CloseDayDialog } from "../components/CloseDayDialog";
import { LockerOpeningPrompt } from "../components/LockerOpeningPrompt";
import { StartLockerPanel } from "../components/StartLockerPanel";
import { isSnoozed, writeSnooze, SNOOZE_MS } from "../lib/locker";

const status = (over: Partial<LockerStatus> = {}): LockerStatus => ({
  business_date: "2026-11-02",
  timezone: "Asia/Colombo",
  float: 1500,
  started: true,
  opening: null,
  todays_counts: [],
  needs_opening: false,
  last_count: null,
  since: "2026-11-02T03:00:00Z",
  movements: [],
  drawer_change: 0,
  expected_now: 12300,
  held: [
    { invoice_id: 103, customer_name: "Kamal", issued_date: "2026-11-01", status: "PendingPayment", advance: 2000, refunded: 0, held: 2000, all_back: true },
    { invoice_id: 106, customer_name: "Perera", issued_date: "2026-11-02", status: "Active", advance: 6000, refunded: 0, held: 6000, all_back: false },
  ],
  held_total: 8000,
  keep: 9500,
  send_home: 2800,
  owner_whatsapp: "94777593701",
  ...over,
});

const lastButton = (name: RegExp) => {
  const all = screen.getAllByRole("button", { name });
  return all[all.length - 1];
};
const typeAmount = (label: RegExp, value: string) => fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } });

beforeEach(() => {
  closingMutate.mockReset();
  openingMutate.mockReset();
  startMutate.mockReset();
  localStorage.clear();
});

describe("close the day", () => {
  it("a Rs 100 short count needs a reason; send home = counted − keep", () => {
    render(<CloseDayDialog open status={status()} onClose={() => {}} />);
    expect(screen.getByText("Rs. 12,300")).toBeTruthy();
    typeAmount(/Cash you counted/i, "12200");
    expect(screen.getByText(/Rs. 100 short/)).toBeTruthy();
    const save = lastButton(/Close the day/i);
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("textbox", { name: /Send home/i }) as HTMLInputElement).value).toBe("2700");

    fireEvent.change(screen.getByRole("textbox", { name: /Reason/i }), { target: { value: "gave wrong change" } });
    expect((save as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(save);
    expect(closingMutate.mock.calls[0][0]).toEqual({ counted: 12200, sent_home: 2700, reason: "gave wrong change" });
  });

  it("a matching count saves without a reason", () => {
    render(<CloseDayDialog open status={status()} onClose={() => {}} />);
    typeAmount(/Cash you counted/i, "12300");
    expect(screen.getByText("Matches.")).toBeTruthy();
    fireEvent.click(lastButton(/Close the day/i));
    expect(closingMutate.mock.calls[0][0]).toEqual({ counted: 12300, sent_home: 2800, reason: undefined });
  });

  it("below what to keep: nothing goes home, top up from home", () => {
    render(<CloseDayDialog open status={status({ expected_now: 9000 })} onClose={() => {}} />);
    typeAmount(/Cash you counted/i, "9000");
    expect(screen.getByText(/add Rs. 500 from home/)).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /Send home/i })).toBeNull();
  });
});

describe("hourly opening reminder", () => {
  it("asks a cashier when today's opening is missing", () => {
    authUser = { permissions: ["locker:count"] };
    manage = false;
    statusState = { data: status({ needs_opening: true }) };
    render(<LockerOpeningPrompt />);
    expect(screen.getByText("Locker opening amount")).toBeTruthy();
    expect(screen.getByText(/Last night left: Rs. 12,300/)).toBeTruthy();
  });

  it("'Remind me in an hour' snoozes it for an hour", () => {
    authUser = { permissions: ["locker:count"] };
    manage = false;
    statusState = { data: status({ needs_opening: true }) };
    render(<LockerOpeningPrompt />);
    fireEvent.click(screen.getByRole("button", { name: /Remind me in an hour/i }));
    expect(isSnoozed("2026-11-02")).toBe(true);
    expect(isSnoozed("2026-11-02", Date.now() + SNOOZE_MS + 1000)).toBe(false);
    expect(isSnoozed("2026-11-03")).toBe(false);
  });

  it("stays quiet while snoozed, once opened, and for the owner", () => {
    authUser = { permissions: ["locker:count"] };
    manage = false;
    writeSnooze("2026-11-02");
    statusState = { data: status({ needs_opening: true }) };
    const { unmount } = render(<LockerOpeningPrompt />);
    expect(screen.queryByText("Locker opening amount")).toBeNull();
    unmount();

    localStorage.clear();
    statusState = { data: status({ needs_opening: false }) };
    const r2 = render(<LockerOpeningPrompt />);
    expect(screen.queryByText("Locker opening amount")).toBeNull();
    r2.unmount();

    manage = true;
    statusState = { data: status({ needs_opening: true }) };
    render(<LockerOpeningPrompt />);
    expect(screen.queryByText("Locker opening amount")).toBeNull();
  });

  it("saving sends the amount", () => {
    authUser = { permissions: ["locker:count"] };
    manage = false;
    statusState = { data: status({ needs_opening: true }) };
    render(<LockerOpeningPrompt />);
    typeAmount(/Cash in the locker/i, "12300");
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    expect(openingMutate.mock.calls[0][0]).toEqual({ amount: 12300, reason: undefined });
  });
});

describe("one-time start", () => {
  beforeEach(() => {
    previewState = {
      isLoading: false,
      data: {
        started: false,
        float: 1500,
        keep: 6500,
        held: [
          { invoice_id: 50, customer_name: "Old A", issued_date: "2026-10-20", status: "Active", advance: 3000, refunded: 0, held: 3000, all_back: false },
          { invoice_id: 51, customer_name: "Old B", issued_date: "2026-10-22", status: "Active", advance: 2000, refunded: 0, held: 2000, all_back: false },
        ],
      },
    };
  });

  it("ticking an advance as already at home lowers what the drawer should hold; extra cash goes home", () => {
    render(<StartLockerPanel />);
    expect(screen.getByText("Rs. 6,500")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /INV-51/ }));
    expect(screen.getByText("Rs. 4,500")).toBeTruthy();
    typeAmount(/Cash you counted/i, "6000");
    expect(screen.getByText(/Rs. 1,500 is extra income/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Start the locker/i }));
    expect(startMutate.mock.calls[0][0]).toEqual({ counted: 6000, at_home_invoice_ids: [51], sent_home: 1500, reason: undefined });
  });

  it("a short drawer needs a note before starting", () => {
    render(<StartLockerPanel />);
    typeAmount(/Cash you counted/i, "5000");
    expect(screen.getByText(/Rs. 1,500 short/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Start the locker/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
