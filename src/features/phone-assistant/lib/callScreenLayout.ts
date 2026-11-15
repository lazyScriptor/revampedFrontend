import tokens from "./callScreenTokens.json";
import type { CallScreen } from "@geargrid/contracts";

export type CallScreenDesign = CallScreen;
export type CallSize = CallScreenDesign["size"];
export type RowStyle = CallScreenDesign["rows"][number]["style"];
export type RuleWhen = CallScreenDesign["rules"][number]["when"];
export type CallAction = CallScreenDesign["actions"][number];

export const CALL_TOKENS = tokens;

/** Every field a profile may show. Order is the order offered in the designer. */
export const CALL_FIELDS = [
  "name",
  "company",
  "rating",
  "status_warning",
  "balance_due",
  "deposit_balance",
  "id_retained",
  "active_items",
  "overdue",
  "invoice_count",
  "rental_dates",
  "last_payment",
  "last_review_comment",
  "recent_call_notes",
] as const;
export type CallField = (typeof CALL_FIELDS)[number];

export const ROW_STYLES: RowStyle[] = ["title", "emphasis", "body", "caption", "stars", "list", "chip"];
export const CALL_SIZES: CallSize[] = ["compact", "standard", "large", "extra_large"];
export const RULE_WHENS: RuleWhen[] = [
  "status_blacklisted",
  "balance_due_over",
  "overdue_days_over",
  "rating_under",
  "id_retained",
  "unknown_caller",
];
export const RULES_WITH_VALUE = new Set<RuleWhen>(["balance_due_over", "overdue_days_over", "rating_under"]);
export const CALL_ACTIONS: CallAction[] = ["dismiss", "add_note", "open_on_desktop", "open_app", "call_back_later"];

/** Same as the server's built-in design (src/services/phoneAssistantPolicyService.js). */
export const DEFAULT_CALL_SCREEN: CallScreenDesign = {
  version: 1,
  size: "standard",
  text_scale: 1,
  shape: { width: "inset", corner_radius: 16, position: "top", opacity: 1, elevation: true },
  theme: { mode: "auto", accent: "brand", status_bar: true },
  header: { show_logo: false, show_shop_name: false },
  rows: [
    { field: "name", style: "title" },
    { field: "rating", style: "stars" },
    { field: "balance_due", style: "emphasis", label: true },
    { field: "active_items", style: "list", max_items: 3 },
  ],
  rules: [],
  actions: ["dismiss", "add_note", "open_on_desktop"],
  behaviour: { auto_dismiss_seconds: 0, draggable: true, tap_to_expand: true, show_for: "incoming", collapsed_rows: 2 },
  locked: { mode: "name_rating" },
};

export const cloneDesign = (d: CallScreenDesign): CallScreenDesign => JSON.parse(JSON.stringify(d));

/** Read a stored design (policy JSON may be missing or from an older version). */
export function readDesign(raw: unknown): CallScreenDesign {
  if (raw && typeof raw === "object" && (raw as any).version === 1 && Array.isArray((raw as any).rows)) {
    return { ...cloneDesign(DEFAULT_CALL_SCREEN), ...(raw as CallScreenDesign) };
  }
  return cloneDesign(DEFAULT_CALL_SCREEN);
}

export function allowedFields(profileFields: string[] | undefined): CallField[] {
  if (!profileFields || profileFields.includes("*")) return [...CALL_FIELDS];
  return CALL_FIELDS.filter((f) => profileFields.includes(f));
}

/** Sample customers used by the preview (and the same shapes the phone shows for "sample call"). */
export type SampleKind = "good" | "dues" | "blacklisted" | "unknown";
export interface SampleBrief {
  kind: SampleKind;
  name: string;
  company: string | null;
  rating: number | null;
  blacklisted: boolean;
  balance: number;
  deposit: number;
  idRetained: boolean;
  items: Array<{ qty: number; name: string; due: string }>;
  overdueDays: number;
  invoiceCount: number;
  rentalDates: string;
  lastPayment: { amount: number; date: string; method: string } | null;
  review: string | null;
  notes: string[];
}

