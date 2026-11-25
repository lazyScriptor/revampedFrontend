import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addActivityComment,
  checkActivityEvent,
  createSavedActivityFilter,
  deleteSavedActivityFilter,
  fetchActivityComments,
  fetchActivityList,
  fetchActivitySettings,
  fetchActivitySummary,
  fetchReturnDatePreview,
  fetchSavedActivityFilters,
  markActivityEventsRead,
  uncheckActivityEvent,
  updateActivitySettings,
  voidInvoicePayment,
  type ActivityApiMode,
} from "../api/activityApi";
import type {
  ActivityFilterState,
  ActivityListResponse,
  ActivitySettingsPayload,
  ReturnPreviewResponse,
} from "../types";
import { DEFAULT_ACTIVITY_SETTINGS } from "../constants";
import { useAuthStore } from "@/stores/useAuthStore";

export const ACTIVITY_KEYS = {
  all: ["activity"] as const,
  list: (filters: Partial<ActivityFilterState>, page: number) =>
    ["activity", "list", filters, page] as const,
  summary: (filters: Partial<ActivityFilterState>) =>
    ["activity", "summary", filters] as const,
  invoice: (invoiceId: number) => ["activity", "invoice", invoiceId] as const,
  comments: (eventId: number) => ["activity", "comments", eventId] as const,
  savedFilters: ["activity", "saved-filters"] as const,
  settings: ["activity", "settings"] as const,
  notCheckedCount: ["activity", "not-checked-count"] as const,
};

export function useActivityList(
  filters: Partial<ActivityFilterState>,
  page = 1,
  limit = 50,
  enabled = true,
  apiMode: ActivityApiMode = "staff",
) {
  return useQuery({
    queryKey: [...ACTIVITY_KEYS.list(filters, page), apiMode],
    queryFn: () => fetchActivityList(filters, page, limit, undefined, apiMode),
    enabled,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useActivitySummary(
  filters: Partial<ActivityFilterState>,
  enabled = true,
  apiMode: ActivityApiMode = "staff",
) {
  return useQuery({
    queryKey: [...ACTIVITY_KEYS.summary(filters), apiMode],
    queryFn: () => fetchActivitySummary(filters, apiMode),
    enabled,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useActivityNotCheckedCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const canView = useAuthStore((s) => s.hasPermission("activity:view"));
  return useQuery({
    queryKey: ACTIVITY_KEYS.notCheckedCount,
    queryFn: async () => {
      const summary = await fetchActivitySummary({ preset: "this_month" });
      return summary.not_checked_count ?? 0;
    },
    enabled: isAuthenticated && canView,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useInvoiceActivity(invoiceId: number | null | undefined) {
  const canView = useAuthStore((s) => s.hasPermission("activity:view"));
  const [data, setData] = useState<ActivityListResponse | undefined>(undefined);

  useEffect(() => {
    if (!invoiceId || !canView) {
      setData(undefined);
      return;
    }
    let active = true;
    fetchActivityList({ preset: "this_month" }, 1, 50, invoiceId)
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setData(undefined);
      });
    return () => {
      active = false;
    };
  }, [invoiceId, canView]);

  return { data };
}

export function useToggleCheckActivity(apiMode: ActivityApiMode = "staff") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      checked,
    }: {
      eventId: number;
      checked: boolean;
    }): Promise<{
      event_id: number;
      checked_by: number | null;
      checked_by_name?: string;
      checked_at: string | null;
    }> => (checked ? uncheckActivityEvent(eventId, apiMode) : checkActivityEvent(eventId, apiMode)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.all });
    },
  });
}

export function useActivityComments(
  eventId: number,
  open: boolean,
  apiMode: ActivityApiMode = "staff",
) {
  return useQuery({
    queryKey: [...ACTIVITY_KEYS.comments(eventId), apiMode],
    queryFn: () => fetchActivityComments(eventId, apiMode),
    enabled: open && eventId > 0,
  });
}

export function useAddActivityComment(
  eventId: number,
  apiMode: ActivityApiMode = "staff",
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addActivityComment(eventId, body, apiMode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ACTIVITY_KEYS.comments(eventId), apiMode] });
      qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.all });
    },
  });
}

export function useMarkActivityRead(apiMode: ActivityApiMode = "staff") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventIds: number[]) => markActivityEventsRead(eventIds, apiMode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity", "list"] });
    },
  });
}

export function useSavedActivityFilters() {
  return useQuery({
    queryKey: ACTIVITY_KEYS.savedFilters,
    queryFn: fetchSavedActivityFilters,
    staleTime: 60_000,
  });
}

export function useCreateSavedActivityFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, filters }: { name: string; filters: ActivityFilterState }) =>
      createSavedActivityFilter(name, filters),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.savedFilters });
    },
  });
}

export function useDeleteSavedActivityFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedActivityFilter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.savedFilters });
    },
  });
}

let cachedActivitySettings: ActivitySettingsPayload | null = null;

export function useActivitySettings(enabled = true) {
  const [data, setData] = useState<ActivitySettingsPayload>(
    cachedActivitySettings ?? DEFAULT_ACTIVITY_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(enabled && !cachedActivitySettings);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchActivitySettings()
      .then((res) => {
        cachedActivitySettings = res;
        if (active) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { data, isLoading };
}

export function useUpdateActivitySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ActivitySettingsPayload>) => updateActivitySettings(patch),
    onSuccess: (updated) => {
      cachedActivitySettings = updated;
      qc.setQueryData(ACTIVITY_KEYS.settings, updated);
      qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.settings });
    },
  });
}

export function useReturnDatePreview(
  invoiceId: number | null | undefined,
  actualReturnDate: string,
  isBackdated: boolean,
  lines?: Array<{ line_id: number; good_qty: number; defective_qty: number }>,
) {
  const [data, setData] = useState<ReturnPreviewResponse | undefined>(undefined);
  const linesKey = JSON.stringify(lines ?? []);

  useEffect(() => {
    if (!invoiceId || !isBackdated || !actualReturnDate) {
      setData(undefined);
      return;
    }
    let active = true;
    fetchReturnDatePreview(invoiceId, actualReturnDate, lines)
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setData(undefined);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, actualReturnDate, isBackdated, linesKey]);

  return { data };
}

export function useVoidPayment() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    (
      vars: {
        invoiceId: number;
        paymentId: number;
        reason: { key: string; note?: string };
      },
      opts?: { onSuccess?: () => void; onError?: (err: any) => void },
    ) => {
      setIsPending(true);
      voidInvoicePayment(vars.invoiceId, vars.paymentId, vars.reason)
        .then(() => {
          setIsPending(false);
          opts?.onSuccess?.();
        })
        .catch((err) => {
          setIsPending(false);
          opts?.onError?.(err);
        });
    },
    [],
  );

  return { mutate, isPending };
}
