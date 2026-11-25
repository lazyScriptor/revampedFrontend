import type { ReasonValue } from "@/features/activity/types";

export type AgeBucket = "green" | "amber" | "red";

export type OpenBillsFilter =
  | "payment_due"
  | "machines_out"
  | "all_back"
  | "completed"
  | "all";

export type OpenBillsDatePreset =
  | "this_month"
  | "last_3_months"
  | "this_year"
  | "custom"
  | "all";

export type OpenBillsSort = "oldest" | "biggest_balance" | "newest";

export type SplitRule = "oldest_first" | "cheaper_for_customer";

export type QueueRule = "fully_back_first" | "biggest_balance" | "split_evenly";

export type LeftoverMode = "credit" | "change" | "none";

export interface SettlementCustomer {
  customer_id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone_number?: string | null;
  nic_number?: string | null;
  photo_url?: string | null;
  deposit_balance?: number;
  rating?: number | null;
  is_blacklisted?: boolean;
}

export interface SettlementOverviewSummary {
  total_owed: number;
  open_bills_count: number;
  machines_out_count: number;
  oldest_unpaid_bill_date: string | null;
  id_cards_held_count: number;
  last_payment: {
    amount: number;
    date: string;
    method?: string;
  } | null;
}

export interface OverviewBillBarItem {
  invoice_id: number;
  issued_date: string;
  status: string;
  id_card_status: number | string;
  live_total: number;
  amount_paid: number;
  owed: number;
  age_days: number;
  age_bucket: AgeBucket;
}

export interface MachinesBarItem {
  equipment_id: number;
  equipment_name: string;
  equipment_name_si?: string | null;
  serial_number?: string | null;
  is_bulk_item: boolean;
  image_url?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  units_out: number;
  bills_count: number;
  invoice_ids: number[];
  oldest_due_date: string | null;
  daily_rate?: number;
}

export interface SettlementOverviewResponse {
  customer: SettlementCustomer;
  summary: SettlementOverviewSummary;
  bills_bar: OverviewBillBarItem[];
  machines_bar: MachinesBarItem[];
}

export interface OpenBillMachineCount {
  equipment_id: number;
  equipment_name: string;
  equipment_name_si?: string | null;
  serial_number?: string | null;
  is_bulk_item?: boolean;
  image_url?: string | null;
  out_qty: number;
  returned_qty: number;
  total_qty: number;
  daily_rate?: number;
  due_date?: string | null;
  days_late?: number;
  invoice_line_id?: number;
}

export interface OpenBillItem {
  invoice_id: number;
  issued_date: string;
  status: string;
  age_days: number;
  age_bucket: AgeBucket;
  live_total: number;
  billed_total_amount: number;
  accrued_charges: number;
  discount_amount: number;
  amount_paid: number;
  balance: number;
  growing_per_day: number;
  machines_out_count: number;
  machine_counts: OpenBillMachineCount[];
  id_card_status: number | string;
  on_behalf_of_customer_id?: number | null;
  on_behalf_of_customer_name?: string | null;
}

export interface OpenBillsResponse {
  bills: OpenBillItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface OpenBillsQueryParams {
  filter?: OpenBillsFilter;
  date_preset?: OpenBillsDatePreset;
  from?: string;
  to?: string;
  equipment_id?: number;
  category_id?: number;
  sort?: OpenBillsSort;
  page?: number;
  limit?: number;
}

export interface SettlementReturnPlacementInput {
  invoice_line_id: number;
  qty: number;
  damaged_qty: number;
}

export interface SettlementReturnInput {
  equipment_id: number;
  qty: number;
  damaged_qty: number;
  placement?: SettlementReturnPlacementInput[];
}

export interface SettlementPaymentInput {
  amount: number;
  method: string;
  payment_date?: string;
  date_reason?: ReasonValue;
}

export interface SettlementDiscountInput {
  invoice_id: number;
  amount?: number;
  pct?: number;
  reason: ReasonValue;
}

export interface SettlementPreviewRequest {
  invoice_ids?: number[];
  returns?: SettlementReturnInput[];
  return_date?: string;
  date_reason?: ReasonValue;
  split_rule?: SplitRule;
  payments?: SettlementPaymentInput[];
  queue_order?: number[];
  bill_amounts?: Record<number, number>;
  discounts?: SettlementDiscountInput[];
  leftover_mode?: LeftoverMode;
  use_wallet_amount?: number;
  note?: string;
}

export interface PreviewBillLine {
  invoice_line_id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_name_si?: string | null;
  is_bulk_item?: boolean;
  serial_number?: string | null;
  out_before: number;
  out_after: number;
  returned_qty: number;
  damaged_qty: number;
  late_fee?: number;
}

export interface PreviewBillChange {
  type: "payment" | "discount" | "late_fee" | "return" | "wallet" | string;
  label_en?: string;
  label_si?: string;
  amount?: number;
  reason?: string;
}

export interface PreviewBillResult {
  invoice_id: number;
  issued_date: string;
  queue_position: number;
  changed: boolean;
  status_before: string;
  status_after: string;
  id_card_status: number | string;
  before: {
    balance: number;
    paid: number;
    total: number;
    machines_out: number;
    discount: number;
    late_fee?: number;
  };
  after: {
    balance: number;
    paid: number;
    total: number;
    machines_out: number;
    discount: number;
    late_fee?: number;
  };
  changes: PreviewBillChange[];
  lines?: PreviewBillLine[];
  stamps: {
    paid_off?: boolean;
    ready_to_close?: boolean;
  };
  payment_allocated?: number;
}

export interface SettlementPreviewTotals {
  owed_before: number;
  owed_after: number;
  machines_out_before: number;
  machines_out_after: number;
  payment_total: number;
  wallet_used: number;
  leftover_amount: number;
  leftover_mode: LeftoverMode;
  late_fees_added?: number;
  discount_total?: number;
}

export interface SettlementPreviewResponse {
  customer_id: number;
  customer_name: string;
  return_date: string;
  split_rule: SplitRule;
  cheaper_alternative?: {
    available: boolean;
    saving: number;
    total_late_fees: number;
  };
  totals: SettlementPreviewTotals;
  bills: PreviewBillResult[];
  summary: {
    en: string;
    si: string;
  };
  preview_version: string;
}

export interface SettlementCommitResponse extends SettlementPreviewResponse {
  settlement_id: number;
  settled_at: string;
  entered_at?: string;
  staff_name?: string;
  is_voided?: boolean;
}

export interface SettlementChangedConflict {
  code: "settlement_changed";
  preview: SettlementPreviewResponse;
}

export interface CompleteBillsResponse {
  completed_invoice_ids: number[];
  count: number;
}

export interface SettlementViewPreferences {
  cardSize: "compact" | "normal" | "detailed";
  showMachineIcons: boolean;
  showPaymentHistory: boolean;
  showDiscount: boolean;
  showRunningCharge: boolean;
  showDates: boolean;
  defaultSplitRule: SplitRule;
  defaultQueueRule: QueueRule;
  defaultFilter: OpenBillsFilter;
  groupByMonth: boolean;
}
