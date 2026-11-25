import { useEffect, useRef } from "react";
import { useUiPreference } from "@/features/preferences/useUiPreference";
import { dispatchShortcut } from "./shortcuts";

/** One window-level key listener for every registered shortcut. Renders nothing. */
export function ShortcutHost() {
  const { value: overrides } = useUiPreference<Record<string, string>>("shortcuts", {});
  const ref = useRef(overrides);
  ref.current = overrides;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      dispatchShortcut(e, ref.current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return null;
}
