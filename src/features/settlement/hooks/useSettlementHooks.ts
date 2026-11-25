import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  commitCustomerSettlement,
  completeSettlementBills,
  fetchCustomerOpenBills,
  fetchSettlementDetail,
  fetchSettlementOverview,
  previewCustomerSettlement,
  voidSettlement,
} from "../api/settlementApi";
import type {
  OpenBillsQueryParams,
  SettlementCommitResponse,
  SettlementPreviewRequest,
  SettlementPreviewResponse,
  SettlementViewPreferences,
} from "../types";

export const SETTLEMENT_KEYS = {
  overview: (customerId: number | null) => ["settlement", "overview", customerId] as const,
  openBills: (customerId: number | null, params: OpenBillsQueryParams) =>
    ["settlement", "open-bills", customerId, params] as const,
  detail: (settlementId: number | null) => ["settlement", "detail", settlementId] as const,
};

export function useSettlementOverview(customerId: number | null) {
  return useQuery({
    queryKey: SETTLEMENT_KEYS.overview(customerId),
    queryFn: ({ signal }) => fetchSettlementOverview(customerId!, signal),
    enabled: Boolean(customerId),
    staleTime: 60 * 1000,
  });
}

export function useCustomerOpenBills(
  customerId: number | null,
  params: OpenBillsQueryParams,
) {
  return useQuery({
    queryKey: SETTLEMENT_KEYS.openBills(customerId, params),
    queryFn: ({ signal }) => fetchCustomerOpenBills(customerId!, params, signal),
    enabled: Boolean(customerId),
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
  });
}

export function useDebouncedSettlementPreview(
  customerId: number | null,
  request: SettlementPreviewRequest | null,
  enabled: boolean,
  debounceMs = 300,
) {
  const [preview, setPreview] = useState<SettlementPreviewResponse | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  const serialized = useMemo(() => (request ? JSON.stringify(request) : ""), [request]);

  const runNow = useCallback(
    async (reqPayload: SettlementPreviewRequest, cid: number) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++requestSeqRef.current;
      setIsUpdating(true);
      setError(null);
      try {
        const res = await previewCustomerSettlement(cid, reqPayload, controller.signal);
        if (seq === requestSeqRef.current && !controller.signal.aborted) {
          setPreview(res);
          setIsUpdating(false);
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError" || controller.signal.aborted) {
          return;
        }
        if (seq === requestSeqRef.current) {
          setError(err?.message || "Failed to preview settlement");
          setIsUpdating(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!customerId || !request || !enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
      setIsUpdating(false);
      return;
    }

    setIsUpdating(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runNow(request, customerId);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, serialized, enabled, debounceMs, runNow]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const refreshNow = useCallback(() => {
    if (customerId && request && enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      runNow(request, customerId);
    }
  }, [customerId, request, enabled, runNow]);

  return {
    preview,
    setPreview,
    isUpdating,
    error,
    refreshNow,
  };
}

export function useCommitSettlement(customerId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      body: SettlementPreviewRequest & { preview_version: string };
      idempotencyKey: string;
    }): Promise<SettlementCommitResponse> => {
      if (!customerId) throw new Error("Missing customerId");
      return commitCustomerSettlement(customerId, vars.body, vars.idempotencyKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "open-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useCompleteSettlementBills(customerId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { invoice_ids: number[]; release_id_card: boolean }) => {
      if (!customerId) throw new Error("Missing customerId");
      return completeSettlementBills(customerId, vars);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useVoidSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { settlementId: number; reason?: string }) =>
      voidSettlement(vars.settlementId, vars.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useSettlementDetail(settlementId: number | null) {
  return useQuery({
    queryKey: SETTLEMENT_KEYS.detail(settlementId),
    queryFn: ({ signal }) => fetchSettlementDetail(settlementId!, signal),
    enabled: Boolean(settlementId),
  });
}

export const DEFAULT_SETTLEMENT_VIEW_PREFS: SettlementViewPreferences = {
  cardSize: "normal",
  showMachineIcons: true,
  showPaymentHistory: true,
  showDiscount: true,
  showRunningCharge: true,
  showDates: true,
  defaultSplitRule: "oldest_first",
  defaultQueueRule: "fully_back_first",
  defaultFilter: "payment_due",
  groupByMonth: false,
};

export function useSettlementViewPrefs(userId?: number | string | null) {
  const storageKey = `geargrid-settlement-view-${userId ?? "default"}`;

  const [prefs, setPrefs] = useState<SettlementViewPreferences>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        return { ...DEFAULT_SETTLEMENT_VIEW_PREFS, ...JSON.parse(raw) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SETTLEMENT_VIEW_PREFS;
  });

  const updatePrefs = useCallback(
    (patch: Partial<SettlementViewPreferences>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    },
    [storageKey],
  );

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULT_SETTLEMENT_VIEW_PREFS);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { prefs, updatePrefs, resetPrefs };
}
