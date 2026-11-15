import { useCallback, useEffect, useState } from "react";
import i18n from "@/i18n";
import {
  nativeBridge,
  isNativePhoneApp,
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
