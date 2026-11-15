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
    mutationFn: (body: {
      muted?: boolean;
      contact_sync_mode?: ContactSyncMode;
      call_logging_scope?: CallLoggingScope;
      sim_filter?: string | null;
    }) => updateDeviceSettings(body),
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
