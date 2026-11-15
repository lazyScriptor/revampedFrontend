import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as phoneAssistantApi from "../api/phoneAssistantApi";
import type { CreateCallNoteBody, UpdateFollowUpBody } from "../api/phoneAssistantApi";

export function useCallDetails(callId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["calls", "detail", callId],
    queryFn: () => phoneAssistantApi.getCallById(callId as number),
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
    queryFn: () => phoneAssistantApi.listCalls(params),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreateCallNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, body }: { callId: number; body: CreateCallNoteBody }) =>
      phoneAssistantApi.createStaffCallNote(callId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["followUps"] });
    },
  });
}

export function useMissedCalls(limit = 50, enabled = true) {
  return useQuery({
    queryKey: ["calls", "missed", limit],
    queryFn: () =>
      phoneAssistantApi.listMissedCalls
        ? phoneAssistantApi.listMissedCalls(limit)
        : Promise.resolve({ items: [] }),
    enabled,
    staleTime: 15 * 1000,
  });
}

export function useDeviceMissedCalls(limit = 50, enabled = true) {
  return useQuery({
    queryKey: ["device", "calls", "missed", limit],
    queryFn: () =>
      phoneAssistantApi.listDeviceMissedCalls
        ? phoneAssistantApi.listDeviceMissedCalls(limit)
        : Promise.resolve({ items: [] }),
    enabled,
    staleTime: 15 * 1000,
  });
}

export function useMarkCallHandled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (callId: number) => phoneAssistantApi.markCallHandled(callId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useMarkDeviceCallHandled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (callId: number) => phoneAssistantApi.markDeviceCallHandled(callId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device", "calls"] });
    },
  });
}

export function useFollowUps(
  params: { status?: "pending" | "done" | "all"; customer_id?: number; limit?: number } = {
    status: "pending",
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ["followUps", params],
    queryFn: () =>
      phoneAssistantApi.listFollowUps
        ? phoneAssistantApi.listFollowUps(params)
        : Promise.resolve({ items: [] }),
    enabled,
    staleTime: 15 * 1000,
  });
}

export function useDeviceFollowUps(
  params: { status?: "pending" | "done" | "all"; customer_id?: number; limit?: number } = {
    status: "pending",
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ["device", "followUps", params],
    queryFn: () =>
      phoneAssistantApi.listDeviceFollowUps
        ? phoneAssistantApi.listDeviceFollowUps(params)
        : Promise.resolve({ items: [] }),
    enabled,
    staleTime: 15 * 1000,
  });
}

export function useUpdateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, body }: { noteId: number; body: UpdateFollowUpBody }) =>
      phoneAssistantApi.updateFollowUp(noteId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followUps"] });
      qc.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useUpdateDeviceFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, body }: { noteId: number; body: UpdateFollowUpBody }) =>
      phoneAssistantApi.updateDeviceFollowUp(noteId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device", "followUps"] });
    },
  });
}
