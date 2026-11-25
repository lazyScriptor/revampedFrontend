import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchActivityList } from "@/features/activity/api/activityApi";
import { nativeBridge } from "../lib/nativeBridge";

/**
 * The feed's unread count for this phone's user, copied to the app icon badge.
 * Returns null while unknown (offline, no activity:view), so callers can fall back to the saved alerts.
 */
export function useDeviceUnread(enabled: boolean): number | null {
  const query = useQuery({
    // Under "activity" so checking or reading an event refreshes it.
    queryKey: ["activity", "list", "device-unread"],
    queryFn: async () =>
      (await fetchActivityList({ unread: true }, 1, 1, undefined, "device")).total,
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const count = typeof query.data === "number" ? query.data : null;

  useEffect(() => {
    if (count !== null) void nativeBridge.syncBadge?.(count);
  }, [count]);

  return count;
}
