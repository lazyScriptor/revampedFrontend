// features/signatures/lib/deviceShell.ts
//
// Keeps a paired phone ready to sign without anyone typing /device:
// • points the page's manifest at /manifest-device.json, so "Add to Home
//   Screen" from a device page installs an icon that opens on /device
//   (the main manifest opens on "/", which sends signed-in staff to the
//   dashboard);
// • holds a screen wake lock so the phone doesn't sleep and stop polling.
import { useEffect } from "react";

const DEVICE_MANIFEST = "/manifest-device.json";

export const isStandalone = (): boolean => {
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    );
  } catch {
    return false;
  }
};

export function useDeviceManifest() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const previous = link.getAttribute("href");
    link.setAttribute("href", DEVICE_MANIFEST);
    return () => {
      if (previous) link.setAttribute("href", previous);
    };
  }, []);
}

export function useScreenWakeLock(enabled = true) {
  useEffect(() => {
    const wakeLock = (navigator as any).wakeLock;
    if (!enabled || !wakeLock?.request) return;
    let sentinel: any = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || sentinel) return;
      try {
        sentinel = await wakeLock.request("screen");
        if (cancelled) {
          sentinel.release?.();
          sentinel = null;
          return;
        }
        sentinel.addEventListener?.("release", () => {
          sentinel = null;
        });
      } catch {
        // Battery saver or an unsupported browser: polling still works while awake.
      }
    };

    // The browser drops the lock whenever the tab is hidden; take it back on return.
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release?.();
      sentinel = null;
    };
  }, [enabled]);
}