export const SAMPLE_BRIEFS: Record<SampleKind, SampleBrief> = {
  good: {
    kind: "good", name: "Nimal Perera", company: "Perera Constructions", rating: 5, blacklisted: false,
    balance: 0, deposit: 25000, idRetained: false,
    items: [{ qty: 1, name: "Concrete mixer", due: "18 Nov" }],
    overdueDays: 0, invoiceCount: 14, rentalDates: "12 Nov – 18 Nov",
    lastPayment: { amount: 42000, date: "12 Nov", method: "Cash" },
    review: "Always returns on time.", notes: ["Booking – needs a breaker on Friday"],
  },
  dues: {
    kind: "dues", name: "Kasun Fernando", company: null, rating: 3, blacklisted: false,
    balance: 18500, deposit: 5000, idRetained: true,
    items: [
      { qty: 2, name: "Scaffolding set", due: "10 Nov" },
      { qty: 1, name: "Plate compactor", due: "14 Nov" },
      { qty: 1, name: "Water pump", due: "14 Nov" },
      { qty: 3, name: "Props", due: "16 Nov" },
    ],
    overdueDays: 4, invoiceCount: 6, rentalDates: "02 Nov – 14 Nov",
    lastPayment: { amount: 10000, date: "05 Nov", method: "Bank transfer" },
    review: null, notes: ["Payment promise – Wednesday"],
  },
  blacklisted: {
    kind: "blacklisted", name: "Ruwan Silva", company: "RS Builders", rating: 1, blacklisted: true,
    balance: 96000, deposit: 0, idRetained: true,
    items: [{ qty: 1, name: "Generator 5kVA", due: "30 Oct" }],
    overdueDays: 17, invoiceCount: 9, rentalDates: "20 Oct – 30 Oct",
    lastPayment: null, review: "Damaged a machine and refused to pay.", notes: [],
  },
  unknown: {
    kind: "unknown", name: "", company: null, rating: null, blacklisted: false,
    balance: 0, deposit: 0, idRetained: false, items: [], overdueDays: 0, invoiceCount: 0,
    rentalDates: "", lastPayment: null, review: null, notes: [],
  },
};

export type AmountMode = "exact" | "rounded" | "flag_only" | "hidden";

export function formatAmount(value: number, mode: AmountMode): string | null {
  const n = mode === "rounded" ? Math.round(value / 1000) * 1000 : value;
  if (mode === "hidden") return null;
  if (mode === "flag_only") return value > 0 ? "has_dues" : null;
  return `LKR ${n.toLocaleString("en-LK")}`;
}

/** Text scale the phone really uses: profile size × (phone choice, else design scale) × optional system scale. */
export function effectiveTextScale(args: {
  design: CallScreenDesign;
  phoneScale?: number | null;
  allowPhoneScale?: boolean;
  min?: number;
  max?: number;
  systemFontScale?: number;
  respectSystemFont?: boolean;
}): number {
  const { design, phoneScale, allowPhoneScale = true, min = 0.8, max = 2, systemFontScale = 1, respectSystemFont = true } = args;
  let scale = design.text_scale;
  if (allowPhoneScale && phoneScale && phoneScale > 0) scale = Math.min(max, Math.max(min, phoneScale));
  if (respectSystemFont) scale *= systemFontScale;
  return Math.round(scale * 100) / 100;
}

export interface ActiveRule {
  accent: "danger" | "warning" | "brand" | "neutral" | null;
  banner: boolean;
  vibrate: boolean;
}

export function evaluateRules(design: CallScreenDesign, brief: SampleBrief): ActiveRule {
  const out: ActiveRule = { accent: null, banner: false, vibrate: false };
  const rank = { neutral: 0, brand: 1, warning: 2, danger: 3 } as const;
  for (const rule of design.rules) {
    let hit = false;
    switch (rule.when) {
      case "status_blacklisted": hit = brief.blacklisted; break;
      case "balance_due_over": hit = brief.balance > (rule.value ?? 0); break;
      case "overdue_days_over": hit = brief.overdueDays > (rule.value ?? 0); break;
      case "rating_under": hit = brief.rating !== null && brief.rating < (rule.value ?? 0); break;
      case "id_retained": hit = brief.idRetained; break;
      case "unknown_caller": hit = brief.kind === "unknown"; break;
    }
    if (!hit) continue;
    if (rule.accent && (out.accent === null || rank[rule.accent] > rank[out.accent])) out.accent = rule.accent;
    if (rule.banner) out.banner = true;
    if (rule.vibrate) out.vibrate = true;
  }
  return out;
}

