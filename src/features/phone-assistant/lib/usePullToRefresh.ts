import { useEffect, useRef, useState } from "react";

/**
 * Pull down from the top of the page to refresh. Touch only, so it does nothing on a desktop browser.
 * `onRefresh` may return a promise; the indicator stays until it settles.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void, threshold = 80) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const handler = useRef(onRefresh);
  handler.current = onRefresh;

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      setPull(dy > 0 ? Math.min(dy, threshold * 1.5) : 0);
    };
    const onEnd = async () => {
      const reached = pull >= threshold;
      startY.current = null;
      setPull(0);
      if (!reached) return;
      setRefreshing(true);
      try {
        await handler.current();
      } finally {
        setRefreshing(false);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pull, threshold]);

  return { pull, refreshing };
}
