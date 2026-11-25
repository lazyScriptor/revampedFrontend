import type { TFunction } from "i18next";

export const formatCallLength = (t: TFunction, seconds: number | null | undefined): string => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0
    ? t("phoneShell.callCard.lengthMinSec", { m, s })
    : t("phoneShell.callCard.lengthSec", { s });
};

/** YYYY-MM-DD for today plus `days`, in the phone's own time zone. */
export const localDay = (days = 0, now = new Date()): string => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
