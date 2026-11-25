import { useEffect, useRef } from "react";

// Keyboard shortcut registry (retail plan §7.12). Definitions are fixed here; the key for each is
// the default below unless the user remapped it (preference "shortcuts": {id: combo}).
// Rules: shortcuts never fire while typing in a field, except Esc (and actions that say
// `allowWhileTyping`); a shortcut with no handler is ignored and never blocks the browser's key.

export interface ShortcutDef {
  id: string;
  /** i18n key for the action name. */
  label: string;
  /** Default combo, e.g. "F2", "Mod+K", "Shift+F4". "Mod" is Ctrl on Windows/Linux and Cmd on Mac. */
  defaultCombo: string;
  allowWhileTyping?: boolean;
  /** Not wired yet (a later retail step adds the handler). Still listed so users can remap it. */
  pending?: boolean;
}

export const SHORTCUT_DEFS: ShortcutDef[] = [
  { id: "command-bar", label: "shortcuts.commandBar", defaultCombo: "Mod+K", allowWhileTyping: true },
  { id: "stock-in", label: "shortcuts.stockIn", defaultCombo: "F2" },
  { id: "find-item", label: "shortcuts.findItem", defaultCombo: "F3" },
  { id: "correct-stock", label: "shortcuts.correctStock", defaultCombo: "F4" },
  { id: "walk-in", label: "shortcuts.walkIn", defaultCombo: "F8" },
  { id: "sell-print", label: "shortcuts.sellPrint", defaultCombo: "F9" },
  { id: "qty-up", label: "shortcuts.qtyUp", defaultCombo: "Plus", pending: true },
  { id: "qty-down", label: "shortcuts.qtyDown", defaultCombo: "Minus", pending: true },
];

export const getShortcutDef = (id: string) => SHORTCUT_DEFS.find((d) => d.id === id);

/** A key event as a combo string, e.g. "Mod+Shift+K", "F2", "Plus". Null for bare modifier presses. */
export const comboFromEvent = (e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">): string | null => {
  let key = e.key;
  if (!key || ["Control", "Meta", "Shift", "Alt", "AltGraph", "Dead", "Unidentified"].includes(key)) return null;
  if (key === "+") key = "Plus";
  else if (key === "-") key = "Minus";
  else if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();
  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push("Mod");
  if (e.altKey) mods.push("Alt");
  // Shift is already part of a printable character ("+"), so only name it for named keys and letters.
  const shiftMatters = e.shiftKey && (key.length > 1 ? key !== "Plus" : /[A-Z0-9]/.test(key));
  if (shiftMatters) mods.push("Shift");
  return [...mods, key].join("+");
};

export const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    return !["button", "checkbox", "radio", "submit", "reset", "range", "color", "file", "image"].includes(type);
  }
  return el.isContentEditable === true;
};

/** Shown in tooltips and the command bar: "Mod+K" becomes "Ctrl K" or "⌘ K". */
export const formatCombo = (combo: string, isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "")) =>
  combo
    .split("+")
    .map((p) => (p === "Mod" ? (isMac ? "⌘" : "Ctrl") : p === "Plus" ? "+" : p === "Minus" ? "−" : p === "Alt" ? (isMac ? "⌥" : "Alt") : p))
    .join(" ");

// ── Handlers ──────────────────────────────────────────────────────────────────
type Handler = (e: KeyboardEvent) => void;
const handlers = new Map<string, Set<{ current: Handler }>>();

/** Runs `handler` when the shortcut `id` is pressed, while the component is mounted. */
export function useShortcut(id: string, handler: Handler, enabled = true) {
  const ref = useRef<Handler>(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const set = handlers.get(id) ?? new Set();
    set.add(ref);
    handlers.set(id, set);
    return () => {
      set.delete(ref);
      if (set.size === 0) handlers.delete(id);
    };
  }, [id, enabled]);
}

/**
 * Finds which shortcut an event triggers and runs its latest handler. Exposed for the host and tests.
 * Returns true when a handler ran (and the browser's own action was cancelled).
 */
export const dispatchShortcut = (e: KeyboardEvent, overrides: Record<string, string> = {}): boolean => {
  if (e.defaultPrevented || e.isComposing) return false;
  const combo = comboFromEvent(e);
  if (!combo) return false;
  const typing = isTypingTarget(e.target);
  for (const def of SHORTCUT_DEFS) {
    const bound = overrides[def.id] || def.defaultCombo;
    if (bound !== combo) continue;
    if (typing && !def.allowWhileTyping && combo !== "Escape") continue;
    const set = handlers.get(def.id);
    if (!set || set.size === 0) continue;
    e.preventDefault();
    // Newest registration wins (the screen on top), like stacked overlays.
    const last = Array.from(set).pop()!;
    last.current(e);
    return true;
  }
  return false;
};

/** Test helper. */
export const __resetShortcutHandlers = () => handlers.clear();
