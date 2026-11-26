import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * How old the dashboard's cards are, for the small "Updated 12 min ago" next to the refresh
 * button, and whether something changed in the shop since (`hasNewData` puts a dot on the button).
 */
export const useDashboardFreshness = () => {
  const qc = useQueryClient();
  const read = () => {
    const queries = qc
      .getQueryCache()
      .findAll({ queryKey: ["dashboard"] })
      .filter((q) => q.queryKey[1] !== "config" && q.state.dataUpdatedAt > 0);
    const oldest = queries.length ? Math.min(...queries.map((q) => q.state.dataUpdatedAt)) : null;
    const hasNewData = queries.some((q) => q.state.isInvalidated);
    return { oldest, hasNewData };
  };
  const [state, setState] = useState(read);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsubscribe = qc.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === "dashboard") setState(read());
    });
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      unsubscribe();
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc]);

  const minutesAgo = state.oldest ? Math.max(0, Math.floor((now - state.oldest) / 60_000)) : null;
  return { minutesAgo, hasNewData: state.hasNewData };
};
