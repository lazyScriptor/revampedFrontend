import axios from "axios";
import { z } from "zod";
import { RegisterDeviceContract, type Contract, type ReportedState } from "@geargrid/contracts";
import {
  getDeviceId,
  getDeviceTenantDb,
  getDeviceToken,
  setDeviceToken,
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
  /** Call recording fields are missing on app builds older than them. */
  audioPermission?: boolean;
  callRecordingEnabled?: boolean;
  /** True when the paired user is an administrator. */
  callRecordingSetupAllowed?: boolean;
  contactSyncEnabled: boolean;
  contactSyncMode?: string;
  callLoggingScope?: string;
  simFilter?: string | null;
  contactsConsented: boolean;
  contactsSyncedAt: string | null;
  /** Why the last contact sync failed, or null. Missing on app builds older than this field. */
  contactsSyncError?: string | null;
  briefsSyncedAt: string | null;
  manufacturer: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  deviceStatus?: "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  offlineWipeDays?: number;
  effectiveCapabilitiesJson?: string | null;
  capabilityReasonsJson?: string | null;
  reportedState?: ReportedState | null;
}

export interface NativeSyncStatus {
  lastBriefSyncAt: string | null;
  lastContactSyncAt: string | null;
  cachedBriefs: number;
  outboxPending: number;
  staleAfterMinutes: number;
  showSyncFooter: "always" | "only_when_stale" | "never";
  online: boolean;
  /** Result of the last "Sync now": how many customers changed, or why it failed. */
  lastResult?: { ok: boolean; updated?: number; error?: string } | null;
}

export interface NativeAppPrefs {
  appLanguage: "follow" | "en" | "si" | "ta";
  appTextSize: "small" | "default" | "large" | "extra_large";
  callTextScale: number | null;
  appLockEnabled: boolean;
  appVersion?: string;
}

export interface NativeAlert {
  id: string;
  receivedAt: string;
  title: string;
  body: string;
  group: string;
  eventKey?: string | null;
  invoiceId?: string | null;
  eventId?: string | null;
  customerId?: string | null;
  link?: string | null;
}

export interface NativeCustomerHit {
  kind: "customer" | "contact";
  id: number;
  name: string;
  company?: string | null;
  phone: string | null;
  rating?: number | null;
  summary?: string | null;
  status?: string | null;
  hasDues?: boolean;
}

