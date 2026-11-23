import { useEffect, useRef } from "react";
import { isTypingTarget } from "@/components/command/shortcuts";

// Barcode scanners type the code as a very fast burst of keys and press Enter (plan §15 item 8).
// A burst is: at least `minLength` printable keys, each less than `maxGapMs` after the one before,
// then Enter. A person cannot type that fast, so ordinary typing is never mistaken for a scan.

export const SCAN_MAX_GAP_MS = 35;
export const SCAN_MIN_LENGTH = 4;

export type ScanFeed = { type: "none" } | { type: "scan"; code: string };

export class ScanDetector {
  private buffer: string[] = [];
  private last = 0;
  constructor(
    private readonly maxGapMs = SCAN_MAX_GAP_MS,
    private readonly minLength = SCAN_MIN_LENGTH,
  ) {}

  reset() {
    this.buffer = [];
  }

  feed(key: string, now: number): ScanFeed {
    if (key === "Enter") {
      const ok = this.buffer.length >= this.minLength && now - this.last <= this.maxGapMs * 2;
      const code = this.buffer.join("");
      this.reset();
      return ok ? { type: "scan", code } : { type: "none" };
    }
    if (key.length === 1) {
      if (this.buffer.length > 0 && now - this.last > this.maxGapMs) this.reset();
      this.buffer.push(key);
      this.last = now;
      return { type: "none" };
    }
    // Shift and friends come with capital letters; anything else (Backspace, arrows, Tab) means a person.
    if (["Shift", "CapsLock", "Control", "Alt", "Meta", "AltGraph"].includes(key)) return { type: "none" };
    this.reset();
    return { type: "none" };
  }
}

// Only the top-most listener acts, so a scan with the finder open does not also reach the page behind it.
const stack: symbol[] = [];

/**
 * Calls `onScan(code)` when a scanner burst ends in Enter. Works while nothing is focused or a
 * non-text control is, and inside any element marked `data-scan` (the finder's search box); a scan
 * into any other text field is left alone.
 */
export function useScanDetector(onScan: (code: string, target: EventTarget | null) => void, enabled = true) {
  const ref = useRef(onScan);
  ref.current = onScan;
  useEffect(() => {
    if (!enabled) return;
    const me = Symbol("scan");
    stack.push(me);
    const detector = new ScanDetector();
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const target = e.target as HTMLElement | null;
      const accepts = !isTypingTarget(target) || !!target?.closest?.("[data-scan]");
      if (!accepts) {
        detector.reset();
        return;
      }
      const res = detector.feed(e.key, e.timeStamp || performance.now());
      if (res.type === "scan" && stack[stack.length - 1] === me) {
        e.preventDefault();
        e.stopPropagation();
        ref.current(res.code, e.target);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [enabled]);
}
