import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import i18n from "@/i18n";
import {
  nativeBridge,
  isNativePhoneApp,
  type NativeAlert,
  type NativeAppPrefs,
  type NativeSyncStatus,
} from "./nativeBridge";

export const TEXT_SIZE_SCALE: Record<NativeAppPrefs["appTextSize"], number> = {
  small: 0.9,
  default: 1,
  large: 1.15,
  extra_large: 1.3,
};

const PREFS_KEY = "geargrid.phone_app_prefs";
const DEFAULT_PREFS: NativeAppPrefs = {
  appLanguage: "follow",
  appTextSize: "default",
  callTextScale: null,
  appLockEnabled: false,
};

const readLocalPrefs = (): NativeAppPrefs => {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(window.localStorage.getItem(PREFS_KEY) || "{}") as Partial<NativeAppPrefs>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};
const writeLocalPrefs = (prefs: NativeAppPrefs) => {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode: the native copy is the real one
  }
};

/** "Follow phone" resolves to the browser/system language, limited to the three the phone pages offer. */
export const resolvePhoneLanguage = (choice: NativeAppPrefs["appLanguage"]): "en" | "si" | "ta" => {
  if (choice !== "follow") return choice;
  const nav = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase();
  if (nav.startsWith("si")) return "si";
  if (nav.startsWith("ta")) return "ta";
  return "en";
};

/** App language, app text size and the other phone-level choices. Stored natively, mirrored locally for the browser. */
export function useAppPrefs() {
  const [prefs, setPrefs] = useState<NativeAppPrefs>(readLocalPrefs);

  useEffect(() => {
    let alive = true;
    void nativeBridge.getAppPrefs().then((native) => {
      if (!alive || !native) return;
      setPrefs(native);
      writeLocalPrefs(native);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<NativeAppPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writeLocalPrefs(next);
      return next;
    });
    if (patch.appLanguage !== undefined) await nativeBridge.setAppLanguage(patch.appLanguage);
    if (patch.appTextSize !== undefined) await nativeBridge.setAppTextSize(patch.appTextSize);
    if (patch.callTextScale !== undefined) await nativeBridge.setCallTextScale(patch.callTextScale);
    if (patch.appLockEnabled !== undefined) await nativeBridge.setAppLock(patch.appLockEnabled);
  }, []);

  return { prefs, update };
}

/** Applies the phone's text size (root font scale) and language to the phone pages while mounted. */
export function useApplyAppPrefs(prefs: NativeAppPrefs) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.fontSize;
    root.style.fontSize = `${Math.round(TEXT_SIZE_SCALE[prefs.appTextSize] * 100)}%`;
    return () => {
      root.style.fontSize = previous;
    };
  }, [prefs.appTextSize]);

  useEffect(() => {
    const target = resolvePhoneLanguage(prefs.appLanguage);
    if (prefs.appLanguage === "follow" && target === "en" && !isNativePhoneApp()) return;
    if (i18n.language !== target) void i18n.changeLanguage(target);
  }, [prefs.appLanguage]);
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export type SyncFreshness = "never" | "fresh" | "stale";

export const syncFreshness = (status: NativeSyncStatus | null, now = Date.now()): SyncFreshness => {
  if (!status?.lastBriefSyncAt) return "never";
  const t = new Date(status.lastBriefSyncAt).getTime();
  if (!Number.isFinite(t)) return "never";
  return now - t > (status.staleAfterMinutes || 60) * 60_000 ? "stale" : "fresh";
};

/** Last syncs, cached customers and queued uploads, refreshed every 15 seconds and after "Sync now". */
export function useSyncStatus(pollMs = 15_000) {
  const [status, setStatus] = useState<NativeSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; updated?: number; error?: string } | null>(null);

  const refresh = useCallback(async () => {
    const next = await nativeBridge.getSyncStatus();
    if (next) setStatus(next);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refresh]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    setResult(null);
    const before = status?.cachedBriefs ?? 0;
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setResult({ ok: false, error: "no_connection" });
        return;
      }
      const res = await nativeBridge.syncNow();
      await refresh();
      const after = await nativeBridge.getSyncStatus();
      if (after) setStatus(after);
      if (!res) setResult({ ok: false, error: "unsupported" });
      else if (after?.lastResult) setResult(after.lastResult);
      else setResult({ ok: true, updated: Math.max(0, (after?.cachedBriefs ?? before) - before) });
    } catch {
      setResult({ ok: false, error: "no_connection" });
    } finally {
      setSyncing(false);
    }
  }, [refresh, status?.cachedBriefs]);

  return { status, syncing, result, syncNow, refresh };
}

let authBridgeInstalled = false;

/**
 * Tells the phone whether somebody is signed in to the application inside the app, so it can sign them out
 * after the shop's time limit. Pairing is separate and never affected.
 */
export function installNativeAuthBridge(
  subscribe: (listener: (state: { user: unknown }) => void) => () => void,
  getState: () => { user: unknown },
) {
  if (authBridgeInstalled || !isNativePhoneApp()) return;
  authBridgeInstalled = true;
  void nativeBridge.setSignedIn(Boolean(getState().user));
  subscribe((state) => {
    void nativeBridge.setSignedIn(Boolean(state.user));
  });
}

/** Keeps the Android status bar & safe-area inset background in sync with the active light/dark theme. */
export function useSyncNativeStatusBar() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  useEffect(() => {
    if (!isNativePhoneApp()) return;
    const color = isDark ? "#0F172A" : "#FFFFFF";
    void nativeBridge.setStatusBarTheme(isDark, color);
  }, [isDark]);
}

let backHandlerInstalled = false;

/** Registers a global hook so Android's Back button closes any open web dialog/drawer/popover first. */
export function installWebBackOverlayHandler() {
  if (backHandlerInstalled || typeof window === "undefined") return;
  backHandlerInstalled = true;
  (window as any).__geargridHandleBack = (): boolean => {
    const modals = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".MuiModal-root:not(.MuiModal-hidden), [role='dialog']:not([aria-hidden='true'])",
      ),
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    if (modals.length === 0) return false;
    const top = modals[modals.length - 1];
    top.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    const backdrop = top.querySelector<HTMLElement>(".MuiBackdrop-root");
    backdrop?.click();
    return true;
  };
}

const READ_ALERTS_KEY = "geargrid.alerts.read_ids.v1";
const READ_ALERTS_EVENT = "geargrid:alerts-read-changed";

export function getReadAlertIds(): Set<string> {
  try {
    const arr = JSON.parse(window.localStorage.getItem(READ_ALERTS_KEY) || "[]");
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function markAlertsRead(ids: string[]) {
  if (ids.length === 0) return;
  try {
    const current = getReadAlertIds();
    let changed = false;
    for (const id of ids) {
      if (id && !current.has(id)) {
        current.add(id);
        changed = true;
      }
    }
    if (!changed) return;
    const trimmed = Array.from(current).slice(-300);
    window.localStorage.setItem(READ_ALERTS_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new Event(READ_ALERTS_EVENT));
  } catch {
    // Ignore storage errors
  }
}

export function countUnreadAlerts(alerts: NativeAlert[], readIds = getReadAlertIds()): number {
  let unread = 0;
  for (const a of alerts) {
    if (!readIds.has(a.id)) unread += 1;
  }
  return unread;
}

export function useUnreadAlertCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const alerts = await nativeBridge.getAlerts();
    setCount(countUnreadAlerts(alerts));
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener(READ_ALERTS_EVENT, onChange);
    window.addEventListener("focus", onChange);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener(READ_ALERTS_EVENT, onChange);
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  return { count, refresh };
}
