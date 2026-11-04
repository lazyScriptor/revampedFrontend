// Wording and countdowns for the overdue notice, shared by the shop's app and the console preview.
export interface PaymentNoticeData {
  overdue_since: string | null;
  lock_at: string | null;
  locked: boolean;
  days_overdue: number;
  shop: string;
  amount: number;
  due_date: string | null;
  message_en: string;
  message_si: string;
  repeat_minutes: number;
  wait_seconds: number;
}

const dateText = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** The message in the user's language, with {shop}, {amount}, {days}, {due_date} and {lock_date} filled in. */
export const noticeMessage = (n: PaymentNoticeData, language: string | undefined) => {
  const template = (language?.startsWith("si") ? n.message_si || n.message_en : n.message_en || n.message_si) ?? "";
  const values: Record<string, string> = {
    shop: n.shop,
    amount: n.amount.toLocaleString("en-US"),
    days: String(n.days_overdue),
    due_date: dateText(n.due_date),
    lock_date: dateText(n.lock_at),
  };
  return template.replace(/\{(shop|amount|days|due_date|lock_date)\}/g, (_, k: string) => values[k]);
};

/** Locked by the server, or the timer has run out while the screen was open. */
export const isLockedNow = (n: PaymentNoticeData, now = Date.now()) => n.locked || (!!n.lock_at && now >= new Date(n.lock_at).getTime());

/** "6d 23h", "4h 12m", "9m 30s". */
export const timeLeftText = (lockAt: string, now = Date.now()) => {
  const left = Math.max(0, Math.floor((new Date(lockAt).getTime() - now) / 1000));
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${left % 60}s`;
};

const SEEN_KEY = "geargrid-payment-notice-seen";
export const lastSeenNotice = () => {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
};
export const markNoticeSeen = (now = Date.now()) => {
  try {
    localStorage.setItem(SEEN_KEY, String(now));
  } catch {
    /* it just comes back sooner */
  }
};
/** The pop-up is due: never when its repeat is 0 minutes, which means the banner alone. */
export const popupDue = (repeatMinutes: number, lastSeen: number, now = Date.now()) => repeatMinutes > 0 && now - lastSeen >= repeatMinutes * 60000;