export interface RenderedRow {
  key: string;
  field: CallField;
  style: RowStyle;
  label: boolean;
  /** A translation key + values, or plain text. The preview resolves it with t(). */
  text: { key?: string; values?: Record<string, unknown>; plain?: string };
  stars?: number;
  items?: string[];
}

export function renderRows(design: CallScreenDesign, brief: SampleBrief, amounts: AmountMode, lockedMode?: string): RenderedRow[] {
  const rows: RenderedRow[] = [];
  const limitToName = lockedMode === "name_only";
  const limitToNameRating = lockedMode === "name_rating";
  design.rows.forEach((row, i) => {
    const field = row.field as CallField;
    if (limitToName && !["name", "company"].includes(field)) return;
    if (limitToNameRating && !["name", "company", "rating"].includes(field)) return;
    const base = { key: `${field}-${i}`, field, style: row.style, label: Boolean(row.label) };
    if (brief.kind === "unknown") {
      if (field === "name") rows.push({ ...base, text: { key: "phoneAssistant.callScreen.sample.notInGearGrid" } });
      return;
    }
    switch (field) {
      case "name": rows.push({ ...base, text: { plain: brief.name } }); break;
      case "company": if (brief.company) rows.push({ ...base, text: { plain: brief.company } }); break;
      case "rating": if (brief.rating !== null) rows.push({ ...base, text: { plain: `${brief.rating}/5` }, stars: brief.rating }); break;
      case "status_warning": if (brief.blacklisted) rows.push({ ...base, text: { key: "phoneAssistant.callScreen.sample.blacklisted" } }); break;
      case "balance_due": {
        const v = formatAmount(brief.balance, amounts);
        if (v && brief.balance > 0) rows.push({ ...base, text: v === "has_dues" ? { key: "phoneAssistant.callScreen.sample.hasDues" } : { plain: v } });
        break;
      }
      case "deposit_balance": {
        const v = formatAmount(brief.deposit, amounts);
        if (v && v !== "has_dues" && brief.deposit > 0) rows.push({ ...base, text: { plain: v } });
        break;
      }
      case "id_retained": if (brief.idRetained) rows.push({ ...base, text: { key: "phoneAssistant.callScreen.sample.idKept" } }); break;
      case "active_items": {
        const max = row.max_items ?? 3;
        if (brief.items.length) {
          rows.push({
            ...base,
            text: { plain: "" },
            items: brief.items.slice(0, max).map((it) => `${it.qty} × ${it.name} · ${it.due}`),
          });
        }
        break;
      }
      case "overdue": if (brief.overdueDays > 0) rows.push({ ...base, text: { key: "phoneAssistant.callScreen.sample.overdueDays", values: { count: brief.overdueDays } } }); break;
      case "invoice_count": rows.push({ ...base, text: { plain: String(brief.invoiceCount) } }); break;
      case "rental_dates": if (brief.rentalDates) rows.push({ ...base, text: { plain: brief.rentalDates } }); break;
      case "last_payment": {
        if (brief.lastPayment) {
          const v = formatAmount(brief.lastPayment.amount, amounts);
          rows.push({ ...base, text: { plain: `${v && v !== "has_dues" ? `${v} · ` : ""}${brief.lastPayment.date} · ${brief.lastPayment.method}` } });
        }
        break;
      }
      case "last_review_comment": if (brief.review) rows.push({ ...base, text: { plain: brief.review } }); break;
      case "recent_call_notes": if (brief.notes.length) rows.push({ ...base, text: { plain: brief.notes[0] } }); break;
    }
  });
  return rows;
}
