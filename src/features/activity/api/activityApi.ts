import { api } from "@/lib/api";
import { deviceApi } from "@/features/phone-assistant/lib/nativeBridge";
import type {
  ActivityComment,
  ActivityFilterState,
  ActivityListResponse,
  ActivitySettingsPayload,
  ActivitySummaryResponse,
  ReturnPreviewResponse,
  SavedActivityFilter,
} from "../types";
import { DEFAULT_ACTIVITY_SETTINGS } from "../constants";

export type ActivityApiMode = "staff" | "device";

const unwrap = <T,>(res: any): T => {
  const first = res?.data !== undefined ? res.data : res;
  return (first?.data !== undefined && first?.status ? first.data : first) as T;
};

const clientFor = (mode: ActivityApiMode) => (mode === "device" ? deviceApi : api);
const prefixFor = (mode: ActivityApiMode) => (mode === "device" ? "/device/activity" : "/activity");

export function buildActivityQueryParams(
  filters: Partial<ActivityFilterState>,
  extra?: { page?: number; limit?: number; invoice_id?: number },
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  // A tapped bar narrows the period to one day. The server prefers a preset over from/to,
  // so the preset has to be left out then.
  const singleDay = Boolean(filters.from && filters.from === filters.to);
  if (filters.preset && !(singleDay && filters.preset !== "custom")) {
    params.preset = filters.preset;
    params.date = filters.preset;
  }
  if (filters.preset === "custom" || singleDay) {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  }
  if (filters.types && filters.types.length > 0) {
    params.types = filters.types.join(",");
  }
  if (filters.staff) params.staff = Number(filters.staff);
  if (filters.customer?.trim()) params.customer = filters.customer.trim();
  if (filters.invoice?.trim()) params.invoice = filters.invoice.trim();
  if (filters.amount_min && Number(filters.amount_min) > 0) {
    params.amount_min = Number(filters.amount_min);
  }
  if (filters.unread) params.unread = "true";
  if (filters.checked === "checked") params.checked = "true";
  if (filters.checked === "not_checked") params.checked = "false";
  if (filters.high_only) params.risk = "high";
  if (filters.after_hours) params.after_hours = "true";
  if (extra?.page) params.page = extra.page;
  if (extra?.limit) params.limit = extra.limit;
  if (extra?.invoice_id) params.invoice_id = extra.invoice_id;
  return params;
}

export const fetchActivityList = async (
  filters: Partial<ActivityFilterState>,
  page = 1,
  limit = 50,
  invoiceId?: number,
  mode: ActivityApiMode = "staff",
): Promise<ActivityListResponse> => {
  const params = buildActivityQueryParams(filters, { page, limit, invoice_id: invoiceId });
  const res = await clientFor(mode).get(prefixFor(mode), { params });
  const payload = unwrap<Partial<ActivityListResponse>>(res);
  return {
    events: payload?.events ?? [],
    total: payload?.total ?? 0,
    page: payload?.page ?? page,
    limit: payload?.limit ?? limit,
    // The server sends the filtered totals with the summary, not with the list.
    totals: payload?.totals,
    see_amounts: payload?.see_amounts ?? true,
  };
};

/** The server groups as { bucket, types: { type: { count } }, total_count }; the chart reads counts by type. */
const normalizeBucket = (raw: any) => {
  if (raw?.counts) return raw;
  const key = String(raw?.bucket ?? raw?.key ?? "");
  const [day, time] = key.split(" ");
  return {
    key,
    label: time || (day.length === 10 ? `${day.slice(8, 10)}/${day.slice(5, 7)}` : key),
    date: day || undefined,
    counts: Object.fromEntries(
      Object.entries(raw?.types ?? {}).map(([type, v]: [string, any]) => [type, Number(v?.count ?? 0)]),
    ),
    total: Number(raw?.total_count ?? raw?.total ?? 0),
  };
};

export const fetchActivitySummary = async (
  filters: Partial<ActivityFilterState>,
  mode: ActivityApiMode = "staff",
): Promise<ActivitySummaryResponse> => {
  const params = buildActivityQueryParams(filters);
  const res = await clientFor(mode).get(`${prefixFor(mode)}/summary`, { params });
  const payload = unwrap<any>(res) ?? {};
  const rawByType = payload.by_type;
  const by_type = Array.isArray(rawByType)
    ? rawByType
    : rawByType && typeof rawByType === "object"
      ? Object.entries(rawByType).map(([type, stats]: [string, any]) => ({
          type,
          count: Number(stats?.count ?? 0),
          amount: Number(stats?.amount ?? 0),
          high_count: Number(stats?.high_count ?? 0),
        }))
      : [];
  const notChecked = payload.not_checked_count ?? payload.not_checked ?? 0;
  return {
    by_type,
    buckets: (payload.buckets ?? []).map(normalizeBucket),
    totals: payload.totals
      ? {
          count: Number(payload.totals.count ?? 0),
          amount: Number(payload.totals.amount ?? 0),
          high_count: Number(payload.totals.high_count ?? 0),
          not_checked_count: Number(payload.totals.not_checked_count ?? payload.totals.not_checked ?? notChecked),
        }
      : undefined,
    can_check: payload.can_check,
    granularity: payload.granularity ?? (filters.preset === "today" ? "hour" : "day"),
    not_checked_count: notChecked,
    high_not_checked_count: payload.high_not_checked_count ?? payload.high_not_checked ?? 0,
    by_staff: payload.by_staff ?? undefined,
    see_amounts: payload.see_amounts ?? true,
  };
};

