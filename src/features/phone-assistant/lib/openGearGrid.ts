import { useAuthStore } from "@/stores/useAuthStore";
import { isNativePhoneApp, nativeBridge } from "./nativeBridge";

/** The sign-in screen is shown with this phone's staff member filled in (never the password). */
export const rememberPairedUsername = (username?: string | null) => {
  if (!username) return;
  try {
    window.localStorage.setItem("geargrid.paired_username", username);
  } catch {
    // Private mode: the user types it
  }
};

/**
 * The GearGrid tab opens the normal web application in this same window. The phone's app lock (when on)
 * is asked first; the GearGrid password is never read or stored by the app.
 */
export async function startFullApp(navigate: (opts: any) => unknown): Promise<boolean> {
  if (isNativePhoneApp()) {
    const prefs = await nativeBridge.getAppPrefs();
    if (prefs?.appLockEnabled) {
      const res = await nativeBridge.authenticateAppLock();
      if (res && !res.ok) return false;
    }
  }
  const signedIn = Boolean(useAuthStore.getState().user);
  navigate({ to: signedIn ? "/dashboard" : "/login", replace: true });
  return true;
}
