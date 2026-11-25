export type ActivityEventType =
  | "invoice_created"
  | "payment"
  | "refund"
  | "discount"
  | "backdated_payment"
  | "backdated_bill"
  | "backdated_return"
  | "return"
  | "payment_voided"
  | "invoice_deleted"
  | "invoice_restored"
  | "invoice_reopened"
  | "id_card_released_unpaid"
  | "review"
  | "customer_payment"
  | "call_promise_missed"
  | "system";

export type ActivityRisk = "high" | "normal";

export type ActivityDatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "this_month"
  | "custom";

export type ReasonListKey = "discount" | "backdate" | "refund" | "void";

export interface ReasonOption {
  key: string;
  label_en: string;
  label_si: string;
  active: boolean;
}

export interface ReasonValue {
  key: string;
  note?: string;
}

export interface ReviewTagOption {
  key: string;
  label_en: string;
  label_si: string;
  active: boolean;
}

export interface ActivityThresholds {
  discountHighPct: number;
  discountHighAmount: number;
  backdateHighDays: number;
  refundHighAmount: number;
}

export interface ActivityRolePolicy {
  types: ActivityEventType[];
  see_amounts: boolean;
}

export interface ActivitySettingsPayload {
  reasons: Record<ReasonListKey, ReasonOption[]>;
  activity: ActivityThresholds;
  review_tags: {
    positive: ReviewTagOption[];
    negative: ReviewTagOption[];
  };
  activity_roles: Record<string, ActivityRolePolicy>;
}

export interface ActivityEventData {
  sentence?: string;
  sentence_en?: string;
  sentence_si?: string;
  reason_key?: string;
  reason_label?: string;
  reason_note?: string;
  days_back?: number;
  late_fee_difference?: number;
  [key: string]: unknown;
}

export interface ActivityEvent {
  event_id: number;
  type: ActivityEventType;
  risk: ActivityRisk;
  invoice_id: number | null;
  invoice_number?: string | null;
  customer_id: number | null;
  customer_name?: string | null;
  actor_user_id: number | null;
  actor_name?: string | null;
  amount: number | null;
  data: ActivityEventData;
  occurred_at: string;
  after_hours: boolean;
  checked_by: number | null;
  checked_by_name?: string | null;
  checked_at: string | null;
  comment_count: number;
  is_read: boolean;
  created_at: string;
}

export interface ActivityComment {
  comment_id: number;
  event_id: number;
  user_id: number;
  user_name?: string;
  body: string;
  created_at: string;
}

export interface ActivityFilterState {
  preset: ActivityDatePreset;
  from?: string;
  to?: string;
  types: ActivityEventType[];
  staff?: number | "";
  customer?: string;
  invoice?: string;
  amount_min?: string;
  unread?: boolean;
  checked?: "all" | "not_checked" | "checked";
  high_only?: boolean;
  after_hours?: boolean;
}

export interface ActivityListResponse {
  events: ActivityEvent[];
  total: number;
  page: number;
  limit: number;
  totals: {
    count: number;
    amount: number;
    high_count: number;
    not_checked_count: number;
  };
  see_amounts?: boolean;
}

export interface ActivitySummaryTypeRow {
  type: ActivityEventType;
  count: number;
  amount: number;
  high_count: number;
}

export interface ActivitySummaryBucket {
  key: string;
  label: string;
  date?: string;
  counts: Partial<Record<ActivityEventType, number>>;
  total: number;
}

export interface ActivityStaffSummaryRow {
  user_id: number;
  name: string;
  discounts: number;
  backdated: number;
  refunds: number;
  total: number;
}

export interface ActivitySummaryResponse {
  by_type: ActivitySummaryTypeRow[];
  buckets: ActivitySummaryBucket[];
  granularity: "hour" | "day";
  not_checked_count: number;
  high_not_checked_count: number;
  by_staff?: ActivityStaffSummaryRow[];
  see_amounts?: boolean;
}

export interface SavedActivityFilter {
  id: string;
  name: string;
  filters: ActivityFilterState;
}

export interface ReturnPreviewResponse {
  late_fee_today: number;
  late_fee_at_date: number;
  difference: number;
}
