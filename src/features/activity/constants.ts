import type {
  ActivityEventType,
  ActivityFilterState,
  ActivitySettingsPayload,
  ReasonListKey,
} from "./types";
import { tk } from "@/i18n/marker";

export interface ActivityTypeMeta {
  type: ActivityEventType;
  labelKey: string;
  color: string;
  bg: string;
  darkBg: string;
  hasAmount: boolean;
}

export const ACTIVITY_TYPE_META: Record<ActivityEventType, ActivityTypeMeta> = {
  invoice_created: {
    type: "invoice_created",
    labelKey: tk("activity.types.invoice_created"),
    color: "#0284c7",
    bg: "#e0f2fe",
    darkBg: "rgba(2, 132, 199, 0.18)",
    hasAmount: true,
  },
  payment: {
    type: "payment",
    labelKey: tk("activity.types.payment"),
    color: "#16a34a",
    bg: "#dcfce7",
    darkBg: "rgba(22, 163, 74, 0.18)",
    hasAmount: true,
  },
  refund: {
    type: "refund",
    labelKey: tk("activity.types.refund"),
    color: "#ea580c",
    bg: "#ffedd5",
    darkBg: "rgba(234, 88, 12, 0.18)",
    hasAmount: true,
  },
  discount: {
    type: "discount",
    labelKey: tk("activity.types.discount"),
    color: "#d97706",
    bg: "#fef3c7",
    darkBg: "rgba(217, 119, 6, 0.18)",
    hasAmount: true,
  },
  backdated_payment: {
    type: "backdated_payment",
    labelKey: tk("activity.types.backdated_payment"),
    color: "#7c3aed",
    bg: "#ede9fe",
    darkBg: "rgba(124, 58, 237, 0.18)",
    hasAmount: true,
  },
  backdated_bill: {
    type: "backdated_bill",
    labelKey: tk("activity.types.backdated_bill"),
    color: "#6d28d9",
    bg: "#ede9fe",
    darkBg: "rgba(109, 40, 217, 0.18)",
    hasAmount: true,
  },
  backdated_return: {
    type: "backdated_return",
    labelKey: tk("activity.types.backdated_return"),
    color: "#9333ea",
    bg: "#f3e8ff",
    darkBg: "rgba(147, 51, 234, 0.18)",
    hasAmount: true,
  },
  return: {
    type: "return",
    labelKey: tk("activity.types.return"),
    color: "#0d9488",
    bg: "#ccfbf1",
    darkBg: "rgba(13, 148, 136, 0.18)",
    hasAmount: true,
  },
  payment_voided: {
    type: "payment_voided",
    labelKey: tk("activity.types.payment_voided"),
    color: "#dc2626",
    bg: "#fee2e2",
    darkBg: "rgba(220, 38, 38, 0.18)",
    hasAmount: true,
  },
  invoice_deleted: {
    type: "invoice_deleted",
    labelKey: tk("activity.types.invoice_deleted"),
    color: "#b91c1c",
    bg: "#fee2e2",
    darkBg: "rgba(185, 28, 28, 0.18)",
    hasAmount: true,
  },
  invoice_restored: {
    type: "invoice_restored",
    labelKey: tk("activity.types.invoice_restored"),
    color: "#2563eb",
    bg: "#dbeafe",
    darkBg: "rgba(37, 99, 235, 0.18)",
    hasAmount: true,
  },
  invoice_reopened: {
    type: "invoice_reopened",
    labelKey: tk("activity.types.invoice_reopened"),
    color: "#4f46e5",
    bg: "#e0e7ff",
    darkBg: "rgba(79, 70, 229, 0.18)",
    hasAmount: false,
  },
  id_card_released_unpaid: {
    type: "id_card_released_unpaid",
    labelKey: tk("activity.types.id_card_released_unpaid"),
    color: "#e11d48",
    bg: "#ffe4e6",
    darkBg: "rgba(225, 29, 72, 0.18)",
    hasAmount: true,
  },
  review: {
    type: "review",
    labelKey: tk("activity.types.review"),
    color: "#ca8a04",
    bg: "#fef9c3",
    darkBg: "rgba(202, 138, 4, 0.18)",
    hasAmount: false,
  },
  customer_payment: {
    type: "customer_payment",
    labelKey: tk("activity.types.customer_payment"),
    color: "#059669",
    bg: "#d1fae5",
    darkBg: "rgba(5, 150, 105, 0.18)",
    hasAmount: true,
  },
  call_promise_missed: {
    type: "call_promise_missed",
    labelKey: tk("activity.types.call_promise_missed"),
    color: "#be123c",
    bg: "#ffe4e6",
    darkBg: "rgba(190, 18, 60, 0.18)",
    hasAmount: true,
  },
  system: {
    type: "system",
    labelKey: tk("activity.types.system"),
    color: "#475569",
    bg: "#f1f5f9",
    darkBg: "rgba(71, 85, 105, 0.22)",
    hasAmount: false,
  },
};

export interface ActivityTypeGroup {
  key: string;
  labelKey: string;
  types: ActivityEventType[];
  color: string;
}

