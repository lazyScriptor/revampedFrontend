// dates.ts — timezone-safe date helpers shared across the app.
//
// Background: `new Date("YYYY-MM-DD")` is UTC midnight, while `getDate/setDate`
// run in the viewer's local time. That asymmetry silently shifts dates by a
// day for users east of UTC. To stay consistent we want two flavours:
//
// • Viewer-local helpers — for editing dates in forms (POS borrow date,
//   handover date), where the user expects "today" to mean their device's
//   today. These are promoted from PosLedgerPanel.tsx.
//
// • Tenant-tz helpers — for reports and finance, where "today" should mean
//   the tenant's local day regardless of which device an operator is on.
//   These pair with the backend parseTenantDayRange util.

const DEFAULT_TZ = "Asia/Colombo";

// ─── Viewer-local helpers ──────────────────────────────────────────────────

export const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayLocalStr = (): string => formatLocalDate(new Date());

export const addDaysLocal = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatLocalDate(dt);
};

export const compareDateStr = (a: string, b: string): number => {
  if (!a || !b) return 0;
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return (
    new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime()
  );
};

// ─── Tenant-tz helpers ─────────────────────────────────────────────────────

// "Today" expressed as YYYY-MM-DD in the tenant's IANA timezone. en-CA gives
// ISO-style ordering which is convenient to slice.
export const tenantToday = (tz: string = DEFAULT_TZ): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
};

// N days before today in the tenant's tz, as YYYY-MM-DD. The subtraction is
// pure calendar arithmetic on UTC parts — no DST surprises because we never
// touch the hours.
export const tenantNDaysAgo = (tz: string = DEFAULT_TZ, n: number = 30): string => {
  const today = tenantToday(tz);
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

// Format a "YYYY-MM-DD" (or ISO timestamp) for display in the tenant's tz.
// Prefer this over `new Date(ymd).toLocaleDateString()` which is off-by-one
// for date-only strings because they're interpreted as UTC midnight first.
export const formatDisplayDate = (
  ymd: string | Date | null | undefined,
  tz: string = DEFAULT_TZ,
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "2-digit" },
): string => {
  if (!ymd) return "—";

  // If it's a bare YYYY-MM-DD we want to render exactly that wall-clock day,
  // not whatever happens when UTC midnight is shifted into a tz. Build a
  // local-noon Date so display is independent of the viewer's offset.
  if (typeof ymd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0); // local noon — never crosses midnight under any TZ shift
    return new Intl.DateTimeFormat("en-GB", opts).format(dt);
  }

  const d = ymd instanceof Date ? ymd : new Date(ymd);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: tz }).format(d);
};