export const checkActivityEvent = async (id: number, mode: ActivityApiMode = "staff") => {
  const res = await clientFor(mode).post(`${prefixFor(mode)}/${id}/check`);
  return unwrap<{ event_id: number; checked_by: number; checked_by_name?: string; checked_at: string }>(res);
};

export const uncheckActivityEvent = async (id: number, mode: ActivityApiMode = "staff") => {
  const res = await clientFor(mode).delete(`${prefixFor(mode)}/${id}/check`);
  return unwrap<{ event_id: number; checked_by: null; checked_at: null }>(res);
};

export const fetchActivityComments = async (
  id: number,
  mode: ActivityApiMode = "staff",
): Promise<ActivityComment[]> => {
  const res = await clientFor(mode).get(`${prefixFor(mode)}/${id}/comments`);
  const comments = unwrap<{ comments?: Array<ActivityComment & { author_name?: string }> }>(res)?.comments ?? [];
  return comments.map((c) => ({ ...c, user_name: c.user_name ?? c.author_name }));
};

export const addActivityComment = async (
  id: number,
  body: string,
  mode: ActivityApiMode = "staff",
): Promise<ActivityComment> => {
  const res = await clientFor(mode).post(`${prefixFor(mode)}/${id}/comments`, { body });
  return unwrap<{ comment: ActivityComment }>(res)?.comment ?? unwrap<ActivityComment>(res);
};

export const markActivityEventsRead = async (
  eventIds: number[],
  mode: ActivityApiMode = "staff",
): Promise<void> => {
  if (eventIds.length === 0) return;
  await clientFor(mode).post(`${prefixFor(mode)}/read`, { event_ids: eventIds });
};

export const exportActivityExcel = async (filters: Partial<ActivityFilterState>): Promise<Blob> => {
  const params = buildActivityQueryParams(filters);
  const res = await api.get("/activity/export", { params, responseType: "blob" });
  return res as unknown as Blob;
};

export const fetchSavedActivityFilters = async (): Promise<SavedActivityFilter[]> => {
  const res = await api.get("/activity/saved-filters");
  return unwrap<{ filters?: SavedActivityFilter[] }>(res)?.filters ?? [];
};

export const createSavedActivityFilter = async (
  name: string,
  filters: ActivityFilterState,
): Promise<SavedActivityFilter> => {
  const res = await api.post("/activity/saved-filters", { name, filters });
  return unwrap<{ filter: SavedActivityFilter }>(res)?.filter ?? unwrap<SavedActivityFilter>(res);
};

export const deleteSavedActivityFilter = async (id: string): Promise<void> => {
  await api.delete(`/activity/saved-filters/${id}`);
};

export const fetchActivitySettings = async (): Promise<ActivitySettingsPayload> => {
  const res = await api.get("/activity/settings");
  const payload = unwrap<Partial<ActivitySettingsPayload>>(res);
  return {
    reasons: {
      discount: payload?.reasons?.discount ?? DEFAULT_ACTIVITY_SETTINGS.reasons.discount,
      backdate: payload?.reasons?.backdate ?? DEFAULT_ACTIVITY_SETTINGS.reasons.backdate,
      refund: payload?.reasons?.refund ?? DEFAULT_ACTIVITY_SETTINGS.reasons.refund,
      void: payload?.reasons?.void ?? DEFAULT_ACTIVITY_SETTINGS.reasons.void,
    },
    activity: {
      ...DEFAULT_ACTIVITY_SETTINGS.activity,
      ...(payload?.activity ?? {}),
    },
    review_tags: {
      positive: payload?.review_tags?.positive ?? DEFAULT_ACTIVITY_SETTINGS.review_tags.positive,
      negative: payload?.review_tags?.negative ?? DEFAULT_ACTIVITY_SETTINGS.review_tags.negative,
    },
    activity_roles: payload?.activity_roles ?? {},
  };
};

export const updateActivitySettings = async (
  patch: Partial<ActivitySettingsPayload>,
): Promise<ActivitySettingsPayload> => {
  const res = await api.put("/activity/settings", patch);
  return unwrap<ActivitySettingsPayload>(res);
};

export const fetchReturnDatePreview = async (
  invoiceId: number,
  actualReturnDate: string,
  lines?: Array<{ line_id: number; good_qty: number; defective_qty: number }>,
): Promise<ReturnPreviewResponse> => {
  const res = await api.post(`/invoices/${invoiceId}/return-preview`, {
    actual_return_date: actualReturnDate,
    lines,
    lines_returned: lines,
  });
  const payload = unwrap<any>(res) ?? {};
  return {
    late_fee_today: payload.late_fee_today ?? payload.now_late_fees ?? 0,
    late_fee_at_date: payload.late_fee_at_date ?? payload.actual_late_fees ?? 0,
    difference: payload.difference ?? payload.late_fee_difference ?? 0,
  };
};

export const voidInvoicePayment = async (
  invoiceId: number,
  paymentId: number,
  reason: { key: string; note?: string },
) => {
  const res = await api.post(`/invoices/${invoiceId}/payments/${paymentId}/void`, { reason });
  return unwrap<any>(res);
};
