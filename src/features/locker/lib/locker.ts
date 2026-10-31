// Small pure helpers for the cash locker screens.

export const toNum = (v: unknown) => Number(v) || 0;

/** "1,500" / "1,500.50" — the screens add "Rs." themselves. */
export const money = (n: unknown) => Number(toNum(n).toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const isZero = (n: unknown) => Math.abs(toNum(n)) < 0.005;

export const personName = (p?: { first_name?: string; last_name?: string } | null) =>
  p ? [p.first_name, p.last_name].filter(Boolean).join(" ") : "";

// ─── hourly reminder ──────────────────────────────────────────────────────────

const SNOOZE_KEY = "geargrid-locker-snooze";
export const SNOOZE_MS = 60 * 60 * 1000;

/** When "Later" was last pressed for today's opening (per day, per browser). */
export const readSnooze = (day: string): number => {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) || "null");
    return raw && raw.day === day ? Number(raw.at) || 0 : 0;
  } catch {
    return 0;
  }
};

export const writeSnooze = (day: string, at = Date.now()) => {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify({ day, at }));
  } catch {
    /* private mode: the reminder just comes back sooner */
  }
};

export const isSnoozed = (day: string, now = Date.now()) => now - readSnooze(day) < SNOOZE_MS;
