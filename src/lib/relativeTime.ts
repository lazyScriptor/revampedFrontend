import i18n from "@/i18n";

// Non-component helpers: evaluated at render time, so they follow the active language.
const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as string;

/** "just now" · "5m ago" · "3h ago" · "2d ago" */
export const relativeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return t("time.justNow");
  if (m < 60) return t("time.minutesAgo", { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("time.hoursAgo", { count: h });
  return t("time.daysAgo", { count: Math.floor(h / 24) });
};

/** "just now" · "5m" · "3h" · "2d" · "Oct 21" */
export const relativeCompact = (iso: string) => {
  const d = new Date(iso);
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return t("time.justNow");
  if (m < 60) return t("time.minutesShort", { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("time.hoursShort", { count: h });
  const days = Math.floor(h / 24);
  if (days < 7) return t("time.daysShort", { count: days });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/** "Today" · "Yesterday" · "3 days ago" · formatted date */
export const relativeDay = (dateStr: string, formatDate: (s: string) => string) => {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (d === 0) return t("time.today");
  if (d === 1) return t("time.yesterday");
  if (d < 7) return t("time.daysAgoLong", { count: d });
  return formatDate(dateStr);
};
