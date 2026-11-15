import axios from "axios";
import { z } from "zod";
import { RegisterDeviceContract, type Contract } from "@geargrid/contracts";
import {
  getDeviceId,
  getDeviceTenantDb,
  getDeviceToken,
} from "@/features/signatures/lib/deviceId";

export interface PhoneAssistantSetupStatus {
  isNative: boolean;
  hasCredentials: boolean;
  callScreeningRole: boolean;
  overlayPermission: boolean;
  notificationsPermission: boolean;
  contactsPermission: boolean;
  callLogPermission: boolean;
  batteryOptimizationExempt: boolean;
  contactSyncEnabled: boolean;
  contactsConsented: boolean;
  contactsSyncedAt: string | null;
  /** Why the last contact sync failed, or null. Missing on app builds older than this field. */
  contactsSyncError?: string | null;
  briefsSyncedAt: string | null;
  manufacturer: string;
}

interface NativePluginShape {
  setCredentials?: (args: {
    deviceId: string;
    deviceToken: string;
    tenantDb: string;
    apiBaseUrl?: string;
  }) => Promise<{ saved: boolean }>;
  clearCredentials?: () => Promise<{ cleared: boolean }>;
  getSetupStatus?: () => Promise<PhoneAssistantSetupStatus>;
  requestCallScreeningRole?: () => Promise<PhoneAssistantSetupStatus>;
  requestOverlayPermission?: () => Promise<PhoneAssistantSetupStatus>;
  requestNotificationsPermission?: () => Promise<PhoneAssistantSetupStatus>;
  requestContactsPermission?: () => Promise<PhoneAssistantSetupStatus>;
  requestCallLogPermission?: () => Promise<PhoneAssistantSetupStatus>;
  requestBatteryExemption?: () => Promise<PhoneAssistantSetupStatus>;
  openVendorAutostart?: () => Promise<{ opened: boolean }>;
  syncNow?: () => Promise<PhoneAssistantSetupStatus>;
  setContactSyncEnabled?: (args: {
    enabled: boolean;
    consented?: boolean;
  }) => Promise<PhoneAssistantSetupStatus>;
}

const getNativePlugin = (): NativePluginShape | null => {
  if (typeof window === "undefined") return null;
  const cap = (window as any).Capacitor;
  const plugin = cap?.Plugins?.PhoneAssistant as NativePluginShape | undefined;
  return plugin ?? null;
};

export const isNativePhoneApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return Boolean(cap?.isNativePlatform?.() || getNativePlugin());
};

export const deviceApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

deviceApi.interceptors.request.use((config) => {
  const deviceId = getDeviceId();
  const token = getDeviceToken();
  const tenantDb = getDeviceTenantDb();
  if (deviceId) config.headers["x-device-id"] = deviceId;
  if (tenantDb) config.headers["x-tenant-db"] = tenantDb;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

deviceApi.interceptors.response.use((response) => response.data);

export async function callDeviceContract<TParams, TQuery, TBody, TData>(
  contract: Contract<TParams, TQuery, TBody, TData>,
  args: {
    params?: TParams;
    query?: TQuery;
    body?: TBody;
  } = {},
): Promise<TData> {
  let url = contract.path;
  if (args.params && typeof args.params === "object") {
    for (const [key, value] of Object.entries(args.params as Record<string, unknown>)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }
  if (contract.params) (contract.params as z.ZodType<TParams>).parse(args.params);
  if (contract.query) (contract.query as z.ZodType<TQuery>).parse(args.query);
  if (contract.body) (contract.body as z.ZodType<TBody>).parse(args.body);

  const raw = await deviceApi.request({
    url,
    method: contract.method,
    params: args.query,
    data: args.body,
  });
  const parsed = contract.response.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Unexpected response from ${contract.method} ${contract.path}`);
  }
  return parsed.data.data;
}

export async function registerDeviceWithServer(body: {
  app_version: string;
  push_token?: string | null;
  contact_sync_enabled?: boolean;
}) {
  if (!getDeviceId() || !getDeviceToken() || !getDeviceTenantDb()) {
    return null;
  }
  return callDeviceContract(RegisterDeviceContract, { body });
}

export const nativeBridge = {
  async setCredentials(args: {
    deviceId: string;
    deviceToken: string;
    tenantDb: string;
    apiBaseUrl?: string;
  }) {
    const plugin = getNativePlugin();
    if (!plugin?.setCredentials) return null;
    try {
      return await plugin.setCredentials(args);
    } catch {
      return null;
    }
  },
  async clearCredentials() {
    const plugin = getNativePlugin();
    if (!plugin?.clearCredentials) return null;
    try {
      return await plugin.clearCredentials();
    } catch {
      return null;
    }
  },
  async getSetupStatus(): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.getSetupStatus) return null;
    return plugin.getSetupStatus();
  },
  async requestCallScreeningRole(): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.requestCallScreeningRole) return null;
    return plugin.requestCallScreeningRole();
  },
  async requestOverlayPermission(): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.requestOverlayPermission) return null;
    return plugin.requestOverlayPermission();
  },
  async requestNotificationsPermission(): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.requestNotificationsPermission) return null;
    return plugin.requestNotificationsPermission();
  },
  async requestContactsPermission(): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.requestContactsPermission) return null;
    return plugin.requestContactsPermission();
  },
  async requestCallLogPermission(): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.requestCallLogPermission) return null;
    return plugin.requestCallLogPermission();
  },
  async requestBatteryExemption(): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.requestBatteryExemption) return null;
    return plugin.requestBatteryExemption();
  },
  async openVendorAutostart(): Promise<{ opened: boolean } | null> {
    const plugin = getNativePlugin();
    if (!plugin?.openVendorAutostart) return null;
    return plugin.openVendorAutostart();
  },
  async syncNow(): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.syncNow) return null;
    return plugin.syncNow();
  },
  async setContactSyncEnabled(
    enabled: boolean,
    consented = false,
  ): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.setContactSyncEnabled) return null;
    return plugin.setContactSyncEnabled({ enabled, consented });
  },
};
