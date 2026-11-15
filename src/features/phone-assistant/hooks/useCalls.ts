import { useQuery } from "@tanstack/react-query";
import { getCallById, listCalls } from "../api/phoneAssistantApi";

export function useCallDetails(callId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["calls", "detail", callId],
    queryFn: () => getCallById(callId as number),
    enabled: enabled && Boolean(callId),
    staleTime: 15 * 1000,
  });
}

export function useCallList(
  params?: { customer_id?: number; page?: number; limit?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: ["calls", "list", params ?? {}],
    queryFn: () => listCalls(params),
    enabled,
    staleTime: 30 * 1000,
  });
}
