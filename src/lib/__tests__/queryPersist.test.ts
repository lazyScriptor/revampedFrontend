import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { dehydrate } from "@tanstack/react-query";

const store = new Map<string, string>();
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: string) => void store.set(k, v)),
  del: vi.fn(async (k: string) => void store.delete(k)),
}));

import {
  shouldPersistQuery,
  buildBuster,
  cacheScopeFor,
  clearPersistedQueryCache,
  PERSIST_KEY,
  queryPersister,
} from "../queryPersist";

const jwt = (payload: object) => `x.${btoa(JSON.stringify(payload))}.y`;

describe("queryPersist", () => {
  beforeEach(() => store.clear());

  it("persists only successful queries marked meta.persist", async () => {
    const qc = new QueryClient();
    await qc.prefetchQuery({ queryKey: ["marked"], queryFn: async () => 1, meta: { persist: true } });
    await qc.prefetchQuery({ queryKey: ["unmarked"], queryFn: async () => 2 });
    await qc.prefetchQuery({ queryKey: ["false"], queryFn: async () => 3, meta: { persist: false } });
    const dehydrated = dehydrate(qc, { shouldDehydrateQuery: shouldPersistQuery });
    expect(dehydrated.queries.map((q) => q.queryKey)).toEqual([["marked"]]);
  });

  it("does not persist a marked query that failed", async () => {
    const qc = new QueryClient();
    await qc.prefetchQuery({ queryKey: ["bad"], queryFn: async () => { throw new Error("x"); }, meta: { persist: true }, retry: false });
    expect(dehydrate(qc, { shouldDehydrateQuery: shouldPersistQuery }).queries).toEqual([]);
  });

  it("builds the scope from the token's tenant and the user id, and a distinct buster per scope", () => {
    const a = cacheScopeFor({ id: 5 }, jwt({ tenantDbName: "geargrid_a" }));
    const b = cacheScopeFor({ id: 5 }, jwt({ tenantDbName: "geargrid_b" }));
    expect(a).toEqual({ tenant: "geargrid_a", userId: "5" });
    expect(buildBuster(a!, "v1")).not.toBe(buildBuster(b!, "v1"));
    expect(buildBuster(a!, "v1")).not.toBe(buildBuster(a!, "v2"));
    expect(cacheScopeFor(null, null)).toBeNull();
    expect(cacheScopeFor({ id: 1 }, "not-a-jwt")?.tenant).toBe("unknown");
  });

  it("clears the stored copy and the in-memory persisted queries on logout", async () => {
    const qc = new QueryClient();
    await qc.prefetchQuery({ queryKey: ["marked"], queryFn: async () => 1, meta: { persist: true } });
    await qc.prefetchQuery({ queryKey: ["unmarked"], queryFn: async () => 2 });
    store.set(PERSIST_KEY, "{}");
    await clearPersistedQueryCache(qc);
    expect(store.has(PERSIST_KEY)).toBe(false);
    expect(qc.getQueryData(["marked"])).toBeUndefined();
    expect(qc.getQueryData(["unmarked"])).toBe(2);
  });

  it("saves and restores a client through the IndexedDB storage", async () => {
    await queryPersister.persistClient({ timestamp: Date.now(), buster: "b", clientState: { mutations: [], queries: [] } });
    await new Promise((r) => setTimeout(r, 1200)); // throttled write
    expect(store.has(PERSIST_KEY)).toBe(true);
    const back = await queryPersister.restoreClient();
    expect(back?.buster).toBe("b");
  });
});
