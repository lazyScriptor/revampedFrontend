import type {
  CollectionBillCard,
  CollectionTimelineDot,
  CustomerCallsSummary,
  CustomerCollectionDetailResponse,
} from "../types";

/**
 * `GET /api/reports/customers/collections/:customerId` answers with the server's names
 * (`both_totals.{filtered,all}`, `calls_section.{summary,calls}`, bills with `live_total`/`owed`).
 * The page was written against other names (`filtered_totals`, `all_totals`, `calls_summary`,
 * bills with `revenue`/`balance`). Reading the missing ones crashed the page ("reading 'balance'"),
 * so every reply is mapped here. A reply already in the page's shape passes through unchanged.
 */
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const totals = (t: any) => ({
  revenue: num(t?.revenue),
  paid: num(t?.paid),
  balance: num(t?.balance ?? t?.owed),
  machines_out: num(t?.machines_out ?? t?.units_out),
});

const bill = (b: any): CollectionBillCard => ({
  ...b,
  invoice_id: num(b?.invoice_id),
  issued_date: b?.issued_date ?? "",
  status: b?.status ?? "",
  is_complete: b?.is_complete ?? b?.status === "Completed",
  revenue: num(b?.revenue ?? b?.live_total),
  paid: num(b?.paid),
  balance: num(b?.balance ?? b?.owed),
  running_charge: num(b?.running_charge ?? b?.accrued_charges),
  discount_amount: num(b?.discount_amount),
  days_late: num(b?.days_late ?? b?.days_overdue),
  has_items_out: b?.has_items_out ?? num(b?.units_out) > 0,
  lines: (Array.isArray(b?.lines) ? b.lines : []).map((l: any) => ({
    ...l,
    line_id: num(l?.line_id),
    equipment_name: l?.equipment_name ?? "",
    borrow_quantity: num(l?.borrow_quantity),
    returned_quantity: num(l?.returned_quantity ?? num(l?.good_returned_qty) + num(l?.defective_returned_qty)),
    units_out: num(l?.units_out),
    days_late: num(l?.days_late),
    running_charge: num(l?.running_charge ?? l?.accrued_charge),
  })),
  payments: (Array.isArray(b?.payments) ? b.payments : []).map((p: any) => ({
    ...p,
    payment_id: num(p?.payment_id),
    amount: num(p?.amount ?? p?.payment_amount),
    method: p?.method ?? "",
    payment_date: p?.payment_date ?? "",
  })),
});

const dot = (d: any): CollectionTimelineDot => ({
  ...d,
  invoice_id: num(d?.invoice_id),
  issued_date: d?.issued_date ?? "",
  state: d?.state ?? "open_owing",
  balance: num(d?.balance ?? d?.owed),
});

const callsSummary = (s: any): CustomerCallsSummary => ({
  ...s,
  total: num(s?.total ?? s?.total_calls),
  answered: num(s?.answered ?? s?.answered_count),
  no_answer: num(s?.no_answer ?? s?.no_answer_count),
  unreachable: num(s?.unreachable ?? s?.unreachable_count),
  by_staff: (Array.isArray(s?.by_staff) ? s.by_staff : []).map((x: any) => ({
    staff_id: x?.staff_id ?? x?.user_id ?? null,
    staff_name: x?.staff_name ?? x?.name ?? "",
    count: num(x?.count),
  })),
  promises_count: num(s?.promises_count),
  promises_amount: num(s?.promises_amount ?? s?.promise_total),
  next_promise: s?.next_promise ?? null,
});

export const normalizeCollectionDetail = (raw: any): CustomerCollectionDetailResponse | null => {
  if (!raw || typeof raw !== "object" || !raw.customer) return null;
  const filtered = raw.filtered_totals ?? raw.both_totals?.filtered ?? raw.customer;
  const all = raw.all_totals ?? raw.both_totals?.all ?? filtered;
  return {
    ...raw,
    customer: {
      ...normalizeCollectionRow(raw.customer),
      balance: num(raw.customer?.balance ?? filtered?.balance),
    },
    filters_on: Boolean(raw.filters_on),
    filter_summary: raw.filter_summary ?? "",
    filtered_totals: totals(filtered),
    all_totals: totals(all),
    timeline: (Array.isArray(raw.timeline) ? raw.timeline : []).map(dot),
    not_complete_bills: (Array.isArray(raw.not_complete_bills) ? raw.not_complete_bills : []).map(bill),
    complete_bills: (Array.isArray(raw.complete_bills) ? raw.complete_bills : []).map(bill),
    calls_summary: callsSummary(raw.calls_summary ?? raw.calls_section?.summary),
    calls: Array.isArray(raw.calls) ? raw.calls : Array.isArray(raw.calls_section?.calls) ? raw.calls_section.calls : [],
  };
};

