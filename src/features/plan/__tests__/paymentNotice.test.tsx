import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/useAuthStore";
import { PaymentNotice } from "../PaymentNotice";
import { useMenuPlanChecker } from "../usePlan";
import { isLockedNow, lastSeenNotice, markNoticeSeen, noticeMessage, popupDue, timeLeftText, type PaymentNoticeData } from "../paymentNoticeText";

const NOW = new Date("2026-11-05T10:00:00Z").getTime();
const notice = (over: Partial<PaymentNoticeData> = {}): PaymentNoticeData => ({
  overdue_since: "2026-11-01T10:00:00Z", lock_at: new Date(NOW + 2 * 86400000).toISOString(), locked: false, days_overdue: 4, shop: "Kasun Tools",
  amount: 5900, due_date: "2026-11-01", message_en: "{shop}: pay Rs. {amount}, {days} days late, by {lock_date}", message_si: "සිංහල {amount}", repeat_minutes: 60, wait_seconds: 3, ...over,
});
const show = (n: PaymentNoticeData | null) => {
  useAuthStore.setState({ user: { paymentNotice: n } } as any);
  return render(<QueryClientProvider client={new QueryClient()}><PaymentNotice /></QueryClientProvider>);
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ now: NOW });
});
afterEach(() => vi.useRealTimers());

describe("notice wording and timing", () => {
  it("fills in the details, in the user's language", () => {
    expect(noticeMessage(notice(), "en")).toBe("Kasun Tools: pay Rs. 5,900, 4 days late, by 7 Nov 2026");
    expect(noticeMessage(notice(), "si")).toBe("සිංහල 5,900");
    expect(noticeMessage(notice({ message_si: "" }), "si")).toContain("Kasun Tools");
  });
  it("leaves unknown braces alone", () => {
    expect(noticeMessage(notice({ message_en: "{nope} {shop}" }), "en")).toBe("{nope} Kasun Tools");
  });
  it("counts down in sensible units", () => {
    expect(timeLeftText(new Date(NOW + 90000000).toISOString(), NOW)).toBe("1d 1h");
    expect(timeLeftText(new Date(NOW + 3700000).toISOString(), NOW)).toBe("1h 1m");
    expect(timeLeftText(new Date(NOW + 90000).toISOString(), NOW)).toBe("1m 30s");
    expect(timeLeftText(new Date(NOW - 5000).toISOString(), NOW)).toBe("0m 0s");
  });
  it("locks at the end of the timer, without waiting for the server", () => {
    expect(isLockedNow(notice(), NOW)).toBe(false);
    expect(isLockedNow(notice(), NOW + 3 * 86400000)).toBe(true);
    expect(isLockedNow(notice({ locked: true }), NOW)).toBe(true);
    expect(isLockedNow(notice({ lock_at: null }), NOW + 999999999)).toBe(false);
  });
  it("the pop-up comes back on schedule; zero means banner only", () => {
    expect(popupDue(60, 0, NOW)).toBe(true);
    expect(popupDue(60, NOW - 59 * 60000, NOW)).toBe(false);
    expect(popupDue(60, NOW - 60 * 60000, NOW)).toBe(true);
    expect(popupDue(0, 0, NOW)).toBe(false);
  });
});

describe("what the shop sees", () => {
  it("nothing when it isn't overdue", () => {
    const { container } = show(null);
    expect(container.textContent).toBe("");
  });
  it("a pop-up that can't be closed until its wait is over, then stays away", () => {
    show(notice());
    const ok = screen.getByRole("button", { name: "OK (3)" }) as HTMLButtonElement;
    expect(ok.disabled).toBe(true);
    for (let i = 0; i < 3; i++) act(() => { vi.advanceTimersByTime(1000); });
    const ready = screen.getByRole("button", { name: "OK" }) as HTMLButtonElement;
    expect(ready.disabled).toBe(false);
    fireEvent.click(ready);
    expect(lastSeenNotice()).toBeGreaterThan(0);
  });
  it("not again until the repeat time, but the banner and countdown stay", () => {
    markNoticeSeen(NOW);
    show(notice());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Locks in 2d 0h");
  });
  it("the banner's Details opens the message straight away", () => {
    markNoticeSeen(NOW);
    show(notice());
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect((screen.getByRole("button", { name: "OK" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("covers the screen when locked, with a way to re-check and log out", () => {
    show(notice({ locked: true }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: /check again/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("locks by itself when the timer runs out on an open screen", () => {
    markNoticeSeen(NOW);
    show(notice({ lock_at: new Date(NOW + 2000).toISOString() }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});

describe("menu while the plan is unknown", () => {
  const Probe = () => <div>{String(useMenuPlanChecker()("data.imports"))}</div>;
  it("hides plan items until the plan is known, so they never appear and vanish", () => {
    useAuthStore.setState({ user: {} } as any);
    render(<Probe />);
    expect(screen.getByText("false")).toBeTruthy();
  });
  it("follows the plan once known", () => {
    useAuthStore.setState({ user: { plan: { tier: "Pro", features: { "data.imports": true }, limits: {} } } } as any);
    render(<Probe />);
    expect(screen.getByText("true")).toBeTruthy();
  });
  it("shows them if the server couldn't say, since the server still enforces it", () => {
    useAuthStore.setState({ user: { plan: null } } as any);
    render(<Probe />);
    expect(screen.getByText("true")).toBeTruthy();
  });
});