export const ACTIVITY_FILTER_GROUPS: ActivityTypeGroup[] = [
  { key: "payments", labelKey: tk("activity.groups.payments"), types: ["payment", "customer_payment"], color: "#16a34a" },
  { key: "refunds", labelKey: tk("activity.groups.refunds"), types: ["refund"], color: "#ea580c" },
  { key: "discounts", labelKey: tk("activity.groups.discounts"), types: ["discount"], color: "#d97706" },
  {
    key: "backdated",
    labelKey: tk("activity.groups.backdated"),
    types: ["backdated_payment", "backdated_bill", "backdated_return"],
    color: "#7c3aed",
  },
  { key: "bills", labelKey: tk("activity.groups.bills"), types: ["invoice_created"], color: "#0284c7" },
  { key: "returns", labelKey: tk("activity.groups.returns"), types: ["return"], color: "#0d9488" },
  {
    key: "voids_deletes",
    labelKey: tk("activity.groups.voids_deletes"),
    types: ["payment_voided", "invoice_deleted", "invoice_restored"],
    color: "#dc2626",
  },
  { key: "reopened", labelKey: tk("activity.groups.reopened"), types: ["invoice_reopened"], color: "#4f46e5" },
  {
    key: "id_card",
    labelKey: tk("activity.groups.id_card"),
    types: ["id_card_released_unpaid"],
    color: "#e11d48",
  },
  { key: "reviews", labelKey: tk("activity.groups.reviews"), types: ["review"], color: "#ca8a04" },
  { key: "system", labelKey: tk("activity.groups.system"), types: ["system", "call_promise_missed"], color: "#475569" },
];

export const ALL_ACTIVITY_TYPES: ActivityEventType[] = Object.keys(ACTIVITY_TYPE_META) as ActivityEventType[];

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilterState = {
  preset: "today",
  types: [],
  staff: "",
  customer: "",
  invoice: "",
  amount_min: "",
  unread: false,
  checked: "all",
  high_only: false,
  after_hours: false,
};

export const DEFAULT_REASONS: Record<ReasonListKey, ActivitySettingsPayload["reasons"][ReasonListKey]> = {
  discount: [
    { key: "regular_customer", label_en: "Regular customer", label_si: "නිත්‍ය පාරිභෝගිකයා", active: true },
    { key: "bulk_long_rental", label_en: "Bulk / long rental", label_si: "තොග / දිගු කාලීන කුලිය", active: true },
    { key: "our_late_delivery", label_en: "Our late delivery", label_si: "අපගේ ප්‍රමාද බෙදාහැරීම", active: true },
    { key: "equipment_issue", label_en: "Equipment issue", label_si: "උපකරණ දෝෂය", active: true },
    { key: "owners_instruction", label_en: "Owner's instruction", label_si: "හිමිකරුගේ උපදෙස", active: true },
    { key: "other", label_en: "Other", label_si: "වෙනත්", active: true },
  ],
  backdate: [
    { key: "forgot_to_enter", label_en: "Forgot to enter", label_si: "ඇතුළත් කිරීමට අමතක විය", active: true },
    { key: "system_was_down", label_en: "System was down", label_si: "පද්ධතිය අක්‍රියව තිබුණි", active: true },
    { key: "entered_at_site", label_en: "Entered at the site", label_si: "වැඩබිමේදී ඇතුළත් කළා", active: true },
    { key: "customer_paid_earlier", label_en: "Customer paid earlier", label_si: "පාරිභෝගිකයා කලින් ගෙවා ඇත", active: true },
    { key: "other", label_en: "Other", label_si: "වෙනත්", active: true },
  ],
  refund: [
    { key: "returned_early", label_en: "Returned early", label_si: "කලින් ආපසු ලබා දුන්නා", active: true },
    { key: "deposit_refund", label_en: "Deposit refund", label_si: "තැන්පතු ආපසු ගෙවීම", active: true },
    { key: "overpayment", label_en: "Overpayment", label_si: "වැඩිපුර ගෙවීම", active: true },
    { key: "equipment_issue", label_en: "Equipment issue", label_si: "උපකරණ දෝෂය", active: true },
    { key: "other", label_en: "Other", label_si: "වෙනත්", active: true },
  ],
  void: [
    { key: "wrong_amount", label_en: "Wrong amount entered", label_si: "වැරදි මුදලක් ඇතුළත් කළා", active: true },
    { key: "wrong_method", label_en: "Wrong payment method", label_si: "වැරදි ගෙවීම් ක්‍රමය", active: true },
    { key: "duplicate_entry", label_en: "Duplicate entry", label_si: "ද්විත්ව ඇතුළත් කිරීම", active: true },
    { key: "bounced_cheque", label_en: "Bounced cheque", label_si: "චෙක්පත ආපසු හැරුණා", active: true },
    { key: "other", label_en: "Other", label_si: "වෙනත්", active: true },
  ],
};

export const DEFAULT_REVIEW_TAGS: ActivitySettingsPayload["review_tags"] = {
  positive: [
    { key: "on_time", label_en: "On time", label_si: "වෙලාවට", active: true },
    { key: "paid_promptly", label_en: "Paid promptly", label_si: "නියමිත වෙලාවට ගෙව්වා", active: true },
    { key: "clean", label_en: "Clean", label_si: "පිරිසිදුයි", active: true },
  ],
  negative: [
    { key: "late", label_en: "Late", label_si: "ප්‍රමාදයි", active: true },
    { key: "damaged", label_en: "Damaged", label_si: "හානි වී ඇත", active: true },
    { key: "payment_delayed", label_en: "Payment delayed", label_si: "ගෙවීම් ප්‍රමාදයි", active: true },
    { key: "difficult", label_en: "Difficult", label_si: "අපහසුයි", active: true },
  ],
};

export const DEFAULT_ACTIVITY_SETTINGS: ActivitySettingsPayload = {
  reasons: DEFAULT_REASONS,
  activity: {
    discountHighPct: 10,
    discountHighAmount: 5000,
    backdateHighDays: 2,
    refundHighAmount: 5000,
  },
  review_tags: DEFAULT_REVIEW_TAGS,
  activity_roles: {},
};
