import { api } from "@/lib/api";
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

const unwrap = <T,>(res: any): T => (res?.data !== undefined ? res.data : res) as T;

export function buildActivityQueryParams(
  filters: Partial<ActivityFilterState>,
  extra?: { page?: number; limit?: number; invoice_id?: number },
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (filters.preset) params.preset = filters.preset;
  if (filters.preset === "custom") {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  } else if (filters.from && filters.to && filters.from === filters.to) {
    // Bar tap drills down to a single day inside the current period
    params.from = filters.from;
    params.to = filters.to;
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
): Promise<ActivityListResponse> => {
  const params = buildActivityQueryParams(filters, { page, limit, invoice_id: invoiceId });
  const res = await api.get("/activity", { params });
  const payload = unwrap<Partial<ActivityListResponse>>(res);
  return {
    events: payload?.events ?? [],
    total: payload?.total ?? 0,
    page: payload?.page ?? page,
    limit: payload?.limit ?? limit,
    totals: payload?.totals ?? { count: 0, amount: 0, high_count: 0, not_checked_count: 0 },
    see_amounts: payload?.see_amounts ?? true,
  };
};

export const fetchActivitySummary = async (
  filters: Partial<ActivityFilterState>,
): Promise<ActivitySummaryResponse> => {
  const params = buildActivityQueryParams(filters);
  const res = await api.get("/activity/summary", { params });
  const payload = unwrap<Partial<ActivitySummaryResponse>>(res);
  return {
    by_type: payload?.by_type ?? [],
    buckets: payload?.buckets ?? [],
    granularity: payload?.granularity ?? (filters.preset === "today" ? "hour" : "day"),
    not_checked_count: payload?.not_checked_count ?? 0,
    high_not_checked_count: payload?.high_not_checked_count ?? 0,
    by_staff: payload?.by_staff,
    see_amounts: payload?.see_amounts ?? true,
  };
};

export const checkActivityEvent = async (id: number) => {
  const res = await api.post(`/activity/${id}/check`);
  return unwrap<{ event_id: number; checked_by: number; checked_by_name?: string; checked_at: string }>(res);
};

export const uncheckActivityEvent = async (id: number) => {
  const res = await api.delete(`/activity/${id}/check`);
  return unwrap<{ event_id: number; checked_by: null; checked_at: null }>(res);
};

export const fetchActivityComments = async (id: number): Promise<ActivityComment[]> => {
  const res = await api.get(`/activity/${id}/comments`);
  return unwrap<{ comments?: ActivityComment[] }>(res)?.comments ?? [];
};

export const addActivityComment = async (id: number, body: string): Promise<ActivityComment> => {
  const res = await api.post(`/activity/${id}/comments`, { body });
  return unwrap<{ comment: ActivityComment }>(res)?.comment ?? unwrap<ActivityComment>(res);
};

export const markActivityEventsRead = async (eventIds: number[]): Promise<void> => {
  if (eventIds.length === 0) return;
  await api.post("/activity/read", { event_ids: eventIds });
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
  });
  return unwrap<ReturnPreviewResponse>(res);
};

export const voidInvoicePayment = async (
  invoiceId: number,
  paymentId: number,
  reason: { key: string; note?: string },
) => {
  const res = await api.post(`/invoices/${invoiceId}/payments/${paymentId}/void`, { reason });
  return unwrap<any>(res);
};
