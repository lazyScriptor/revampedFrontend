import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { connectSocket, getSocket } from "@/lib/socket";
import {
  deleteDeviceCalls,
  deleteDeviceContacts,
  getDevicePolicy,
  getPhoneAssistantPolicy,
  getShopDeviceAudit,
  listShopDevices,
  setShopDeviceStatus,
  testShopDevicePush,
  updateDeviceSettings,
  updatePhoneAssistantPolicy,
  patchPhoneAssistantPolicy,
  type DeviceSettingsBody,
  updateShopDevice,
  wipeShopDevice,
  type CallLoggingScope,
  type ContactSyncMode,
  type DeviceStatus,
  type PhoneAssistantPolicy,
} from "../api/phoneAssistantApi";

export const shopDeviceQueryKeys = {
  all: ["phone-assistant", "devices"] as const,
  list: (status?: string) => ["phone-assistant", "devices", status ?? "ALL"] as const,
  audit: (id: number | null) => ["phone-assistant", "device-audit", id] as const,
  policy: ["phone-assistant", "policy"] as const,
  devicePolicy: ["phone-assistant", "device-policy"] as const,
};

export function useShopDevices(status?: string, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const handlePending = () => {
      if (!active) return;
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.all });
    };
    try {
      connectSocket();
      const socket = getSocket();
      socket?.on("device:pending", handlePending);
      return () => {
        active = false;
        socket?.off("device:pending", handlePending);
      };
    } catch {
      return () => {
        active = false;
      };
    }
  }, [enabled, queryClient]);

  return useQuery({
    queryKey: shopDeviceQueryKeys.list(status),
    queryFn: () => listShopDevices(status),
    enabled,
    staleTime: 15_000,
  });
}

export function useUpdateShopDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: number;
      body: {
        device_label?: string | null;
        capabilities?: Record<string, boolean>;
        brief_profile_id?: string | null;
        muted?: boolean;
        contact_sync_mode?: ContactSyncMode;
        call_logging_scope?: CallLoggingScope;
        sim_filter?: string | null;
      };
    }) => updateShopDevice(vars.id, vars.body),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.audit(vars.id) });
      queryClient.invalidateQueries({ queryKey: ["me", "devices"] });
    },
  });
}

export function useSetShopDeviceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; status: DeviceStatus; reason?: string | null }) =>
      setShopDeviceStatus(vars.id, { status: vars.status, reason: vars.reason }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.audit(vars.id) });
      queryClient.invalidateQueries({ queryKey: ["me", "devices"] });
    },
  });
}

export function useWipeShopDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; reason?: string | null }) =>
      wipeShopDevice(vars.id, vars.reason),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.audit(vars.id) });
    },
  });
}

export function useTestShopDevicePush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => testShopDevicePush(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.audit(id) });
    },
  });
}

export function useShopDeviceAudit(id: number | null, enabled = true) {
  return useQuery({
    queryKey: shopDeviceQueryKeys.audit(id),
    queryFn: () => getShopDeviceAudit(id as number),
    enabled: enabled && Boolean(id),
    staleTime: 10_000,
  });
}

export function usePhoneAssistantPolicy(enabled = true) {
  return useQuery({
    queryKey: shopDeviceQueryKeys.policy,
    queryFn: () => getPhoneAssistantPolicy(),
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdatePhoneAssistantPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PhoneAssistantPolicy>) => updatePhoneAssistantPolicy(body),
    onSuccess: (res) => {
      if (res?.policy) {
        queryClient.setQueryData(shopDeviceQueryKeys.policy, res);
      }
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.policy });
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.devicePolicy });
    },
  });
}

export function useDevicePolicy(enabled = true) {
  return useQuery({
    queryKey: shopDeviceQueryKeys.devicePolicy,
    queryFn: () => getDevicePolicy(),
    enabled,
    staleTime: 15_000,
  });
}

export function useUpdateDeviceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DeviceSettingsBody) => updateDeviceSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.devicePolicy });
    },
  });
}

export function useDeleteDeviceContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteDeviceContacts(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.devicePolicy });
    },
  });
}

export function useDeleteDeviceCalls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteDeviceCalls(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.devicePolicy });
    },
  });
}

/** Set a nested value on a copy of the object, following a dotted path. */
export function setPathValue<T extends Record<string, any>>(source: T, path: string, value: unknown): T {
  const parts = path.split(".");
  const root: any = Array.isArray(source) ? [...source] : { ...source };
  let node = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    node[parts[i]] = { ...(node[parts[i]] ?? {}) };
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
  return root;
}

/**
 * Tabs edit one value at a time by path (PATCH /phone-assistant/policy), so a slow tab can never
 * overwrite another tab's work. Optimistic, with rollback on error.
 */
export function usePatchPhoneAssistantPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Array<{ path: string; value: unknown }>) => patchPhoneAssistantPolicy(updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: shopDeviceQueryKeys.policy });
      const previous = queryClient.getQueryData<{ policy: PhoneAssistantPolicy }>(shopDeviceQueryKeys.policy);
      if (previous) {
        let next: any = previous.policy;
        for (const u of updates) next = setPathValue(next, u.path, u.value);
        queryClient.setQueryData(shopDeviceQueryKeys.policy, { ...previous, policy: next });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(shopDeviceQueryKeys.policy, context.previous);
    },
    onSuccess: (res) => {
      if (res?.policy) queryClient.setQueryData(shopDeviceQueryKeys.policy, res);
      queryClient.invalidateQueries({ queryKey: shopDeviceQueryKeys.devicePolicy });
    },
  });
}
