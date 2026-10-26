import { tk } from "@/i18n/marker";
import type { Language, TemplateKey, WhatsAppWarning } from "../api/whatsapp.api";

/** wa.me click-to-chat link. With no number WhatsApp opens its contact picker with the text filled in. */
export const buildWaLink = (digits: string, text = "") => `https://wa.me/${digits || ""}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/**
 * Must be called straight from a click handler (before any await) or browsers block the new tab.
 * Returns false when the browser blocked it so the UI can offer the link instead.
 */
export const openWhatsApp = (link: string): boolean => {
  const win = window.open(link, "_blank", "noopener,noreferrer");
  return !!win;
};

/** Warnings that make sending pointless or unwelcome. */
export const BLOCKING_WARNINGS: WhatsAppWarning[] = ["opted_out"];
export const isBlocked = (warnings: WhatsAppWarning[]) => warnings.some((w) => BLOCKING_WARNINGS.includes(w));

/** Warnings that mean "no usable number": WhatsApp will ask staff to pick the contact. */
export const NO_NUMBER_WARNINGS: WhatsAppWarning[] = ["no_phone", "landline", "invalid_phone"];
export const lacksNumber = (warnings: WhatsAppWarning[]) => warnings.some((w) => NO_NUMBER_WARNINGS.includes(w));

export const WARNING_I18N: Record<WhatsAppWarning, string> = {
  no_phone: tk("whatsapp.warnings.noPhone"),
  landline: tk("whatsapp.warnings.landline"),
  invalid_phone: tk("whatsapp.warnings.invalidPhone"),
  opted_out: tk("whatsapp.warnings.optedOut"),
  no_balance: tk("whatsapp.warnings.noBalance"),
  nothing_to_return: tk("whatsapp.warnings.nothingToReturn"),
  messaged_recently: tk("whatsapp.warnings.messagedRecently"),
  too_long: tk("whatsapp.warnings.tooLong"),
};

export const TEMPLATE_I18N: Record<TemplateKey, string> = {
  receipt: tk("whatsapp.types.receipt"),
  payment_received: tk("whatsapp.types.payment_received"),
  payment_reminder: tk("whatsapp.types.payment_reminder"),
  return_due_tomorrow: tk("whatsapp.types.return_due_tomorrow"),
  return_due_today: tk("whatsapp.types.return_due_today"),
  overdue_return: tk("whatsapp.types.overdue_return"),
  thank_you: tk("whatsapp.types.thank_you"),
  custom: tk("whatsapp.types.custom"),
};

/** Message types that make sense for a given invoice status (first = the suggested default). */
export const suggestedTemplate = (invoiceStatus?: string | null): TemplateKey => {
  switch (invoiceStatus) {
    case "PendingPayment":
      return "payment_reminder";
    case "Completed":
      return "thank_you";
    default:
      return "receipt";
  }
};

export const INVOICE_TEMPLATES: TemplateKey[] = [
  "receipt",
  "payment_reminder",
  "payment_received",
  "return_due_tomorrow",
  "return_due_today",
  "overdue_return",
  "thank_you",
  "custom",
];
export const CUSTOMER_TEMPLATES: TemplateKey[] = ["custom"];

// ─── template preview (mirror of the server's renderer) ──────────────────────

const PLACEHOLDER_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;
const valueOf = (vars: Record<string, string>, key: string) => {
  const v = vars[key];
  return v === undefined || v === null ? "" : String(v);
};

/** Same rules as the server: a line whose placeholders are all empty disappears. */
export const renderTemplate = (body: string, vars: Record<string, string>) => {
  const out: string[] = [];
  for (const line of String(body || "").split("\n")) {
    const found = [...line.matchAll(PLACEHOLDER_RE)];
    if (found.length === 0) {
      out.push(line);
      continue;
    }
    if (found.every((m) => valueOf(vars, m[1]).trim() === "")) continue;
    out.push(line.replace(PLACEHOLDER_RE, (_, key: string) => valueOf(vars, key)));
  }
  return out
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const unknownPlaceholders = (body: string, known: string[]) => {
  const bad = new Set<string>();
  for (const m of String(body || "").matchAll(PLACEHOLDER_RE)) if (!known.includes(m[1])) bad.add(m[1]);
  return [...bad];
};

// ─── time ────────────────────────────────────────────────────────────────────

/** "2 hours ago" / "yesterday" in the UI language. */
export const timeAgo = (iso: string, language: Language | string = "en", now: number = Date.now()) => {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(language === "si" ? "si" : "en", { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
};
