import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as locker from "../api/locker.api";

export const LOCKER_KEYS = {
  status: ["locker", "status"] as const,
  start: ["locker", "start"] as const,
  history: ["locker", "history"] as const,
};

// Payments, refunds and expenses recorded anywhere change what the drawer should hold.
export const useLockerStatus = (enabled = true) =>
  useQuery({
    queryKey: LOCKER_KEYS.status,
    queryFn: locker.fetchStatus,
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });

const useLockerMutation = <TVars, TData>(fn: (v: TVars) => Promise<TData>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locker"] });
      qc.invalidateQueries({ queryKey: ["accounting-expenses"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};

export const useRecordOpening = () => useLockerMutation(locker.recordOpening);
export const useRecordClosing = () => useLockerMutation(locker.recordClosing);
export const useRecordLockerExpense = () => useLockerMutation(locker.recordExpense);
export const useChangePaymentMethod = () => useLockerMutation(locker.changePaymentMethod);
export const useStartLocker = () => useLockerMutation(locker.startLocker);
export const useReviewCount = () => useLockerMutation(locker.reviewCount);
export const useSetFloat = () => useLockerMutation(locker.setFloat);

export const useStartPreview = (enabled: boolean) =>
  useQuery({ queryKey: LOCKER_KEYS.start, queryFn: locker.fetchStartPreview, enabled, staleTime: 0 });

export const useLockerHistory = (enabled: boolean) =>
  useQuery({ queryKey: LOCKER_KEYS.history, queryFn: () => locker.fetchHistory({ limit: 60 }), enabled, staleTime: 30 * 1000 });
