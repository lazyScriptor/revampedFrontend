import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as collectionsApi from "../api/collectionsApi";
import type {
  CollectionsQueryParams,
  DialFromPhonePayload,
  SaveCallOutcomePayload,
} from "../types";

export function useDialFromPhone() {
  return useMutation({
    mutationFn: (payload: DialFromPhonePayload) => collectionsApi.dialFromUserPhone(payload),
  });
}

export function useSaveCallOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveCallOutcomePayload) => collectionsApi.saveCallOutcome(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", "open-invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "returns-today"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["followUps"] });
    },
  });
}

export function useLinkCallToCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, customerId }: { callId: number; customerId: number }) =>
      collectionsApi.linkCallToCustomer(callId, customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useSetCallDisputeHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, disputeHold }: { callId: number; disputeHold: boolean }) =>
      collectionsApi.setCallDisputeHold(callId, disputeHold),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useCollectionsReport(params: CollectionsQueryParams) {
  return useQuery({
    queryKey: ["collections", "report", params],
    queryFn: () => collectionsApi.fetchCollectionsReport(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCustomerCollectionDetail(
  customerId: number,
  params: CollectionsQueryParams & { filters_on?: boolean },
) {
  return useQuery({
    queryKey: ["collections", "customer", customerId, params],
    queryFn: () => collectionsApi.fetchCustomerCollectionDetail(customerId, params),
    enabled: Number.isFinite(customerId) && customerId > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCallsReport(params: {
  startDate?: string;
  endDate?: string;
  staff_id?: number | string;
  outcome?: string;
  search?: string;
  promise_status?: string;
}) {
  return useQuery({
    queryKey: ["calls", "report", params],
    queryFn: () => collectionsApi.fetchCallsReport(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCollectionsSettings() {
  return useQuery({
    queryKey: ["settings", "collections"],
    queryFn: () => collectionsApi.fetchCollectionsSettings(),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateCollectionsSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: collectionsApi.updateCollectionsSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "collections"] });
      qc.invalidateQueries({ queryKey: ["phone-assistant", "policy"] });
    },
  });
}