/** Machine chips: the server sends count/longest_days/overdue_days. */
export const normalizeMachineChip = (m: any) => ({
  ...m,
  equipment_id: num(m?.equipment_id),
  name: m?.name ?? m?.equipment_name ?? "",
  qty: num(m?.qty ?? m?.count),
  max_days_out: num(m?.max_days_out ?? m?.longest_days),
  days_overdue: num(m?.days_overdue ?? m?.overdue_days),
});

/** One customer row of the Collections list (the server nests the late figures under `overdue`). */
export const normalizeCollectionRow = (r: any) => ({
  ...r,
  revenue: num(r?.revenue),
  paid: num(r?.paid),
  balance: num(r?.balance),
  overdue_machines_count: num(r?.overdue_machines_count ?? r?.overdue?.units_out),
  overdue_max_days: num(r?.overdue_max_days ?? r?.overdue?.longest_days),
  overdue_amount: num(r?.overdue_amount ?? r?.overdue?.late_money),
  has_items_out: r?.has_items_out ?? num(r?.units_out) > 0,
  oldest_unpaid_date: r?.oldest_unpaid_date ?? r?.oldest_unpaid_bill ?? null,
  machines_out: (Array.isArray(r?.machines_out) ? r.machines_out : []).map(normalizeMachineChip),
});

/** `GET /api/reports/customers/collections`: `optionCounts` and `pagination.total` on the server. */
export const normalizeCollectionsList = (raw: any) => {
  const t = raw?.totals ?? {};
  return {
    ...raw,
    rows: (Array.isArray(raw?.rows) ? raw.rows : []).map(normalizeCollectionRow),
    total: num(raw?.total ?? raw?.pagination?.total),
    page: num(raw?.page ?? raw?.pagination?.page) || 1,
    limit: num(raw?.limit ?? raw?.pagination?.limit) || 50,
    totals: {
      ...t,
      customer_count: num(t.customer_count),
      revenue: num(t.revenue),
      paid: num(t.paid),
      balance: num(t.balance),
      machines_out: num(t.machines_out ?? t.units_out),
      overdue_amount: num(t.overdue_amount),
    },
    option_counts: raw?.option_counts ?? raw?.optionCounts ?? { owes_money: 0, not_returned: 0, late: 0, everyone: 0 },
  };
};

/** `GET /api/reports/calls`: the server reads preset/from/to (not startDate/endDate). */
export const toServerCallsParams = (p: Record<string, unknown>) => {
  const { startDate, endDate, ...rest } = p as any;
  const out: Record<string, unknown> = { ...rest };
  if (startDate || endDate) {
    out.preset = "custom";
    if (startDate) out.from = String(startDate).slice(0, 10);
    if (endDate) out.to = String(endDate).slice(0, 10);
  }
  for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === "") delete out[k];
  return out;
};

/** The server answers `totals.*_count` and `pagination.total`; the page reads `summary` and `total`. */
export const normalizeCallsReport = (raw: any) => {
  const t = raw?.summary ?? raw?.totals ?? {};
  return {
    ...raw,
    rows: Array.isArray(raw?.rows) ? raw.rows : [],
    total: num(raw?.total ?? raw?.pagination?.total),
    summary: {
      total_calls: num(t.total_calls),
      answered: num(t.answered ?? t.answered_count),
      no_answer: num(t.no_answer ?? t.no_answer_count),
      unreachable: num(t.unreachable ?? t.unreachable_count),
      promises_count: num(t.promises_count),
      promises_amount: num(t.promises_amount ?? t.promise_amount_total),
      promises_kept: num(t.promises_kept),
      promises_missed: num(t.promises_missed),
    },
    by_staff: (Array.isArray(raw?.by_staff) ? raw.by_staff : []).map((s: any) => ({
      ...s,
      staff_id: s?.staff_id ?? s?.user_id ?? null,
      staff_name: s?.staff_name ?? s?.name ?? "",
      total_calls: num(s?.total_calls),
      answered: num(s?.answered ?? s?.answered_count),
      promises_count: num(s?.promises_count),
      promises_kept: num(s?.promises_kept),
    })),
  };
};
