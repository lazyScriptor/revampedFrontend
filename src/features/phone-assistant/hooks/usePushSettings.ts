import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roleApi } from "@/features/admin/api/admin.api";
import {
  getDeviceInvoice,
  getDevicePushPreferences,
  getMyPushPreferences,
  getPushSettings,
  sendPushTest,
  updateDevicePushPreferences,
  updateMyPushPreferences,
  updatePushSettings,
  type GetPushSettingsResult,
  type PushSettingsPayload,
  type UserPushPreferenceItem,
  type UserPushPreferenceUpdate,
} from "../api/phoneAssistantApi";

export const pushQueryKeys = {
  shopSettings: ["phone-assistant", "push-settings"] as const,
  roles: ["phone-assistant", "roles"] as const,
  myPreferences: ["me", "push-preferences"] as const,
  devicePreferences: ["device", "push-preferences"] as const,
  deviceInvoice: (id: number) => ["device", "invoice", id] as const,
};

export interface PushRoleOption {
  role_id: number;
  role_name: string;
  is_system_default?: boolean;
}

export function usePushSettings(enabled = true) {
  return useQuery({
    queryKey: pushQueryKeys.shopSettings,
    queryFn: () => getPushSettings(),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdatePushSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PushSettingsPayload) => updatePushSettings(payload),
    onMutate: async (nextSettings) => {
      await queryClient.cancelQueries({ queryKey: pushQueryKeys.shopSettings });
      const previous = queryClient.getQueryData<GetPushSettingsResult>(
        pushQueryKeys.shopSettings,
      );
      if (previous) {
        queryClient.setQueryData<GetPushSettingsResult>(
          pushQueryKeys.shopSettings,
          {
            ...previous,
            settings: nextSettings,
          },
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(pushQueryKeys.shopSettings, context.previous);
      }
    },
    onSuccess: (res) => {
      const current = queryClient.getQueryData<GetPushSettingsResult>(
        pushQueryKeys.shopSettings,
      );
      if (current && res?.settings) {
        queryClient.setQueryData<GetPushSettingsResult>(
          pushQueryKeys.shopSettings,
          {
            ...current,
            settings: res.settings,
          },
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pushQueryKeys.shopSettings });
      queryClient.invalidateQueries({ queryKey: pushQueryKeys.myPreferences });
    },
  });
}

export function useSendPushTest() {
  return useMutation({
    mutationFn: () => sendPushTest(),
  });
}

export function usePushRoles(enabled = true) {
  return useQuery({
    queryKey: pushQueryKeys.roles,
    queryFn: async (): Promise<PushRoleOption[]> => {
      const res = (await roleApi.getRoles(false)) as any;
      const list = res?.data?.roles ?? res?.roles ?? [];
      return Array.isArray(list)
        ? list.map((r: any) => ({
            role_id: Number(r.role_id),
            role_name: String(r.role_name ?? r.name ?? `#${r.role_id}`),
            is_system_default: Boolean(r.is_system_default),
          }))
        : [];
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

function mergePreferenceUpdates(
  current: { preferences: UserPushPreferenceItem[] } | undefined,
  updates: UserPushPreferenceUpdate[],
): { preferences: UserPushPreferenceItem[] } | undefined {
  if (!current) return current;
  const byKey = new Map(updates.map((u) => [u.event_key, u]));
  return {
    preferences: current.preferences.map((item) => {
      const upd = byKey.get(item.event_key);
      if (!upd) return item;
      return {
        ...item,
        enabled: upd.enabled,
        min_amount:
          upd.min_amount !== undefined ? upd.min_amount : item.min_amount,
      };
    }),
  };
}

export function useMyPushPreferences(enabled = true) {
  return useQuery({
    queryKey: pushQueryKeys.myPreferences,
    queryFn: () => getMyPushPreferences(),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateMyPushPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: UserPushPreferenceUpdate[]) =>
      updateMyPushPreferences(preferences),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: pushQueryKeys.myPreferences });
      const previous = queryClient.getQueryData<{
        preferences: UserPushPreferenceItem[];
      }>(pushQueryKeys.myPreferences);
      const next = mergePreferenceUpdates(previous, updates);
      if (next) {
        queryClient.setQueryData(pushQueryKeys.myPreferences, next);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(pushQueryKeys.myPreferences, context.previous);
      }
    },
    onSuccess: (res) => {
      if (res?.preferences) {
        queryClient.setQueryData(pushQueryKeys.myPreferences, res);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pushQueryKeys.myPreferences });
    },
  });
}

export function useDevicePushPreferences(enabled = true) {
  return useQuery({
    queryKey: pushQueryKeys.devicePreferences,
    queryFn: () => getDevicePushPreferences(),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateDevicePushPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: UserPushPreferenceUpdate[]) =>
      updateDevicePushPreferences(preferences),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({
        queryKey: pushQueryKeys.devicePreferences,
      });
      const previous = queryClient.getQueryData<{
        preferences: UserPushPreferenceItem[];
      }>(pushQueryKeys.devicePreferences);
      const next = mergePreferenceUpdates(previous, updates);
      if (next) {
        queryClient.setQueryData(pushQueryKeys.devicePreferences, next);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          pushQueryKeys.devicePreferences,
          context.previous,
        );
      }
    },
    onSuccess: (res) => {
      if (res?.preferences) {
        queryClient.setQueryData(pushQueryKeys.devicePreferences, res);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: pushQueryKeys.devicePreferences,
      });
    },
  });
}

export function useDeviceInvoice(invoiceId: number | null) {
  return useQuery({
    queryKey: pushQueryKeys.deviceInvoice(invoiceId ?? 0),
    queryFn: () => getDeviceInvoice(invoiceId!),
    enabled: typeof invoiceId === "number" && Number.isInteger(invoiceId) && invoiceId > 0,
    retry: (failureCount, error: any) =>
      error?.status !== 403 && error?.status !== 404 && failureCount < 1,
  });
}
