import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateTime } from "../dates";

describe("formatDateTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 27 Oct 2026, 15:00 in Colombo (UTC+5:30)
    vi.setSystemTime(new Date("2026-10-27T09:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("shows today with the exact time in the tenant timezone", () => {
    expect(formatDateTime("2026-10-27T08:15:00Z")).toBe("Today 1:45 PM");
  });

  it("uses the tenant day, not UTC, for yesterday", () => {
    // 26 Oct 20:00 UTC is already 27 Oct 01:30 in Colombo
    expect(formatDateTime("2026-10-26T20:00:00Z")).toBe("Today 1:30 AM");
    expect(formatDateTime("2026-10-26T03:00:00Z")).toBe("Yesterday 8:30 AM");
  });

  it("shows the date and time for older entries, adding the year only when it differs", () => {
    expect(formatDateTime("2026-10-20T04:30:00Z")).toBe("20 Oct 10:00 AM");
    expect(formatDateTime("2025-12-31T04:30:00Z")).toBe("31 Dec 2025 10:00 AM");
  });

  it("uses the translated day words and handles missing or date-only values", () => {
    expect(formatDateTime("2026-10-27T08:15:00Z", { today: "අද", yesterday: "ඊයේ" })).toBe("අද 1:45 PM");
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("2026-10-20")).toBe("20 Oct 2026");
  });
});
