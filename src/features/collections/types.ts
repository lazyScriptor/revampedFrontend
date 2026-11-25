export type CallOutcome = "answered" | "no_answer" | "unreachable";
export type PromiseStatus = "waiting" | "kept" | "missed";
export type CallFilterKey =
  | "not_called_today"
  | "no_answer"
  | "promised"
  | "promise_missed"
  | "call_again_today"
  | "calls_to_note";

export interface CallResultOption {
  key: string;
  label_en: string;
  label_si: string;
  active: boolean;
  requires_promise?: boolean;
  requires_date?: boolean;
  requires_note?: boolean;
}

export const DEFAULT_CALL_RESULTS: CallResultOption[] = [
  { key: "will_pay_today", label_en: "Will pay today", label_si: "අද ගෙවනවා", active: true },
  { key: "will_pay_on_date", label_en: "Will pay on a date", label_si: "දිනයක ගෙවනවා", active: true, requires_promise: true, requires_date: true },
  { key: "will_return_machines", label_en: "Will bring machines back", label_si: "යන්ත්‍ර ආපසු ගෙන එනවා", active: true, requires_date: true },
  { key: "asked_more_time", label_en: "Asked for more time", label_si: "වැඩි කාලයක් ඉල්ලුවා", active: true },
  { key: "disputes_amount", label_en: "Says amount is wrong", label_si: "මුදල වැරදි බව කියයි", active: true },
  { key: "other", label_en: "Other", label_si: "වෙනත්", active: true, requires_note: true },
];

export interface LastCallSummary {
  call_id?: number | null;
  started_at?: string | null;
  duration_seconds?: number | null;
  outcome?: CallOutcome | null;
  suggested_outcome?: "answered" | "no_answer" | null;
  result?: string | null;
  result_label?: string | null;
  note?: string | null;
  staff_name?: string | null;
  tries_today?: number;
  promise_amount?: number | null;
  promise_date?: string | null;
  promise_status?: PromiseStatus | null;
  call_again_on?: string | null;
  needs_note?: boolean;
}

export interface CallLogEntry {
  call_id: number;
  customer_id: number | null;
  customer_name?: string | null;
  phone_e164?: string | null;
  raw_number?: string | null;
  direction: "INCOMING" | "OUTGOING" | "MISSED";
  source: "phone" | "manual";
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  staff_id?: number | null;
  staff_name?: string | null;
  device_label?: string | null;
  suggested_outcome?: "answered" | "no_answer" | null;
  outcome?: CallOutcome | null;
  result?: string | null;
  result_label?: string | null;
  note?: string | null;
  promise_amount?: number | null;
  promise_date?: string | null;
  promise_status?: PromiseStatus | null;
  promise_kept_at?: string | null;
  call_again_on?: string | null;
  invoice_ids?: number[];
  recording_id?: number | null;
  recording_duration_seconds?: number | null;
  dispute_hold?: boolean;
}

export interface SaveCallOutcomePayload {
  call_id?: number | null;
  customer_id: number;
  invoice_ids?: number[];
  outcome: CallOutcome;
  result?: string | null;
  note?: string | null;
  promise_amount?: number | null;
  promise_date?: string | null;
  expected_return_date?: string | null;
  call_again_on?: string | null;
  phone?: string | null;
}

export interface DialFromPhonePayload {
  phone: string;
  customer_id?: number;
  invoice_ids?: number[];
}

export type CollectionsDatePreset = "all_time" | "this_month" | "last_3_months" | "this_year" | "custom";
export type CollectionsDateBasis = "bill_date" | "due_date";

