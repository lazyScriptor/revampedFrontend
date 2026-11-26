import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { cacheScopeFor, startQueryPersistence } from "@/lib/queryPersist";
import { startRealtimeInvalidation } from "@/app/realtimeInvalidation";

/**
 * Restores and saves the persisted queries for the signed-in user and shop. Renders nothing.
 * The cache is cleared on logout and when the user or shop changes (see useAuthStore).
 */
export function QueryPersistence() {
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const scope = cacheScopeFor(user, token);
  const tenant = scope?.tenant;
  const userId = scope?.userId;

  useEffect(() => {
    if (!tenant || !userId) return;
    const { stop } = startQueryPersistence(client, { tenant, userId });
    return stop;
  }, [client, tenant, userId]);

  // While signed in, refresh exactly the cached data the server says changed (data:changed).
  useEffect(() => {
    if (!tenant || !userId) return;
    return startRealtimeInvalidation(client);
  }, [client, tenant, userId]);

  return null;
}
