import { useEffect, useState } from "react";
import { isNativePhoneApp, nativeBridge } from "./nativeBridge";

/** How many Android permissions the app still needs (caller ID role, overlay, notifications, battery). */
export function useSetupWarningCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isNativePhoneApp()) return;
    let alive = true;
    void nativeBridge.getSetupStatus().then((s) => {
      if (!alive || !s) return;
      setCount(
        [s.callScreeningRole, s.overlayPermission, s.notificationsPermission, s.batteryOptimizationExempt].filter((v) => v === false).length,
      );
    });
    return () => {
      alive = false;
    };
  }, []);
  return count;
}