export interface CollectionsQueryParams {
  owes_money?: boolean;
  not_returned?: boolean;
  late?: boolean;
  everyone?: boolean;
  date_preset?: CollectionsDatePreset;
  from?: string;
  to?: string;
  date_basis?: CollectionsDateBasis;
  search?: string;
  bill_status?: "complete" | "not_complete" | "";
  return_status?: "returned" | "not_returned" | "";
  overdue_only?: boolean;
  balance_min?: number;
  rating?: number;
  call_state?: "not_called" | "no_answer" | "promised" | "promise_missed" | "";
  blacklisted?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CollectionMachineOutChip {
  equipment_id: number;
  name: string;
  qty: number;
  max_days_out: number;
  days_overdue: number;
}

export interface CollectionCustomerRow {
  customer_id: number;
  name: string;
  customer_type?: "Individual" | "Business";
  nic_number?: string | null;
  phone_number?: string | null;
  rating?: number | null;
  is_blacklisted?: boolean;
  status_label?: "Good" | "Watch" | "Blacklisted";
  revenue: number;
  paid: number;
  balance: number;
  overdue_machines_count: number;
  overdue_max_days: number;
  overdue_amount: number;
  has_items_out: boolean;
  last_bill_date?: string | null;
  oldest_unpaid_date?: string | null;
  oldest_due_date?: string | null;
  last_payment_date?: string | null;
  last_call?: LastCallSummary | null;
  machines_out: CollectionMachineOutChip[];
  invoice_ids?: number[];
}

export interface CollectionsTotals {
  customer_count: number;
  revenue: number;
  paid: number;
  balance: number;
  machines_out: number;
  overdue_amount: number;
}

export interface CollectionsOptionCounts {
  owes_money: number;
  not_returned: number;
  late: number;
  everyone: number;
}

export interface CollectionsListResponse {
  rows: CollectionCustomerRow[];
  total: number;
  page: number;
  limit: number;
  totals: CollectionsTotals;
  option_counts: CollectionsOptionCounts;
}

export interface CollectionBillLineItem {
  line_id: number;
  equipment_name: string;
  borrow_quantity: number;
  returned_quantity: number;
  units_out: number;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  days_late: number;
  running_charge: number;
}

export interface CollectionBillCard {
  invoice_id: number;
  issued_date: string;
  status: string;
  is_complete: boolean;
  revenue: number;
  paid: number;
  balance: number;
  running_charge: number;
  discount_amount: number;
  discount_reason_key?: string | null;
  discount_reason_note?: string | null;
  days_late: number;
  has_items_out: boolean;
  lines: CollectionBillLineItem[];
  payments: Array<{
    payment_id: number;
    amount: number;
    method: string;
    payment_date: string;
  }>;
}

export interface CollectionTimelineDot {
  invoice_id: number;
  issued_date: string;
  state: "open_owing" | "open_paid" | "complete";
  balance: number;
}

export interface CustomerCallsSummary {
  total: number;
  answered: number;
  no_answer: number;
  unreachable: number;
  by_staff: Array<{ staff_id: number | null; staff_name: string; count: number }>;
  promises_count: number;
  promises_amount: number;
  next_promise?: { amount: number; date: string } | null;
}

export interface CustomerCollectionDetailResponse {
  customer: CollectionCustomerRow;
  filters_on: boolean;
  filter_summary: string;
  filtered_totals: { revenue: number; paid: number; balance: number; machines_out: number };
  all_totals: { revenue: number; paid: number; balance: number; machines_out: number };
  timeline: CollectionTimelineDot[];
  not_complete_bills: CollectionBillCard[];
  complete_bills: CollectionBillCard[];
  calls_summary: CustomerCallsSummary;
  calls: CallLogEntry[];
}

export interface CallsReportResponse {
  rows: CallLogEntry[];
  total: number;
  summary: {
    total_calls: number;
    answered: number;
    no_answer: number;
    unreachable: number;
    promises_count: number;
    promises_amount: number;
    promises_kept: number;
    promises_missed: number;
  };
  by_staff: Array<{
    staff_id: number | null;
    staff_name: string;
    total_calls: number;
    answered: number;
    promises_count: number;
    promises_kept: number;
  }>;
}

export interface CallRecordingSettings {
  enabled: boolean;
  retentionDays: 30 | 90 | 180;
  mobileData: boolean;
  deleteFromPhoneAfterUpload: boolean;
  termsLineEnabled: boolean;
  termsLine_en: string;
  termsLine_si: string;
}

export const DEFAULT_CALL_RECORDING_SETTINGS: CallRecordingSettings = {
  enabled: false,
  retentionDays: 90,
  mobileData: false,
  deleteFromPhoneAfterUpload: false,
  termsLineEnabled: false,
  termsLine_en: "Calls with our shop may be recorded for service and record-keeping.",
  termsLine_si: "සේවා සහ වාර්තා තබා ගැනීම සඳහා අපගේ වෙළඳසැල සමඟ සිදු කරන ඇමතුම් පටිගත කළ හැක.",
};

export interface SavedCollectionView {
  id: string;
  name: string;
  params: CollectionsQueryParams;
}
