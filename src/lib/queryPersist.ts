// Keeps selected TanStack Query results in IndexedDB so the till opens instantly on a cold start
// (retail plan §7.11). Only queries that set `meta: { persist: true }` are stored.
import type { Query, QueryClient } from "@tanstack/react-query";
import { persistQueryClient, type Persister } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { queryClient as appQueryClient } from "@/app/queryClient";

export const PERSIST_KEY = "geargrid-query-cache";
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24 h

// IndexedDB can be missing or blocked (private windows, some embedded browsers). Persisting is a
// nice-to-have, so every storage call swallows its errors and the app simply runs without it.
const safeStorage = {
  getItem: async (key: string) => {
    try {
      return (await get<string>(key)) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await set(key, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: async (key: string) => {
    try {
      await del(key);
    } catch {
      /* ignore */
    }
  },
};

export const queryPersister: Persister = createAsyncStoragePersister({
  storage: safeStorage,
  key: PERSIST_KEY,
  throttleTime: 1000,
});

/** Only successful queries that opted in with `meta: { persist: true }` are written to disk. */
export const shouldPersistQuery = (query: Pick<Query, "meta" | "state">): boolean =>
  query.meta?.persist === true && query.state.status === "success";

const appVersion = () => (typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev");

/** Decodes the JWT payload (no verification; it only labels the cache). */
const tokenPayload = (token: string | null | undefined): Record<string, any> | null => {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export interface CacheScope {
  tenant: string;
  userId: string;
}

/** Who the cached data belongs to: the shop (tenantDbName in the login token) and the user. */
export const cacheScopeFor = (
  user: { id?: number | string | null; configData?: Record<string, unknown> | null } | null | undefined,
  token: string | null | undefined,
): CacheScope | null => {
  if (!user || user.id === undefined || user.id === null) return null;
  const payload = tokenPayload(token);
  const tenant =
    (payload?.tenantDbName as string | undefined) ||
    (payload?.tenant_id != null ? String(payload.tenant_id) : undefined) ||
    ((user.configData as any)?.tenant_id != null ? String((user.configData as any).tenant_id) : undefined) ||
    "unknown";
  return { tenant, userId: String(user.id) };
};

/** Cache buster: a new app version, shop or user discards what was stored. */
export const buildBuster = (scope: CacheScope, version: string = appVersion()) =>
  `${version}|${scope.tenant}|${scope.userId}`;

/** Wipes the stored copy and the in-memory copies of persisted queries (logout, shop change). */
export const clearPersistedQueryCache = async (client: QueryClient = appQueryClient) => {
  try {
    client.removeQueries({ predicate: (q) => q.meta?.persist === true });
  } catch {
    /* ignore */
  }
  await queryPersister.removeClient();
};

/**
 * Starts restoring and saving persisted queries for one user and shop. Returns a stop function.
 * Call it again with a different scope (after clearing) when the user or shop changes.
 */
export const startQueryPersistence = (client: QueryClient, scope: CacheScope, persister: Persister = queryPersister) => {
  const [unsubscribe, restored] = persistQueryClient({
    queryClient: client,
    persister,
    maxAge: PERSIST_MAX_AGE,
    buster: buildBuster(scope),
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
  });
  return { stop: unsubscribe, restored };
};
