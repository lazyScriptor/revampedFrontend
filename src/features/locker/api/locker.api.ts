import { api } from "@/lib/api";

export type CountKind = "START" | "OPENING" | "CLOSING";

export interface PersonRef {
  user_id: number;
  first_name?: string;
  last_name?: string;
}

export interface LockerCount {
  count_id: number;
  kind: CountKind;
  business_date: string;
  counted_at: string;
  counted_amount: number | string;
  expected_amount: number | string | null;
  difference: number | string;
  keep_amount: number | string | null;
  sent_home: number | string;
  left_in_drawer: number | string;
  reason: string | null;
  counted_by_user_id: number | null;
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  review_note: string | null;
  CountedBy?: PersonRef | null;
  ReviewedBy?: PersonRef | null;
}

export interface Movement {
  id: string;
  type: "advance" | "payment" | "refund" | "expense";
  at: string;
  amount: number;
  method: string;
  in_drawer: boolean;
  payment_id?: number;
  invoice_id?: number;
  expense_id?: number;
  customer_name?: string;
  category?: string;
  description?: string;
  by?: string;
}

export interface HeldAdvance {
  invoice_id: number;
  customer_name: string;
  issued_date: string;
  status: string;
  advance: number;
  refunded: number;
  held: number;
  all_back: boolean;
}

export interface LockerStatus {
  business_date: string;
  timezone: string;
  float: number;
  started: boolean;
  opening: LockerCount | null;
  todays_counts: LockerCount[];
  needs_opening: boolean;
  last_count: LockerCount | null;
  since: string;
  movements: Movement[];
  drawer_change: number;
  expected_now: number | null;
  held: HeldAdvance[];
  held_total: number;
  keep: number;
  send_home: number | null;
  owner_whatsapp: string | null;
}

export interface StartPreview {
  started: boolean;
  float: number;
  held: HeldAdvance[];
  keep: number;
}

// api.ts already unwraps axios' `response.data`, leaving the server's { status, data } envelope.
const data = <T>(body: any): T => body?.data as T;

export const fetchStatus = async () => data<LockerStatus>(await api.get("/locker/status"));
export const recordOpening = async (p: { amount: number; reason?: string }) =>
  data<{ count: LockerCount; owner_whatsapp: string | null }>(await api.post("/locker/opening", p));
export const recordClosing = async (p: { counted: number; sent_home?: number; reason?: string }) =>
  data<{ count: LockerCount }>(await api.post("/locker/closing", p));
export const recordExpense = async (p: { amount: number; category: string; description?: string }) => data(await api.post("/locker/expenses", p));
export const changePaymentMethod = async (p: { payment_id: number; method: string }) =>
  data(await api.patch(`/locker/payments/${p.payment_id}/method`, { method: p.method }));
export const fetchStartPreview = async () => data<StartPreview>(await api.get("/locker/start"));
export const startLocker = async (p: { counted: number; at_home_invoice_ids: number[]; sent_home?: number; reason?: string }) =>
  data<{ count: LockerCount }>(await api.post("/locker/start", p));
export const fetchHistory = async (p: { limit?: number; offset?: number } = {}) =>
  data<{ total: number; rows: LockerCount[] }>(await api.get("/locker/history", { params: p }));
export const reviewCount = async (p: { count_id: number; note?: string }) => data(await api.patch(`/locker/counts/${p.count_id}/review`, { note: p.note }));
export const setFloat = async (amount: number) => data<{ float: number }>(await api.put("/locker/float", { amount }));
