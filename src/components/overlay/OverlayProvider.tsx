import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getOverlayComponent } from "./overlayRegistry";

// One overlay manager for all of retail (plan §7.0 and §15 item 1).
//  - at most 2 levels; opening a third replaces the second
//  - each open pushes one browser history entry, so the phone's back button closes the top overlay
//    instead of leaving the page. Closing from the UI pops that entry again.
//  - the entry keeps the router's own history.state keys, so the router sees the same location.

export const MAX_OVERLAY_DEPTH = 2;

interface StackEntry {
  key: number;
  id: string;
  props: Record<string, any>;
}

interface OverlayApi {
  open: (id: string, props?: Record<string, any>) => void;
  /** Closes the top overlay. Resolves once the browser history entry is gone, so a navigation that follows is safe. */
  close: () => Promise<void>;
  closeAll: () => Promise<void>;
  /** Number of overlays currently open. */
  depth: number;
}

const OverlayContext = createContext<OverlayApi | null>(null);

interface LevelInfo {
  depth: number;
  isTop: boolean;
  close: () => void;
}
const LevelContext = createContext<LevelInfo | null>(null);

/** Inside an overlay component: which level it is on, and how to close itself. */
export const useOverlayLevel = () => useContext(LevelContext);

const NOOP_API: OverlayApi = { open: () => {}, close: async () => {}, closeAll: async () => {}, depth: 0 };

export const useOverlay = (): OverlayApi => useContext(OverlayContext) ?? NOOP_API;

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const stackRef = useRef<StackEntry[]>([]);
  stackRef.current = stack;
  const keyRef = useRef(0);
  // popstate events we caused ourselves (closing from the UI) and must not treat as "Back pressed".
  const ignorePops = useRef(0);
  const waiters = useRef<Array<() => void>>([]);

  const flushWaiters = () => {
    const list = waiters.current;
    waiters.current = [];
    list.forEach((fn) => fn());
  };

  const open = useCallback((id: string, props: Record<string, any> = {}) => {
    if (!getOverlayComponent(id)) {
      if (import.meta.env?.DEV) console.warn(`[overlay] "${id}" is not registered`);
      return;
    }
    const current = stackRef.current;
    const entry: StackEntry = { key: ++keyRef.current, id, props };
    let next: StackEntry[];
    let pushHistory = true;
    if (current.length >= MAX_OVERLAY_DEPTH) {
      // Keep two levels: the new one takes the place of the top one (its history entry is reused).
      next = [...current.slice(0, MAX_OVERLAY_DEPTH - 1), entry];
      pushHistory = false;
    } else if (current.length > 0 && current[current.length - 1].id === id) {
      next = [...current.slice(0, -1), entry];
      pushHistory = false;
    } else {
      next = [...current, entry];
    }
    if (pushHistory) {
      try {
        window.history.pushState({ ...(window.history.state ?? {}), __overlay: next.length }, "");
      } catch {
        /* history unavailable: the overlay still works, only the back button won't close it */
      }
    }
    stackRef.current = next;
    setStack(next);
  }, []);

  const popTop = useCallback((viaUi: boolean): Promise<void> => {
    const current = stackRef.current;
    if (current.length === 0) return Promise.resolve();
    const next = current.slice(0, -1);
    stackRef.current = next;
    setStack(next);
    if (!viaUi) return Promise.resolve();
    return new Promise<void>((resolve) => {
      ignorePops.current += 1;
      waiters.current.push(resolve);
      try {
        window.history.back();
      } catch {
        ignorePops.current = Math.max(0, ignorePops.current - 1);
        flushWaiters();
        return;
      }
      // If the browser never reports the pop, don't leave callers hanging.
      setTimeout(() => {
        if (waiters.current.includes(resolve)) {
          ignorePops.current = Math.max(0, ignorePops.current - 1);
          waiters.current = waiters.current.filter((w) => w !== resolve);
          resolve();
        }
      }, 300);
    });
  }, []);

  const close = useCallback(() => popTop(true), [popTop]);

  const closeAll = useCallback(async () => {
    while (stackRef.current.length > 0) await popTop(true);
  }, [popTop]);

  // The phone's Back button (or the browser's) closes the top overlay. With nothing open this does nothing.
  useEffect(() => {
    const onPop = () => {
      if (ignorePops.current > 0) {
        ignorePops.current -= 1;
        flushWaiters();
        return;
      }
      void popTop(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [popTop]);

  const api = useMemo<OverlayApi>(
    () => ({ open, close, closeAll, depth: stack.length }),
    [open, close, closeAll, stack.length],
  );

  return (
    <OverlayContext.Provider value={api}>
      {children}
      {stack.map((entry, index) => {
        const Component = getOverlayComponent(entry.id);
        if (!Component) return null;
        const level: LevelInfo = {
          depth: index,
          isTop: index === stack.length - 1,
          close: () => {
            void close();
          },
        };
        return (
          <LevelContext.Provider key={entry.key} value={level}>
            <Component {...entry.props} onClose={level.close} />
          </LevelContext.Provider>
        );
      })}
    </OverlayContext.Provider>
  );
}
