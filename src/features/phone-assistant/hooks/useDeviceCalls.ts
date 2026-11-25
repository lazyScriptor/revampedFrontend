import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDeviceCallCard,
  fetchDeviceCallsToNote,
  saveDeviceCallOutcome,
  type DeviceCallNotePayload,
} from "../api/deviceCallApi";

export function useDeviceCallCard(clientCallId: string) {
  return useQuery({
    queryKey: ["device", "calls", "card", clientCallId],
    queryFn: () => fetchDeviceCallCard(clientCallId),
    enabled: Boolean(clientCallId),
    // The card is opened seconds after hanging up; the call may still be on its way to the server.
    retry: 3,
    retryDelay: 1500,
    // A background refetch must not reset what the cashier has already tapped.
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useDeviceCallsToNote(enabled = true) {
  return useQuery({
    queryKey: ["device", "calls", "to-note"],
    queryFn: fetchDeviceCallsToNote,
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useSaveDeviceCallOutcome(clientCallId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeviceCallNotePayload) => saveDeviceCallOutcome(clientCallId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["device", "calls", "to-note"] });
      void qc.invalidateQueries({ queryKey: ["device", "followUps"] });
    },
  });
}
