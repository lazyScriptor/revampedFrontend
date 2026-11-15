// features/signatures/lib/deviceId.ts
//
// Each phone installing this app as a PWA gets a stable, locally-generated
// `device_id` on first launch. That id is the primary key for the paired-
// device flow — the backend binds it to an operator once, and from then on
// every public signature endpoint accepts the id as authorization.
//
// Persisted in localStorage under `geargrid.device_id`. Survives refreshes
// and PWA re-launches; cleared only by Clear Site Data or Unpair.

const STORAGE_KEY = "geargrid.device_id";
const LABEL_KEY = "geargrid.device_label";
const TOKEN_KEY = "geargrid.device_token";
const TENANT_DB_KEY = "geargrid.tenant_db";

const safeStorage = () => {
  try {
    // Access throws in Safari private mode / cross-origin iframe contexts.
    const probe = "__gg_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
};

const generateDeviceId = (): string => {
  // crypto.randomUUID is available everywhere we care about (iOS 15.4+,
  // Android Chrome 92+). Fall back to a cheaper random id if absent so the
  // flow degrades gracefully on exotic WebViews.
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `gg-${crypto.randomUUID()}`;
    }
  } catch {
    // ignore
  }
  const rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `gg-${Date.now().toString(36)}-${rand}`;
};

export const getOrCreateDeviceId = (): string => {
  const storage = safeStorage();
  if (!storage) return generateDeviceId();
  const existing = storage.getItem(STORAGE_KEY);
  if (existing && existing.length >= 8) return existing;
  const fresh = generateDeviceId();
  storage.setItem(STORAGE_KEY, fresh);
  return fresh;
};

export const getDeviceId = (): string | null => {
  const storage = safeStorage();
  if (!storage) return null;
  const existing = storage.getItem(STORAGE_KEY);
  return existing && existing.length >= 8 ? existing : null;
};

export const clearDeviceId = () => {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(LABEL_KEY);
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(TENANT_DB_KEY);
};

export const setDeviceToken = (token: string) => {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(TOKEN_KEY, token);
};

export const getDeviceToken = (): string | null => {
  const storage = safeStorage();
  if (!storage) return null;
  const val = storage.getItem(TOKEN_KEY);
  return val && val.length > 0 ? val : null;
};

export const getPublicDeviceHeaders = (): Record<string, string> => {
  const token = getDeviceToken();
  return token ? { "x-device-token": token } : {};
};

export const setDeviceTenantDb = (tenantDb: string) => {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(TENANT_DB_KEY, tenantDb);
};

export const getDeviceTenantDb = (): string | null => {
  const storage = safeStorage();
  if (!storage) return null;
  const val = storage.getItem(TENANT_DB_KEY);
  return val && val.length > 0 ? val : null;
};

export const setDeviceLabel = (label: string) => {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(LABEL_KEY, label);
};

export const getDeviceLabel = (): string | null => {
  const storage = safeStorage();
  if (!storage) return null;
  return storage.getItem(LABEL_KEY);
};

// Best-effort friendly label from the user agent — "iPhone", "Pixel 7", etc.
// Only used as a default; the operator (or the phone user) can override.
export const suggestDeviceLabel = (): string => {
  if (typeof navigator === "undefined") return "Phone";
  const ua = navigator.userAgent || "";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Pixel/.test(ua)) return "Pixel";
  if (/Samsung|SM-/.test(ua)) return "Samsung";
  if (/Redmi|Mi\s/.test(ua)) return "Xiaomi";
  if (/Android/.test(ua)) return "Android phone";
  return "Phone";
};