interface NativePluginShape {
  syncBadge?(options: { unread: number }): Promise<void>;
  getDeviceToken?: () => Promise<{ deviceId: string; deviceToken: string }>;
  getSyncStatus?: () => Promise<NativeSyncStatus>;
  showSampleCall?: () => Promise<{ shown: boolean }>;
  setCallTextScale?: (args: { scale: number | null }) => Promise<{ saved: boolean }>;
  getAppPrefs?: () => Promise<NativeAppPrefs>;
  setAppLanguage?: (args: { language: string }) => Promise<{ saved: boolean }>;
  setAppTextSize?: (args: { size: string }) => Promise<{ saved: boolean }>;
  setAppLock?: (args: { enabled: boolean }) => Promise<{ saved: boolean }>;
  authenticateAppLock?: () => Promise<{ ok: boolean; error?: string }>;
  sharePdf?: (args: { html: string; filename: string; widthMm?: number }) => Promise<{ shared: boolean; error?: string }>;
  listSims?: () => Promise<{ sims: Array<{ id: string; label: string }> }>;
  getAlerts?: () => Promise<{ alerts: NativeAlert[] }>;
  clearAlerts?: () => Promise<{ cleared: boolean }>;
  searchCustomers?: (args: { query: string; limit?: number }) => Promise<{ hits: NativeCustomerHit[]; cachedBriefs: number }>;
  setSignedIn?: (args: { signedIn: boolean }) => Promise<{ saved: boolean }>;
  setStatusBarTheme?: (args: { dark: boolean; color?: string }) => Promise<{ applied: boolean }>;
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
  requestAudioPermission?: () => Promise<PhoneAssistantSetupStatus>;
  openVendorAutostart?: () => Promise<{ opened: boolean }>;
  syncNow?: () => Promise<PhoneAssistantSetupStatus>;
  setContactSyncEnabled?: (args: {
    enabled: boolean;
    consented?: boolean;
  }) => Promise<PhoneAssistantSetupStatus>;
  wipeLocalContacts?: () => Promise<{ wiped: boolean }>;
  updatePrivacySelection?: (args: {
    contactSyncMode?: string;
    callLoggingScope?: string;
    simFilter?: string | null;
    selectedLabels?: string[];
    selectedAccounts?: string[];
    excludedContactKeys?: string[];
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

/**
 * The app replaces the device token every 30 days and the old one stops working a day later,
 * so these pages take the app's current token before using their own copy.
 */
export async function syncNativeDeviceToken(): Promise<void> {
  const plugin = getNativePlugin();
  if (!plugin?.getDeviceToken) return;
  try {
    const native = await plugin.getDeviceToken();
    // A different device id means a new pairing is being handed over: leave it alone.
    if (native?.deviceToken && native.deviceId === getDeviceId() && native.deviceToken !== getDeviceToken()) {
      setDeviceToken(native.deviceToken);
    }
  } catch {
    // Keep the stored token
  }
}
void syncNativeDeviceToken();

deviceApi.interceptors.request.use(async (config) => {
  await syncNativeDeviceToken();
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
  device_model?: string | null;
  os_version?: string | null;
  reported_state?: ReportedState | null;
  click_to_call_enabled?: boolean;
  cached_briefs?: number;
  brief_format?: number;
  outbox_pending?: number;
  last_brief_sync_at?: string;
  last_contact_sync_at?: string;
}) {
  if (!getDeviceId() || !getDeviceToken() || !getDeviceTenantDb()) {
    return null;
  }
  return callDeviceContract(RegisterDeviceContract, { body });
}

export const nativeBridge = {
  /** Clears the app icon badge when nothing is unread. Older app builds don't have it. */
  async syncBadge(unread: number): Promise<void> {
    const plugin = getNativePlugin();
    if (!plugin?.syncBadge) return;
    try {
      await plugin.syncBadge({ unread });
    } catch {
      // The badge is cosmetic
    }
  },

  async getSyncStatus(): Promise<NativeSyncStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.getSyncStatus) return null;
    try {
      return await plugin.getSyncStatus();
    } catch {
      return null;
    }
  },
  async showSampleCall(): Promise<boolean> {
    const plugin = getNativePlugin();
    if (!plugin?.showSampleCall) return false;
    try {
      return Boolean((await plugin.showSampleCall()).shown);
    } catch {
      return false;
    }
  },
  async setCallTextScale(scale: number | null): Promise<boolean> {
    const plugin = getNativePlugin();
    if (!plugin?.setCallTextScale) return false;
    try {
      return Boolean((await plugin.setCallTextScale({ scale })).saved);
    } catch {
      return false;
    }
  },
  async getAppPrefs(): Promise<NativeAppPrefs | null> {
    const plugin = getNativePlugin();
    if (!plugin?.getAppPrefs) return null;
    try {
      return await plugin.getAppPrefs();
    } catch {
      return null;
    }
  },
  async setAppLanguage(language: NativeAppPrefs["appLanguage"]): Promise<boolean> {
    const plugin = getNativePlugin();
    if (!plugin?.setAppLanguage) return false;
    try {
      return Boolean((await plugin.setAppLanguage({ language })).saved);
    } catch {
      return false;
    }
  },
  async setAppTextSize(size: NativeAppPrefs["appTextSize"]): Promise<boolean> {
    const plugin = getNativePlugin();
    if (!plugin?.setAppTextSize) return false;
    try {
      return Boolean((await plugin.setAppTextSize({ size })).saved);
    } catch {
      return false;
    }
  },
  async setAppLock(enabled: boolean): Promise<boolean> {
    const plugin = getNativePlugin();
    if (!plugin?.setAppLock) return false;
    try {
      return Boolean((await plugin.setAppLock({ enabled })).saved);
    } catch {
      return false;
    }
  },
  /** Asks for fingerprint, face or device PIN. The app never sees or stores the GearGrid password. */
  async authenticateAppLock(): Promise<{ ok: boolean; error?: string } | null> {
    const plugin = getNativePlugin();
    if (!plugin?.authenticateAppLock) return null;
    try {
      return await plugin.authenticateAppLock();
    } catch (e: any) {
      return { ok: false, error: e?.message || "failed" };
    }
  },
  /** Builds a PDF from HTML on the phone and opens Android's share sheet (printing needs the counter's print agent). */
  async sharePdf(html: string, filename: string, widthMm = 72): Promise<boolean> {
    const plugin = getNativePlugin();
    if (!plugin?.sharePdf) return false;
    try {
      return Boolean((await plugin.sharePdf({ html, filename, widthMm })).shared);
    } catch {
      return false;
    }
  },
  async listSims(): Promise<Array<{ id: string; label: string }>> {
    const plugin = getNativePlugin();
    if (!plugin?.listSims) return [];
    try {
      return (await plugin.listSims()).sims ?? [];
    } catch {
      return [];
    }
  },
  async getAlerts(): Promise<NativeAlert[]> {
    const plugin = getNativePlugin();
    if (!plugin?.getAlerts) return [];
    try {
      return (await plugin.getAlerts()).alerts ?? [];
    } catch {
      return [];
    }
  },
  async clearAlerts(): Promise<boolean> {
    const plugin = getNativePlugin();
    if (!plugin?.clearAlerts) return false;
    try {
      return Boolean((await plugin.clearAlerts()).cleared);
    } catch {
      return false;
    }
  },
  /** Offline customer lookup over the phone's local cache (name, NIC, ID or phone; contacts by phone only). */
  async searchCustomers(query: string, limit = 15): Promise<{ hits: NativeCustomerHit[]; cachedBriefs: number } | null> {
    const plugin = getNativePlugin();
    if (!plugin?.searchCustomers) return null;
    try {
      return await plugin.searchCustomers({ query, limit });
    } catch {
      return null;
    }
  },
  async setSignedIn(signedIn: boolean): Promise<boolean> {
    const plugin = getNativePlugin();
    if (!plugin?.setSignedIn) return false;
    try {
      return Boolean((await plugin.setSignedIn({ signedIn })).saved);
    } catch {
      return false;
    }
  },
  async setStatusBarTheme(dark: boolean, color?: string): Promise<boolean> {
    const plugin = getNativePlugin();
    if (!plugin?.setStatusBarTheme) return false;
    try {
      return Boolean((await plugin.setStatusBarTheme({ dark, color })).applied);
    } catch {
      return false;
    }
  },
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
  async requestAudioPermission(): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.requestAudioPermission) return null;
    return plugin.requestAudioPermission();
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
  async wipeLocalContacts(): Promise<{ wiped: boolean } | null> {
    const plugin = getNativePlugin();
    if (!plugin?.wipeLocalContacts) return null;
    try {
      return await plugin.wipeLocalContacts();
    } catch {
      return null;
    }
  },
  async updatePrivacySelection(args: {
    contactSyncMode?: string;
    callLoggingScope?: string;
    simFilter?: string | null;
    selectedLabels?: string[];
    selectedAccounts?: string[];
    excludedContactKeys?: string[];
  }): Promise<PhoneAssistantSetupStatus | null> {
    const plugin = getNativePlugin();
    if (!plugin?.updatePrivacySelection) return null;
    try {
      return await plugin.updatePrivacySelection(args);
    } catch {
      return null;
    }
  },
};
